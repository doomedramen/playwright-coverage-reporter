import { test, expect } from '../../src/fixtures/coverage-fixture';

test.describe('Custom Coverage Fixtures', () => {
  test('should use coverage fixtures for enhanced tracking', async ({ page, trackInteraction }) => {
    await page.goto('/');

    // Test basic navigation with tracking
    await trackInteraction('[data-testid="nav-home"]', 'click');
    await page.click('[data-testid="nav-home"]');

    // Test form filling with tracking
    await trackInteraction('[data-testid="email-input"]', 'fill');
    await page.fill('[data-testid="email-input"]', 'fixture-test@example.com');

    await trackInteraction('[data-testid="password-input"]', 'fill');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Test select interaction
    await trackInteraction('[data-testid="role-select"]', 'select');
    await page.selectOption('[data-testid="role-select"]', 'admin');

    // Test checkbox interaction
    await trackInteraction('[data-testid="remember-checkbox"]', 'check');
    await page.check('[data-testid="remember-checkbox"]');

    // Test textarea interaction
    await trackInteraction('[data-testid="comments-textarea"]', 'fill');
    await page.fill('[data-testid="comments-textarea"]', 'Testing with fixtures');

    // Test button click with tracking
    await trackInteraction('[data-testid="login-button"]', 'click');
    await page.click('[data-testid="login-button"]');

    // Verify login was successful
    await expect(page.locator('.success-message')).toContainText('Login successful!');
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('should track complete user flow', async ({ page, trackInteraction, getCoveredElements }) => {
    await page.goto('/');

    // Complete login flow with tracking
    await trackInteraction('[data-testid="email-input"]', 'fill');
    await page.fill('[data-testid="email-input"]', 'flow-test@example.com');

    await trackInteraction('[data-testid="password-input"]', 'fill');
    await page.fill('[data-testid="password-input"]', 'password123');

    await trackInteraction('[data-testid="login-button"]', 'click');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard
    await expect(page.locator('#dashboard')).toBeVisible();

    // Dashboard interactions
    await trackInteraction('[data-testid="profile-button"]', 'click');
    await page.click('[data-testid="profile-button"]');

    await trackInteraction('[data-testid="settings-button"]', 'click');
    await page.click('[data-testid="settings-button"]');

    await trackInteraction('[data-testid="logout-button"]', 'click');
    await page.click('[data-testid="logout-button"]');

    // Verify back to login
    await expect(page.locator('#login-form')).toBeVisible();

    // Check covered elements (if available)
    try {
      const coveredElements = await getCoveredElements();
      console.log(`📊 Covered elements in this test: ${coveredElements?.length || 0}`);
    } catch (error) {
      // Fixture might not have this method implemented yet, which is okay
      console.log('ℹ️ getCoveredElements not implemented in fixtures');
    }
  });

  test('should handle search functionality with fixtures', async ({ page, trackInteraction }) => {
    await page.goto('/');

    // Search interaction
    await trackInteraction('[data-testid="search-input"]', 'fill');
    await page.fill('[data-testid="search-input"]', 'fixture search test');

    await trackInteraction('[data-testid="search-button"]', 'click');
    await page.click('[data-testid="search-button"]');

    // Verify search results
    await expect(page.locator('#search-results')).toBeVisible();
    await expect(page.locator('#search-results')).toContainText('fixture search test');
  });

  test('should test form validation with fixtures', async ({ page, trackInteraction }) => {
    await page.goto('/');

    // Try to submit empty form
    await trackInteraction('[data-testid="login-button"]', 'click');
    await page.click('[data-testid="login-button"]');

    // Should show validation error
    await expect(page.locator('.error-message')).toContainText('Please fill in all fields');

    // Now fill the form properly
    await trackInteraction('[data-testid="email-input"]', 'fill');
    await page.fill('[data-testid="email-input"]', 'validation-test@example.com');

    await trackInteraction('[data-testid="password-input"]', 'fill');
    await page.fill('[data-testid="password-input"]', 'password123');

    await trackInteraction('[data-testid="login-button"]', 'click');
    await page.click('[data-testid="login-button"]');

    // Should succeed now
    await expect(page.locator('.success-message')).toContainText('Login successful!');
  });
});