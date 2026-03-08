import { resolveRecipeId } from './sku';

/**
 * @typedef {Object} BatchSettings
 * @property {number} mainPortionSize
 * @property {number} sidePortionSize
 * @property {number} starterPortionSize
 * @property {number} portionsPerBatch
 */

/**
 * Calculates the multiplier for scaling quantities.
 * @param {number} targetValue 
 * @param {number} baseYield 
 * @returns {number}
 */
export function getMultiplier(targetValue, baseYield) {
    if (!baseYield || baseYield <= 0) return 0;
    return targetValue / baseYield;
}

/**
 * Intelligent weight calculation based on recipe metadata and global settings.
 * 
 * @param {Object} recipe 
 * @param {BatchSettings} settings 
 * @param {Array<Object>} allRecipes
 * @returns {number} The weight in grams/ml
 */
export function getPortionWeight(recipe, settings, allRecipes = []) {
    const { mainPortionSize, sidePortionSize, starterPortionSize } = settings;
    if (!recipe) return mainPortionSize;

    // 1. Explicit Override
    if (recipe.portionSize) return parseFloat(recipe.portionSize);

    const style = (recipe.dishStyle || recipe.style || '').toLowerCase();
    const cat = (recipe.dishCategory || '').toLowerCase();
    const name = (recipe.name || '').toLowerCase();
    const sku = recipe.id;

    // 2. Usage Checking: If this is a prep/sauce, look for it in other recipes
    const isComponent = ['sauce', 'glaze', 'marinade', 'coating', 'paste', 'dip', 'prep', 'base', 'stock'].includes(style) ||
        ['condiment', 'sauce', 'topping', 'base', 'stock'].includes(cat) ||
        name.includes('sauce') || name.includes('marinade') || name.includes('roux');

    if (isComponent && allRecipes.length > 0) {
        // Find the FIRST recipe that uses this item as an ingredient
        for (const r of allRecipes) {
            if (!r.ingredients) continue;
            // Use the professional resolver to see if this ingredient matches our recipe
            const usage = r.ingredients.find(ing => {
                const resolvedId = resolveRecipeId(ing, allRecipes);
                return resolvedId === sku;
            });
            if (usage && usage.qty > 0) {
                const parentBase = parseFloat(r.baseYield) || 1;
                // Use the usage per portion of the parent
                return (parseFloat(usage.qty) / parentBase) * getPortionWeight(r, settings, []);
            }
        }
    }

    // 3. Heuristic Defaults
    if (['side', 'snack', 'vegetable_dish', 'pickle'].includes(cat) ||
        ['side', 'steamed', 'raw', 'pickle'].includes(style) ||
        name.includes('kimchi') || name.includes('pickle')) {
        return sidePortionSize;
    }

    if (['appetizer', 'starter', 'salad'].includes(cat) ||
        ['appetizer', 'starter', 'salad'].includes(style) ||
        name.includes('salad') || name.includes('appetizer')) {
        return starterPortionSize;
    }

    if (style === 'prep' || cat === 'base' || cat === 'stock') {
        return 1000; // Default to 1kg if no usage found
    }

    return mainPortionSize;
}

/**
 * Determines whether to use 1 (for portion-based units) or portion weight.
 * 
 * @param {Object} recipe 
 * @param {BatchSettings} settings 
 * @returns {number}
 */
export function getPortionSize(recipe, settings, allRecipes = []) {
    if (!recipe) return settings.mainPortionSize;
    const unit = (recipe.unit || '').toLowerCase();
    const weight = getPortionWeight(recipe, settings, allRecipes);

    if (unit.includes('portion')) return 1;

    // Normalize: if the recipe's unit is kg/L, the portion size must be in kg/L
    const isBulkMetric = /^(kg|l|liter|litre)s?$/.test(unit) || unit === 'kilogram' || unit === 'kilograms';
    if (isBulkMetric) {
        return weight / 1000;
    }

    return weight;
}

/**
 * Determines the standard production quantity for a recipe based on its type and settings.
 * 
 * @param {Object} recipe 
 * @param {BatchSettings} settings 
 * @param {Array<Object>} allRecipes
 * @returns {number} The yield in the recipe's base unit (kg, L, portions, etc.)
 */
export function getStandardBatchYield(recipe, settings, allRecipes = []) {
    if (!recipe) return 0;
    const style = (recipe.dishStyle || recipe.style || '').toLowerCase();
    const cat = (recipe.dishCategory || '').toLowerCase();
    const name = (recipe.name || '').toLowerCase();

    // 1. Prep items and Fixed Batch items use their defined batch size
    const isPrep = ['prep', 'base', 'stock', 'sauce', 'glaze', 'marinade'].includes(style) ||
        ['base', 'stock', 'sauce', 'condiment'].includes(cat) ||
        name.includes('base') || name.includes('sauce') || name.includes('marinade') || name.includes('master');

    if (isPrep || recipe.production_strategy === 'fixed_batch' || recipe.production_strategy === 'foundational') {
        return parseFloat(recipe.production_batch_size) || parseFloat(recipe.baseYield) || 1;
    }

    // 2. Main/Side dishes use portionsPerBatch * portionSize
    return settings.portionsPerBatch * getPortionSize(recipe, settings, allRecipes);
}
