
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to pages', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');

    await page.click('button:has-text("Menu")');
    await expect(page.locator('[data-testid="menu"]')).toBeVisible();
  });
});
  