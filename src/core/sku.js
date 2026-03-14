/**
 * Mapping of internal SKUs to specific recipe IDs for BOM explosion.
 * This acts as a manual registry for core components.
 */
export const SKU_TO_RECIPE_MAP = {
    'INT-MAG-SOY': 'magic-soy',
    'INT-BBQ-SCE': 'bbq-sauce',
    'INT-SWT-SWP': 'sweet-spicy-sauce',
    'INT-CHK-COAT': 'chicken-coating-flour',
    'INT-CHK-STRCH': 'chicken-coating-starch',
    'INT-EGG-WSH': 'egg-wash',
    'INT-TTE-SCE': 'tteokkochi-sauce',
    'INT-CUR-ROUX': 'curry-roux',
    'INT-CUR-BASE': 'curry-vege-base'
};

/**
 * Normalizes a string for comparison:
 * 1. Lowercase, Trimmed
 * 2. Collapse whitespace
 * 3. Strip leading numbers and symbols (e.g. "1. ", "2) ")
 * 4. Strip trailing parentheses (e.g. " (Master Base)")
 */
const normalize = (val) => {
    const s = (val || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
    // Strip "1. ", "2) ", etc
    const noLeadingNum = s.replace(/^[0-9]+[\.\)\s-]+/, '').trim();
    // Strip " (Anything in brackets)"
    const clean = noLeadingNum.replace(/\s*\(.*?\)\s*/g, '').trim();
    return clean;
};

/**
 * Resolves a Recipe ID from an ingredient object using a multi-tier approach.
 * This is the system's "Fail-Safe" for linking ingredients to their sub-recipes.
 * 
 * @param {Object} ing The ingredient object (from a recipe's ingredient list)
 * @param {Array<Object>} recipes Total repository of recipes
 * @returns {string|null} The resolved recipe ID
 */
export function resolveRecipeId(ing, recipes = []) {
    if (!ing) return null;
    // Original 's' for SKU-based normalization, 'n' for name-based
    const originalSkuNormalized = normalize(ing.sku);
    const n = normalize(ing.name);

    // Tier 1: Explicit Registry (SKU_TO_RECIPE_MAP)
    if (ing.sku && SKU_TO_RECIPE_MAP[ing.sku]) return SKU_TO_RECIPE_MAP[ing.sku];

    // Tier 2: Search for SKU property or Recipe Name/ID match
    // This 's' is a more comprehensive normalized key for Tier 2 matching
    const s = normalize(ing.sku || ing.recipe_id || ing.name);
    if (!s) return null; // FIX (Step 2): Don't match empty strings

    const directMatch = recipes.find(r => {
        const rSku = normalize(r.sku);
        const rId = normalize(r.id || r.recipe_id);
        const matchFound = (ing.sku && r.id === ing.sku) || (s && rSku === s) || (s && rId === s);
        return matchFound;
    });

    if (directMatch) return directMatch.id || directMatch.recipe_id;
    // Tier 3: Name-Based Fallback (Professional Fail-Safe)
    const nameMatch = recipes.find(r => n && normalize(r.name) === n);
    if (nameMatch) return nameMatch.id;

    // After implementation of STEP 1:
    const suspectTerms = ['sauce', 'base', 'stock', 'marinade', 'coating', 'roux', 'glaze', 'paste', 'wash'];
    if (ing.sku || (n && suspectTerms.some(t => n.includes(t)))) {
        console.warn(`[BOM] SKU resolution failed for ingredient: "${ing.name}" (sku: ${ing.sku || 'none'})`);
    }

    return null;
}

/**
 * Legacy wrapper for compatibility.
 */
export function resolveRecipeIdBySku(sku, recipes = []) {
    return resolveRecipeId({ sku }, recipes);
}
