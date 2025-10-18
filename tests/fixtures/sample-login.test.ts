/**
 * Sample login test fixture for integration testing
 * This simulates a typical Playwright test file that would be analyzed
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // These are the selectors that should be tracked by the coverage reporter
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Verify login success
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Same selectors but different test flow
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/login');

    // Submit without filling fields
    await page.click('button[type="submit"]');

    // Check validation messages
    await expect(page.locator('input[name="email"] + .error')).toBeVisible();
    await expect(page.locator('input[name="password"] + .error')).toBeVisible();
  });
});