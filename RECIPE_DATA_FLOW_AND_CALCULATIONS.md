# Recipe Data Flow & Calculation Logic
## Complete Step-by-Step Guide with Examples
**Date:** 2026-03-10

---

## PART 1: RECIPE DATA FLOW FROM SUPABASE

### 1.1 Data Source: Supabase Tables

Your app fetches recipe data from **two Supabase tables**:

**Table 1: `sop_recipes` (Primary)**
```sql
Columns:
├── recipe_id (text, PK)
├── client_id (text) [e.g., 'kabile' or 'street-eat']
├── recipe_name (text)
├── base_yield (numeric) [e.g., 100, 500, 1000]
├── yield_unit (text) [e.g., 'g', 'kg', 'ml', 'L']
├── ingredients (jsonb) [array of {name, qty, unit, recipe_id}]
├── method (jsonb) [array of preparation steps]
├── bulk_method (jsonb) [array of scaling tips]
├── note (text) [operational notes]
├── dish_style (text) [e.g., 'stewed', 'fried']
├── cuisine_type (text)
├── tier (text) [e.g., 'Tier 2 (Daily)']
├── production_strategy (text)
├── production_batch_size (numeric)
├── is_deleted (boolean)
├── show_on_board (boolean)
└── created_at (timestamp)
```

**Table 2: `consulting_sops` (Legacy, for enrichment)**
```sql
Columns:
├── dish_name (text)
├── client_id (text)
├── recipe_json (jsonb) [fallback recipe data]
├── presentation_json (jsonb) [strategy, method, tips, temp]
└── ...other fields
```

### 1.2 Data Fetch Process (App.jsx, lines 147-244)

**Step 1: Try Offline Cache**
```javascript
// Check if recipe data exists in browser localStorage
const cached = localStorage.getItem(`sop_cache_kabile`);
if (cached) {
  setRecipes(JSON.parse(cached));
  // Quick UI win: show cached recipes immediately
}
```

**Step 2: Fetch from Both Tables**
```javascript
// Parallel fetch from both Supabase tables
const [recipeRes, legacyRes] = await Promise.all([
  supabase.from('sop_recipes').select('*').eq('client_id', 'kabile'),
  supabase.from('consulting_sops').select('*').eq('client_id', 'kabile')
]);

// Raw data from tables:
recipeRes.data = [
  {
    recipe_id: "recipe_123",
    recipe_name: "Chicken Stew",
    base_yield: 1000,
    yield_unit: "g",
    ingredients: [
      {name: "chicken", qty: 500, unit: "g"},
      {name: "carrots", qty: 200, unit: "g"}
    ],
    ...other fields
  },
  ...more recipes
]

legacyRes.data = [
  {
    dish_name: "Chicken Stew",
    presentation_json: {
      strategy: {
        method: "Brown chicken first",
        tips: "Add vegetables slowly"
      }
    },
    ...other fields
  },
  ...legacy recipes
]
```

**Step 3: Normalize & Match**
```javascript
// Create a normalization function
const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/^\d+[\s.\-_]*/, '')  // Remove leading numbers
    .replace(/[\s\-_]/g, '');       // Remove spaces/dashes

// Build legacy lookup map
const legacyMap = new Map();
legacyData.forEach(l => {
  legacyMap.set(normalize(l.dish_name), l);
});

// Example:
normalize("1. Chicken Stew") === normalize("chicken-stew")  // true
```

**Step 4: Merge & Enrich Data**
```javascript
// For each recipe from sop_recipes:
const parsed = baseData.map(row => {
  const normName = normalize(row.recipe_name);
  const legacyMatch = legacyMap.get(normName);

  // If matching legacy record exists, extract strategy
  let strategy = {};
  if (legacyMatch?.presentation_json) {
    const pjson = JSON.parse(legacyMatch.presentation_json);
    strategy = pjson.strategy || {};
  }

  // Merge into final recipe object
  return {
    ...row,  // All sop_recipes columns
    id: row.recipe_id,
    name: row.recipe_name,
    baseYield: row.base_yield,
    unit: row.yield_unit,
    ingredients: row.ingredients,  // array
    method: row.method || [strategy.method, strategy.temp, strategy.tips].filter(Boolean),
    note: strategy.note || row.note,
    bulkMethod: strategy.tips || row.bulk_method,
    dishStyle: row.dish_style,
    dishCategory: row.tier,
    // ... all enriched fields
  };
});

// Result: recipes[] state with enriched data
setRecipes(parsed);
```

**Step 5: Cache Offline**
```javascript
// Save merged data to localStorage for offline access
localStorage.setItem(
  'sop_cache_kabile',
  JSON.stringify(parsed)
);
```

---

## PART 2: EXAMPLE RECIPE DATA (COMPLETE)

### 2.1 Raw Data from Supabase

**`sop_recipes` table:**
```json
{
  "recipe_id": "recipe_001",
  "recipe_name": "Tomato Sauce Base",
  "client_id": "kabile",
  "base_yield": 500,
  "yield_unit": "g",
  "ingredients": [
    {
      "name": "tomatoes",
      "qty": 400,
      "unit": "g",
      "recipe_id": null
    },
    {
      "name": "olive oil",
      "qty": 50,
      "unit": "ml",
      "recipe_id": null
    },
    {
      "name": "garlic",
      "qty": 20,
      "unit": "g",
      "recipe_id": null
    }
  ],
  "method": [
    "Heat oil in pan",
    "Add garlic, sauté 30 seconds",
    "Add tomatoes, simmer 30 minutes"
  ],
  "bulk_method": [
    "Increase heat, stir more frequently"
  ],
  "note": "Store in fridge, good for 5 days",
  "dish_style": "sauce",
  "tier": "Tier 1 (Base)",
  "production_strategy": "batch",
  "base_portions": 10
}
```

**`consulting_sops` table (legacy):**
```json
{
  "dish_name": "Tomato Sauce Base",
  "client_id": "kabile",
  "presentation_json": {
    "strategy": {
      "method": "Brown tomatoes before simmering",
      "tips": "Use San Marzano tomatoes for best flavor",
      "temp": "Medium-high (180°C if in oven)",
      "note": "Key base ingredient for pasta dishes"
    }
  }
}
```

### 2.2 Merged Data in App State

After fetch and merge, your app has:

```javascript
recipes[0] = {
  // From sop_recipes:
  recipe_id: "recipe_001",
  recipe_name: "Tomato Sauce Base",
  base_yield: 500,
  yield_unit: "g",
  ingredients: [
    {name: "tomatoes", qty: 400, unit: "g"},
    {name: "olive oil", qty: 50, unit: "ml"},
    {name: "garlic", qty: 20, unit: "g"}
  ],

  // From legacy enrichment:
  method: [
    "Brown tomatoes before simmering",  // enriched
    "Medium-high (180°C if in oven)"     // enriched
  ],
  bulkMethod: ["Use San Marzano tomatoes for best flavor"],
  note: "Key base ingredient for pasta dishes",

  // Normalized fields:
  id: "recipe_001",
  name: "Tomato Sauce Base",
  baseYield: 500,
  unit: "g",
  dishStyle: "sauce",
  dishCategory: "Tier 1 (Base)",
  is_deleted: false,
  show_on_board: true
}
```

---

## PART 3: CALCULATION LOGIC - STEP BY STEP

### 3.1 The Calculation Chain

When a user **scales a recipe**, here's what happens:

```
User Input: Scale "Tomato Sauce Base" to 2x (1000g instead of 500g)
  ↓
[STEP 1] Calculate Scale Factor
  factor = currentYield / baseYield
  factor = 1000 / 500 = 2
  ↓
[STEP 2] Scale Each Ingredient
  tomatoes: 400 * 2 = 800g
  olive oil: 50 * 2 = 100ml
  garlic: 20 * 2 = 40g
  ↓
[STEP 3] Format for Display (formatDisplay)
  800g → {v: "800", u: "g"}
  100ml → {v: "100", u: "ml"}
  40g → {v: "40", u: "g"}
  ↓
[STEP 4] Render in UI
  800 g
  100 ml
  40 g
```

### 3.2 Complete Calculation Example

**SCENARIO: Scale "Chicken Stew" from base 500g to 1500g**

**Recipe in Database:**
```javascript
{
  recipe_id: "stew_001",
  recipe_name: "Chicken Stew",
  base_yield: 500,
  unit: "g",
  base_portions: 5,           // 100g per portion
  portions_per_batch: 20,     // batch = 20 portions
  ingredients: [
    {name: "chicken", qty: 250, unit: "g"},
    {name: "carrots", qty: 100, unit: "g"},
    {name: "potatoes", qty: 80, unit: "g"},
    {name: "onion", qty: 40, unit: "g"},
    {name: "water", qty: 200, unit: "ml"}
  ]
}

// Settings in UI:
portionSize: 100g  // grams per portion
```

**USER INTERACTION:**

1. User selects "Chicken Stew"
2. User types "1500" in scale input (currently showing 500)
3. App calculates: factor = 1500 / 500 = 3

**STEP 1: Scale Ingredients**
```javascript
scaledIngredients = [
  {name: "chicken", qty: 250 * 3 = 750, unit: "g"},
  {name: "carrots", qty: 100 * 3 = 300, unit: "g"},
  {name: "potatoes", qty: 80 * 3 = 240, unit: "g"},
  {name: "onion", qty: 40 * 3 = 120, unit: "g"},
  {name: "water", qty: 200 * 3 = 600, unit: "ml"}
]
```

**STEP 2: Calculate Portions**
```javascript
// From core/batch.js
const portionWeight = baseYield / basePortions
              = 500 / 5
              = 100g per portion

const scaledPortions = (scaledYield / baseYield) * basePortions
                    = (1500 / 500) * 5
                    = 3 * 5
                    = 15 portions

// Batches needed:
const portionsPerBatch = 20
const batchesNeeded = 15 / 20 = 0.75 batches
const standardBatchYield = (20 / 5) * 500 = 2000g (one full batch)
```

**STEP 3: Format for Display**

Using formatDisplay() from quantities.js:

```javascript
// For chicken (750g):
chefRound(750, "g") → 750
formatDisplay(750, "g", "metric") → {v: "750", u: "g"}
Display: "750 g"

// For carrots (300g):
chefRound(300, "g") → 300
formatDisplay(300, "g", "metric") → {v: "300", u: "g"}
Display: "300 g"

// For potatoes (240g):
chefRound(240, "g") → 240
formatDisplay(240, "g", "metric") → {v: "240", u: "g"}
Display: "240 g"

// For water (600ml):
chefRound(600, "ml") → 600
formatDisplay(600, "ml", "metric") → {v: "600", u: "ml"}
Display: "600 ml"
```

**FINAL UI DISPLAY:**

```
CHICKEN STEW (1500g) [3x scale]

Ingredients:
  Chicken      750 g
  Carrots      300 g
  Potatoes     240 g
  Onion        120 g
  Water        600 ml

Portions: 15 portions (5g per portion)
Batches: 0.75 (partial batch)
```

---

## PART 4: UNIT CONVERSION EXAMPLES

### 4.1 Metric System (Default)

**Input:** 2500g of flour, metric system

**Process:**
```javascript
val = 2500
unit = "g"
unitSystem = "metric"

// formatQuantity():
if (val >= 1000 && unit === "g") {
  displayVal = val / 1000  // 2500 / 1000 = 2.5
  displayUnit = "kg"
}

chefRound(2.5, "kg") → 2.5
formatQuantity(2500, "g", "metric") → {val: "2.5", unit: "kg"}
```

**Output:** `2.5 kg` ✅

---

**Input:** 800ml of stock, metric system

**Process:**
```javascript
val = 800
unit = "ml"
unitSystem = "metric"

// formatQuantity():
if (val < 1000 && unit === "ml") {
  displayVal = 800
  displayUnit = "ml"
}

chefRound(800, "ml") → 800
formatQuantity(800, "ml", "metric") → {val: "800", unit: "ml"}
```

**Output:** `800 ml` ✅

---

### 4.2 Imperial System

**Input:** 2500g of flour, imperial system

**Process:**
```javascript
val = 2500
unit = "g"
unitSystem = "imperial"

// formatQuantity():
if (unitSystem === "imperial" && unit === "g") {
  oz = 2500 * 0.035274  // g to oz conversion
     = 88.19 oz

  if (oz >= 16) {
    displayVal = 88.19 / 16  // oz to lb
                = 5.51 lb
    displayUnit = "lb"
  }
}

chefRound(5.51, "lb") → 5.5
formatQuantity(2500, "g", "imperial") → {val: "5.5", unit: "lb"}
```

**Output:** `5.5 lb` ✅

---

**Input:** 250ml of oil, imperial system

**Process:**
```javascript
val = 250
unit = "ml"
unitSystem = "imperial"

// formatQuantity():
if (unitSystem === "imperial" && unit === "ml") {
  floz = 250 * 0.033814  // ml to fl oz
       = 8.45 fl oz

  if (floz >= 8) {
    displayVal = 8.45 / 8  // fl oz to cup
                = 1.06 cups
    displayUnit = "cup"
  }
}

chefRound(1.06, "cup") → 1
formatQuantity(250, "ml", "imperial") → {val: "1", unit: "cup"}
```

**Output:** `1 cup` ✅

---

## PART 5: BOMENGINE (DEMAND CALCULATION)

### 5.1 What BOMEngine Does

BOMEngine calculates **ingredient demand** when recipes contain **sub-recipes**.

**Example Hierarchy:**
```
Pasta with Sauce Recipe (base: 500g)
  ├─ Ingredient: Pasta (base: 200g)
  └─ Ingredient: Tomato Sauce Base (recipe: recipe_001, qty: 250g)
        ├─ Tomatoes (qty: 400g)
        ├─ Olive Oil (qty: 50ml)
        └─ Garlic (qty: 20g)

When you scale "Pasta with Sauce" to 1500g (3x):
  - Pasta demand = 200 * 3 = 600g
  - Tomato Sauce needed = 250 * 3 = 750g of sauce
    - Which means:
      - Tomatoes = 400/500 of sauce * 750g = 600g
      - Olive Oil = 50/500 of sauce * 750g = 75ml
      - Garlic = 20/500 of sauce * 750g = 30g
```

### 5.2 BOMEngine Input/Output

**Input:**
```javascript
calculateBOM(
  recipes,  // All recipes array
  {
    recipe_002: 3  // Scale "Pasta with Sauce" to 3x
  },
  20  // portionsPerBatch (default 20)
)
```

**Processing (BOMEngine.js):**
```javascript
// 1. Create recipe map for O(1) lookup
recipeMap = {
  recipe_002: {Pasta with Sauce recipe},
  recipe_001: {Tomato Sauce Base recipe}
}

// 2. Explode hierarchy (recursive)
explode(recipe_002, 3):
  nodes[recipe_002].scale = 3
  nodes[recipe_002].weight = 3 * 500 = 1500g

  // For each ingredient in recipe_002:
  // If ingredient is a sub-recipe, explode it:
  explode(recipe_001, (250/500) * 3 = 1.5):
    nodes[recipe_001].scale = 1.5
    nodes[recipe_001].weight = 1.5 * 500 = 750g
    // ... and so on recursively

// 3. Calculate per-ingredient demand
demand[recipe_001] = nodes[recipe_001].weight = 750g
```

**Output:**
```javascript
{
  nodes: {
    recipe_002: {
      scale: 3,
      weight: 1500,
      portions: 60,
      unit: "g"
    },
    recipe_001: {
      scale: 1.5,
      weight: 750,
      portions: 30,
      unit: "g"
    }
  },
  demand: {
    recipe_002: 1500,  // 3x of 500g
    recipe_001: 750    // 1.5x of 500g
  },
  activeOrigins: {
    recipe_002: 3  // Only recipe_002 was manually scaled
  }
}
```

---

## PART 6: DATA FLOW DIAGRAM (Full Stack)

```
SUPABASE (Database Layer)
    ↓
[sop_recipes] ──┐
                ├→ Fetch (Promise.all)
[consulting_sops]┘
    ↓
[App.jsx: Normalize & Merge]
    ↓
recipes[] state (React)
    ↓
[User Selects Recipe]
    ↓
activeRecipe = recipes.find(r => r.id === selectedId)
    ↓
[User Scales Recipe]
    ↓
planIntent = {recipe_id: scaleFactor}  // {recipe_002: 3}
    ↓
[BOMEngine.calculateBOM(recipes, planIntent)]
    ↓
bomResult = {nodes, demand, activeOrigins}
    ↓
activeDemand = bomResult.demand  // {recipe_002: 1500, recipe_001: 750}
    ↓
[Map to Views]
    ├→ Scaler View: Show scaled ingredient quantities
    ├→ Market View: Aggregate ingredient totals
    └→ Board View: Show production targets
    ↓
[formatDisplay(scaledQty, unit)]
    ↓
{v: "750", u: "g"}  // Value + unit for rendering
    ↓
UI Render: "750 g"
```

---

## PART 7: HOW TO VALIDATE THIS IN YOUR APP

### 7.1 Add Debug Mode (Optional)

Add this to App.jsx to log the entire data flow:

```javascript
// Add to component state
const [debugMode, setDebugMode] = useState(false);

// Add debug output after each major step
useEffect(() => {
  if (debugMode && activeRecipe) {
    console.log("=== DEBUG: RECIPE DATA FLOW ===");
    console.log("Active Recipe:", activeRecipe);
    console.log("Plan Intent:", planIntent);
    console.log("BOM Result:", bomResult);
    console.log("Active Demand:", activeDemand);
    console.log("Settings:", coreSettings);
  }
}, [activeRecipe, planIntent, bomResult, activeDemand, debugMode]);
```

### 7.2 Verify in Browser Console

1. Open app → Select a recipe
2. Open DevTools (F12) → Console tab
3. Type:
```javascript
// Check if recipes loaded
console.log(window.recipes)  // May not be exposed

// Or use React DevTools to inspect App.jsx state:
// - recipes[]
// - activeRecipe
// - planIntent
// - bomResult (if exposed)
```

### 7.3 Manual Calculation Check

1. Select a recipe with known base_yield
2. Scale to 2x
3. Calculate manually:
   ```
   For each ingredient:
   scaledQty = baseQty * (scaledYield / baseYield)
   scaledQty = baseQty * (scaledYield / baseYield)
   ```
4. Compare with UI display

### 7.4 Test Case: Tomato Sauce

**Recipe:**
```
Name: Tomato Sauce Base
Base Yield: 500g
Ingredients:
  - Tomatoes: 400g
  - Olive Oil: 50ml
  - Garlic: 20g
```

**Test 1: Scale to 1000g (2x)**
```
Expected:
  - Tomatoes: 400 * 2 = 800g ✓
  - Olive Oil: 50 * 2 = 100ml ✓
  - Garlic: 20 * 2 = 40g ✓

Check UI displays: "800 g", "100 ml", "40 g"
```

**Test 2: Scale to 250g (0.5x)**
```
Expected:
  - Tomatoes: 400 * 0.5 = 200g ✓
  - Olive Oil: 50 * 0.5 = 25ml ✓
  - Garlic: 20 * 0.5 = 10g ✓

Check UI displays: "200 g", "25 ml", "10 g"
```

**Test 3: Scale to 2500g (5x)**
```
Expected:
  - Tomatoes: 400 * 5 = 2000g → Display as 2 kg ✓
  - Olive Oil: 50 * 5 = 250ml ✓
  - Garlic: 20 * 5 = 100g ✓

Check UI displays: "2 kg", "250 ml", "100 g"
```

---

## PART 8: COMMON ISSUES & HOW TO SPOT THEM

### Issue 1: Recipe Data Not Loading
**Symptom:** Blank recipe list, no recipes appear
**Root Cause:** Supabase fetch failed, or client_id mismatch
**Check:**
```javascript
1. Go to Supabase dashboard
2. Check sop_recipes table has rows with client_id = 'kabile'
3. Check network tab in DevTools for fetch errors
```

---

### Issue 2: Quantities Don't Scale
**Symptom:** Scale input changes, but ingredient quantities stay same
**Root Cause:** BOMEngine not calculating, or calculation not updating UI
**Check:**
```javascript
1. Check planIntent state updates when scale input changes
2. Check bomResult recalculates
3. Check formatDisplay is called for each ingredient
```

---

### Issue 3: Units Displaying Incorrectly
**Symptom:** "2500 g" instead of "2.5 kg"
**Root Cause:** formatDisplay not converting units
**Check:**
```javascript
1. Check formatQuantity logic (lines 18-71 of quantities.js)
2. Check threshold: val >= 1000 for g→kg conversion
3. Verify chefRound is not introducing decimals
```

---

### Issue 4: Imperial Conversion Wrong
**Symptom:** 500g shows as "15 oz" instead of "1.1 lb"
**Root Cause:** Unit conversion formula off, or wrong threshold
**Check:**
```javascript
1. Check unitSystem setting is "imperial"
2. Verify conversion math: 500 * 0.035274 = 17.637 oz
3. Check threshold: oz >= 16 for oz→lb conversion
```

---

## SUMMARY

Your app's calculation logic is **correct in principle**:

✅ **Data Flow:** Supabase → Normalize → Cache → Merge → recipes[] state
✅ **Scaling:** factor = scaledYield / baseYield, multiply all ingredients
✅ **Formatting:** formatDisplay handles metric/imperial + unit conversion + rounding
✅ **BOMEngine:** Recursive hierarchy calculation for sub-recipes

**To verify everything works:**

1. Load app with a known recipe
2. Check browser console for fetch success
3. Select recipe, check activeRecipe contains correct data
4. Scale recipe to 2x, 0.5x, and verify numbers match manual calculation
5. Check formatDisplay output matches UI display
6. Verify BOMEngine output if using sub-recipes

---

**Questions to validate your data:**

- [ ] Are recipes loading from Supabase?
- [ ] Are ingredients displaying correctly?
- [ ] Does scaling multiply quantities correctly?
- [ ] Are units converting properly (g→kg, ml→L)?
- [ ] Do sub-recipes calculate correctly (BOMEngine)?

Ready to test? Pick one of these test cases above and let me know the results!
