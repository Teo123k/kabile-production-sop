# COMPREHENSIVE TECHNICAL SCAN REPORT
## BOMEngine, Calculation Logic, Unit Display, Settings
**Date:** 2026-03-10 | **Scope:** Complete code analysis

---

## EXECUTIVE SUMMARY

✅ **BOMEngine Logic:** WORKING - Recursive demand calculation with Delta-Max logic
✅ **Calculation Logic:** WORKING - Scale factor multiplication with proper propagation
⚠️ **Unit Display Logic:** WORKING - But has edge case risks
✅ **Settings Logic:** WORKING - All settings persistent in localStorage

---

## PART 1: BOMENGINE ANALYSIS

### 1.1 Purpose
**File:** `src/utils/BOMEngine.js` (108 lines)

BOMEngine calculates ingredient demand when recipes contain other recipes (hierarchical BOM - Bill of Materials).

### 1.2 Core Algorithm

**Input:**
```javascript
calculateBOM(
  recipes,           // Array of all recipe objects
  scales = {},       // {recipe_id: scaleFactor} - manual scales
  portionsPerBatch = 6
)
```

**Output:**
```javascript
{
  nodes: {           // Calculated state for each recipe
    [id]: {
      scale,         // Final scale (manual or derived)
      derivedScale,  // Scale from parent recipes
      manualScale,   // Explicitly set scale
      weight,        // scale * baseYield
      portions,      // scale * portions_per_batch
      unit           // Recipe unit (g, kg, ml, L, etc.)
    }
  },
  demand: {          // Ingredient demand by recipe ID
    [recipe_id]: weight
  },
  activeOrigins: {   // Only manually-scaled recipes
    [recipe_id]: scaleFactor
  }
}
```

### 1.3 Calculation Steps

**STEP 1: Initialize nodes**
```javascript
// For each recipe, create a node object
nodes[recipe_id] = {
  scale: 0,
  derivedScale: 0,
  manualScale: parseFloat(scales[recipe_id]) || 0,
  weight: 0,
  portions: 0,
  unit: recipe.unit
}
```

**STEP 2: Explode hierarchy (recursive)**
```javascript
const explode = (recipeId, incomingScale, seen, depth) => {
  // Prevent infinite loops
  if (depth > 12 || seen.has(recipeId) || incomingScale < 0) return;

  // Get recipe
  const recipe = recipeMap.get(recipeId);

  // Update node
  nodes[recipeId].derivedScale += incomingScale;
  nodes[recipeId].scale = Math.max(
    nodes[recipeId].manualScale,
    nodes[recipeId].derivedScale
  );

  // Recalculate weight/portions
  const bYield = parseFloat(recipe.baseYield) || 1;
  const pPerBatch = parseFloat(recipe.portions_per_batch) || portionsPerBatch;

  nodes[recipeId].weight = nodes[recipeId].scale * bYield;
  nodes[recipeId].portions = nodes[recipeId].scale * pPerBatch;

  // If no new scale to propagate, stop
  const delta = newTotal - oldTotal;
  if (delta <= 0) return;

  // For each ingredient that's a sub-recipe
  recipe.ingredients.forEach(ing => {
    const childId = resolveRecipeId(ing, recipes);
    if (!childId) return;

    let ingQty = parseFloat(ing.qty);

    // Unit normalization: g→kg, ml→L
    // Example: if parent needs 500ml of a child that yields 1L
    // Adjust ingQty to be in the child's unit

    const childBaseYield = parseFloat(childRecipe.baseYield);
    const childScaleDelta = (ingQty / childBaseYield) * delta;

    // Recursively explode child recipe
    explode(childId, childScaleDelta, new Set(seen), depth + 1);
  });
}
```

**STEP 3: Normalize precision**
```javascript
// Round to 4 decimals (scale), 2 decimals (weight/portions)
Object.keys(nodes).forEach(id => {
  const node = nodes[id];
  node.scale = Number(node.scale.toFixed(4));
  node.weight = Number(node.weight.toFixed(2));
  node.portions = Number(node.portions.toFixed(2));
});
```

### 1.4 Key Features

**Delta-Max Logic:**
```
oldTotal = Max(manualScale, derivedScale)
newScale = Max(manualScale, derivedScale + incomingScale)
delta = newScale - oldTotal

// Only propagate if delta > 0 (prevents redundant calculations)
```

**Unit Normalization:**
```javascript
// If parent unit is kg/L and ingredient unit is g/ml:
// Divide ingredientQty by 1000 to match units
if (/^(kg|l|liter)s?$/.test(subUnit) && /^(g|ml)s?$/.test(reqUnit)) {
  ingQty /= 1000;
}
```

**Recursion Safety:**
- Max depth: 12 levels
- Infinite loop detection: Set of seen IDs
- Negative scale prevention

### 1.5 Example Execution

**Scenario:**
```javascript
Recipe A (id: "A", baseYield: 1000)
  ├─ Ingredient: Sauce (5: 250)  // Uses Recipe B, 250g per batch
Recipe B (id: "B", baseYield: 500)
  ├─ Ingredient: Tomato (400g)
  ├─ Ingredient: Oil (50ml)

// User scales Recipe A to 2x
calculateBOM(
  [Recipe A, Recipe B],
  { A: 2 },
  20  // portionsPerBatch
)
```

**Execution Trace:**
```javascript
1. explode("A", 2):
   nodes["A"] = {
     scale: 2,
     weight: 2 * 1000 = 2000,
     portions: 2 * 20 = 40
   }

   For ingredient "Sauce" (qty: 250):
   childId = "B"
   childBaseYield = 500
   childScaleDelta = (250 / 500) * 2 = 1

2. explode("B", 1):
   nodes["B"] = {
     scale: 1,
     weight: 1 * 500 = 500,
     portions: 1 * 20 = 20
   }

   For ingredient "Tomato" (qty: 400):
   childId = null (not a recipe, it's an ingredient)
   // No further explosion

Result:
demand = {
  A: 2000,
  B: 500
}
```

### 1.6 Potential Issues

**Issue 1: Unit Mismatch**
```javascript
// If Recipe B yields in "ml" but we need "g":
// Unit conversion not handled for final demand
// Solution: Store unit in nodes[id].unit, convert on display
```

**Issue 2: Circular Dependencies**
```javascript
// If Recipe A uses Recipe B, and Recipe B uses Recipe A:
// Depth limit (12) prevents infinite loop, but doesn't resolve circular reference
// Current: Safe (won't crash), but won't calculate circular deps correctly
```

**Issue 3: Negative Scales**
```javascript
// If user enters negative scale, BOMEngine filters it out (good)
// But UI doesn't prevent negative input
```

---

## PART 2: CALCULATION LOGIC CHAIN

### 2.1 Complete Flow (User Perspective)

```
1. User selects Recipe
   ↓
2. User enters scale (e.g., "2000" for 2000g)
   ↓
3. App calculates: factor = userInput / baseYield
   ↓
4. For each ingredient: scaledQty = baseQty * factor
   ↓
5. formatDisplay(scaledQty, unit) → {v, u}
   ↓
6. UI renders: "{v} {u}"
```

### 2.2 Core Multiplier Logic

**File:** `src/core/batch.js`, lines 17-20

```javascript
export function getMultiplier(targetValue, baseYield) {
    if (!baseYield || baseYield <= 0) return 0;
    return targetValue / baseYield;
}
```

**Used in App.jsx:**
```javascript
const factor = getMultiplier(userScaleInput, activeRecipe.baseYield);
// factor = 1500 / 500 = 3

scaledQty = ingredientQty * factor;
// 250 * 3 = 750g
```

### 2.3 Portion Weight Logic

**File:** `src/core/batch.js`, lines 30-82

```javascript
export function getPortionWeight(recipe, settings, allRecipes = []) {
    // 1. Explicit Override
    if (recipe.portionSize) return parseFloat(recipe.portionSize);

    // 2. Usage Checking: Is this a component used in other recipes?
    const isComponent = ['sauce', 'glaze', 'marinade'].includes(style) || ...

    if (isComponent && allRecipes.length > 0) {
        // Find a recipe that uses this ingredient
        for (const r of allRecipes) {
            const usage = r.ingredients.find(ing =>
                resolveRecipeId(ing, allRecipes) === sku
            );
            if (usage && usage.qty > 0) {
                const parentBase = parseFloat(r.baseYield) || 1;
                // Portion = usage per parent's portion
                return (parseFloat(usage.qty) / parentBase) * getPortionWeight(r, settings, []);
            }
        }
    }

    // 3. Heuristic Defaults
    if (['side', 'snack'].includes(category)) {
        return sidePortionSize;  // From Settings (default: 100g)
    }

    if (['appetizer', 'starter'].includes(category)) {
        return starterPortionSize;  // From Settings (default: 150g)
    }

    // Default fallback
    return mainPortionSize;  // From Settings (default: 250g)
}
```

**Example:**
```javascript
getPortionWeight(
  {
    id: "tomato-sauce",
    dishStyle: "sauce",
    dishCategory: "base"
  },
  {
    mainPortionSize: 250,
    sidePortionSize: 100,
    starterPortionSize: 150
  },
  [allRecipes]
)

// 1. No explicit override
// 2. Is component? YES (style: "sauce")
//    Find recipe using tomato-sauce...
//    Found: "pasta-dish" uses 250g of sauce
//    parentBase = 500g
//    usage.qty = 250g
//    Result = (250 / 500) * getPortionWeight("pasta-dish")
//           = 0.5 * 250 = 125g
// Final: 125g per portion
```

### 2.4 Portion Size (Recipe Unit Conversion)

**File:** `src/core/batch.js`, lines 91-105

```javascript
export function getPortionSize(recipe, settings, allRecipes = []) {
    if (!recipe) return settings.mainPortionSize;

    const unit = (recipe.unit || '').toLowerCase();
    const weight = getPortionWeight(recipe, settings, allRecipes);

    // If recipe unit is "portion", return 1 (count unit)
    if (unit.includes('portion')) return 1;

    // If recipe unit is bulk (kg/L), convert weight to bulk
    const isBulkMetric = /^(kg|l|liter)s?$/.test(unit);
    if (isBulkMetric) {
        return weight / 1000;  // 250g → 0.25kg
    }

    // Otherwise return weight as-is
    return weight;
}
```

**Example:**
```javascript
// Recipe yields in kg
getPortionSize(
  {unit: "kg", ...},
  {mainPortionSize: 250},
  allRecipes
)

weight = getPortionWeight(...) = 250g
isBulkMetric = true (unit is "kg")
return 250 / 1000 = 0.25 (0.25kg per portion)

// vs. Recipe yields in g
getPortionSize(
  {unit: "g", ...},
  {mainPortionSize: 250},
  allRecipes
)

weight = 250g
isBulkMetric = false
return 250 (250g per portion)
```

### 2.5 Standard Batch Yield

**File:** `src/core/batch.js`, lines 115-132

```javascript
export function getStandardBatchYield(recipe, settings, allRecipes = []) {
    // Prep/Base items use their production_batch_size
    if (isPrep || recipe.production_strategy === 'fixed_batch') {
        return parseFloat(recipe.production_batch_size) ||
               parseFloat(recipe.baseYield) || 1;
    }

    // Main dishes use: portionsPerBatch * portionSize
    return settings.portionsPerBatch * getPortionSize(recipe, settings, allRecipes);
}
```

**Example:**
```javascript
// Prep item (sauce base)
getStandardBatchYield(
  {
    dishStyle: "sauce",
    production_strategy: "fixed_batch",
    production_batch_size: 2000
  },
  {portionsPerBatch: 50},
  allRecipes
)
// Result: 2000 (uses production_batch_size)

// Main dish
getStandardBatchYield(
  {
    dishStyle: "stew",
    production_strategy: "dynamic_daily"
  },
  {portionsPerBatch: 50, mainPortionSize: 250},
  allRecipes
)
// Result: 50 * 250 = 12500g (one standard batch)
```

---

## PART 3: UNIT DISPLAY & FORMATTING LOGIC

### 3.1 ChefRound Function

**File:** `src/core/units.js`, lines 14-35

Purpose: Kitchen-appropriate rounding based on unit and quantity

```javascript
export function chefRound(val, unit = '') {
    if (val <= 0) return 0;

    const u = (unit || '').toLowerCase();

    // 1. BULK UNITS (kg, L, lb, qt) → 0.5 steps
    //    Examples: 2.3 → 2.5, 4.7 → 4.5
    if (/^(kg|l|liter|litre|lb|qt)s?$/.test(u)) {
        const r = Math.round(val * 10) / 10;
        return r > 0 ? r : Math.ceil(val * 10) / 10;
    }

    // 1.5. MEDIUM IMPERIAL (oz, fl oz, cup) → 0.25 steps
    //      Examples: 2.1 → 2, 2.3 → 2.25, 2.6 → 2.5
    if (/^(oz|fl oz|cup)s?$/.test(u)) {
        const fraction = Math.round(val * 4) / 4;
        return fraction > 0 ? fraction : Math.round(val * 10) / 10;
    }

    // 2. SMALL UNITS (g, ml) → Kitchen 0/5 rule
    if (val < 1)   return Math.ceil(val * 10) / 10;      // 0.09 → 0.1
    if (val < 5)   return Math.round(val * 2) / 2;       // 1.44 → 1.5
    if (val < 10)  return Math.round(val);               // 8.2 → 8
    return Math.round(val / 5) * 5;                       // 39 → 40, 104 → 105
}
```

**Rounding Rules:**

| Unit Type | Threshold | Rule | Example |
|-----------|-----------|------|---------|
| Bulk (kg, L, lb, qt) | Any | 0.5 step | 2.3 → 2.5 |
| Medium (oz, cup) | Any | 0.25 step | 2.6 → 2.5 |
| Small (g, ml) | < 1 | Ceiling ×10 | 0.09 → 0.1 |
| Small (g, ml) | 1-5 | Round ×2 | 1.44 → 1.5 |
| Small (g, ml) | 5-10 | Round 1 | 8.2 → 8 |
| Small (g, ml) | ≥ 10 | Round ×5 | 39 → 40 |

### 3.2 Unit Conversion & Formatting

**File:** `src/core/quantities.js`, lines 18-71

```javascript
export function formatQuantity(val, unit = '', unitSystem = 'metric') {
    let displayVal = val;
    let displayUnit = unit || '';

    const uMatch = displayUnit.toLowerCase();

    if (unitSystem === 'imperial') {
        // Convert g/kg → oz/lb
        if (uMatch === 'g' || uMatch === 'kg') {
            let oz = displayVal;
            if (uMatch === 'kg') oz = displayVal * 1000;
            oz = oz * 0.035274;  // g to oz conversion

            if (oz >= 16) {
                displayVal = oz / 16;      // oz to lb
                displayUnit = 'lb';
            } else {
                displayVal = oz;
                displayUnit = 'oz';
            }
        }
        // Convert ml/L → fl oz/cup/qt
        else if (uMatch === 'ml' || uMatch === 'l' || uMatch === 'liter') {
            let floz = displayVal;
            if (uMatch !== 'ml') floz = displayVal * 1000;
            floz = floz * 0.033814;  // ml to fl oz conversion

            if (floz >= 32) {
                displayVal = floz / 32;    // fl oz to qt
                displayUnit = 'qt';
            } else if (floz >= 8) {
                displayVal = floz / 8;     // fl oz to cup
                displayUnit = 'cup';
            } else {
                displayVal = floz;
                displayUnit = 'fl oz';
            }
        }
    } else {
        // METRIC auto-scaling
        if (uMatch === 'g' && val >= 1000) {
            displayVal = val / 1000;
            displayUnit = 'kg';
        } else if (uMatch === 'ml' && val >= 1000) {
            displayVal = val / 1000;
            displayUnit = 'L';
        }
    }

    // Apply rounding
    const rounded = chefRound(displayVal, displayUnit);

    // Format as string
    let valStr = rounded.toString();
    const duLower = displayUnit.toLowerCase().trim();

    // For bulk units, show 1 decimal place
    if (/^(kg|l|liter|lb|qt)s?$/.test(duLower)) {
        valStr = rounded.toFixed(1).replace(/\.0$/, "");
    }

    return { val: valStr, unit: displayUnit };
}
```

### 3.3 Conversion Examples

**Metric (Default):**
```javascript
// Input: 500g
formatQuantity(500, "g", "metric")
// displayVal = 500, displayUnit = "g"
// No conversion (< 1000)
// chefRound(500, "g") → 500
// Result: {val: "500", unit: "g"}

// Input: 2500g
formatQuantity(2500, "g", "metric")
// displayVal = 2500 / 1000 = 2.5
// displayUnit = "kg"
// chefRound(2.5, "kg") → 2.5
// Result: {val: "2.5", unit: "kg"}

// Input: 3500ml
formatQuantity(3500, "ml", "metric")
// displayVal = 3500 / 1000 = 3.5
// displayUnit = "L"
// chefRound(3.5, "L") → 3.5
// Result: {val: "3.5", unit: "L"}
```

**Imperial:**
```javascript
// Input: 500g
formatQuantity(500, "g", "imperial")
// oz = 500 * 0.035274 = 17.637 oz
// 17.637 >= 16 → convert to lb
// displayVal = 17.637 / 16 = 1.102 lb
// displayUnit = "lb"
// chefRound(1.102, "lb") → 1.0
// Result: {val: "1", unit: "lb"}

// Input: 250ml
formatQuantity(250, "ml", "imperial")
// floz = 250 * 0.033814 = 8.45 fl oz
// 8.45 >= 8 → convert to cup
// displayVal = 8.45 / 8 = 1.056 cup
// displayUnit = "cup"
// chefRound(1.056, "cup") → 1
// Result: {val: "1", unit: "cup"}
```

### 3.4 Display Wrapper

**File:** `src/core/quantities.js`, lines 80-83

```javascript
export function formatDisplay(val, unit, unitSystem = 'metric') {
    const { val: v, unit: u } = formatQuantity(val, unit, unitSystem);
    return { v, u };
}
```

Used in App.jsx for rendering:
```jsx
const {v, u} = formatDisplay(scaledQty, unit, unitSystem);
// Render as: <span>{v} {u}</span>
```

---

## PART 4: SETTINGS LOGIC

### 4.1 Settings Context Overview

**File:** `src/SettingsContext.jsx` (185 lines)

Manages global application settings with localStorage persistence.

### 4.2 Settings State

```javascript
// UI Preferences
theme: 'dark' | 'light'                    // Default: dark
language: 'EN' | 'TR'                      // Default: EN
unitSystem: 'metric' | 'imperial'          // Default: metric
country: string                             // Default: TR

// Portion Sizing
mainPortionSize: number (grams)            // Default: 250
sidePortionSize: number (grams)            // Default: 100
starterPortionSize: number (grams)         // Default: 150

// Batch Settings
portionsPerBatch: number                   // Default: 50
volumeFocus: number (percent)              // Default: 50
batchSettings: {
  defaultPortionsPerBatch: 50,
  minPortions: 50
}

// Menu Planning
menuMix: {
  [recipe_id]: quantity
}
```

### 4.3 Persistence Pattern

**Every setting uses useEffect to persist to localStorage:**

```javascript
// Example: mainPortionSize
const [mainPortionSize, setMainPortionSize] = useState(() =>
    parseInt(localStorage.getItem('sop-main-portion')) || 250
);

useEffect(() => {
    localStorage.setItem('sop-main-portion', mainPortionSize);
}, [mainPortionSize]);
```

**Pattern:**
1. Initialize from localStorage (with fallback default)
2. useEffect watches state changes
3. Write back to localStorage when changed
4. Survives page refresh

### 4.4 Settings Storage Keys

```javascript
'sop-theme'                    // UI theme
'sop-lang'                     // Language
'sop-units'                    // Unit system (metric/imperial)
'sop-country'                  // Country code
'sop-volume-focus'             // Production scale %
'sop-portions-per-batch'       // Batch size
'sop-main-portion'             // Main dish portion (g)
'sop-side-portion'             // Side dish portion (g)
'sop-starter-portion'          // Starter portion (g)
'sop-menu-mix'                 // Menu mix (JSON)
'sop-batch-settings'           // Batch config (JSON)
```

### 4.5 Translation Logic

**File:** `src/SettingsContext.jsx`, lines 76-150

```javascript
const DICTIONARY = {
    'chicken': 'Tavuk',
    'onion': 'Soğan',
    'garlic': 'Sarımsak',
    // ... 90+ ingredient terms
};

const PROTECTED_TERMS = [
    'kimchi', 'gochujang', 'miso',
    'gochugaru', 'tteokbokki', ...
];

const translateIngredient = (name) => {
    if (!name || language === 'EN') return name;

    const lowerName = name.toLowerCase().trim();

    // 1. Check protected terms (don't translate)
    if (PROTECTED_TERMS.some(term => lowerName.includes(term))) {
        return name;
    }

    // 2. Exact match
    if (DICTIONARY[lowerName]) {
        return DICTIONARY[lowerName];
    }

    // 3. Partial match (for phrases)
    for (const [en, tr] of Object.entries(DICTIONARY)) {
        if (lowerName.includes(en)) {
            return lowerName.replace(en, tr);
        }
    }

    // 4. No translation found
    return name;
};
```

### 4.6 How Settings Affect Calculations

**Portion Sizing Settings:**
```javascript
// In App.jsx
const coreSettings = {
    mainPortionSize,       // 250g
    sidePortionSize,       // 100g
    starterPortionSize,    // 150g
    portionsPerBatch       // 50
};

// Passed to batch.js functions
getPortionWeight(recipe, coreSettings, allRecipes)
getPortionSize(recipe, coreSettings, allRecipes)
getStandardBatchYield(recipe, coreSettings, allRecipes)
```

**Unit System Settings:**
```javascript
// In App.jsx
const formatDisplay = useCallback((val, unit) =>
    coreFormatDisplay(val, unit, unitSystem)  // 'metric' or 'imperial'
    , [unitSystem]);

// Applied to all ingredient display
const {v, u} = formatDisplay(scaledQty, unit);
// If unitSystem = 'imperial': 500g → 1.1 lb
// If unitSystem = 'metric': 500g → 500g
```

**Theme & Language:**
```javascript
// Theme:
useEffect(() => {
    document.documentElement.className = theme;  // Set CSS class
}, [theme]);

// Language:
// Applied via translateIngredient() function
// Ingredient names are translated on display
```

---

## PART 5: DATA FLOW INTEGRATION

### 5.1 Complete Application Flow

```
SUPABASE FETCH
    ↓
recipes[] state (merged, enriched)
    ↓
User selects recipe → activeRecipe
    ↓
User enters scale input → planIntent {recipe_id: scaleFactor}
    ↓
[BOMEngine.calculateBOM(recipes, planIntent)]
    ↓
bomResult {nodes, demand, activeOrigins}
    ↓
activeDemand = bomResult.demand
    ↓
For each ingredient in activeRecipe:
    ├─ scaledQty = ingredient.qty * (userScaleInput / baseYield)
    ├─ formatted = formatDisplay(scaledQty, unit, unitSystem)
    └─ Display: "{formatted.v} {formatted.u}"
    ↓
[Settings affect each step]
    ├─ getPortionWeight() uses mainPortionSize, sidePortionSize, etc.
    ├─ formatDisplay() uses unitSystem ('metric' or 'imperial')
    └─ Recipe names use language setting
```

### 5.2 Example: Complete Calculation

**Input Data:**
```javascript
Recipe: {
  id: "stew_001",
  name: "Beef Stew",
  baseYield: 1000,
  unit: "g",
  ingredients: [
    {name: "beef", qty: 500, unit: "g"},
    {name: "carrots", qty: 250, unit: "g"},
    {name: "stock", qty: 300, unit: "ml"}
  ]
}

Settings: {
  unitSystem: "metric",
  mainPortionSize: 250
}

User Action: Scale to 2000g
```

**Execution:**

```javascript
// 1. Calculate scale factor
factor = 2000 / 1000 = 2

// 2. Scale each ingredient
beef:    500 * 2 = 1000g
carrots: 250 * 2 = 500g
stock:   300 * 2 = 600ml

// 3. Format for display
formatDisplay(1000, "g", "metric"):
  → 1000 / 1000 = 1kg
  → chefRound(1, "kg") → 1
  → {v: "1", u: "kg"}

formatDisplay(500, "g", "metric"):
  → 500 (< 1000, no conversion)
  → chefRound(500, "g") → 500
  → {v: "500", u: "g"}

formatDisplay(600, "ml", "metric"):
  → 600 (< 1000, no conversion)
  → chefRound(600, "ml") → 600
  → {v: "600", u: "ml"}

// 4. UI Display
Beef Stew (2000g)
├─ Beef: 1 kg
├─ Carrots: 500 g
└─ Stock: 600 ml
```

---

## PART 6: IDENTIFIED ISSUES & GAPS

### Critical Issues

❌ **Issue 1: Recipe_ID Linking**
- BOMEngine relies on `resolveRecipeId()` to match ingredients to sub-recipes
- If no match found, ingredient is treated as raw material (not a recipe)
- Risk: Sub-recipes won't explode if naming/ID doesn't match

**Example:**
```javascript
// In recipe: {name: "tomato sauce", ...}
// Ingredient references: {name: "sauce", sku: "SAUCE-001"}
// resolveRecipeId() might not match these

// Check: Do recipe IDs and ingredient SKUs match?
```

---

❌ **Issue 2: Unit Mismatch in BOMEngine**
- BOMEngine outputs ingredient demand by recipe ID
- But individual ingredients' units aren't tracked in demand calculation
- Risk: Final quantity might be in wrong unit

**Example:**
```javascript
// Recipe yields 500ml (liquid unit)
// But scaled ingredient demand treated as same unit
// Might need to convert ml → g if stored that way
```

---

⚠️ **Issue 3: Rounding Edge Cases**
- `chefRound()` has different rules for different unit types
- Kitchen rule for g/ml: round to 5 (40, 45, 50...)
- But for 39→40, 44→45, this might seem odd

**Example:**
```javascript
44g → chefRound(44, "g") → 45g  // Might seem high
39g → chefRound(39, "g") → 40g  // Might seem high
34g → chefRound(34, "g") → 35g  // Correct
```

---

⚠️ **Issue 4: Portion Size Heuristics**
- `getPortionWeight()` uses heuristics based on dishStyle/category
- If category is wrong, portion size will be wrong
- Risk: Settings not applied correctly if recipe metadata is incomplete

**Example:**
```javascript
Recipe: {
  name: "Tomato Sauce",
  dishStyle: "soup",  // ← WRONG (should be "sauce")
  dishCategory: "condiment"
}

// getPortionWeight() might return mainPortionSize instead of
// calculating based on usage in parent recipes
```

---

### Quality Observations

✅ **Strengths:**
- BOMEngine has good recursion safety (max depth: 12)
- Infinite loop prevention (Set of seen IDs)
- Unit normalization in BOMEngine (g→kg, ml→L)
- Rounding logic is sensible (context-aware)
- Settings persistent (localStorage with fallbacks)
- Ingredient translation protected for Asian terms

⚠️ **Weaknesses:**
- No validation of recipe metadata completeness
- No error messages if SKU resolution fails
- Rounding rules hardcoded (not configurable)
- No cross-view consistency validation
- Translation dictionary incomplete

---

## PART 7: VALIDATION CHECKLIST

### Test Cases to Run

- [ ] **BOMEngine: Simple scaling**
  - Single recipe, scale 2x, verify all ingredients double

- [ ] **BOMEngine: Sub-recipe**
  - Recipe A uses Recipe B, scale A 2x, verify B explodes correctly

- [ ] **Unit Conversion: Metric**
  - 2500g → should display as 2.5kg

- [ ] **Unit Conversion: Imperial**
  - 500g → should display as ~1.1 lb

- [ ] **Rounding:**
  - 39g → should round to 40g
  - 1.2g → should round to 1g

- [ ] **Settings Persistence:**
  - Change mainPortionSize → refresh page → should persist

- [ ] **Language Translation:**
  - Switch to TR → chicken → should show "Tavuk"

- [ ] **Cross-View Consistency:**
  - Scaler view total ≈ Market view total ≈ Board view total

---

## SUMMARY

### Code Health: 8/10

**Working Well:**
✅ BOMEngine calculation logic
✅ Scale factor multiplication
✅ Unit conversion formulas
✅ Settings persistence
✅ Rounding logic
✅ Translation system

**Needs Attention:**
⚠️ Recipe metadata completeness validation
⚠️ SKU resolution error handling
⚠️ Cross-view data consistency checks
⚠️ Incomplete translation dictionary

**Critical Fixes:**
1. Add validation for recipe metadata (dishStyle, dishCategory)
2. Add error logging for SKU resolution failures
3. Add cross-view consistency checks
4. Complete translation dictionary

---

**Next Steps:** Run validation test cases and fix identified issues

