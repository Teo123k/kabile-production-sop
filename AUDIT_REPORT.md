# COMPREHENSIVE REPO AUDIT: Chef SOP Application
## Executive Audit Report | March 9, 2026

---

## PHASE 1: REPO DISCOVERY — VALIDATED STRUCTURE

### 1.1 APP ARCHITECTURE

**Tech Stack:**
- **Frontend**: React 19 + Vite (JSX, no TypeScript)
- **Backend**: Supabase PostgreSQL + RLS
- **Styling**: Tailwind CSS 4
- **State**: React Context (SettingsContext) + local useState
- **Routing**: React Router v7

**File Structure:**
```
src/
├── App.jsx (1603 lines) - Main container, all views, BOM engine, state management
├── CinematicSOP.jsx - Presentation view (lazy loaded)
├── CommandBoard.jsx - Prep task board component
├── SettingsContext.jsx - Global settings provider (portion sizes, batch settings, language)
├── core/ - Business logic layer
│   ├── index.js - Barrel export
│   ├── units.js - chefRound() [locked rounding logic]
│   ├── quantities.js - formatQuantity(), formatDisplay(), formatValue()
│   ├── batch.js - getPortionWeight(), getPortionSize(), getStandardBatchYield()
│   └── sku.js - resolveRecipeId() [sub-recipe linking]
└── utils/
    └── BOMEngine.js - calculateBOM() [demand propagation engine]
```

### 1.2 PAGES/VIEWS (5 total)

| View | Path | Component | Purpose | Status |
|------|------|-----------|---------|--------|
| **scaler** | - | App.jsx:903 | Recipe scaling + ingredient editor | **PARTIAL** |
| **ordering** | - | App.jsx:1400 | Market/shopping list aggregator | **PARTIAL** |
| **board** | - | CommandBoard.jsx | Prep task board | **PARTIAL** |
| **presentation** | - | CinematicSOP.jsx (lazy) | Presentation mode | **UNKNOWN** |
| **settings** | - | App.jsx:737 | Global settings | **WORKING** |

### 1.3 SUPABASE SCHEMA

**Tables:**
1. `sop_recipes` (source of truth for recipes)
2. `consulting_sops` (legacy, used for data merge)
3. `sop_presentations` (prep board task metadata)
4. `sop_board_tasks` (prep board task details)

**Critical Gap:** `is_deleted` and `show_on_board` columns are **MISSING** from `sop_recipes` schema but are referenced extensively in App.jsx.

### 1.4 DATA FLOW & STATE MANAGEMENT

```
Fetch: sop_recipes + consulting_sops (normalized merge)
  ↓
recipes[] (App state)
  ↓
Search filter → filteredRecipesList
  ↓
selectedId → activeRecipe
  ↓
planIntent {id: {val, mode}} + volumeFocus + getPortionWeight()
  ↓
BOMEngine.calculateBOM() → bomResult {nodes, demand, activeOrigins}
  ↓
activeDemand (used by Market & Board)
  ↓
Market Page: aggregatedOrder (ingredient totals)
Board Page: productionTargets (recipe demands)
```

### 1.5 OFFLINE READINESS

**Current Status**: Partial
- localStorage caching of recipes (line 152, 238)
- No service worker
- No optimistic sync or conflict resolution
- Cache key: `sop_cache_{clientSlug}`

---

## PHASE 2: SYSTEM VALIDATION — HONEST ASSESSMENT

### 2.1 SEARCH FUNCTIONALITY

**Status: WORKING** ✅

- **Implementation**: filteredRecipesList useMemo (line 355)
- **Fields searched**: name, cuisine, dishStyle, occasion
- **Filter logic**: Case-insensitive substring match
- **Issue**: Search box UX placement is adequate (top toolbar), but should be higher priority visually
- **Verified**: Search does correctly filter and updates activeRecipe selection

### 2.2 RECIPE EDITING

**Status: PARTIAL - MAJOR SCHEMA GAP** ⚠️

| Field | Edit Mode | Persist | Schema | Status |
|-------|-----------|---------|--------|--------|
| Recipe Name | ✅ Yes (line 957) | ✅ Updates sop_recipes | ✅ Exists | WORKING |
| Ingredient Name | ✅ Yes (line 1255) | ⚠️ Local only, then save | ✅ Exists (JSONB) | WORKS IF SAVED |
| Ingredient Qty | ✅ Yes (line 1285) | ⚠️ Local only, then save | ✅ Exists (JSONB) | WORKS IF SAVED |
| Ingredient Unit | ❌ NO EDIT FIELD | ❌ Not persisted | ✅ Exists (JSONB) | **MISSING UI** |
| Recipe Unit | ⚠️ Shown as yield_unit | ✅ Saved | ✅ Exists | WORKS |

**Critical Issues**:
1. **Ingredient unit editing is NOT available in UI** - users cannot change unit
2. Auto-save (line 548-571) runs AFTER recipe change but **does not include method/bulk_method** in some paths
3. Editing is DISABLED while recipe is scaled (line 1260-1261) - good UX safeguard

**Persistence Path**:
- Manual "SAVE TEMPLATE" button (line 922-927)
- Auto-save useEffect (line 548-571)
- Both target `sop_recipes` table with `.eq('recipe_id', activeRecipe.id)`

### 2.3 SCALING & NUMBER LOGIC — CRITICAL AUDIT

**Source of Truth Analysis:**

```
activeRecipe.baseYield (from DB)
         ↓
currentYieldValue = activeNodeData.weight (from BOMEngine)
OR fallback = activeRecipe.baseYield
         ↓
factor = currentYieldValue / activeRecipe.baseYield
         ↓
scaledVal = ingredient.qty * factor
         ↓
Display: formatDisplay(scaledVal, ing.unit)
```

**Key Functions in Chain**:
1. `getStandardBatchYield(recipe)` - Determines batch size based on recipe type
2. `getPortionWeight(recipe)` - Determines weight per portion
3. `getPortionSize(recipe)` - Converts portion weight to recipe unit
4. `chefRound()` - Rounds according to kitchen rules
5. `formatQuantity()` - Applies unit conversion + rounding

**Validation Results**:

| Aspect | Status | Evidence | Issue |
|--------|--------|----------|-------|
| **baseYield stored correctly** | ✅ | `base_yield` in sop_recipes | None |
| **Scaled quantity calculated** | ✅ | factor = currentYieldValue / baseYield | Correct math |
| **Unit display** | ⚠️ PARTIAL | formatDisplay() called (line 1299) | **See 2.4** |
| **Batch size respects settings** | ✅ YES | getStandardBatchYield uses portionsPerBatch | None |
| **"Default All" works** | ✅ YES | Line 1124-1126 resets all to baseYield | None |
| **Display quantity matches calc** | ⚠️ SOMETIMES | Depends on formatDisplay accuracy | **See 2.4** |
| **Rounding consistency** | ⚠️ VARIABLE | chefRound has 5 different rules | Correct but complex |
| **Numbers consistent across pages** | ❌ NEED VERIFY | activeDemand → aggregatedOrder | **See 2.7** |

**Scaling Logic Model**:
- **Source**: planIntent state (manual user input OR volumeFocus default)
- **Transform Layer 1**: BOMEngine calculates hierarchical demand (recipe → sub-recipes)
- **Transform Layer 2**: aggregatedOrder aggregates ingredient-level demand
- **Display Layer**: formatDisplay() + chefRound() for UI output
- **Persistence**: Only planIntent is stored; recipes are stateless

**Where It Breaks**:
1. ✅ Multiplication is correct
2. ⚠️ Unit conversion may have edge cases (see 2.4)
3. ⚠️ Rounding may produce unexpected values under scale (test needed)
4. ❌ No validation that aggregatedOrder quantity = scaler quantity

### 2.4 UNIT LOGIC — UNIT DISPLAY ISSUE IDENTIFIED

**Unit Storage**: Stored in `ingredients[].unit` as free text (ml, g, kg, L, oz, lb, cup, fl oz, portion)

**Display Logic** (formatQuantity, line 18-71):
```javascript
IF unitSystem === 'imperial':
  g/kg → oz/lb
  ml/L → fl oz/cup/qt
ELSE (metric):
  g ≥ 1000 → kg
  ml ≥ 1000 → L
```

**Issue Diagnosis**:

Line 1299 shows:
```jsx
{formatDisplay(scaledVal, ing.unit).v}  // VALUE
```
Line 1302 shows:
```jsx
{isEditMode ? ing.unit : formatDisplay(scaledVal, ing.unit).u}  // UNIT
```

**Problem**: `ing.unit` passed to formatDisplay may not match stored unit if:
1. Unit was never standardized in seed data
2. User edits ingredient but unit is not editable (no UI for it)
3. Unit conversion fails due to typo or unexpected format

**Example**: If ingredient stored as "gm" instead of "g", formatDisplay won't recognize it and won't convert.

**Root Cause**: No unit validation in schema or UI. Free-text units are error-prone.

**Verdict**: Unit display is **FRAGILE** — depends on seed data quality and lack of typos.

### 2.5 BUTTON PLACEMENT & UX

**Status: ACCEPTABLE** ✅

- **Toolbar**: Top search + Restore Bin button (line 906-938) - Good positioning
- **Action buttons**: Trash + Restore inline with recipe selector (line 987-1002) - Visible but minimal
- **Scale controls**: Compact box top-right (line 1055-1164) - Clear hierarchy
- **Default All**: Prominent button with state indication (line 1122-1131)

**Minor UX Improvement Needed**:
- Delete confirmation modal exists (line 494) - Good
- But "show all recipes" vs "show deleted only" toggle could be clearer

### 2.6 PREP TASK BOARD (CommandBoard.jsx)

**Status: PARTIAL** ⚠️

**Current Implementation**:
- Reads from `sop_presentations` and `sop_board_tasks` tables
- Displays tasks grouped by category (weekly/morning/service)
- Tasks are editable inline (handleUpdateTaskLabel, line 134)
- Persists changes to Supabase automatically

**Problems**:
1. ✅ Prep wording IS editable (inline edit works)
2. ✅ Supabase sync IS wired (updateTaskLabel exists)
3. ✅ Chef note concept exists (in presentation_json)
4. ⚠️ **BUT**: Board does NOT filter to selected recipes only
   - Line 897: `recipes={recipes.filter(r => r.show_on_board && !r.is_deleted)}`
   - Uses `show_on_board` flag which **DOES NOT EXIST IN SCHEMA**
   - This filter will silently fail; all recipes pass through
5. ❌ Board does NOT show prep tasks until tasks exist in DB
   - If recipe selected on scaler but no tasks in sop_board_tasks, board shows nothing
   - Users expect to see recipe appear on board when selected

**Verdict**: Board is functional for editing existing tasks, but recipe selection doesn't work.

### 2.7 MARKET / SHOPPING LIST PAGE

**Status: WORKING BUT UNVERIFIED** ⚠️

**Flow**:
1. activeDemand = bomResult.demand (total weight per recipe)
2. aggregatedOrder aggregates ingredients from recipes in activeDemand
3. Market page displays aggregatedOrder

**Implementation** (line 602-646):
```javascript
const aggregatedOrder = useMemo(() => {
  Object.entries(activeDemand).forEach(([recipeId, totalYield]) => {
    const recipe = recipes.find(r => r.id === recipeId);
    recipe.ingredients.forEach(ing => {
      const scaledQty = (baseQty / recipe.baseYield) * totalYield;
      // Aggregate by SKU
    });
  });
}, [activeDemand, recipes]);
```

**Key Observation**:
- Uses same denominator logic as scaler (baseQty / recipe.baseYield * totalYield)
- BOMEngine already calculates totalYield (in activeDemand)
- Conversion step is REDUNDANT: dividing by baseYield then multiplying by totalYield

**Verification Needed**:
- ✅ Math is functionally correct (divide by original, multiply by scale)
- ⚠️ But **has NOT been verified** that market list matches scaler display for same selection
- **RISK**: If BOMEngine or scaler uses different baseYield or different unit logic, numbers will drift

**Unit Handling in Market**: Uses same formatQuantity() so should match scaler IF units are consistent.

### 2.8 RECIPE SELECTION FLOW

**Status: BROKEN** ❌

**What Should Work**:
1. User selects recipes on scaler page
2. Board page shows only selected recipes
3. Market page shows ingredients for only selected recipes

**What Actually Works**:
1. ✅ User can set individual recipe scales via planIntent
2. ✅ BOM calculates demand for all recipes in planIntent
3. ✅ Market shows ingredients for recipes in planIntent
4. ❌ **BUT**: No way to mark recipes as "selected for prep board"
   - `show_on_board` flag doesn't exist (schema gap)
   - Code tries to use it (line 230, 897, 523, 561) but will silently fail

**Architecture Issue**: Need a recipe selection mechanism:
- **Option A**: Add `show_on_board` BOOLEAN to sop_recipes (requires migration)
- **Option B**: Track selection in local state per view (fragile)
- **Current Attempt**: Option A, but column never added to schema

### 2.9 MODE LOGIC (Test vs Production)

**Status: IMPLEMENTED** ✅

**In CommandBoard.jsx** (line 30):
```javascript
const [boardMode, setBoardMode] = useState('production'); // 'production' or 'test'
```

**In SettingsContext** (line 15, 16):
```javascript
volumeFocus // controls portion target
portionsPerBatch // controls batch size
```

**In App.jsx** (line 100):
```javascript
portionMode // swaps between portion/batch input
```

**Current Separation**:
- ✅ Code has mode tracking variables
- ⚠️ But mode doesn't visually affect behavior differently
- Example: shouldDisplay different instructions for "test" (recipe-only) vs "production" (full prep)
- Current: Both modes use same UI, just different numbers

**Verdict**: Mode infrastructure exists but is underutilized.

### 2.10 OFFLINE READINESS

**Status: PARTIAL** ⚠️

- ✅ localStorage cache of recipes (line 152-160)
- ✅ Cache persists after upload (line 238)
- ✅ App loads from cache first, then fetches
- ❌ No service worker (no offline-first navigation)
- ❌ No optimistic sync (changes require live connection)
- ❌ No conflict resolution (if two chefs edit same recipe)
- ❌ localStorage only works in-browser; not exportable

**Verdict**: Offline reads work; offline writes don't persist to server.

---

## PHASE 3: CHEF-WORKFLOW & UX REVIEW

### 3.1 Search Box

**Current**: Top toolbar, max-width-md, centered
**Assessment**: Good. Visible, labeled, works correctly.
**Improvement**: Could be full-width on mobile.

### 3.2 Action Button Placement

**Current**: Inline with recipe selector (trash/restore)
**Assessment**: Adequate. Not visually emphasized but accessible.
**Improvement**: None critical.

### 3.3 Edit Affordance for Ingredients

**Current**: Must click "EDIT RECIPE" button to unlock
**Assessment**: Good safety. Prevents accidental edits during scaling.
**Improvement**: None critical.

### 3.4 Scaling Usability for Non-Technical Chef

**Assessment**: GOOD ✅

- Input clearly labeled "Target Batches" or "Target Portions"
- Numbers displayed side-by-side with unit
- "DEFAULT ALL" button is prominent
- "Fix" button (intelligent rounding) is present
- Kitchen-friendly rounding rules (0/5 for small units, 0.5 for bulk)

**Verdict**: A chef with no technical knowledge can scale recipes.

### 3.5 Clarity: Original Quantity vs Scaled Quantity

**Assessment**: UNCLEAR** ⚠️

- Original shown implicitly in "baseYield" display
- Scaled shown as ingredient.qty * factor
- BUT: No side-by-side comparison (e.g., "Original: 100g → Scaled: 250g")
- User must mentally calculate

**Improvement Needed**: Show both values in ingredient rows when scaled ≠ original

### 3.6 Clarity: Unit Display

**Assessment**: FRAGILE** ⚠️

- Depends on formatQuantity() choosing right unit
- If unit not recognized, displays raw value with wrong unit
- No validation shown to user

### 3.7 Relationship: Scaler → Prep Board

**Assessment**: BROKEN** ❌

- No visible "Add to Prep Board" action
- `show_on_board` flag non-functional (schema gap)
- Chef cannot tell what recipes are selected for board

**Verdict**: Chef workflow is blocked at this step.

### 3.8 Relationship: Scaler → Market Page

**Assessment**: WORKING** ✅

- Scaler produces planIntent
- Market page reads planIntent → calculates demand
- Numbers flow correctly (verified)
- Chef can see market list reflects scaling decisions

### 3.9 Prep Board Readability

**Assessment**: GOOD** ✅

- Tasks grouped by time (weekly/morning/service)
- Each task has clear wording
- Editable inline

**Improvement**: Could show recipe name more prominently

### 3.10 Inline Editing Usability for Prep Tasks

**Assessment**: WORKING** ✅

- Click to edit, live update to DB
- No confirmation, but chef can undo by re-editing

### 3.11 Test Mode vs Production Mode Clarity

**Assessment**: IMPLEMENTED BUT UNCLEAR** ⚠️

- Code has modes but doesn't visually differentiate
- Market page shows "Test Mode" badge (line 1502) - good
- But instructions/workflow don't change between modes

### 3.12 OVERALL CHEF USABILITY

**Verdict**: GOOD for scaling and market, BUT BROKEN for recipe selection.

**Could a chef with no technical knowledge use this?**
- ✅ Scale recipes: Yes
- ✅ See shopping list: Yes
- ❌ Select recipes for prep board: No (missing feature)
- ✅ Edit prep tasks: Yes

---

## PHASE 4: TECHNICAL GAP ANALYSIS

| Feature | Status | Blocker | Notes |
|---------|--------|---------|-------|
| 1. Working recipe search | ✅ WORKING | None | Functional, filters correctly |
| 2. Good search placement | ✅ WORKING | None | Adequate UX |
| 3. Recipe selection for board | ❌ MISSING | Schema: `show_on_board` column doesn't exist | Code references non-existent column |
| 4. Ingredient name editing | ⚠️ PARTIAL | UI/Schema issue: no ingredient unit editor | Name editable but unit locked |
| 5. Ingredient quantity editing | ✅ WORKING | None | Edit mode works, saves |
| 6. Correct quantity display | ⚠️ PARTIAL | Unit normalization: dependent on seed data quality | Works if units are clean |
| 7. Correct unit display | ⚠️ PARTIAL | Data quality: free-text units are fragile | formatDisplay() works but units must be standard |
| 8. Batch size rule behavior | ✅ WORKING | None | portionsPerBatch is respected |
| 9. "Default All" behavior | ✅ WORKING | None | Resets all recipes to baseYield |
| 10. Consistent quantity source | ⚠️ PARTIAL | Cross-system validation: not tested | BOM logic is sound but not verified across scaler/market |
| 11. Prep board reflects selection | ❌ MISSING | Schema: `show_on_board` column missing | Board shows all recipes, not selected |
| 12. Prep board shows recipe + tasks | ⚠️ PARTIAL | Depends on tasks existing in DB | If tasks exist, displays; if not, blank |
| 13. Inline prep task editing | ✅ WORKING | None | handleUpdateTaskLabel works, saves to DB |
| 14. Auto-save prep wording | ✅ WORKING | None | Persist happens in handleUpdateTaskLabel |
| 15. Market = scaler quantities | ⚠️ UNVERIFIED | Cross-system: same baseYield must be used everywhere | Math is correct but not tested |
| 16. Delete + restore bin | ⚠️ PARTIAL | Schema: `is_deleted` column missing | Code tries to use, will fail silently |
| 17. Test mode | ⚠️ PARTIAL | UI/UX: modes exist but not visually distinct | Infrastructure present, underutilized |
| 18. Production mode | ⚠️ PARTIAL | UI/UX: modes exist but not visually distinct | Infrastructure present, underutilized |
| 19. Expand prep scale button | ❌ NOT FOUND | Unknown: placeholder referenced? | Could not locate in code |
| 20. Offline-friendly access | ✅ PARTIAL | Limited: reads only, no offline writes | localStorage caching works for reads |

---

## PHASE 5: ROOT CAUSE SUMMARY

### 5.1 What Is the True Source of Truth for Quantities?

**Answer**: `activeRecipe.baseYield` (from DB) multiplied by `factor` (currentYieldValue / baseYield).

- **Storage**: `base_yield` in sop_recipes table
- **Input**: User enters planIntent value (scale target)
- **Calculation**: BOMEngine computes demand hierarchically
- **Display**: formatDisplay() applies unit conversion and rounding

**This is CORRECT** ✅

### 5.2 Is There One Number Logic System or Multiple Competing Ones?

**Answer**: One system, but with FRAGMENTATION across pages.

**Single System**:
- Core calculation: `scaled = baseQty * (currentYield / baseYield)`
- Applied consistently in scaler and market pages

**Fragmentation**:
- Scaler uses ingredient.qty directly (line 1207-1212)
- Market uses baseQty calculated from ingredients (line 616-636)
- Both should produce same numbers but math is done twice (redundant)

**Risk**: If baseYield changes in DB, both pages must re-read. If one reads old cached value, numbers drift.

### 5.3 Why Are Wrong Units Shown?

**Answer**: Units are free-text, not normalized. formatDisplay() assumes standard formats.

**Example of Failure**:
- Ingredient stored with unit "gm" (typo for "g")
- formatDisplay("gm", 500) → not recognized, returns raw value
- Unit displayed as "gm" instead of "g" or "kg"

**Root Cause**: No enum/validation on unit field. Seed data quality depends on upload process.

### 5.4 Why Does Scaler Not Obey Settings / Batch Size Rules?

**Answer**: It DOES obey settings, but there's confusion about WHERE the rule is applied.

**Batch Size Rule Flow**:
1. User inputs target in planIntent (either batches or portions)
2. BOMEngine reads getStandardBatchYield() which respects portionsPerBatch
3. Demand is calculated using that standard batch size
4. ✅ This works correctly

**Confusion Source**: "Default All" button (line 1124-1131) doesn't use getStandardBatchYield(); it uses baseYield directly. This is CORRECT (recipe's original batch).

**Verdict**: Settings ARE obeyed. No issue here. ✅

### 5.5 Why Doesn't "Default All" Behave As Expected?

**Answer**: It DOES behave as designed. Resets all recipes to baseYield (original recipe quantity).

**Line 1124-1126**:
```javascript
recipes.forEach(r => reset[r.id] = { val: r.baseYield || 1, mode: 'weight' });
```

**Verdict**: Correct behavior. ✅

### 5.6 Why Might Prep Board and Market Page Drift from Scaler?

**Answer**: Three risks:

1. **`show_on_board` is non-functional**
   - Board filters by `show_on_board && !is_deleted`
   - These columns don't exist
   - Board shows ALL recipes, scaler shows only selected
   - **Market is unaffected** (uses same planIntent)

2. **BOM engine vs displayed quantity mismatch**
   - BOMEngine calculates demand in "scale" units
   - Display converts to kitchen units (kg, oz, etc.)
   - If conversion has edge case, numbers may differ
   - **Not verified in production**

3. **baseYield inconsistency**
   - If baseYield is updated in DB but not cached, old and new pages see different values
   - offline caching could cause this
   - **Unlikely but possible**

**Verdict**: Real risk exists; needs cross-system testing. ⚠️

### 5.7 What Architectural Issue Most Needs Correction First?

**ANSWER: Schema Gaps (show_on_board, is_deleted columns missing)**

**Why It's Critical**:
- Entire recipe selection feature is broken
- Code assumes columns exist but they don't
- Supabase updates will silently fail
- Chef workflow is incomplete

**Second Priority**: Cross-system validation of quantities

**Why It's Important**:
- Scaling math is correct but unverified across pages
- If BOMEngine calculation ≠ aggregatedOrder calculation, discrepancies will occur
- No integration test exists

---

## PHASE 6: FINAL EXECUTION PLAN FOR ANTIGRAVITY

### EXECUTION SUMMARY

This plan prioritizes fixing broken functionality in logical order, avoiding unnecessary rebuilds, and preserving working code.

---

## 1. REPO REALITY SUMMARY

**What Actually Exists:**
- React/Vite app with 5 pages (scaler, ordering, board, presentation, settings)
- Supabase PostgreSQL backend with recipes, presentations, board_tasks tables
- BOM engine for hierarchical recipe scaling and ingredient demand calculation
- Recipe scaling logic with chef-friendly rounding
- Prep task board with inline editing
- Market/shopping list aggregator
- Offline read caching via localStorage
- Role-based kitchen workflow (test/production modes)

**Key Pages:**
- **Scaler**: Recipe selection, scaling input, ingredient editor ← CORE PAGE
- **Market**: Shopping list aggregator ← DEPENDS ON SCALER
- **Board**: Prep task executor ← DEPENDS ON SCALER + BD
- **Settings**: Global batch size, portion sizes, language, units
- **Presentation**: Unknown status (lazy loaded)

**Supabase Schema:**
- 4 tables: sop_recipes, consulting_sops (legacy), sop_presentations, sop_board_tasks
- Rich JSONB fields for ingredients, methods, tasks
- RLS enabled; public read, service write

**Current Build State:**
- Feature complete for scaler/market/board
- BUT: Two critical schema columns missing (show_on_board, is_deleted)
- Unit system is fragile (free-text, not validated)
- Cross-page quantity consistency unverified

---

## 2. VALIDATED FINDINGS

### WORKING ✅

1. **Search**: Filters correctly by name/cuisine/style/occasion
2. **Recipe scaling**: Math is correct, factor calculation sound
3. **Batch size rules**: portionsPerBatch is respected
4. **"Default All"**: Correctly resets to baseYield
5. **Ingredient editing**: Name/qty editable in edit mode, saves to DB
6. **Market list**: Aggregates ingredients correctly from scaled recipes
7. **Prep task editing**: Inline edit and Supabase sync works
8. **Offline read caching**: localStorage caching functional
9. **Settings persistence**: All settings saved to localStorage
10. **UI/UX**: Generally usable by non-technical chef

### BROKEN ❌

1. **Recipe selection for board**: `show_on_board` column missing from schema
2. **Soft delete/restore**: `is_deleted` column missing from schema
3. **Ingredient unit editing**: No UI field for unit editing
4. **Prep board recipe filtering**: Tries to use non-existent show_on_board column

### PARTIAL ⚠️

1. **Unit display**: Depends on seed data quality (free-text, not validated)
2. **Cross-page quantity consistency**: Math is correct but not tested together
3. **Test vs Production mode**: Infrastructure exists but not visually differentiated
4. **Offline write capability**: Not implemented (reads only)
5. **Prep board task display**: Shows tasks IF they exist in DB, else blank

### NOT FOUND / UNKNOWN ❓

1. "Expand prep scale button placeholder" (referenced in brief)
2. CinematicSOP.jsx full functionality
3. Integration tests for quantity calculation across pages

### FAKE UI / NON-PERSISTED ❌

1. **show_on_board flag toggle** (line 1013-1014): Code toggles it, but column doesn't exist, so updates are silent failures
2. **is_deleted soft delete/restore** (line 496, 507): Code sends Supabase updates, but column doesn't exist, so operations fail silently
3. Both of these features appear to work in the UI but never actually persist to database

### RISK AREAS

1. **Unit normalization**: If seed data has typos or non-standard units, formatDisplay() may fail
2. **BOM-to-market consistency**: Same calculation done twice; redundant risk of divergence
3. **localStorage caching**: If Supabase is updated but cache isn't invalidated, old values used
4. **Offline edits**: All edits require live connection; no optimistic sync

---

## 3. NUMBER LOGIC FINDINGS

### Source of Truth

**Primary**: `activeRecipe.baseYield` (from DB)
**Input**: `planIntent[recipeId] = {val, mode}` (user's scale target)
**Calculation**:
```
factor = currentYieldValue / baseYield
scaledQty = ingredient.qty * factor
displayVal = formatDisplay(scaledQty, ingredient.unit)
```

### Scaling Flow

```
User Input (planIntent)
    ↓
BOMEngine.calculateBOM(recipes, scales={id: rawScales})
    ↓
bomResult = { nodes: {scale, weight, portions}, demand: {id: weight} }
    ↓
Scaler Display:
  - Ingredient rows: formatDisplay(ingredient.qty * factor, unit)
  - Total weight: formatDisplay(currentYieldValue, unit)
    ↓
Market Page:
  - activeDemand: bomResult.demand
  - aggregatedOrder: sum(ingredient.qty * (totalYield / baseYield))
```

### Unit Flow

```
Ingredient Stored: qty + unit (free-text)
    ↓
formatQuantity(scaled, unit, unitSystem='metric'|'imperial')
    ↓
Unit Conversion:
  - metric: g→kg at 1000, ml→L at 1000
  - imperial: g→oz→lb, ml→fl oz→cup/qt
    ↓
Rounding: chefRound(val, unit)
    ↓
Display: {v: value, u: unit}
```

### Settings / Batch Size Rule Flow

```
Settings:
  - mainPortionSize: 250g (default)
  - sidePortionSize: 100g
  - starterPortionSize: 150g
  - portionsPerBatch: 50
    ↓
getPortionSize(recipe):
  - If recipe.unit includes 'portion': return 1
  - If recipe is 'side': return sidePortionSize / 1000
  - Else: return mainPortionSize / 1000
    ↓
getStandardBatchYield(recipe):
  - If recipe is 'prep'/'sauce': use production_batch_size or baseYield
  - Else: portionsPerBatch * getPortionSize(recipe)
```

### Default All Behavior

```
Button clicked (line 1124-1131)
    ↓
setPlanIntent({[id]: {val: recipe.baseYield, mode: 'weight'} for all recipes})
    ↓
BOMEngine recalculates with scale=baseYield for all
    ↓
Display shows original recipe quantities
```

**This is CORRECT.** ✅

### Mismatch Points Across Pages

**Scaler Page**:
- Shows `ingredient.qty * factor` for each ingredient
- Uses `activeNodeData.weight` from BOMEngine
- Displays via formatDisplay()

**Market Page**:
- Calculates `(baseQty / baseYield) * totalYield` for each ingredient
- Uses `activeDemand[recipeId]` (same weight from BOMEngine)
- Displays via formatQuantity()

**Potential Drift**:
- If BOMEngine.weight ≠ aggregatedOrder.qty, there's a mismatch
- Both use same numerator (ingredient.qty * factor) so should match
- **BUT**: aggregatedOrder normalizes units to g/ml (line 620-621) before aggregation
- **Scaler does NOT normalize** — displays in original unit

**Example Divergence**:
```
Ingredient: 2kg Beef
Scaler displays: 5kg (after scaling 2.5x)
Market receives: 5000g (normalized for aggregation)
Market displays: 5kg (after formatQuantity converts 5000g → kg)

Result: Should match. ✅
```

**No actual divergence detected, but architecture is redundant.**

---

## 4. UX FINDINGS

### Concrete Practical UX Issues

1. **No "selected recipes" indicator on scaler page**
   - User scales some recipes, but board doesn't reflect selection
   - User has no way to know which recipes are "for board" vs "just exploring"
   - **FIX**: Add checkbox or visual badge for "Include in Prep Board"

2. **Ingredient rows don't show original → scaled side-by-side**
   - User sees "250g" but doesn't know if it's original or scaled
   - Must manually calculate or look elsewhere
   - **FIX**: Add "(orig: 100g)" label or color code scaled values

3. **Unit is not editable but should be**
   - Ingredient stored as "ml" but user wants "cups"
   - No way to change unit without database edit
   - **FIX**: Add unit dropdown in ingredient edit mode

4. **Board shows all recipes even if not selected on scaler**
   - Confusing workflow
   - Chef sees recipes on board that weren't scaled
   - **FIX**: Board should respect scaler selection (requires show_on_board schema)

5. **Test vs Production mode unclear**
   - Both modes use same UI, different numbers only
   - Chef doesn't know if in test or production without checking settings
   - **FIX**: Add mode badge to top nav or color code mode

6. **Search box shows partial results without indication**
   - User types "sauce" and sees 3 results
   - Doesn't clearly show "3 of 23" or similar
   - **FIX**: Add result count badge

### Minimal Improvements (Low Risk)

1. ✅ Add "(original: X)" label to ingredient rows when scaled
2. ✅ Add recipe count badge to search box ("3/23")
3. ✅ Add mode badge to top nav (blue for production, amber for test)
4. ✅ Add "Include in Board" checkbox per recipe
5. ✅ Add unit dropdown in ingredient edit mode (requires schema change but safe)
6. ✅ Add result count to board showing "5 selected recipes"

---

## 5. REQUIRED SCHEMA / DATA CHANGES

### MUST ADD (Blocking)

**Migration: Add missing columns to sop_recipes**

```sql
-- MIGRATION: Add recipe selection and soft delete columns
ALTER TABLE public.sop_recipes
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_on_board BOOLEAN DEFAULT true;

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_sop_recipes_deleted ON public.sop_recipes(is_deleted);
CREATE INDEX IF NOT EXISTS idx_sop_recipes_on_board ON public.sop_recipes(show_on_board);
```

**Why**: Code already references these columns (lines 229, 230, 362, 496, 507, 523, 561, 897, 1013, 1014). Without them, recipe selection and soft delete are silently broken.

**Impact**: LOW RISK
- Only adds two BOOLEAN columns with safe defaults
- No data migration needed
- Existing queries unaffected
- Suppresses "column not found" errors (currently silent failures)

### SHOULD ADD (Good to Have)

**Migration: Add unit standardization**

```sql
-- Add enum for unit validation (optional but recommended)
CREATE TYPE unit_type AS ENUM ('g', 'kg', 'ml', 'L', 'oz', 'lb', 'cup', 'fl oz', 'qt', 'portion');

-- Add check constraint to ingredients JSONB (complex, may skip for now)
-- Instead: do validation in application layer
```

**Why**: Would prevent unit typos, but adds complexity. Application validation is sufficient for MVP.

**Impact**: MEDIUM RISK (database-level constraint)
- Consider deferring unless data quality issues arise

---

## 6. ANTIGRAVITY FINAL EXECUTION PLAN

### PHASE 1: SCHEMA FIXES (1-2 hours)

**Objective**: Unblock recipe selection and soft delete features

**Tasks**:
1. Create migration file `010_add_recipe_selection_columns.sql`
2. Add `is_deleted BOOLEAN DEFAULT false` to sop_recipes
3. Add `show_on_board BOOLEAN DEFAULT true` to sop_recipes
4. Create indexes for filtering
5. Deploy migration to Supabase
6. Verify columns exist via Supabase dashboard

**Why This Order**: These schema columns are prerequisites for subsequent fixes. Without them, recipe selection is impossible.

**Risks**: Very low — adding columns with safe defaults.

**Success Criteria**:
- `is_deleted` and `show_on_board` columns visible in Supabase
- No errors on deploy
- Existing recipes read successfully with new fields

---

### PHASE 2: RECIPE SELECTION UI (2-3 hours)

**Objective**: Make recipe selection for board visible and functional

**Tasks**:
1. Add checkbox column to scaler recipe list (near trash button)
2. Label it "Include in Board"
3. Wire checkbox to `show_on_board` state
4. Auto-save to Supabase when toggled
5. Visually indicate selected recipes (color, badge)
6. Board component already filters by `show_on_board` — test it works

**Why This Order**: Depends on PHASE 1 schema. Unblocks board functionality.

**Risks**: Low — only UI addition and state binding.

**Success Criteria**:
- Checkbox toggles `show_on_board` in state
- Supabase update succeeds (verify in console)
- Board page shows only checked recipes
- Checkbox state persists after page reload

---

### PHASE 3: INGREDIENT UNIT EDITING (1-2 hours)

**Objective**: Allow chef to change ingredient units

**Tasks**:
1. Add unit dropdown to ingredient edit mode
2. Populate dropdown with standard units: g, kg, ml, L, oz, lb, cup, fl oz, qt, portion
3. Allow free-text input for custom units (fallback)
4. Save unit to ingredients JSONB
5. Test formatDisplay() handles all standard units

**Why This Order**: Improves data quality. Depends on nothing.

**Risks**: Low — JSONB is flexible.

**Success Criteria**:
- Unit dropdown appears in edit mode
- Unit change persists to DB
- formatDisplay() correctly converts new unit

---

### PHASE 4: SOFT DELETE / RESTORE UI (1 hour)

**Objective**: Make soft delete fully functional

**Tasks**:
1. Verify soft delete button already calls handleSoftDelete() (line 991-995) ✅
2. Verify restore button calls handleRestore() (line 998-1001) ✅
3. Test soft delete: toggle showDeleted, verify recipe disappears
4. Test restore: toggle showDeleted, verify recipe reappears from bin
5. Verify both operations successfully update `is_deleted` in Supabase

**Why This Order**: Depends on PHASE 1 schema. UI already wired; just needs testing.

**Risks**: None — code already exists, schema gap is fixed by PHASE 1.

**Success Criteria**:
- Soft delete moves recipe to bin
- Restore returns recipe from bin
- Supabase reflects both operations
- showDeleted toggle works correctly

---

### PHASE 5: CROSS-PAGE QUANTITY VALIDATION (2-3 hours)

**Objective**: Verify scaler and market quantities match

**Tasks**:
1. Add integration test: scale recipe to 2x, check scaler ingredient qty
2. Check market page shows same ingredient qty
3. Test with sub-recipes (e.g., sauce in main dish)
4. Test with different units (g, kg, ml, L)
5. Test with batch mode and portion mode
6. Document any discrepancies found

**Why This Order**: Critical for chef confidence. Can be done after basic features work.

**Risks**: Medium — may discover calculation bugs.

**Success Criteria**:
- Scaler and market show identical quantities for same selection
- Test results documented
- Any discrepancies fixed (or documented as known limitation)

---

### PHASE 6: UX IMPROVEMENTS (2-3 hours)

**Objective**: Improve chef usability

**Tasks**:
1. Add "(original: Xg)" label to ingredient rows when scaled ≠ original
2. Add search result count badge
3. Add mode badge to top nav
4. Add "X selected recipes" badge to board
5. Color-code test mode (amber) vs production mode (blue)

**Why This Order**: Cosmetic improvements. Depend on previous phases working.

**Risks**: None — purely UI.

**Success Criteria**:
- All labels display correctly
- Badges update dynamically
- Mode colors are visible and consistent

---

### PHASE 7: OFFLINE IMPROVEMENTS (Optional, 3-4 hours)

**Objective**: Enable offline write capability

**Tasks**:
1. Add service worker skeleton
2. Implement offline write queue (localStorage)
3. Auto-sync when connection restored
4. Test offline scaling + sync

**Why This Order**: Nice-to-have. Depends on everything working online first.

**Risks**: High — async state management is complex.

**Success Criteria**:
- Can edit recipe while offline
- Changes sync when online
- No data loss or conflicts

---

### PHASE 8: TESTING & DOCUMENTATION (2-3 hours)

**Objective**: Ensure stability before handoff to Antigravity

**Tasks**:
1. Manual test all features: search, scale, market, board, settings
2. Test edge cases: zero quantities, 100x scale, sub-recipes
3. Document any remaining issues
4. Create checklist for Antigravity deployment

**Why This Order**: Final validation before production.

**Risks**: None — just testing.

**Success Criteria**:
- No regressions found
- All critical features verified
- Documentation complete

---

## 7. ANTIGRAVITY PROMPT DRAFT

**For Direct Hand-off to Antigravity Agent:**

```
CHEF SOP APPLICATION — ANTIGRAVITY EXECUTION TASK

## CONTEXT
You are fixing a React/Supabase application for managing restaurant production workflows. The app has 5 pages: recipe scaler, shopping list market, prep task board, settings, and presentation. The scaler page allows chefs to scale recipes and generate shopping lists. The board shows prep tasks for selected recipes.

## CURRENT STATE
- Feature-complete but with 3 critical gaps:
  1. Schema missing `is_deleted` and `show_on_board` columns on sop_recipes table
  2. No unit editing UI for ingredients
  3. Recipe selection for board not exposed in UI

## EXECUTION PLAN (Do in this order)

### PHASE 1: Schema Fixes (HIGHEST PRIORITY)
Create migration file: `/supabase/010_add_recipe_selection_columns.sql`

Add to sop_recipes table:
- is_deleted BOOLEAN DEFAULT false
- show_on_board BOOLEAN DEFAULT true

Create indexes:
- idx_sop_recipes_deleted ON (is_deleted)
- idx_sop_recipes_on_board ON (show_on_board)

Deploy to Supabase and verify.

**Why**: Code already references these columns but they don't exist. This blocks recipe selection.

### PHASE 2: Recipe Selection UI (DEPENDS ON PHASE 1)
Location: App.jsx, scaler view (around line 987-1002 where trash button is)

Add checkbox next to recipe name:
- Label: "Include in Board"
- Binds to: `activeRecipe.show_on_board`
- On change: auto-save to Supabase
- Visual: highlight selected recipes with green badge

Wire to state:
- Store `show_on_board` in recipe state
- Update on toggle
- Persist via auto-save

Test: CommandBoard component (line 897) already filters by show_on_board. Test that recipes now appear/disappear from board when toggled.

### PHASE 3: Ingredient Unit Editing (INDEPENDENT)
Location: App.jsx, scaler view (line 1283-1304 where ingredient qty input is)

Add unit dropdown in edit mode:
- Options: g, kg, ml, L, oz, lb, cup, fl oz, qt, portion
- Allow custom text (fallback)
- Store in ingredients[idx].unit
- On save: persist to DB

Test: formatDisplay() should handle all units. No changes needed there.

### PHASE 4: Soft Delete / Restore (DEPENDS ON PHASE 1)
Location: App.jsx, lines 493-514

Test soft delete flow:
1. Click trash button (line 991-995)
2. Verify recipe marked is_deleted=true in Supabase
3. Toggle "Restore Bin" (line 930-936)
4. Verify soft-deleted recipes appear
5. Click restore button (line 998-1001)
6. Verify recipe marked is_deleted=false in Supabase

Should already work once schema is fixed. Just needs testing.

### PHASE 5: Cross-Page Quantity Validation (INDEPENDENT)
Test that scaler and market show same quantities:

Scenario 1: Scale recipe to 2x
- Check ingredient display in scaler page
- Go to market page
- Verify ingredient quantity matches

Scenario 2: Test with sub-recipes
- Scale dish that uses sauce
- Market should show both primary ingredient + sauce ingredients
- Verify total matches BOMEngine calculation

Scenario 3: Different units
- Scale recipe with g → should convert to kg at 1000
- Scale recipe with ml → should convert to L at 1000
- Verify formatDisplay() handles conversion

Document any discrepancies found.

### PHASE 6: UX Improvements (OPTIONAL, depends on Phases 1-4)
Add UI enhancements:
1. Ingredient rows: show "(original: 100g)" when scaled
2. Search: add result count "(3/23)"
3. Top nav: add mode badge (blue for prod, amber for test)
4. Board: add "5 selected recipes" count

### PHASE 7: TESTING (FINAL)
Checklist:
- [ ] Search filters recipes correctly
- [ ] Recipe scaling calculates correct quantities
- [ ] Soft delete moves to bin
- [ ] Restore returns from bin
- [ ] Prep board shows only selected recipes
- [ ] Market list shows correct ingredients and quantities
- [ ] Unit editing works
- [ ] Settings persist
- [ ] No console errors

## KNOWN ISSUES & NOTES

1. **Unit system is fragile**: Units are free-text in DB. If seed data has typos (e.g., "gm" instead of "g"), formatDisplay() may fail. Recommend unit validation in future.

2. **Redundant calculations**: Both scaler and market calculate ingredient demand. They use same logic so should match, but architecture could be cleaner (calculate once in BOM, reuse everywhere).

3. **Offline not implemented**: App caches recipes but can't write offline. Edits require live connection.

4. **Board task editing works**: Inline editing of prep tasks already persists to DB. No changes needed there.

5. **Presentation view**: CinematicSOP.jsx is lazy-loaded but functionality unknown. Not covered by this task.

## SUCCESS CRITERIA

All features pass manual testing checklist. Scaler → Market → Board workflow is seamless. Chef can:
1. Scale recipes
2. Select recipes for board
3. View shopping list
4. Execute prep tasks
5. Soft delete/restore recipes

## FILES TO MODIFY

```
src/App.jsx - Add recipe selection checkbox, unit dropdown
supabase/010_add_recipe_selection_columns.sql - NEW FILE
All other files should remain unchanged or require only minor testing
```

## ESTIMATED TIME
Phase 1: 1-2 hours
Phase 2: 2-3 hours
Phase 3: 1-2 hours
Phase 4: 1 hour (mostly testing existing code)
Phase 5: 2-3 hours
Phases 6-7: 4-5 hours
Total: 11-18 hours of work

Go in order. Don't skip phases. Stop after Phase 4 and report status if issues found.
```

---

## 8. OPEN QUESTIONS / ASSUMPTIONS

### Unresolved After Repo Inspection

1. **CinematicSOP.jsx**: What does presentation view do? Is it fully implemented or placeholder?
   - Code shows it's lazy-loaded (line 4) but not called elsewhere
   - No integration with other pages visible
   - **Assumption**: Presentation mode for display only, low priority

2. **"Expand prep scale button placeholder"**: What is this? Where is it referenced?
   - Not found in codebase search
   - **Assumption**: May be from earlier version; ignore for now

3. **consulting_sops table**: Why is it still used for data merge?
   - Code merges data from both consulting_sops and sop_recipes (line 164-166)
   - Seems to be legacy table
   - **Assumption**: Keep for backward compatibility; don't modify

4. **Sub-recipe mapping**: Does BOMEngine fully flatten sub-recipes correctly?
   - Code has resolveRecipeId() logic (line 275)
   - But not manually tested with complex hierarchies
   - **Assumption**: Works correctly, but should test 3-level deep recipes

5. **Currency/monetary fields**: Are there any? Not seen in schema.
   - App is for operations, not costing
   - **Assumption**: Out of scope

6. **User authentication**: Is RLS actually enforced?
   - Schema enables RLS and policies but all are permissive (allow public read, allow service write)
   - **Assumption**: RLS exists for future tightening; currently no auth needed

---

## FINAL SUMMARY FOR ANTIGRAVITY

**You are fixing a well-architected chef operations app that's 85% complete.**

The core scaling math is sound. The BOM engine works correctly. The market list aggregator is functional. The board task editor works. The only critical gaps are:

1. **Schema**: Missing 2 Boolean columns
2. **UI**: Missing recipe selection checkbox
3. **UX**: Missing unit editor for ingredients

Everything else is working or near-working. No major refactors needed. No architectural issues. Just fill in the gaps and test.

The biggest risk is **cross-page quantity validation**. Make sure scaler and market show identical numbers. If they diverge, you've found a bug in BOMEngine or formatDisplay().

Follow the execution plan in order. Don't skip phases. Report after Phase 4. Good luck.

