export const calculateBOM = (recipes, volumeFocus, menuMix, getPortionSize) => {
    try {
        if (!recipes || !Array.isArray(recipes)) return {};
        const safeMenuMix = menuMix || {};
        const safeVolumeFocus = parseFloat(volumeFocus) || 0;

        // 1. FAST INDEXING: Map-based lookups for O(1) performance
        const recipeMap = new Map();
        const skuMap = new Map();

        recipes.forEach(r => {
            if (!r || !r.id) return;
            recipeMap.set(r.id, r);
            if (r.sku) skuMap.set(r.sku, r);
            if (r.recipe_id) skuMap.set(r.recipe_id, r);
            if (r.meta && r.meta.sku) skuMap.set(r.meta.sku, r);
        });

        // 2. Initialize Demand Map
        const demandObj = {};
        recipes.forEach(r => {
            if (r && r.id) demandObj[r.id] = 0;
        });

        const hasMix = Object.keys(safeMenuMix).length > 0;

        if (!hasMix || safeVolumeFocus === 0) {
            recipes.forEach(r => {
                if (!r || !r.id) return;
                const pSize = getPortionSize ? getPortionSize(r) : 250;
                demandObj[r.id] = safeVolumeFocus * pSize;
            });
            return demandObj;
        }

        // 3. Apply Top-Level Demand
        recipes.forEach(r => {
            if (!r || !r.id) return;
            const mixVal = safeMenuMix[r.id];
            if (mixVal !== undefined && mixVal !== null) {
                const mixPercentage = (parseFloat(mixVal) || 0) / 100;
                const portionsNeeded = safeVolumeFocus * mixPercentage;
                const pSize = getPortionSize ? getPortionSize(r) : 250;
                demandObj[r.id] = portionsNeeded * pSize;
            }
        });

        // 4. Recursive Explosion (Cascade Down)
        const explode = (recipeId, yieldRequested, seen = new Set(), depth = 0) => {
            if (depth > 10 || seen.has(recipeId) || !yieldRequested || yieldRequested <= 0) return;
            seen.add(recipeId);

            const recipe = recipeMap.get(recipeId);
            if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) return;

            recipe.ingredients.forEach(ing => {
                if (!ing || !ing.sku) return;

                // O(1) LOOKUP using pre-built maps
                const childRecipe = recipeMap.get(ing.sku) || skuMap.get(ing.sku);
                const childRecipeId = childRecipe?.id;

                if (childRecipeId) {
                    let qtyToProcess = parseFloat(ing.qty) || 0;
                    if (qtyToProcess <= 0) return;

                    const subUnit = (childRecipe.unit || '').toLowerCase();
                    const reqUnit = (ing.unit || '').toLowerCase();
                    const isSubMetric = subUnit === 'kg' || subUnit === 'l' || subUnit === 'liter' || subUnit === 'litre';
                    const isReqSmall = reqUnit === 'g' || reqUnit === 'ml';

                    if (isSubMetric && isReqSmall) {
                        qtyToProcess /= 1000;
                    }

                    const safeBaseYield = parseFloat(recipe.baseYield) || 1;
                    const scaledChildYield = (qtyToProcess / safeBaseYield) * yieldRequested;

                    if (demandObj[childRecipeId] === undefined) demandObj[childRecipeId] = 0;
                    demandObj[childRecipeId] += scaledChildYield;

                    explode(childRecipeId, scaledChildYield, new Set(seen), depth + 1);
                }
            });
        };

        const initialDemand = { ...demandObj };
        Object.entries(initialDemand).forEach(([recipeId, yieldRequested]) => {
            if (yieldRequested > 0) {
                explode(recipeId, yieldRequested);
            }
        });

        // 5. Apply Production Strategies & Rounding
        Object.keys(demandObj).forEach(recipeId => {
            const recipe = recipeMap.get(recipeId);
            if (!recipe) return;

            let totalDemand = demandObj[recipeId];
            if (!totalDemand || totalDemand <= 0) {
                demandObj[recipeId] = 0;
                return;
            }

            const strategy = recipe.production_strategy || 'dynamic_daily';
            const batchSize = parseFloat(recipe.production_batch_size) || parseFloat(recipe.baseYield) || 1;

            if (strategy === 'fixed_batch' || strategy === 'foundational') {
                const batchesNeeded = Math.ceil(totalDemand / batchSize);
                demandObj[recipeId] = Number((batchesNeeded * batchSize).toFixed(2));
            } else {
                demandObj[recipeId] = Number(totalDemand.toFixed(2));
            }
        });

        return demandObj;
    } catch (error) {
        console.error("BOM Engine Error:", error);
        return {};
    }
};
