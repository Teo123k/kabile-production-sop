/**
 * @typedef {Object} RoundingConfig
 * @property {number} volumeFocus Current production scale
 */

/**
 * [LOCKED] CORE ROUNDING LOGIC - DO NOT MODIFY WITHOUT AUDIT
 * Implements professional kitchen rounding (the 0/5 rule for small units, 0.5 for bulk)
 * 
 * @param {number} val The raw mathematical value
 * @param {string} [unit=''] The unit to determine rounding strategy
 * @returns {number} The rounded value safe for kitchen production
 */
export function chefRound(val, unit = '') {
    if (val <= 0) return 0;
    const u = (unit || '').toLowerCase();

    // 1. Bulk Units (kg, L, Liter, lb, qt) - 0.5 steps
    if (['kg', 'l', 'liter', 'lb', 'qt'].some(x => u.includes(x))) {
        const r = Math.round(val * 10) / 10;
        return r > 0 ? r : Math.ceil(val * 10) / 10;
    }

    // 1.5 Medium Imperial Units (oz, fl oz, cup) - 0.25 steps (quarter increments)
    if (['oz', 'fl oz', 'cup'].some(x => u.includes(x))) {
        const fraction = Math.round(val * 4) / 4;
        return fraction > 0 ? fraction : Math.round(val * 10) / 10;
    }

    // 2. Small Units (g, ml) - 0 / 5 rule
    if (val < 1) return Math.ceil(val * 10) / 10;   // 0.09 -> 0.1
    if (val < 5) return Math.round(val * 2) / 2;     // 1.44 -> 1.5
    if (val < 10) return Math.round(val);             // 8.2 -> 8
    return Math.round(val / 5) * 5;                   // 104 -> 105, 39 -> 40
}
