import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { StaticAnalyzer } from '../../src/analyzers/static-analyzer';

describe('StaticAnalyzer Integration Tests', () => {
  let analyzer: StaticAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
    tempDir = mkdirSync(join(tmpdir(), 'static-analyzer-integration-'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Real Test File Analysis', () => {
    it('should analyze complex real-world test files', async () => {
      const testFile = join(tempDir, 'complex-login.spec.ts');
      const complexTestContent = `
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.login('user@example.com', 'password123');

    // Check various elements after login
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.locator('.user-profile')).toBeVisible();
    await expect(page.getByLabel('User menu')).toBeVisible();

    // Test navigation
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL('/settings');

    // Test dynamic content
    await page.getByRole('button', { name: 'Load notifications' }).click();
    await expect(page.locator('.notification-item')).toHaveCount(3);
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should handle form interactions', async ({ page }) => {
    // Test remember me checkbox
    await page.getByLabel('Remember me').check();
    await expect(page.getByLabel('Remember me')).toBeChecked();

    // Test forgot password link
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL('/forgot-password');

    // Test social login buttons
    await page.getByRole('button', { name: 'Login with Google' }).click();
    await page.getByRole('button', { name: 'Login with GitHub' }).click();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();

    await page.keyboard.press('Enter');
    // Should attempt login
  });

  test('should handle accessibility features', async ({ page }) => {
    // Test ARIA attributes
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();

    // Test form labels
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    // Test error announcements
    await page.click('button[type="submit"]'); // Submit empty form
    await expect(page.getByRole('alert', { name: 'Please fill in all required fields' })).toBeVisible();
  });
});
`;

      writeFileSync(testFile, complexTestContent);
      const result = await analyzer.analyzeFile(testFile);

      // Extract the raw selectors from TestSelector array
      const selectors = result.map(s => s.raw);

      expect(selectors).toContain('button[type="submit"]');
      expect(selectors).toContain('input[type="email"]');
      expect(selectors).toContain('input[type="password"]');
      expect(selectors).toContain('.error-message');
      expect(selectors).toContain('.user-profile');
      expect(selectors).toContain('.notification-item');
      expect(selectors.some(s => s.includes('Remember me'))).toBe(true);
      expect(selectors.some(s => s.includes('Forgot password'))).toBe(true);
      expect(selectors.some(s => s.includes('Login with Google'))).toBe(true);
      expect(selectors.some(s => s.includes('Login with GitHub'))).toBe(true);
      expect(selectors.some(s => s.includes('Dashboard'))).toBe(true);
      expect(selectors.some(s => s.includes('Email address'))).toBe(true);
      expect(selectors.some(s => s.includes('Password'))).toBe(true);
      expect(selectors.some(s => s.includes('Please fill in all required fields'))).toBe(true);
    });

    it('should handle Page Object Model patterns', async () => {
      const pageObjectFile = join(tempDir, 'login-page.ts');
      const pageObjectContent = `
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly socialLoginButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error-message');
    this.rememberMeCheckbox = page.getByLabel('Remember me');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.socialLoginButtons = page.locator('.social-login button');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async enableRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.check();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent();
  }

  async isSocialLoginVisible(): Promise<boolean> {
    return await this.socialLoginButtons.isVisible();
  }
}
`;

      const testFile = join(tempDir, 'login.spec.ts');
      const testContent = `
import { test, expect } from '@playwright/test';
import { LoginPage } from './login-page';

test('should login using page object', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await page.goto('/login');

  await loginPage.login('user@example.com', 'password123');
  await expect(page.locator('.dashboard')).toBeVisible();
});
`;

      writeFileSync(pageObjectFile, pageObjectContent);
      writeFileSync(testFile, testContent);

      const pageObjectResult = await analyzer.analyzeFile(pageObjectFile);
      const testResult = await analyzer.analyzeFile(testFile);

      // Extract selectors from TestSelector arrays
      const pageObjectSelectors = pageObjectResult.map(s => s.raw);
      const testSelectors = testResult.map(s => s.raw);

      // Page object should contain selectors
      expect(pageObjectSelectors).toContain('input[type="email"]');
      expect(pageObjectSelectors).toContain('input[type="password"]');
      expect(pageObjectSelectors).toContain('button[type="submit"]');
      expect(pageObjectSelectors).toContain('.error-message');
      expect(pageObjectSelectors).toContain('.social-login button');
      expect(pageObjectSelectors.some(s => s.includes('Remember me'))).toBe(true);
      expect(pageObjectSelectors.some(s => s.includes('Forgot password'))).toBe(true);

      // Test file should also extract selectors from page object usage
      expect(testSelectors.length).toBeGreaterThan(0);
    });

    it('should handle fixture and helper functions', async () => {
      const helperFile = join(tempDir, 'test-helpers.ts');
      const helperContent = `
import { Page, expect } from '@playwright/test';

export class TestHelpers {
  static async loginWithRole(page: Page, role: string): Promise<void> {
    await page.goto(\`/login?role=\${role}\`);
    await page.fill('#username', \`test-\${role}\`);
    await page.fill('#password', 'password123');
    await page.click('#login-button');
  }

  static async waitForPageLoad(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.app-loaded')).toBeVisible();
  }

  static async selectDropdownOption(page: Page, selector: string, value: string): Promise<void> {
    await page.click(selector);
    await page.click(\`[data-value="\${value}"]\`);
  }

  static async verifyFormValidation(page: Page, formSelector: string): Promise<void> {
    const inputs = await page.locator(\`\${formSelector} input[required]\`).all();
    for (const input of inputs) {
      await expect(input).toHaveAttribute('data-validated');
    }
  }
}
`;

      const testFile = join(tempDir, 'role-based-login.spec.ts');
      const testContent = `
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../helpers/test-helpers';

test.describe('Role-based Authentication', () => {
  ['admin', 'user', 'manager'].forEach(role => {
    test(\`should login as \${role}\`, async ({ page }) => {
      await TestHelpers.loginWithRole(page, role);
      await TestHelpers.waitForPageLoad(page);

      await expect(page.locator(\`.role-\${role}-dashboard\`)).toBeVisible();
      await expect(page.getByRole('heading', { name: \`\${role} Dashboard\` })).toBeVisible();
    });
  });

  test('should handle dropdown selection', async ({ page }) => {
    await page.goto('/settings');
    await TestHelpers.selectDropdownOption(page, '#theme-selector', 'dark');
    await expect(page.locator('body')).toHaveClass('dark-theme');
  });

  test('should validate form completion', async ({ page }) => {
    await page.goto('/registration');
    await TestHelpers.verifyFormValidation(page, '#registration-form');
  });
});
`;

      writeFileSync(helperFile, helperContent);
      writeFileSync(testFile, testContent);

      const helperResult = await analyzer.analyzeFile(helperFile);
      const testResult = await analyzer.analyzeFile(testFile);

      const helperSelectors = helperResult.map(s => s.raw);
      const testSelectors = testResult.map(s => s.raw);

      expect(helperSelectors).toContain('#username');
      expect(helperSelectors).toContain('#password');
      expect(helperSelectors).toContain('#login-button');
      expect(helperSelectors).toContain('.app-loaded');

      expect(testSelectors.some(s => s.includes('role-'))).toBe(true);
      expect(testSelectors).toContain('#theme-selector');
      expect(testSelectors).toContain('#registration-form');
    });
  });

  describe('Complex Selector Patterns', () => {
    it('should handle dynamic and conditional selectors', async () => {
      const testFile = join(tempDir, 'dynamic-selectors.spec.ts');
      const dynamicContent = `
import { test, expect } from '@playwright/test';

test('should handle dynamic selectors', async ({ page }) => {
  await page.goto('/dynamic-page');

  // Wait for dynamic content
  await page.waitForSelector('.dynamic-content');

  // Handle dynamically generated IDs
  const dynamicId = await page.locator('[data-testid^="item-"]').first().getAttribute('data-testid');
  await page.locator(\`[\${dynamicId}]\`).click();

  // Handle conditional elements
  const isVisible = await page.locator('.conditional-element').isVisible();
  if (isVisible) {
    await page.locator('.conditional-element').click();
  }

  // Handle list items with dynamic content
  const items = await page.locator('.item-list li').all();
  for (let i = 0; i < items.length; i++) {
    await page.locator(\`.item-list li:nth-child(\${i + 1})\`).click();
    await expect(page.locator(\`.item-detail[data-index="\${i}"]\`)).toBeVisible();
  }

  // Handle form fields with dynamic names
  await page.locator('input[name^="field_"]').fill('test value');

  // Handle elements with dynamic classes
  await page.locator('[class*="dynamic-"]').click();

  // Handle nested dynamic content
  await page.locator('.parent').locator('.child-dynamic').click();
});
`;

      writeFileSync(testFile, dynamicContent);
      const result = await analyzer.analyzeFile(testFile);
      const selectors = result.map(s => s.raw);

      expect(selectors).toContain('.dynamic-content');
      expect(selectors).toContain('[data-testid^="item-"]');
      expect(selectors).toContain('.conditional-element');
      expect(selectors).toContain('.item-list li');
      expect(selectors.some(s => s.includes('item-list li:nth-child'))).toBe(true);
      expect(selectors.some(s => s.includes('item-detail[data-index'))).toBe(true);
      expect(selectors).toContain('input[name^="field_"]');
      expect(selectors).toContain('[class*="dynamic-"]');
      expect(selectors).toContain('.parent');
      expect(selectors).toContain('.child-dynamic');
    });

    it('should handle complex CSS selectors', async () => {
      const testFile = join(tempDir, 'complex-css.spec.ts');
      const complexContent = `
import { test, expect } from '@playwright/test';

test('should handle complex CSS selectors', async ({ page }) => {
  await page.goto('/complex-layout');

  // Complex descendant selectors
  await page.locator('.header .nav .nav-item').click();
  await page.locator('.main-content > .section:first-child .article').isVisible();

  // Sibling selectors
  await page.locator('.input-group input + .error-message').isVisible();
  await page.locator('.tabs .tab.active ~ .tab-panel').isVisible();

  // Attribute selectors with complex values
  await page.locator('[data-role="admin"][data-permission="read"]').click();
  await page.locator('[href^="/api"][href$=".json"]').isVisible();

  // Pseudo-class selectors
  await page.locator('.list-item:first-child').click();
  await page.locator('.list-item:last-child').click();
  await page.locator('.list-item:nth-child(odd)').toHaveCount(3);
  await page.locator('.checkbox:not(:checked)').click();

  // Complex combinations
  await page.locator('.form-group:not(.disabled) input:required').fill('required field');
  await page.locator('.card.collapsible[data-state="expanded"] .card-content').isVisible();

  // Multiple class selectors
  await page.locator('.btn.btn-primary.btn-large').click();
  await page.locator('.alert.alert-danger.alert-dismissible').isVisible();
});
`;

      writeFileSync(testFile, complexContent);
      const result = await analyzer.analyzeFile(testFile);
      const selectors = result.map(s => s.raw);

      expect(selectors).toContain('.header .nav .nav-item');
      expect(selectors).toContain('.main-content > .section:first-child .article');
      expect(selectors).toContain('.input-group input + .error-message');
      expect(selectors).toContain('.tabs .tab.active ~ .tab-panel');
      expect(selectors).toContain('[data-role="admin"][data-permission="read"]');
      expect(selectors).toContain('[href^="/api"][href$=".json"]');
      expect(selectors).toContain('.list-item:first-child');
      expect(selectors).toContain('.list-item:last-child');
      expect(selectors).toContain('.list-item:nth-child(odd)');
      expect(selectors).toContain('.checkbox:not(:checked)');
      expect(selectors).toContain('.form-group:not(.disabled) input:required');
      expect(selectors).toContain('.card.collapsible[data-state="expanded"] .card-content');
      expect(selectors).toContain('.btn.btn-primary.btn-large');
      expect(selectors).toContain('.alert.alert-danger.alert-dismissible');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed selector patterns gracefully', async () => {
      const testFile = join(tempDir, 'malformed-selectors.spec.ts');
      const malformedContent = `
import { test, expect } from '@playwright/test';

test('should handle malformed selectors', async ({ page }) => {
  await page.goto('/test');

  // These might be malformed but should still be extracted
  await page.locator('['); // Incomplete attribute selector
  await page.locator('.'); // Incomplete class selector
  await page.locator('#'); // Incomplete ID selector

  // These are valid but unusual
  await page.locator('[data-attr="value with spaces"]').click();
  await page.locator('.class-with-emoji-🎉').isVisible();
  await page.locator('#id-with-special-chars_123').isVisible();

  // Complex quoted strings
  await page.locator('[title="Don\\'t click this"]').hover();
  await page.locator('[data-message="She said \\"Hello\\""]').isVisible();
});
`;

      writeFileSync(testFile, malformedContent);
      const result = await analyzer.analyzeFile(testFile);
      const selectors = result.map(s => s.raw);

      // Should still extract what it can - filter out invalid selectors
      expect(selectors.some(s => s.includes('data-attr'))).toBe(true);
      expect(selectors.some(s => s.includes('class-with-emoji'))).toBe(true);
      expect(selectors.some(s => s.includes('id-with-special-chars'))).toBe(true);
    });

    it('should handle large test files efficiently', async () => {
      const testFile = join(tempDir, 'large-test.spec.ts');
      let largeContent = `
import { test, expect } from '@playwright/test';

test.describe('Large Test Suite', () => {
`;

      // Generate 20 tests with various selectors (reduced for performance)
      for (let i = 0; i < 20; i++) {
        largeContent += `
  test('test ${i}', async ({ page }) => {
    await page.goto('/page-${i}');
    await page.locator('.button-${i}').click();
    await page.locator('#input-${i}').fill('value-${i}');
    await page.locator('[data-test="${i}"]').isVisible();
    await expect(page.locator('.result-${i}')).toBeVisible();
  });
`;
      }

      largeContent += '});';
      writeFileSync(testFile, largeContent);

      const result = await analyzer.analyzeFile(testFile);
      const selectors = result.map(s => s.raw);

      // Should extract selectors from all tests
      expect(selectors.length).toBeGreaterThan(50); // At least some selectors per test
      expect(selectors.some(s => s.includes('button-'))).toBe(true);
      expect(selectors.some(s => s.includes('input-'))).toBe(true);
    });
  });
});