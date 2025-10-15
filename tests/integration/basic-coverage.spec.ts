import { test, expect } from '@playwright/test';

test.describe('Basic Coverage Reporter Integration', () => {
  test('should not break normal Playwright test execution', async ({ page }) => {
    // This test verifies that our coverage reporter doesn't interfere with normal Playwright functionality
    await page.goto('/');

    // Basic Playwright operations should work normally
    await expect(page.locator('h1')).toContainText('Test Application');

    // Test navigation links
    await page.click('[data-testid="nav-home"]');
    await expect(page.locator('h1')).toBeVisible();

    // Test basic form interactions
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Verify form was filled
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('test@example.com');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('password123');
  });

  test('should handle form submission correctly', async ({ page }) => {
    await page.goto('/');

    // Fill out the login form
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.selectOption('[data-testid="role-select"]', 'user');
    await page.fill('[data-testid="comments-textarea"]', 'Test comment');
    await page.check('[data-testid="remember-checkbox"]');

    // Submit the form
    await page.click('[data-testid="login-button"]');

    // Verify login was successful
    await expect(page.locator('.success-message')).toContainText('Login successful!');
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#login-form')).toBeHidden();
  });

  test('should handle dashboard interactions', async ({ page }) => {
    await page.goto('/');

    // First login
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to appear
    await expect(page.locator('#dashboard')).toBeVisible();

    // Test dashboard buttons
    await page.click('[data-testid="profile-button"]');
    await page.click('[data-testid="settings-button"]');

    // Logout
    await page.click('[data-testid="logout-button"]');

    // Verify we're back to login form
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#dashboard')).toBeHidden();
  });

  test('should handle search functionality', async ({ page }) => {
    await page.goto('/');

    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'test search');
    await page.click('[data-testid="search-button"]');

    // Verify search results appear
    await expect(page.locator('#search-results')).toBeVisible();
    await expect(page.locator('#search-results')).toContainText('test search');
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/');

    // Try to submit empty form
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.locator('.error-message')).toContainText('Please fill in all fields');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#dashboard')).toBeHidden();
  });

  test('should handle reset and cancel buttons', async ({ page }) => {
    await page.goto('/');

    // Fill form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.check('[data-testid="remember-checkbox"]');

    // Test cancel button
    await page.click('[data-testid="cancel-button"]');

    // Form should be reset
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="remember-checkbox"]')).not.toBeChecked();

    // Fill again and test reset button
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="comments-textarea"]', 'test comment');

    await page.click('[data-testid="reset-button"]');

    // Form should be reset
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="comments-textarea"]')).toHaveValue('');
  });
});