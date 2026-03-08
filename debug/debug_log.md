# Debug Log: Scaling Logic Issues

## Attempt 1
**DATE**: 2026-03-03
**PROBLEM**: Selecting "Test Mode" for 4 portions results in 300 portions. "Apply All" increases quantities incorrectly.
**HYPOTHESIS**: 
1. `App.jsx` converts Portions to Weights (`val * pSize`) before saving to `dailyProduction`, but `BOMEngine.js` interprets `seeds` as Portions when `isTestMode` is true.
2. `applyMultiplier` uses `r.baseYield` for initialization regardless of mode.
**ACTION**:
- Align `App.jsx` to save raw Portion counts when in `portionMode`.
- Update `handleUpdateTarget` to handle both modes through a unified resolver.
- Fix `applyMultiplier` to use appropriate base units.
**RESULT**: Successfully aligned `App.jsx` and `BOMEngine.js` data contracts.
**WHY_FAILED**: N/A.

## Attempt 2
**DATE**: 2026-03-03
**PROBLEM**: "Apply All" results in 0 quantities for sauces. Market page shows black screen.
**HYPOTHESIS**: 
- H1: `Apply All` logic in `App.jsx` filters by `rootRecipeIds`, which excludes shared components like sauces, clearing their manual intents.
- H2: Market View (CommandBoard.jsx) and the Order List are attempting to render `planIntent[id]` as a React child. Since it's now an object `{val, mode}`, React crashes with "Objects are not valid as a React child".
- H3: `BOMEngine.js` has a broken filter for `activeOrigins` (`v > 0`), causing zero labels in the UI.
**ACTION**:
- Fix `BOMEngine.js` to normalize `activeOrigins` and fix the filter.
- Update `App.jsx` components to use `val.val` when rendering.
- Refactor `Apply All` to merge root intents instead of replacing the whole state.
**RESULT**: Partially addressed. Architecture changes introduced new variable ordering issue.
**WHY_FAILED**: Moving `rootRecipeIds` was not done properly, causing the crash described in Attempt 3.

## Attempt 3
**DATE**: 2026-03-03
**PROBLEM**: Full black screen. App crashes on every render. Also, Apply All sets all recipes to 0.
**HYPOTHESIS**:
- H1: `bomResult` useMemo references `rootRecipeIds.has()`, but `rootRecipeIds` is defined 55 lines later. `const` is not hoisted in JS, so it's `undefined` on render.
- H2: Controller layer ignores `planIntent` in Production Mode, only using `volumeFocus` (which is 1 on mode switch reset).
- H3: Input handler does `val * baseYield` then controller divides by `baseYield` again → double-division → wrong scale.
- H4: Apply All reads `currentPortionCount` from BOM output (which is 0 when no seed exists) → sets all roots to 0.
- H5: Batch count label formula `currentYieldValue / (volumeFocus * portionSize)` produces absurd values.
**ACTION**:
- Move `rootRecipeIds` definition before `bomResult`
- Unified controller: `planIntent` works in BOTH modes; `volumeFocus` is fallback only
- Input handler stores directly as `'batch'` mode (no multiplication)
- Apply All reads from `planIntent` directly, defaults to 1 batch
- Fixed display label to `currentYieldValue / baseYield`
**RESULT**: All 5 root causes fixed. App loads, scales correctly, Market/Board render, mode switch works.
## Attempt 4
**DATE**: 2026-03-03
**PROBLEM**: Input field "stuck at 0" or resets while typing. Apply All doesn't work for prep recipes.
**HYPOTHESIS**:
- H1: Input `value` reads from derived BOM `portions`. If a recipe (like Kimchi) has no specific portion metadata, or if it takes a moment to compute, the UI resets the user's typing to 0.
- H2: `Apply All` only targets roots. If a user is on a prep item, it doesn't propagate scaling to the roots that consume it.
**ACTION**:
- Refactored input `value` in `App.jsx` to prioritize `planIntent[selectedId].val`. This breaks the feedback loop.
- Generalized `Apply All` to take the current recipe's intent (regardless of type) and apply it to all root recipes.
**RESULT**: Systemic fix. All recipes now accept and hold input correctly. Kimchi 4 portions scales ingredients to 800g cabbage, etc.
**WHY_FAILED**: N/A - FIXED.
