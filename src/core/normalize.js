/**
 * Centralized Unit Normalization Contract (Phase 2)
 * Ensures consistent conversion of diverse units to a common base (grams/ml).
 */

import { isSauceLikeRecipe, getRecipeCategory } from './batch.js';

/**
 * Converts a quantity and unit to absolute grams/ml.
 */
export function toGrams(qty, unit) {
  const q = parseFloat(qty) || 0;
  if (q === 0) return 0;
  
  const u = (unit || '').toLowerCase().trim();
  
  // Bulk Mass/Volume
  if (/^(kg|l|liter|litre|kilogram)s?$/.test(u)) return q * 1000;
  
  // Standard Small Units
  if (/^(g|ml|gram|mls)s?$/.test(u)) return q;
  
  // Heuristic: If "kg" is inside the unit string (e.g. "kg Beef")
  if (u.includes('kg') || u.includes('kilogram')) return q * 1000;
  if (u.includes(' l ') || u.startsWith('l ') || u.endsWith(' l')) return q * 1000;

  return q; // Default to 1:1 for unknown units (portion, pcs, etc.)
}

/**
 * Calculates the total physical weight of a recipe list (sum of parts).
 */
export function sumIngredientsGrams(recipe, edibleOnly = false) {
  if (!recipe || !recipe.ingredients) return 0;
  
  const isProcessIngredient = (ing, r) => {
    if (ing.is_process || ing.isProcessIngredient) return true;
    const name = (ing.name || '').toLowerCase();
    const style = (r.dishStyle || r.style || '').toLowerCase();
    if (style === 'fried' && name.includes('oil') && !name.includes('sesame') && !name.includes('chili')) return true;
    return false;
  };

  return recipe.ingredients.reduce((acc, ing) => {
    if (edibleOnly && isProcessIngredient(ing, recipe)) return acc;
    return acc + toGrams(ing.qty, ing.unit);
  }, 0);
}

/**
 * Gets the source-truth baseline yield of a recipe in grams.
 */
export function getRecipeBaselineGrams(recipe, edibleOnly = false, settings = {}) {
  if (!recipe) return 1;
  
  const unit = (recipe.unit || '').toLowerCase();
  const bYield = parseFloat(recipe.baseYield) || 1;
  const isBulk = /^(kg|l|liter|litre|kilogram)s?$/.test(unit);
  const isDirectMetric = /^(g|ml|gram|grams|milliliter|millilitre|milliliters|millilitres)s?$/.test(unit);
  const isPortionBased = /^(portion|portions|pcs|pax|each)s?$/.test(unit);

  // 1. If explicit physical yield exists, use it as authoritative source truth.
  if (isBulk) return bYield * 1000;
  if (isDirectMetric) return bYield;
  
  // 2. Physical Weight Fallback
  const naturalSum = sumIngredientsGrams(recipe, edibleOnly);
  if (naturalSum > 0) return naturalSum;

  // 3. Safety Circuit Breaker: If unit is portion-based but has no ingredients,
  // we must prevent baseline=1 (which causes 250x scale factor explosions).
  // We use category-aware fallbacks to ensure consistency with portion settings.
  if (isPortionBased && bYield > 0 && !isSauceLikeRecipe(recipe)) {
    const category = getRecipeCategory(recipe);
    const fallbacks = {
      main: (settings?.mainPortionSize) || 250,
      side: (settings?.sidePortionSize) || 80,
      starter: (settings?.starterPortionSize) || 150
    };
    return bYield * (fallbacks[category] || fallbacks.main);
  }

  // 4. Last Fallback: baseYield (treated as grams)
  return Math.max(1, bYield);
}
