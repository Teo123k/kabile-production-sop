# GitHub Repo Validation & Testing Plan
## cabij_sop_app Application
**Focus:** BOMEngine, Settings, Quantity Display, Button Logic

---

## PHASE 1: BOMENGINE CALCULATION LOGIC

### 1.1 What BOMEngine Does
**File:** `src/utils/BOMEngine.js`

BOMEngine calculates hierarchical demand when you scale a recipe:
```
Recipe A (base yield: 100g) → Scale to 200g
  ├─ Ingredient 1: 10g → 20g (scale factor: 2x)
  ├─ Ingredient 2: 20g → 40g
  └─ Sub-recipe B (yield: 50g) → 100g
      ├─ Ingredient 3: 5g → 10g
      └─ Ingredient 4: 15g → 30g

Output: demand {nodes, demand, activeOrigins}
```

### 1.2 Test Cases for BOMEngine

**TEST 1: Simple Recipe Scaling**
```javascript
Input:
  recipe_id: "recipe_1"
  baseYield: 100
  currentYield: 200
  ingredients: [
    {name: "flour", qty: 50, unit: "g"},
    {name: "water", qty: 30, unit: "g"}
  ]

Expected Output:
  demand["flour"] = 100
  demand["water"] = 60
  factor = 2
```

**TEST 2: Sub-Recipe Linking**
```javascript
Input:
  Recipe A (base yield: 500g, ingredients: [{dough_recipe_id: "recipe_2", qty: 400}])
  Recipe B (base yield: 100g, ingredients: [{flour: 50}, {water: 30}])

Scale Recipe A to 1000g:
  factor = 2
  dough_qty = 400 * 2 = 800g
  Recipe B yields 100g, so need 8 batches

Expected Output:
  flour demand = 50 * 8 = 400g
  water demand = 30 * 8 = 240g
```

**TEST 3: Mixed Units**
```javascript
Input:
  Recipe scales from 1L to 2L
  Ingredient 1: 500ml
  Ingredient 2: 200g

Expected Output:
  Ingredient 1: 1000ml (or 1L)
  Ingredient 2: 400g
  Units preserved but values scaled correctly
```

**TEST 4: Edge Case - Zero Quantity**
```javascript
Input:
  Recipe with ingredient qty: 0

Expected Output:
  Should NOT crash
  Demand should be 0
  Display should show "0 g" or similar
```

**TEST 5: Edge Case - Very Large Scale**
```javascript
Input:
  Base yield: 100g → Scale to 50,000g (500x)

Expected Output:
  All calculations accurate
  Rounding still applies kitchen rules
  No decimal precision errors
```

### 1.3 How to Validate BOMEngine

**Step 1: Check the Code**
```bash
cd /sessions/zen-modest-franklin/mnt/cabij_sop_app
cat src/utils/BOMEngine.js
```

**Step 2: Find Where It's Called**
```bash
grep -n "calculateBOM" src/**/*.jsx
# Should see: App.jsx (line ~650)
```

**Step 3: Trace the Data Flow**
```
App.jsx: activeRecipe + planIntent
  → BOMEngine.calculateBOM(recipe, planIntent)
  → bomResult {nodes, demand, activeOrigins}
  → activeDemand state
  → Used by Market, Board, Scaler views
```

**Step 4: Manual Test**
1. Load the app in browser
2. Select a recipe
3. Scale it to 2x
4. Open browser DevTools → Console
5. Run: `console.log(activeDemand)` (if exposed in window)
6. Verify numbers match expected scaling

---

## PHASE 2: SETTINGS LOGIC VALIDATION

### 2.1 What Settings Does
**File:** `src/SettingsContext.jsx`

Settings controls:
- Portion size (grams per portion)
- Batch settings (portions per batch)
- Language/unit system (metric vs imperial)
- Base multiplier for default scaling

```javascript
SettingsContext provides:
  {
    portionSize: 150,              // grams
    portionsPerBatch: 20,          // batch quantity
    unitSystem: 'metric',          // or 'imperial'
    recipeSettings: {recipe_id: {portions, batches, ...}}
  }
```

### 2.2 Test Cases for Settings

**TEST 1: Portion Size Setting**
```
Input:
  portionSize = 150g
  Recipe A: baseYield = 100g, basePortions = 10

Expected:
  When viewing Recipe A, portion weight shown = 10g (100 ÷ 10)
  When scaling to "3 portions", yield = 30g

Validation:
  getPortionWeight() should return 10
  getPortionSize() should return 3 (30 ÷ 10)
```

**TEST 2: Batch Settings**
```
Input:
  portionsPerBatch = 20
  Recipe A: basePortions = 10

Expected:
  Standard batch = 1 batch
  Each batch = 10 portions
  But if portionsPerBatch = 20, then 2 batches = 20 portions

Validation:
  getStandardBatchYield() respects portionsPerBatch
```

**TEST 3: Unit System Toggle**
```
Input:
  unitSystem = 'metric'
  Ingredient: 500ml

Expected:
  Display: "500ml"

Input:
  unitSystem = 'imperial'
  Ingredient: 500ml

Expected:
  Display: "16.9 fl oz" or "2 cups" (depending on conversion)
```

**TEST 4: Settings Persistence**
```
Input:
  User changes portionSize from 150 to 200
  User navigates away
  User comes back

Expected:
  portionSize still = 200 (should be saved in localStorage or Supabase)

Validation:
  Check if settings are saved to localStorage
  Or check if persisted in Supabase sop_recipes.settings
```

**TEST 5: Recipe-Specific Override**
```
Input:
  Global portionSize = 150
  Recipe A has override: portions = 100

Expected:
  Recipe A uses 100 portions
  Other recipes use 150 portions

Validation:
  recipeSettings[recipe_id] should take precedence
```

### 2.3 How to Validate Settings

**Step 1: Check SettingsContext**
```bash
cat src/SettingsContext.jsx
# Look for:
# - useState declarations
# - useEffect for loading/saving
# - Context.Provider values
```

**Step 2: Check Where Settings Are Used**
```bash
grep -rn "useContext(SettingsContext)" src/
# Should see usage in App.jsx, multiple places
```

**Step 3: Manual Test**
1. Open app
2. Go to Settings view
3. Change portionSize to 200
4. Go to Scaler view
5. Verify portion calculations changed
6. Refresh page
7. Verify setting persisted

**Step 4: Check localStorage**
```javascript
// In browser console:
localStorage.getItem('sop_cache_<clientSlug>')
// Should contain portionSize: 200
```

---

## PHASE 3: QUANTITY REPRESENTATION & DISPLAY ACCURACY

### 3.1 What Affects Quantity Display
**Files:** `src/core/quantities.js`, `src/App.jsx` (rendering)

Flow:
```
scaledQty = baseQty * scaleFactor
  ↓
formatQuantity(scaledQty, unit, unitSystem)
  ├─ Unit conversion (g → kg, ml → L, etc)
  └─ chefRound() for kitchen-appropriate rounding
  ↓
formatDisplay(scaledQty, unit)
  ├─ Returns {v: "500", u: "g"}
  ↓
UI Render: "{v} {u}" → "500 g"
```

### 3.2 Test Cases for Quantity Display

**TEST 1: Metric Display**
```
Input:
  baseQty: 50, unit: "g", unitSystem: "metric"
  Scale: 2x → 100g

Expected Display:
  "100 g"

Input:
  baseQty: 500, unit: "g", scale: 4x → 2000g

Expected Display:
  "2 kg" (not "2000 g")
```

**TEST 2: Imperial Display**
```
Input:
  baseQty: 500, unit: "g", unitSystem: "imperial"

Expected Display:
  "17.6 oz" (approximately, depending on conversion)
```

**TEST 3: Rounding (Chef Rules)**
```
Input:
  baseQty: 33.33g, unit: "g", scale: 2x → 66.66g

Expected Display:
  "67 g" (rounded up for practical kitchen use)
  NOT "66.66 g"
```

**TEST 4: Small Quantities**
```
Input:
  baseQty: 2, unit: "g", scale: 0.5x → 1g

Expected Display:
  "1 g" (not 0.5g)
  OR if < 1g, convert to ml or other unit
```

**TEST 5: Mixed Unit Conversion**
```
Input:
  baseQty: 250, unit: "ml", scale: 3x → 750ml

Expected Display:
  "750 ml" (metric)
  OR "0.75 L" (if using compacted format)
```

### 3.3 How to Validate Quantity Display

**Step 1: Check formatQuantity() and formatDisplay()**
```bash
cat src/core/quantities.js
# Look for:
# - Unit conversion logic
# - Threshold checks (g → kg, ml → L)
# - chefRound() application
```

**Step 2: Test with Real Data**
1. Find a recipe with varied ingredients
2. Scale recipe to 2x, 0.5x, 10x
3. Take screenshot of ingredient list
4. Manually calculate expected quantities
5. Compare actual display vs expected
6. Check for:
   - Correct unit conversions
   - Appropriate rounding
   - No broken decimal display

**Step 3: Check Cross-View Consistency**
1. Scaler view: scale recipe, note ingredient quantities
2. Go to Market view: check if aggregated totals match
3. Go to Board view: check if task quantities match
4. All three views should show consistent numbers

---

## PHASE 4: BUTTON FUNCTIONALITY VALIDATION

### 4.1 Critical Buttons in App

| Button | Location | Action | Expected Outcome |
|--------|----------|--------|------------------|
| **SAVE TEMPLATE** | Scaler view | Saves edited recipe | Recipe updated in DB, message shown |
| **EDIT MODE** | Scaler view | Toggle edit on/off | Ingredient fields become editable |
| **DEFAULT ALL** | Scaler view | Reset scale to base | All quantities return to base |
| **DELETE** | Scaler view | Remove ingredient | Ingredient deleted from recipe |
| **SCALE INPUT** | Scaler view | Change yield value | All quantities recalculate |
| **ADD TASK** | Board view | Create new task | Task added to board |
| **COMPLETE TASK** | Board view | Mark task done | Task styling changes, DB updated |
| **REFRESH** | Any view | Reload data | Data reloads from Supabase |
| **LANGUAGE TOGGLE** | Settings | Switch language | UI text changes |
| **SETTINGS SAVE** | Settings | Save portion/batch | Values persist |

### 4.2 Button Test Checklist

**TEST 1: SAVE TEMPLATE Button**
```
Steps:
1. Select recipe
2. Enter Edit Mode
3. Change ingredient quantity
4. Click SAVE TEMPLATE
5. Check:
   ☐ Success message appears
   ☐ Database updated (check Supabase)
   ☐ Page doesn't crash
   ☐ New quantity persists after refresh
```

**TEST 2: DEFAULT ALL Button**
```
Steps:
1. Select recipe
2. Scale recipe to 2x
3. Click DEFAULT ALL
4. Check:
   ☐ All quantities return to base
   ☐ Scale input returns to "1"
   ☐ No broken state
```

**TEST 3: EDIT MODE Toggle**
```
Steps:
1. Toggle EDIT ON
2. Check:
   ☐ Ingredient fields become input boxes
   ☐ Unit field appears (if available)
   ☐ Save button appears
   ☐ Edit mode indicator shows
3. Toggle EDIT OFF
4. Check:
   ☐ Fields become read-only
   ☐ Save button hides
```

**TEST 4: DELETE Ingredient**
```
Steps:
1. Enter Edit Mode
2. Delete an ingredient
3. Check:
   ☐ Ingredient removed from list
   ☐ BOM recalculates without it
   ☐ Quantity totals update
   ☐ Save button becomes available
4. Click SAVE
5. Check:
   ☐ Deletion persists after refresh
```

**TEST 5: SCALE INPUT**
```
Steps:
1. Select recipe (yield: 100g)
2. Enter "200" in scale input
3. Check:
   ☐ All ingredient quantities double
   ☐ Calculations are correct
   ☐ No decimal precision issues
4. Enter "0.5"
5. Check:
   ☐ All quantities halve
   ☐ Small quantities display correctly
```

**TEST 6: ADD TASK (Board)**
```
Steps:
1. Go to Board view
2. Click ADD TASK
3. Fill in task details
4. Click CREATE
5. Check:
   ☐ Task appears in board
   ☐ Task saved to DB
   ☐ Task persists after refresh
```

**TEST 7: COMPLETE TASK**
```
Steps:
1. Open a task in Board
2. Mark as "Complete"
3. Check:
   ☐ Task styling changes (strikethrough, gray, etc)
   ☐ Task status saved to DB
   ☐ Status persists after refresh
```

**TEST 8: Settings SAVE**
```
Steps:
1. Go to Settings
2. Change portionSize to 200
3. Click SAVE (or auto-save)
4. Go to Scaler view
5. Check:
   ☐ Portion calculations use 200
6. Refresh page
7. Check:
   ☐ Setting still = 200 (persisted)
```

---

## PHASE 5: CRITICAL BUGS FROM AUDIT REPORT

### 5.1 Known Issues to Fix

**Issue 1: Missing Database Columns**
```sql
-- These columns are referenced in code but don't exist:
ALTER TABLE sop_recipes ADD COLUMN is_deleted BOOLEAN DEFAULT false;
ALTER TABLE sop_recipes ADD COLUMN show_on_board BOOLEAN DEFAULT true;

-- Fix: Add these columns to Supabase sop_recipes table
```

**Issue 2: Ingredient Unit Editing Missing**
```jsx
// Currently:
// Line 1255-1305: Unit is displayed but NOT editable
<input type="text" value={ing.name} onChange={...} />  // Name editable
<span>{ing.unit}</span>  // Unit NOT editable

// Should be:
<input type="text" value={ing.name} onChange={...} />
<input type="text" value={ing.unit} onChange={...} />  // Make unit editable
```

**Issue 3: formatDisplay() Can Fail on Unknown Units**
```javascript
// If unit = "gm" (typo), formatDisplay() won't recognize it
// Fix: Standardize all units on DB insert or add unit validation

const VALID_UNITS = ['g', 'kg', 'ml', 'L', 'oz', 'lb', 'cup', 'fl oz', 'portion'];

if (!VALID_UNITS.includes(ing.unit)) {
  console.warn(`Unknown unit: ${ing.unit}`);
  // Set to closest match or 'g'
}
```

**Issue 4: No Cross-View Validation**
```javascript
// Scaler shows one total, Board shows different total
// Fix: Add validation

const scalerTotal = activeDemand['flour'];
const boardTotal = boardTasks.reduce(q => q);

if (Math.abs(scalerTotal - boardTotal) > 0.01) {
  console.warn('Data inconsistency detected');
  // Handle mismatch
}
```

---

## PHASE 6: TEST EXECUTION CHECKLIST

### Run These Tests Systematically

- [ ] **BOMEngine Tests**
  - [ ] Simple scaling (1 ingredient, 2x)
  - [ ] Sub-recipe linking (nested recipes)
  - [ ] Mixed units (g, ml, portions)
  - [ ] Edge cases (0, large numbers, decimals)

- [ ] **Settings Tests**
  - [ ] Portion size affects calculations
  - [ ] Batch size affects display
  - [ ] Unit system toggles correctly
  - [ ] Settings persist after refresh
  - [ ] Recipe-specific overrides work

- [ ] **Quantity Display Tests**
  - [ ] Metric display correct
  - [ ] Imperial display correct
  - [ ] Rounding follows kitchen rules
  - [ ] Small quantities handled
  - [ ] Unit conversions at threshold (g→kg)

- [ ] **Button Tests**
  - [ ] SAVE TEMPLATE persists changes
  - [ ] DEFAULT ALL resets to base
  - [ ] EDIT MODE toggles properly
  - [ ] DELETE removes ingredient correctly
  - [ ] SCALE INPUT recalculates all
  - [ ] ADD/COMPLETE TASK works
  - [ ] Settings SAVE persists

- [ ] **Critical Bug Fixes**
  - [ ] Database schema updated
  - [ ] Unit editing UI added
  - [ ] Unit validation implemented
  - [ ] Cross-view consistency checks added

---

## PHASE 7: TEST REPORT TEMPLATE

Create a file: `TEST_RESULTS.md`

```markdown
# Test Results Report
Date: [today]

## BOMEngine Tests
- Simple Scaling: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
  Evidence: [numbers match/don't match]

- Sub-Recipe: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
  Evidence: [hierarchy works/broken]

## Settings Tests
- Portion Size: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
  Evidence: [settings affect calculations/don't]

## Quantity Display Tests
- Metric: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
  Evidence: [units convert correctly/don't]

## Button Tests
- SAVE: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
- DEFAULT: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL
[... etc ...]

## Critical Bugs
- [ ] Database schema fixed
- [ ] Unit editing implemented
- [ ] Unit validation added
- [ ] Cross-view consistency verified

## Summary
Total Tests: X
Passed: X
Partial: X
Failed: X

Next Actions:
1. [highest priority fix]
2. [next fix]
3. [...]
```

---

## NEXT STEPS

1. **Choose Your Starting Point:**
   - Option A: Test BOMEngine first (core logic)
   - Option B: Fix database schema first (blocker)
   - Option C: Test buttons first (UX validation)

2. **Run Tests Systematically**
   - Pick one phase at a time
   - Document results
   - Fix issues as found

3. **Create Issues List**
   - Keep track of what works/breaks
   - Prioritize by severity
   - Create fixes

4. **Validate Fixes**
   - Re-test after each fix
   - Ensure no regressions
   - Update TEST_RESULTS.md

---

**Ready to start testing?** Let me know which phase you'd like to tackle first, and I can help you walk through it step by step.
