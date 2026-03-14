import { test, expect } from '@playwright/test';

const DEFAULT_PORTION_RECIPES = [
  { id: 'king-tteokbokki-magic-soy', name: 'King Tteokbokki (Magic Soy Version)', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'udon-base', name: 'Udon Base', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'japanese-curry-roux', name: 'Japanese Curry Roux', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'korean-fried-chicken', name: 'Korean Fried Chicken', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'tteokbokki', name: 'Tteokbokki', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'japchae-magic-soy', name: 'Japchae (Magic Soy Version)', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'classic-tteokbokki', name: 'Classic Tteokbokki', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'japchae-classic', name: 'Japchae (Classic Version)', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'asian-coleslaw', name: 'Asian Coleslaw', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'chicken-katsu-for-curry', name: 'Chicken Katsu for Curry', expectedMin: 8, expectedMax: 12, expectedBase: 10 },
  { id: 'bulgogi-dish', name: 'Bulgogi Beef', expectedMin: 8, expectedMax: 12, expectedBase: 4 },
  { id: 'dakgalbi-dish', name: 'Dakgalbi', expectedMin: 8, expectedMax: 12, expectedBase: 4 }
];

async function waitForScalerReady(page) {
  await page.goto('/kabile');
  await expect(page.getByTestId('nav-scaler')).toBeVisible();
  await expect(page.getByTestId('recipe-title-button')).toBeVisible({ timeout: 20000 });
}

async function selectRecipe(page, recipeId) {
  await page.getByTestId('recipe-title-button').click();
  await page.getByTestId(`recipe-option-${recipeId}`).click();
}

async function setScalerTarget(page, value) {
  const input = page.getByTestId('scaler-target-input');
  await input.click();
  await input.fill(String(value));
  await input.press('Tab');
}

async function readScalerTargetValue(page) {
  const raw = await page.getByTestId('scaler-target-input').inputValue();
  return Number(raw);
}

test.describe('Scaler calculation flow', () => {
  test('original recipe quantity displays correctly', async ({ page }) => {
    await waitForScalerReady(page);
    await selectRecipe(page, 'dakgalbi-sauce');

    await expect(page.getByTestId('scaler-target-input')).toHaveValue('1');
    await expect(page.getByTestId('ingredient-qty-water')).toContainText('185');
    await expect(page.getByTestId('ingredient-qty-water')).toContainText('g');
    await expect(page.getByTestId('ingredient-qty-soy-light')).toContainText('60');
    await expect(page.getByTestId('scaler-total-weight')).toContainText('1kg');
  });

  test('scaling to different batch sizes updates ingredients correctly', async ({ page }) => {
    await waitForScalerReady(page);
    await selectRecipe(page, 'dakgalbi-sauce');

    await expect(page.getByTestId('ingredient-qty-water')).toContainText('185');
    await setScalerTarget(page, 2);

    await expect(page.getByTestId('ingredient-qty-water')).toContainText('370');
    await expect(page.getByTestId('ingredient-qty-soy-light')).toContainText('120');
    await expect(page.getByTestId('scaler-total-weight')).toContainText('2kg');
  });

  test('portion mode follows the setting menu portion-class weight', async ({ page }) => {
    await waitForScalerReady(page);
    await page.getByTestId('nav-settings').click();
    const meatStirFryInput = page.getByTestId('setting-portion-class-meat-stir-fry');
    await meatStirFryInput.fill('400');

    await page.getByRole('button', { name: /return to dashboard/i }).click();
    await page.getByTestId('mode-portion').click();
    await selectRecipe(page, 'dakgalbi-dish');

    await expect(page.getByTestId('scaler-target-input')).toHaveValue('3');
    await setScalerTarget(page, 6);

    await expect(page.getByTestId('ingredient-qty-mt-chk-thi')).toContainText(/1\.6\s*kg/i);
    await expect(page.getByTestId('ingredient-qty-dakgalbi-sauce')).toContainText('800');
    await expect(page.getByTestId('scaler-total-weight')).toContainText(/2\.4\s*kg/i);
  });

  test('shopping list matches the selected recipe scale', async ({ page }) => {
    await waitForScalerReady(page);
    await selectRecipe(page, 'dakgalbi-sauce');
    await setScalerTarget(page, 2);

    await page.getByTestId('nav-market').click();
    await expect(page.getByText('Aggregated Order')).toBeVisible();
    await expect(page.getByTestId('market-row-water')).toBeVisible();
    await expect(page.getByTestId('market-qty-water')).toContainText('370');
    await expect(page.getByTestId('market-qty-soy-sauce')).toContainText('120');
  });

  test('default all in portion mode keeps recipes near the expected default portion size', async ({ page }) => {
    await waitForScalerReady(page);
    await page.getByTestId('mode-portion').click();
    await page.getByRole('button', { name: /default all/i }).click();

    const mismatches = [];

    for (const recipe of DEFAULT_PORTION_RECIPES) {
      await selectRecipe(page, recipe.id);
      const actual = await readScalerTargetValue(page);
      const inRange = actual >= recipe.expectedMin && actual <= recipe.expectedMax;
      if (!inRange) {
        mismatches.push({
          recipe: recipe.name,
          recipeId: recipe.id,
          actual,
          expectedRange: `${recipe.expectedMin}-${recipe.expectedMax}`,
          savedBaseYield: recipe.expectedBase
        });
      }
    }

    test.info().annotations.push({
      type: 'default-portion-diagnostic',
      description: JSON.stringify(mismatches)
    });

    expect(mismatches).toEqual([]);
  });
});
