import { test, expect } from '@playwright/test';

test.describe('Playwright Integration Tests', () => {
  test('should run normal Playwright tests without our reporter interfering', async ({ page }) => {
    // This test ensures our package doesn't interfere with normal Playwright functionality
    await page.goto('/');

    // Basic page functionality
    await expect(page.locator('h1')).toContainText('Test Application');

    // Test form interactions
    await page.fill('[data-testid="email-input"]', 'integration-test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Verify form values
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('integration-test@example.com');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('password123');

    // Test submit
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('.success-message')).toContainText('Login successful!');
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('should handle all interactive elements', async ({ page }) => {
    await page.goto('/');

    // Test all navigation links
    await page.click('[data-testid="nav-home"]');
    await page.click('[data-testid="nav-about"]');
    await page.click('[data-testid="nav-contact"]');
    await page.click('[data-testid="nav-login"]');

    // Test form elements
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.selectOption('[data-testid="role-select"]', 'admin');
    await page.fill('[data-testid="comments-textarea"]', 'Test comment');
    await page.check('[data-testid="remember-checkbox"]');

    // Test buttons
    await page.click('[data-testid="reset-button"]');
    // Form should be reset
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="remember-checkbox"]')).not.toBeChecked();

    // Fill and submit
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('#dashboard')).toBeVisible();

    // Test dashboard buttons
    await page.click('[data-testid="profile-button"]');
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="logout-button"]');

    // Should be back to login
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="search-input"]', 'playwright test');
    await page.click('[data-testid="search-button"]');

    await expect(page.locator('#search-results')).toBeVisible();
    await expect(page.locator('#search-results')).toContainText('playwright test');
  });

  test('should discover all interactive elements on page', async ({ page }) => {
    await page.goto('/');

    // Use JavaScript to count all interactive elements
    const interactiveElementCount = await page.evaluate(() => {
      const interactiveSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[role="button"]:not([disabled])',
        '[onclick]',
        '[data-testid]'
      ];

      const allElements = new Set<HTMLElement>();

      interactiveSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);

          // Only count visible elements
          if (style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              htmlEl.offsetWidth > 0 &&
              htmlEl.offsetHeight > 0) {
            allElements.add(htmlEl);
          }
        });
      });

      return allElements.size;
    });

    console.log(`🔍 Found ${interactiveElementCount} interactive elements on the page`);
    expect(interactiveElementCount).toBeGreaterThan(15); // We expect at least 15 interactive elements

    // Verify specific elements exist
    const specificElements = [
      '[data-testid="email-input"]',
      '[data-testid="password-input"]',
      '[data-testid="login-button"]',
      '[data-testid="nav-home"]',
      '[data-testid="search-input"]'
    ];

    for (const selector of specificElements) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });
});