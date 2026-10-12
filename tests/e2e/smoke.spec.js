import { expect, test } from '@playwright/test';

test('serves the static application shell without credentials', async ({ page }) => {
  const response = await page.goto('/src/main/resources/META-INF/resources/index.html');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Dicekeeper/i);
  await expect(page.locator('#app')).toBeAttached();
});
