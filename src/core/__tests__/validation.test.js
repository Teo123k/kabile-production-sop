
import { calculateBOM } from '../../utils/BOMEngine.js';
import { formatQuantity } from '../quantities.js';
import { chefRound } from '../units.js';
import { getPortionWeight, getStandardBatchYield, getCanonicalBatchYield } from '../batch.js';
import { getRecipeBaselineGrams } from '../normalize.js';
import { resolveRecipeId } from '../sku.js';

const colors = {
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    reset: '\x1b[0m',
    warn: '\x1b[33m'
};

function assert(condition, message) {
    if (condition) {
        console.log(`${colors.pass}✅ PASS: ${message}${colors.reset}`);
        return true;
    } else {
        console.error(`${colors.fail}❌ FAIL: ${message}${colors.reset}`);
        return false;
    }
}

console.log('--- STARTING BOMENGINE VALIDATION SUITE ---');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    console.log(`\nRunning Test ${totalTests}: ${name}`);
    try {
        if (fn()) passedTests++;
    } catch (e) {
        console.error(`${colors.fail}💥 CRASH: ${e.message}${colors.reset}`);
    }
}

// Test 1: Simple scaling
runTest('Simple scaling (1 ingredient, 2x)', () => {
    const recipes = [{
        id: 'chicken-stew',
        name: 'Chicken Stew',
        baseYield: 500,
        ingredients: [{ name: 'chicken', qty: 250, unit: 'g' }]
    }];
    const scales = { 'chicken-stew': 2 }; // factor = 2
    const res = calculateBOM(recipes, scales);
    return assert(res.demand['chicken-stew'] === 1000 && res.nodes['chicken-stew'].weight === 1000,
        'Correctly scaled base yield and node weight');
});

// Test 2: Unit conversion (metric)
runTest('Unit conversion (metric g -> kg)', () => {
    const res = formatQuantity(2500, 'g', 'metric');
    return assert(res.val === "2.5" && res.unit === "kg", 'Formatted 2500g to 2.5kg');
});

// Test 3: Unit conversion (imperial)
runTest('Unit conversion (imperial g -> lb)', () => {
    // 500g * 0.035274 = 17.637 oz
    // 17.637 / 16 = 1.102 lb
    const res = formatQuantity(500, 'g', 'imperial');
    return assert(res.val === "1.1" && res.unit === "lb", `Formatted 500g to 1.1lb (got ${res.val}${res.unit})`);
});

// Test 4: ChefRound (small units)
runTest('ChefRound (small units 0/5 rule)', () => {
    const res = chefRound(39, 'g');
    return assert(res === 40, 'Rounded 39g to 40g (0/5 rule)');
});

// Test 5: ChefRound (bulk units)
runTest('ChefRound (bulk units 0.1 step)', () => {
    const res = chefRound(2.34, 'kg');
    return assert(res === 2.3, 'Rounded 2.34kg to 2.3kg');
});

// Test 6: BOMEngine sub-recipe
runTest('BOMEngine sub-recipe propagation', () => {
    const recipes = [
        {
            id: 'sauce-a',
            name: 'Sauce A',
            baseYield: 1000,
            ingredients: [{ name: 'Stock B', qty: 500, unit: 'ml', sku: 'SKU-STOCK-B' }]
        },
        {
            id: 'stock-b',
            name: 'Stock B',
            sku: 'SKU-STOCK-B',
            baseYield: 500,
            ingredients: [{ name: 'Water', qty: 500, unit: 'ml' }]
        }
    ];
    const scales = { 'sauce-a': 2 };
    const res = calculateBOM(recipes, scales);

    if (!res.nodes['stock-b']) {
        return assert(false, 'Node "stock-b" missing from results');
    }

    return assert(res.nodes['stock-b'].scale === 2,
        `Sub-recipe correctly calculated scale cascade (got ${res.nodes['stock-b'].scale})`);
});

// Test 7: Edge case — zero quantity
runTest('Edge case — zero quantity', () => {
    const res = chefRound(0, 'g');
    return assert(res === 0, 'Zero returns zero');
});

// Test 8: Edge case — very large number
runTest('Edge case — very large number (auto-scale)', () => {
    const res = formatQuantity(50000, 'g', 'metric');
    return assert(res.val === "50" && res.unit === "kg", '50000g scales to 50kg');
});

// Test 9: Non-standard unit
runTest('Non-standard unit (passthrough + warning)', () => {
    console.log(`${colors.warn}Note: Expecting console warning below${colors.reset}`);
    const res = formatQuantity(100, 'gm', 'metric');
    return assert(res.val === "100" && res.unit === "gm", 'Non-standard "gm" passed through');
});

// Test 10: Settings portion sizing
runTest('Settings portion sizing (heuristics)', () => {
    const settings = { mainPortionSize: 300, sidePortionSize: 150, starterPortionSize: 100 };
    const res = getPortionWeight({ name: 'Side Salad', dishCategory: 'side' }, settings);
    return assert(res === 150, 'Heuristic mapping for "side" used sidePortionSize');
});

// Test 11: Yield Normalization Equivalence (Sauce with bulk units)
runTest('Yield Normalization Equivalence (Sauce kg -> g)', () => {
    const sauce = {
        id: 'magic-soy',
        name: 'Magic Soy Sauce',
        baseYield: 1.5,
        unit: 'kg',
        ingredients: [
            { name: 'Soy', qty: 1000, unit: 'ml' },
            { name: 'Sugar', qty: 500, unit: 'g' }
        ]
    };
    const settings = { portionsPerBatch: 6 };
    const standard = getStandardBatchYield(sauce, settings);
    const canonical = getCanonicalBatchYield(sauce);
    
    // Both should return 1500 (1.5kg * 1000)
    return assert(standard === 1500 && standard === canonical, 
        `Standard (${standard}) and Canonical (${canonical}) yields aligned at 1500g`);
});

runTest('Production batch uses source portion mass for portion-based mains', () => {
    const recipe = {
        id: 'katsu-curry',
        name: 'Katsu Curry',
        baseYield: 1,
        unit: 'Portion',
        dishStyle: 'fried',
        ingredients: [
            { name: 'Chicken Breast', qty: 220, unit: 'g' },
            { name: 'Panko', qty: 40, unit: 'g' },
            { name: 'Flour', qty: 30, unit: 'g' },
            { name: 'Egg', qty: 1, unit: 'pcs' },
            { name: 'Milk', qty: 50, unit: 'ml' },
            { name: 'Salt', qty: 2, unit: 'g' },
            { name: 'Black pepper', qty: 1, unit: 'g' },
            { name: 'Curry Roux', qty: 70, unit: 'g' },
            { name: 'Curry Vege Base', qty: 100, unit: 'g' },
            { name: 'Stock', qty: 280, unit: 'ml' },
            { name: 'Finish Butter', qty: 1, unit: 'g' },
            { name: 'Udon Base', qty: 1, unit: 'Portion' }
        ]
    };
    const settings = { portionsPerBatch: 50, mainPortionSize: 250 };
    const standard = getStandardBatchYield(recipe, settings);
    return assert(standard === 39800, `Katsu batch yield should be 39800g for 50 source portions (got ${standard})`);
});

runTest('Explicit ml yield remains baseline truth for prep sauces', () => {
    const recipe = {
        id: 'magic-soy',
        name: 'Magic Soy',
        baseYield: 11000,
        unit: 'ml',
        dishStyle: 'prep',
        ingredients: [
            { name: 'Light Soy', qty: 4000, unit: 'ml' },
            { name: 'Water', qty: 5000, unit: 'ml' },
            { name: 'Mirin', qty: 2000, unit: 'ml' },
            { name: 'Garlic puree', qty: 500, unit: 'g' },
            { name: 'Ginger puree', qty: 50, unit: 'g' },
            { name: 'Onion puree', qty: 500, unit: 'g' },
            { name: 'Pineapple puree', qty: 1000, unit: 'g' },
            { name: 'Sugar', qty: 200, unit: 'g' }
        ]
    };
    const baseline = getRecipeBaselineGrams(recipe, false, {});
    const standard = getStandardBatchYield(recipe, { portionsPerBatch: 50 });
    const canonical = getCanonicalBatchYield(recipe);
    return assert(
        baseline === 11000 && standard === 11000 && canonical === 11000,
        `Magic Soy baseline (${baseline}), standard (${standard}), and canonical (${canonical}) should all align at 11000ml`
    );
});

console.log('\n--- VALIDATION SUMMARY ---');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);

if (passedTests === totalTests) {
    console.log(`${colors.pass}✨ ALL TESTS PASSED${colors.reset}`);
    process.exit(0);
} else {
    console.error(`${colors.fail}❌ SOME TESTS FAILED${colors.reset}`);
    process.exit(1);
}
