import { test, expect } from '@playwright/test';

test.describe('Interactive Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + __dirname + '/../sample-app.html');
  });

  test('should handle navigation links', async ({ page }) => {
    const links = [
      { selector: '#home-link', expectedText: 'Home' },
      { selector: '#about-link', expectedText: 'About' },
      { selector: '#contact-link', expectedText: 'Contact' },
      { selector: '#dashboard-link', expectedText: 'Dashboard' }
    ];

    for (const link of links) {
      await page.click(link.selector);
      await expect(page.locator('#message')).toBeVisible();
      await expect(page.locator('#message')).toContainText(`Navigated to ${link.expectedText}`);
    }
  });

  test('should handle interactive cards', async ({ page }) => {
    const cards = [
      { cardSelector: '[data-testid="card-1"]', buttonSelector: '[data-testid="card-1-button"]', name: 'Card 1' },
      { cardSelector: '[data-testid="card-2"]', buttonSelector: '[data-testid="card-2-button"]', name: 'Card 2' },
      { cardSelector: '[data-testid="card-3"]', buttonSelector: '[data-testid="card-3-button"]', name: 'Card 3' }
    ];

    for (const card of cards) {
      // Verify card is visible
      await expect(page.locator(card.cardSelector)).toBeVisible();

      // Click card button
      await page.click(card.buttonSelector);

      // Verify message
      await expect(page.locator('#message')).toBeVisible();
      await expect(page.locator('#message')).toContainText(`${card.name} button clicked!`);

      // Clear message for next iteration
      await page.evaluate(() => {
        document.getElementById('message').style.display = 'none';
      });
    }
  });

  test('should handle action buttons', async ({ page }) => {
    // Success button
    await page.click('[data-testid="success-button"]');
    await expect(page.locator('#message')).toContainText('This is a success message!');
    await expect(page.locator('#message')).toHaveClass(/success/);

    // Clear message
    await page.evaluate(() => {
      document.getElementById('message').style.display = 'none';
    });

    // Error button
    await page.click('[data-testid="error-button"]');
    await expect(page.locator('#message')).toContainText('This is an error message!');
    await expect(page.locator('#message')).toHaveClass(/error/);

    // Clear message
    await page.evaluate(() => {
      document.getElementById('message').style.display = 'none';
    });

    // Toggle button
    const forms = page.locator('.form-section');
    await expect(forms.first()).toBeVisible();

    await page.click('[data-testid="toggle-button"]');
    await expect(forms.first()).toBeHidden();

    await page.click('[data-testid="toggle-button"]');
    await expect(forms.first()).toBeVisible();
  });

  test('should use getByText for text-based selection', async ({ page }) => {
    await page.getByText('Login').click();
    await expect(page.locator('#message')).toContainText('Login attempted');

    await page.evaluate(() => {
      document.getElementById('message').style.display = 'none';
    });

    await page.getByText('Forgot Password?').click();
    await expect(page.locator('#message')).toContainText('Password reset link sent');
  });

  test('should use getByTitle for elements with titles', async ({ page }) => {
    // Note: Our sample doesn't have title attributes, but this shows how to use it
    // await page.getByTitle('Help').click();
  });

  test('should handle form validation with getByLabel', async ({ page }) => {
    await page.getByLabel('Email:').fill('test@example.com');
    await page.getByLabel('Password:').fill('password123');
    await page.getByLabel('Remember me').check();

    await expect(page.locator('#email')).toHaveValue('test@example.com');
    await expect(page.locator('#password')).toHaveValue('password123');
    await expect(page.locator('#remember')).toBeChecked();
  });

  test('should handle complex selectors', async ({ page }) => {
    // CSS selector with attribute
    await page.click('button[id="login-btn"]');
    await expect(page.locator('#message')).toContainText('Login button clicked');

    // CSS selector with class
    await page.click('button.secondary');
    await expect(page.locator('#message')).toContainText('Password reset link sent');

    // CSS selector with data attribute
    await page.click('[data-testid="success-button"]');
    await expect(page.locator('#message')).toContainText('success message');
  });

  test('should use CSS combinators', async ({ page }) => {
    // Child selector
    await page.click('.form-section > form > button[type="submit"]');
    await expect(page.locator('#message')).toContainText('Login attempted');

    // Descendant selector
    await page.click('.container footer p');
    // This won't do anything but shows the selector type

    // Adjacent sibling
    await page.click('h2 + form #email');
    await page.locator('h2 + form #email').fill('adjacent@example.com');
  });
});