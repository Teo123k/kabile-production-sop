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
 * @returns {number} The weight in grams/ml
 */
export function getPortionWeight(recipe, settings) {
    const { mainPortionSize, sidePortionSize, starterPortionSize } = settings;
    if (!recipe) return mainPortionSize;

    // 1. Explicit Override
    if (recipe.portionSize) return parseFloat(recipe.portionSize);

    const style = (recipe.dishStyle || recipe.style || '').toLowerCase();
    const cat = (recipe.dishCategory || '').toLowerCase();
    const name = (recipe.name || '').toLowerCase();

    if (['sauce', 'glaze', 'marinade', 'coating', 'paste', 'dip'].includes(style) ||
        ['condiment', 'sauce', 'topping'].includes(cat) || name.includes('sauce')) {
        return 40;
    }

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
        return 1000;
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
export function getPortionSize(recipe, settings) {
    if (!recipe) return settings.mainPortionSize;
    const unit = (recipe.unit || '').toLowerCase();
    if (unit.includes('portion')) return 1;
    return getPortionWeight(recipe, settings);
}
