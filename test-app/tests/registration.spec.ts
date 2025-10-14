import { test, expect } from '@playwright/test';

test.describe('Registration Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + __dirname + '/../sample-app.html');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Registration Form');
    await expect(page.locator('#register-form')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#plan')).toBeVisible();
    await expect(page.locator('#register-btn')).toBeVisible();
  });

  test('should submit registration form with all fields', async ({ page }) => {
    await page.fill('#username', 'testuser');
    await page.fill('#register-email', 'user@example.com');
    await page.selectOption('#plan', 'premium');
    await page.check('input[name="account-type"][value="business"]');
    await page.fill('#bio', 'This is my bio text');

    await page.click('#register-btn');

    await expect(page.locator('#message')).toBeVisible();
    await expect(page.locator('#message')).toContainText('Registration: testuser');
    await expect(page.locator('#message')).toContainText('user@example.com');
    await expect(page.locator('#message')).toContainText('premium');
    await expect(page.locator('#message')).toContainText('business');
  });

  test('should handle form reset', async ({ page }) => {
    // Fill form first
    await page.fill('#username', 'testuser');
    await page.fill('#register-email', 'user@example.com');
    await page.selectOption('#plan', 'basic');
    await page.fill('#bio', 'This is my bio');

    // Verify fields are filled
    await expect(page.locator('#username')).toHaveValue('testuser');
    await expect(page.locator('#register-email')).toHaveValue('user@example.com');
    await expect(page.locator('#plan')).toHaveValue('basic');
    await expect(page.locator('#bio')).toHaveValue('This is my bio');

    // Reset form
    await page.click('#reset-btn');

    // Verify fields are reset
    await expect(page.locator('#username')).toHaveValue('');
    await expect(page.locator('#register-email')).toHaveValue('');
    await expect(page.locator('#plan')).toHaveValue('');
    await expect(page.locator('#bio')).toHaveValue('');
  });

  test('should handle select dropdown', async ({ page }) => {
    const planSelect = page.locator('#plan');

    await planSelect.selectOption('basic');
    await expect(planSelect).toHaveValue('basic');

    await planSelect.selectOption('premium');
    await expect(planSelect).toHaveValue('premium');

    await planSelect.selectOption('enterprise');
    await expect(planSelect).toHaveValue('enterprise');
  });

  test('should handle radio buttons', async ({ page }) => {
    const personalRadio = page.locator('input[name="account-type"][value="personal"]');
    const businessRadio = page.locator('input[name="account-type"][value="business"]');

    await expect(personalRadio).not.toBeChecked();
    await expect(businessRadio).not.toBeChecked();

    await personalRadio.check();
    await expect(personalRadio).toBeChecked();
    await expect(businessRadio).not.toBeChecked();

    await businessRadio.check();
    await expect(businessRadio).toBeChecked();
    await expect(personalRadio).not.toBeChecked();
  });

  test('should handle textarea', async ({ page }) => {
    const bioTextarea = page.locator('#bio');

    await bioTextarea.fill('This is a multi-line\nbio text with special characters: !@#$%^&*()');
    await expect(bioTextarea).toHaveValue('This is a multi-line\nbio text with special characters: !@#$%^&*()');
  });

  test('should use getByRole for form elements', async ({ page }) => {
    await page.getByLabel('Username:').fill('testuser');
    await page.getByLabel('Email:').fill('user@example.com');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.locator('#message')).toContainText('Registration: testuser');
  });

  test('should use getByPlaceholder', async ({ page }) => {
    await page.getByPlaceholder('Choose a username').fill('placeholder_user');
    await page.getByPlaceholder('Enter your email').fill('placeholder@example.com');
    await page.getByPlaceholder('Tell us about yourself').fill('Placeholder bio text');

    await expect(page.locator('#username')).toHaveValue('placeholder_user');
    await expect(page.locator('#register-email')).toHaveValue('placeholder@example.com');
    await expect(page.locator('#bio')).toHaveValue('Placeholder bio text');
  });
});