import { chefRound } from './units';

/**
 * @typedef {Object} FormattedQuantity
 * @property {string} val The rounded value as a string
 * @property {string} unit The display unit
 */

/**
 * [LOCKED] CORE UNIT FORMATTER
 * Handles unit conversion (metric/imperial) and rounding via chefRound.
 * 
 * @param {number} val Raw value
 * @param {string} [unit=''] Original unit
 * @param {'metric'|'imperial'} [unitSystem='metric'] Current UI unit system
 * @returns {FormattedQuantity}
 */
export function formatQuantity(val, unit = '', unitSystem = 'metric') {
    let displayVal = val;
    let displayUnit = unit || '';

    const uMatch = displayUnit.toLowerCase();

    if (unitSystem === 'imperial') {
        if (uMatch === 'g' || uMatch === 'kg') {
            let oz = displayVal;
            if (uMatch === 'kg') oz = displayVal * 1000;
            oz = oz * 0.035274;
            if (oz >= 16) {
                displayVal = oz / 16;
                displayUnit = 'lb';
            } else {
                displayVal = oz;
                displayUnit = 'oz';
            }
        } else if (uMatch === 'ml' || uMatch === 'l' || uMatch === 'liter') {
            let floz = displayVal;
            if (uMatch !== 'ml') floz = displayVal * 1000;
            floz = floz * 0.033814;
            if (floz >= 32) {
                displayVal = floz / 32;
                displayUnit = 'qt';
            } else if (floz >= 8) {
                displayVal = floz / 8;
                displayUnit = 'cup';
            } else {
                displayVal = floz;
                displayUnit = 'fl oz';
            }
        }
    } else {
        // Metric auto-scaling
        if (uMatch === 'g' && val >= 1000) {
            displayVal = val / 1000;
            displayUnit = 'kg';
        } else if (uMatch === 'ml' && val >= 1000) {
            displayVal = val / 1000;
            displayUnit = 'L';
        }
    }

    const rounded = chefRound(displayVal, displayUnit);

    let valStr = rounded.toString();
    const duLower = displayUnit.toLowerCase();
    if (['kg', 'l', 'lb', 'qt'].some(u => duLower.includes(u))) {
        valStr = rounded.toFixed(1).replace(/\.0$/, "");
    }

    return { val: valStr, unit: displayUnit };
}

/**
 * Simpler wrapper for display objects
 * @param {number} val 
 * @param {string} unit 
 * @param {'metric'|'imperial'} unitSystem 
 * @returns {{v: string, u: string}}
 */
export function formatDisplay(val, unit, unitSystem = 'metric') {
    const { val: v, unit: u } = formatQuantity(val, unit, unitSystem);
    return { v, u };
}

/**
 * Returns only the formatted value string
 * @param {number} val 
 * @param {string} unit 
 * @param {'metric'|'imperial'} unitSystem 
 * @returns {string}
 */
export function formatValue(val, unit, unitSystem = 'metric') {
    const { val: v } = formatQuantity(val, unit, unitSystem);
    return v;
}
