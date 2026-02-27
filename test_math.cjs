// Test script to verify the math logic of App.jsx
const fs = require('fs');

const MASTER_RECIPES = [
    {
        id: 'magic-soy',
        name: '1. Magic Soy (Master Base)',
        baseYield: 11,
        unit: 'L',
        ingredients: [
            { category: 'liquid', name: 'Dark Soy Sauce', qty: 4, unit: 'L', sku: 'SOY-DRK-4L' },
            { category: 'liquid', name: 'Filtered Water', qty: 5, unit: 'L', sku: 'WTR-FLT' },
            { category: 'liquid', name: 'Mirin', qty: 2, unit: 'L', sku: 'MIR-JPN-2L' },
            { category: 'aromatic', name: 'Garlic Puree', qty: 500, unit: 'g', sku: 'GAR-PUR-FR' },
            { category: 'aromatic', name: 'Ginger Puree', qty: 50, unit: 'g', sku: 'GIN-PUR-FR' },
            { category: 'aromatic', name: 'Onion Puree', qty: 500, unit: 'g', sku: 'ONN-PUR-FR' },
            { category: 'aromatic', name: 'Pineapple Puree', qty: 1, unit: 'kg', sku: 'PNP-PUR-1K' },
            { category: 'spice', name: 'White Sugar', qty: 200, unit: 'g', sku: 'SGR-WHT-KG' },
        ],
    },
    {
        id: 'bulgogi',
        name: '2. Bulgogi Marinade',
        baseYield: 2,
        unit: 'kg Beef',
        ingredients: [
            { cat: 'MEAT', name: 'Raw Beef (Sliced)', qty: 2, unit: 'kg', sku: 'MT-BEEF-SLI' },
            { cat: 'BASE', name: 'Magic Soy', qty: 300, unit: 'g', sku: 'INT-MAG-SOY' },
            { cat: 'BASE', name: 'Light Soy Sauce', qty: 120, unit: 'g', sku: 'SOY-LGT-KG' },
        ],
    },
    {
        id: 'bbq-sauce',
        name: '10. BBQ (KFC Glaze)',
        baseYield: 1,
        unit: 'Batch',
        ingredients: [
            { cat: 'BASE', name: 'Magic Soy', qty: 1, unit: 'L', sku: 'INT-MAG-SOY' },
            { cat: 'BASE', name: 'Ketchup', qty: 600, unit: 'ml', sku: 'KTC-SCE-L' },
            { cat: 'DRY', name: 'Sugar', qty: 300, unit: 'g', sku: 'SGR-WHT-KG' },
        ],
    },
    {
        id: 'thai-spicy',
        name: '11. Thai Spicy (KFC Glaze)',
        baseYield: 1,
        unit: 'Batch',
        ingredients: [
            { cat: 'BASE', name: 'BBQ Base', qty: 2, unit: 'L', sku: 'INT-BBQ-SCE' },
            { cat: 'WET', name: 'Sriracha', qty: 500, unit: 'ml', sku: 'SRI-SCE-L' },
            { cat: 'WET', name: 'Lime Juice', qty: 3, unit: 'pcs', sku: 'PRD-LME-FR' },
        ],
    }
];

const chefRound = (val, unit = '') => {
    if (val <= 0) return 0;
    const u = unit.toLowerCase();

    // 1. Bulk Units (kg, L, Liters) need decimal precision preserved
    if (u === 'kg' || u === 'l' || u === 'liter' || u === 'liters') {
        if (val < 1) return Number(Math.round(val * 100) / 100); // 0.11 kg
        if (val < 10) return Number(Math.round(val * 10) / 10); // 1.5 kg
        return Math.round(val * 2) / 2; // 10.5 kg
    }

    // 2. Small Units (g, ml) use the 0/5 rule
    if (val < 5) return Number(Math.round(val * 10) / 10); // 1.5 g
    if (val < 10) return Math.round(val); // 8 g
    return Math.round(val / 5) * 5; // 105 g
};

const SKU_TO_RECIPE_MAP = {
    'INT-MAG-SOY': 'magic-soy',
    'INT-BBQ-SCE': 'bbq-sauce'
};

const testScaling = (targetRecipeId, requestedYield) => {
    const totals = {};

    const processRecipe = (recipeId, yieldReq) => {
        const recipe = MASTER_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return;

        recipe.ingredients.forEach(ing => {
            // Handle mixed unit conversions (e.g. 1L Magic Soy vs 11L baseYield)
            // If sku is INT-MAG-SOY, its base yield is 11L. 
            // We know Magic soy is requested in 'L' when it's 1L, but in 'g' when it's 300g.
            // The base calculation is (qtyRequestedInRecipe / recipeBaseYield) * yieldReq
            // Wait, if Magic Soy is 300g (0.3L approx, assuming 1:1 density for this app's logic), 
            // we might have a unit mismatch bug.

            let normalizedQty = ing.qty;
            const subRecipeId = SKU_TO_RECIPE_MAP[ing.sku];

            if (subRecipeId) {
                const subRecipe = MASTER_RECIPES.find(r => r.id === subRecipeId);
                if (subRecipe) {
                    const subUnit = subRecipe.unit?.toLowerCase() || '';
                    const reqUnit = ing.unit?.toLowerCase() || '';
                    if ((subUnit.includes('l') || subUnit.includes('kg')) && (reqUnit === 'g' || reqUnit === 'ml')) {
                        normalizedQty = normalizedQty / 1000;
                    }
                }
            }

            const scaledQty = (normalizedQty / recipe.baseYield) * yieldReq;

            if (subRecipeId) {
                processRecipe(subRecipeId, scaledQty);
            } else {
                const sku = ing.sku || `${ing.name}`;
                if (!totals[sku]) {
                    totals[sku] = { name: ing.name, qty: 0, unit: ing.unit };
                }
                totals[sku].qty += scaledQty;
            }
        });
    };

    processRecipe(targetRecipeId, requestedYield);

    console.log(`\n--- Test: ${targetRecipeId} | Target: ${requestedYield} ---`);
    Object.values(totals).forEach(item => {
        const rounded = chefRound(item.qty);
        console.log(`- ${item.name}: ${item.qty.toFixed(3)} -> Rounded: ${rounded} ${item.unit}`);
    });
}

testScaling('bulgogi', 2); // Base yield
testScaling('thai-spicy', 1); // Triggers nested recursion: Thai -> BBQ -> Magic Soy
