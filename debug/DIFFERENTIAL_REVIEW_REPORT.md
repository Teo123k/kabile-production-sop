# Differential Review Report: Scaling Logic Stability

**Severity: CRITICAL (Logic Failure)**
**Confidence: HIGH**

## Executive Summary
The recent refactor of `applyMultiplier` introduced a logic regression where every recipe in the codebase is explicitly seeded in `dailyProduction`. When `BOMEngine.js` processes these seeds, it treats each one as an independent root (entry point). For recipes that are both seeds AND ingredients of other seeds, their scale is summed, leading to "random" (inflated) quantities.

## Blast Radius Analysis
- **Core Engine**: `BOMEngine.js`
- **Primary State**: `dailyProduction` in `App.jsx`
- **Impacted UI**: All quantity inputs across Scaler and Presentation views.
- **Transitive Impact**: Any downstream production planning will have inflated totals.

## Vulnerability: Scale Accumulation Regression
In `BOMEngine.js`:
```javascript
nodes[recipeId].scale += parentScale;
```
If `dailyProduction` contains: `{ Parent: 1, Child: 1 }`, and Parent contains Child:
1. Child scale starts at 1 (from its own seed).
2. Parent (scale 1) explodes into Child, adding another scale factor.
3. Child final scale = 1 + ExplosionFactor.

## Mitigation Plan
1. **App.jsx**: Refactor `applyMultiplier` to only scale *existing* seeds in `dailyProduction`.
2. **App.jsx**: If `dailyProduction` is empty, only scale the *active* recipe or detected *root* recipes.
3. **BOMEngine.js**: Ensure that if a node is an ingredient, it doesn't double-count its own seed if it's already being provided by a parent (or decide clear precedence).

## Quality Checklist
- [x] Logic blast radius analyzed
- [x] Root cause identified (Scale Summing)
- [ ] Fix implemented
- [ ] Portions vs Weights consistency verified
