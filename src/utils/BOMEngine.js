import {
    getCanonicalPortionCount,
    toGrams,
    getRecipeBaselineGrams,
    resolveRecipeId
} from '../core/index.js';

/**
 * BOM Engine - Pure Mathematical Logic
 * Calculates scale factors and demand across a recipe cascade.
 * 
 * @param {Array} recipes - All recipe objects
 * @param {Object} scales - Initial scale factors { [id]: scale }
 * @param {Object} settings - Portion settings contract
 * @returns {Object} { nodes, demand, activeOrigins }
 */
export const calculateBOM = (recipes, scales = {}, portionsPerBatch = 6, settings = {}) => {
    try {
        if (!recipes || !Array.isArray(recipes)) return { nodes: {}, demand: {}, activeOrigins: {} };

        const recipeMap = new Map();
        recipes.forEach(r => {
            if (!r.id) {
                console.warn('[BOM] Recipe missing id:', r.name || 'unknown');
                return;
            }
            if (!r.baseYield || parseFloat(r.baseYield) <= 0) {
                console.warn(`[BOM] Recipe "${r.id}" has invalid baseYield: ${r.baseYield}`);
            }
            if (!r.ingredients || !Array.isArray(r.ingredients)) {
                console.warn(`[BOM] Recipe "${r.id}" has no ingredients array`);
            }
            recipeMap.set(r.id, r);
        });

        const nodes = {}; // { [id]: { scale, derivedScale, manualScale, weight, portions, unit } }
        const safeScales = scales || {};
        const effectiveSettings = {
            mainPortionSize: settings.mainPortionSize || 250,
            sidePortionSize: settings.sidePortionSize || 80,
            starterPortionSize: settings.starterPortionSize || 150,
            portionsPerBatch: settings.portionsPerBatch || portionsPerBatch
        };
        const isPortionLikeUnit = (unit) => /^(portion|portions|pcs|pax|each)s?$/i.test((unit || '').trim());

        const explode = (recipeId, incomingScale, seen = new Set(), depth = 0) => {
            if (depth > 12 || seen.has(recipeId) || incomingScale < 0) return;
            seen.add(recipeId);

            const recipe = recipeMap.get(recipeId);
            if (!recipe) return;

            // Initialize node if missing
            if (!nodes[recipeId]) {
                nodes[recipeId] = {
                    scale: 0,
                    derivedScale: 0,
                    manualScale: 0,
                    demandWeight: 0,
                    effectiveDemandWeight: 0,
                    shortageWeight: 0,
                    weight: 0,
                    edibleWeight: 0,
                    portions: 0,
                    unit: recipe.unit
                };
            }

            const oldTotal = Math.max(nodes[recipeId].manualScale, nodes[recipeId].derivedScale);

            // Apply manual scale at the entry point of the recursion
            if (depth === 0) {
                nodes[recipeId].manualScale = parseFloat(safeScales[recipeId]) || 0;
            }

            nodes[recipeId].derivedScale += incomingScale;
            const newTotal = Math.max(nodes[recipeId].manualScale, nodes[recipeId].derivedScale);

            const delta = newTotal - oldTotal;
            nodes[recipeId].scale = newTotal;

            const isProcessIngredient = (ing, r) => {
                if (ing.is_process || ing.isProcessIngredient) return true;
                const name = (ing.name || '').toLowerCase();
                const style = (r.dishStyle || r.style || '').toLowerCase();
                if (style === 'fried' && name.includes('oil') && !name.includes('sesame') && !name.includes('chili')) return true;
                return false;
            };

            const baselineGrams = getRecipeBaselineGrams(recipe, false, effectiveSettings);
            const edibleBaselineGrams = (recipe.ingredients || []).reduce((acc, ing) => {
                if (isProcessIngredient(ing, recipe)) return acc;
                return acc + toGrams(ing.qty, ing.unit);
            }, 0) || baselineGrams;

            nodes[recipeId].weight = nodes[recipeId].scale * baselineGrams;
            nodes[recipeId].edibleWeight = nodes[recipeId].scale * edibleBaselineGrams;
            
            const canonicalPortionCount = getCanonicalPortionCount(recipe, effectiveSettings, recipes);
            nodes[recipeId].portions = nodes[recipeId].scale * canonicalPortionCount;

            if (delta <= 0) return;

            if (recipe.ingredients) {
                recipe.ingredients.forEach(ing => {
                    const childId = resolveRecipeId(ing, recipes);
                    if (childId) {
                        // PHASE 2B: HARD CIRCUIT BREAKER
                        // Recursive propagation for scale is strictly disabled.
                        return;
                    }
                });
            }
        };

        // Demand-only recursion: tracks required child output without mutating child manual scale.
        const accumulateDemand = (recipeId, parentDemandWeight, seen = new Set(), depth = 0) => {
            if (depth > 12 || seen.has(recipeId) || parentDemandWeight <= 0) return;
            seen.add(recipeId);

            const recipe = recipeMap.get(recipeId);
            if (!recipe || !Array.isArray(recipe.ingredients)) return;

            const parentBaseline = getRecipeBaselineGrams(recipe, false, effectiveSettings);
            if (parentBaseline <= 0) return;

            recipe.ingredients.forEach(ing => {
                const childId = resolveRecipeId(ing, recipes);
                if (!childId || childId === recipeId) return;

                const childRecipe = recipeMap.get(childId);
                if (!childRecipe) return;

                const childBaselineGrams = getRecipeBaselineGrams(childRecipe, false, effectiveSettings);
                const childPortionCount = getCanonicalPortionCount(childRecipe, effectiveSettings, recipes);
                const childGramsPerPortion = childPortionCount > 0 ? (childBaselineGrams / childPortionCount) : 0;

                const ingredientGrams = isPortionLikeUnit(ing.unit)
                    ? (parseFloat(ing.qty) || 0) * childGramsPerPortion
                    : toGrams(ing.qty, ing.unit);
                if (ingredientGrams <= 0) return;

                const requiredChildWeight = (ingredientGrams / parentBaseline) * parentDemandWeight;
                if (requiredChildWeight <= 0) return;

                if (!nodes[childId]) {
                    nodes[childId] = {
                        scale: 0,
                        derivedScale: 0,
                        manualScale: 0,
                        demandWeight: 0,
                        effectiveDemandWeight: 0,
                        shortageWeight: 0,
                        weight: 0,
                        edibleWeight: 0,
                        portions: 0,
                        unit: childRecipe.unit
                    };
                }

                nodes[childId].demandWeight += requiredChildWeight;
                accumulateDemand(childId, requiredChildWeight, new Set(seen), depth + 1);
            });
        };

        // 1. Establish baselines from ALL provided scales
        Object.keys(safeScales).forEach(id => {
            explode(id, 0);
        });

        // 2. Demand pass across sub-recipe links (no scale mutation)
        Object.keys(safeScales).forEach(id => {
            const rootNode = nodes[id];
            if (!rootNode || rootNode.weight <= 0) return;
            accumulateDemand(id, rootNode.weight, new Set(), 0);
        });

        // 3. Final cleanup and normalization
        Object.keys(nodes).forEach(id => {
            const node = nodes[id];
            node.effectiveDemandWeight = Math.max(node.weight, node.demandWeight);
            node.shortageWeight = Math.max(0, node.demandWeight - node.weight);
            node.scale = Number(node.scale.toFixed(4));
            node.weight = Number(node.weight.toFixed(2));
            node.demandWeight = Number(node.demandWeight.toFixed(2));
            node.effectiveDemandWeight = Number(node.effectiveDemandWeight.toFixed(2));
            node.shortageWeight = Number(node.shortageWeight.toFixed(2));
            node.edibleWeight = Number(node.edibleWeight.toFixed(2));
            node.portions = Number(node.portions.toFixed(2));
        });

        return {
            nodes,
            demand: Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, n.effectiveDemandWeight])),
            activeOrigins: Object.fromEntries(
                Object.entries(safeScales)
                    .filter(([_, v]) => parseFloat(v) > 0)
                    .map(([id, v]) => [id, parseFloat(v)])
            )
        };
    } catch (e) {
        console.error("BOM Fail:", e);
        return { nodes: {}, demand: {}, activeOrigins: {} };
    }
};
