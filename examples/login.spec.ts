import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');

    // Submit form
    await page.click('button:has-text("Login")');

    // Verify successful login
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('text=Welcome, user@example.com')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should handle empty form submission', async ({ page }) => {
    // Click login button without filling form
    await page.click('button:has-text("Login")');

    // Verify validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.locator('[data-testid="password-input"]');
    const toggleButton = page.locator('[data-testid="password-toggle"]');

    // Fill password
    await passwordInput.fill('password123');

    // Verify password is hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button
    await toggleButton.click();

    // Verify password is visible
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle again
    await toggleButton.click();

    // Verify password is hidden again
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to registration page', async ({ page }) => {
    // Click register link
    await page.click('a[href="/register"]');

    // Verify navigation
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Click forgot password link
    await page.click('a[href="/forgot-password"]');

    // Verify navigation
    await expect(page).toHaveURL('/forgot-password');
    await expect(page.locator('h1:has-text("Reset Password")')).toBeVisible();
  });
});