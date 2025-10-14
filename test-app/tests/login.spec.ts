import { test, expect } from '@playwright/test';

test.describe('Login Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + __dirname + '/../sample-app.html');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Login Form');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#remember')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
    await expect(page.locator('#forgot-btn')).toBeVisible();
  });

  test('should submit login form with valid data', async ({ page }) => {
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.check('#remember');

    await page.click('#login-btn');

    await expect(page.locator('#message')).toBeVisible();
    await expect(page.locator('#message')).toContainText('Login attempted');
    await expect(page.locator('#message')).toContainText('test@example.com');
    await expect(page.locator('#message')).toContainText('remember: true');
  });

  test('should handle forgot password', async ({ page }) => {
    await page.click('#forgot-btn');

    await expect(page.locator('#message')).toBeVisible();
    await expect(page.locator('#message')).toContainText('Password reset link sent');
  });

  test('should validate email input', async ({ page }) => {
    const emailInput = page.locator('#email');

    await emailInput.fill('invalid-email');
    await expect(emailInput).toHaveValue('invalid-email');

    await emailInput.fill('valid@example.com');
    await expect(emailInput).toHaveValue('valid@example.com');
  });

  test('should handle password input', async ({ page }) => {
    const passwordInput = page.locator('#password');

    await passwordInput.fill('mypassword');
    await expect(passwordInput).toHaveValue('mypassword');

    // Verify it's a password field
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle remember checkbox', async ({ page }) => {
    const rememberCheckbox = page.locator('#remember');

    await expect(rememberCheckbox).not.toBeChecked();

    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();

    await rememberCheckbox.uncheck();
    await expect(rememberCheckbox).not.toBeChecked();
  });

  test('should use data-testid selectors', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.check('[data-testid="remember-checkbox"]');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('#message')).toContainText('Login attempted');
  });
});