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
    const s = normalize(ing.sku);
    const n = normalize(ing.name);

    // Tier 1: Explicit Registry (SKU_TO_RECIPE_MAP)
    if (SKU_TO_RECIPE_MAP[ing.sku]) return SKU_TO_RECIPE_MAP[ing.sku];

    // Tier 2: Direct Match (ID, SKU, or Recipe_ID)
    const directMatch = recipes.find(r =>
        r.id === ing.sku ||
        normalize(r.sku) === s ||
        normalize(r.recipe_id) === s
    );
    if (directMatch) return directMatch.id;

    // Tier 3: Name-Based Fallback (Professional Fail-Safe)
    const nameMatch = recipes.find(r => normalize(r.name) === n);
    if (nameMatch) return nameMatch.id;

    return null;
}

/**
 * Legacy wrapper for compatibility.
 */
export function resolveRecipeIdBySku(sku, recipes = []) {
    return resolveRecipeId({ sku }, recipes);
}
