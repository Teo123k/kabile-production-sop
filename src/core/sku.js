/**
 * Mapping of internal SKUs to specific recipe IDs for BOM explosion.
 * This is used to resolve sub-recipe dependencies during total market list aggregation.
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
 * Resolves a recipe ID for a given SKU string.
 * @param {string} sku 
 * @param {Array<Object>} recipes Current loaded recipe list
 * @returns {string|null}
 */
export function resolveRecipeIdBySku(sku, recipes = []) {
    if (!sku) return null;
    return SKU_TO_RECIPE_MAP[sku] || recipes.find(r => r.id === sku)?.id || null;
}
