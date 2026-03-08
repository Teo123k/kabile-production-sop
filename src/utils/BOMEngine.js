import { resolveRecipeId } from '../core/sku';

/**
 * BOM Engine - Pure Mathematical Logic
 * Calculates scale factors and demand across a recipe cascade.
 * 
 * @param {Array} recipes - All recipe objects
 * @param {Object} scales - Initial scale factors { [id]: scale }
 * @returns {Object} { nodes, demand, activeOrigins }
 */
export const calculateBOM = (recipes, scales = {}, portionsPerBatch = 6) => {
    try {
        if (!recipes || !Array.isArray(recipes)) return { nodes: {}, demand: {}, activeOrigins: {} };

        const recipeMap = new Map();
        recipes.forEach(r => recipeMap.set(r.id, r));

        const nodes = {}; // { [id]: { scale, derivedScale, manualScale, weight, portions, unit } }
        const safeScales = scales || {};

        const explode = (recipeId, incomingScale, seen = new Set(), depth = 0) => {
            if (depth > 12 || seen.has(recipeId) || incomingScale < 0) return;
            seen.add(recipeId);

            const recipe = recipeMap.get(recipeId);
            if (!recipe) return;

            // Initialize node if missing
            if (!nodes[recipeId]) {
                const manualScale = parseFloat(safeScales[recipeId]) || 0;
                nodes[recipeId] = {
                    scale: 0,
                    derivedScale: 0,
                    manualScale,
                    weight: 0,
                    portions: 0,
                    unit: recipe.unit
                };
            }

            // Delta-Max Logic: Use Max(Manual, Derived) and only propagate INCREASES
            const oldTotal = Math.max(nodes[recipeId].manualScale, nodes[recipeId].derivedScale);
            nodes[recipeId].derivedScale += incomingScale;
            const newTotal = Math.max(nodes[recipeId].manualScale, nodes[recipeId].derivedScale);

            const delta = newTotal - oldTotal;
            nodes[recipeId].scale = newTotal;

            // Recalculate derived metrics
            const bYield = parseFloat(recipe.baseYield) || 1;
            const pPerBatch = parseFloat(recipe.portions_per_batch) || portionsPerBatch;
            nodes[recipeId].weight = nodes[recipeId].scale * bYield;
            nodes[recipeId].portions = nodes[recipeId].scale * pPerBatch;

            if (delta <= 0) return; // No new scale to propagate

            // Explode children
            if (recipe.ingredients) {
                recipe.ingredients.forEach(ing => {
                    const childId = resolveRecipeId(ing, recipes);
                    if (childId) {
                        const childRecipe = recipeMap.get(childId);
                        if (!childRecipe) return;

                        let ingQty = parseFloat(ing.qty) || 0;
                        const subUnit = (childRecipe.unit || '').toLowerCase();
                        const reqUnit = (ing.unit || '').toLowerCase();

                        // Unit normalization (G/ML to KG/L)
                        if (/^(kg|l|liter|litre)s?$/.test(subUnit) && /^(g|ml)s?$/.test(reqUnit)) {
                            ingQty /= 1000;
                        }

                        const childBaseYield = parseFloat(childRecipe.baseYield) || 1;
                        const childScaleDelta = (ingQty / childBaseYield) * delta;
                        explode(childId, childScaleDelta, new Set(seen), depth + 1);
                    }
                });
            }
        };

        // 1. Establish baselines from ALL provided scales
        Object.keys(safeScales).forEach(id => {
            explode(id, 0);
        });

        // 2. Final cleanup and normalization
        Object.keys(nodes).forEach(id => {
            const node = nodes[id];
            node.scale = Number(node.scale.toFixed(4));
            node.weight = Number(node.weight.toFixed(2));
            node.portions = Number(node.portions.toFixed(2));
        });

        return {
            nodes,
            demand: Object.fromEntries(Object.entries(nodes).map(([id, n]) => [id, n.weight])),
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
