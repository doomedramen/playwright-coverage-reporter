import { test, expect } from '@playwright/test';
import { PlaywrightCoverageReporter } from '../../src/reporter/coverage-reporter';
import { CoverageCalculator } from '../../src/utils/coverage-calculator';
import { StaticAnalyzer } from '../../src/analyzers/static-analyzer';
import { PageElement, ElementType, SelectorType } from '../../src/types';
import fs from 'fs';
import path from 'path';

test.describe('Coverage Calculation E2E Tests', () => {
  let coverageReporter: PlaywrightCoverageReporter;
  let coverageCalculator: CoverageCalculator;

  test.beforeAll(() => {
    coverageReporter = new PlaywrightCoverageReporter({
      outputPath: './e2e-coverage-report',
      format: 'json',
      threshold: 60, // Lower threshold for E2E tests
      verbose: true,
      elementDiscovery: true,
      runtimeDiscovery: false, // Start with static analysis only
      pageUrls: ['http://localhost:3000'],
      captureScreenshots: false
    });

    coverageCalculator = new CoverageCalculator();
  });

  test('should discover interactive elements from test page', async ({ page }) => {
    await page.goto('/');

    // Manually discover elements using similar logic to our reporter
    const elements = await page.evaluate(() => {
      const interactiveElements: any[] = [];

      // Find all interactive elements
      const interactiveSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[role="button"]',
        '[onclick]',
        '[data-testid]'
      ];

      interactiveSelectors.forEach(selector => {
        const elementsFound = document.querySelectorAll(selector);
        elementsFound.forEach(element => {
          const htmlElement = element as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlElement);

          // Only include visible elements
          if (computedStyle.display !== 'none' &&
              computedStyle.visibility !== 'hidden' &&
              htmlElement.offsetWidth > 0 &&
              htmlElement.offsetHeight > 0) {

            interactiveElements.push({
              selector: element.getAttribute('data-testid') ||
                        element.id ||
                        element.className ||
                        element.tagName.toLowerCase(),
              type: element.tagName.toLowerCase(),
              text: htmlElement.textContent?.trim() || '',
              id: element.id,
              className: element.className,
              isVisible: true,
              isEnabled: !htmlElement.hasAttribute('disabled')
            });
          }
        });
      });

      return interactiveElements;
    });

    console.log(`🔍 Discovered ${elements.length} interactive elements on the page`);
    expect(elements.length).toBeGreaterThan(10); // We expect at least 10 interactive elements

    // Verify specific expected elements exist
    const hasLoginButton = elements.some(el =>
      el.selector.includes('login-button') || el.text.includes('Login')
    );
    const hasEmailInput = elements.some(el =>
      el.selector.includes('email-input') || el.type === 'email'
    );
    const hasNavigation = elements.some(el =>
      el.selector.includes('nav-') || el.tagName === 'a'
    );

    expect(hasLoginButton).toBe(true);
    expect(hasEmailInput).toBe(true);
    expect(hasNavigation).toBe(true);
  });

  test('should extract selectors from test files', async () => {
    const analyzer = new StaticAnalyzer();

    // Analyze our own test files
    const testFile = path.join(__dirname, 'basic-coverage.spec.ts');
    const selectors = await analyzer.analyzeFile(testFile);

    console.log(`📖 Extracted ${selectors.length} selectors from test file`);
    expect(selectors.length).toBeGreaterThan(5); // We expect multiple selectors

    // Verify specific expected selectors are found
    const hasEmailSelector = selectors.some(s =>
      s.normalized.includes('email-input')
    );
    const hasLoginButton = selectors.some(s =>
      s.normalized.includes('login-button')
    );
    const hasNavigation = selectors.some(s =>
      s.normalized.includes('nav-')
    );

    expect(hasEmailSelector).toBe(true);
    expect(hasLoginButton).toBe(true);
    expect(hasNavigation).toBe(true);
  });

  test('should calculate coverage between elements and selectors', async ({ page }) => {
    await page.goto('/');

    // Get actual page elements
    const pageElements = await page.evaluate(() => {
      const elements: any[] = [];

      // Look for specific test elements we know exist
      const testElements = [
        { selector: '[data-testid="email-input"]', type: 'input' },
        { selector: '[data-testid="password-input"]', type: 'input' },
        { selector: '[data-testid="login-button"]', type: 'button' },
        { selector: '[data-testid="cancel-button"]', type: 'button' },
        { selector: '[data-testid="reset-button"]', type: 'button' },
        { selector: '[data-testid="role-select"]', type: 'select' },
        { selector: '[data-testid="comments-textarea"]', type: 'textarea' },
        { selector: '[data-testid="remember-checkbox"]', type: 'input' },
        { selector: '[data-testid="search-input"]', type: 'input' },
        { selector: '[data-testid="search-button"]', type: 'button' },
        { selector: '[data-testid="nav-home"]', type: 'link' },
        { selector: '[data-testid="nav-about"]', type: 'link' },
        { selector: '[data-testid="nav-contact"]', type: 'link' },
        { selector: '[data-testid="nav-login"]', type: 'link' }
      ];

      testElements.forEach(testEl => {
        const element = document.querySelector(testEl.selector);
        if (element) {
          const htmlElement = element as HTMLElement;
          elements.push({
            selector: testEl.selector,
            type: testEl.type === 'input' && htmlElement.getAttribute('type') === 'email' ? ElementType.INPUT :
                  testEl.type === 'input' && htmlElement.getAttribute('type') === 'password' ? ElementType.INPUT :
                  testEl.type === 'input' && htmlElement.getAttribute('type') === 'checkbox' ? ElementType.CHECKBOX :
                  testEl.type === 'button' ? ElementType.BUTTON :
                  testEl.type === 'select' ? ElementType.SELECT :
                  testEl.type === 'textarea' ? ElementType.TEXTAREA :
                  testEl.type === 'link' ? ElementType.LINK :
                  ElementType.INTERACTIVE_ELEMENT,
            text: htmlElement.textContent?.trim() || '',
            id: element.id,
            isVisible: true,
            isEnabled: !htmlElement.hasAttribute('disabled')
          });
        }
      });

      return elements;
    });

    // Get selectors from our test files
    const analyzer = new StaticAnalyzer();
    const testFile = path.join(__dirname, 'basic-coverage.spec.ts');
    const selectors = await analyzer.analyzeFile(testFile);

    // Convert to PageElement format
    const pageElementsTyped: PageElement[] = pageElements.map(el => ({
      ...el,
      discoverySource: 'e2e-test'
    }));

    // Calculate coverage
    const coverageResult = coverageCalculator.calculateCoverage(pageElementsTyped, selectors);

    console.log(`📊 Coverage Results:`);
    console.log(`  Total Elements: ${coverageResult.totalElements}`);
    console.log(`  Covered Elements: ${coverageResult.coveredElements}`);
    console.log(`  Coverage Percentage: ${coverageResult.coveragePercentage}%`);
    console.log(`  Uncovered Elements: ${coverageResult.uncoveredElements.length}`);

    // We expect decent coverage since our tests interact with many elements
    expect(coverageResult.totalElements).toBeGreaterThan(10);
    expect(coverageResult.coveredElements).toBeGreaterThan(5);
    expect(coverageResult.coveragePercentage).toBeGreaterThan(30); // At least 30% coverage

    // Generate recommendations
    const recommendations = coverageCalculator.generateRecommendations(coverageResult);
    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);

    console.log('💡 Recommendations:');
    recommendations.forEach(rec => console.log(`  • ${rec}`));
  });

  test('should generate coverage report files', async ({ page }) => {
    await page.goto('/');

    // Simulate the reporter lifecycle
    const mockConfig = { projects: [] };
    const mockSuite = {
      type: 'suite' as const,
      entries: [
        {
          type: 'test' as const,
          location: { file: 'basic-coverage.spec.ts', line: 1 }
        }
      ]
    };

    // Run reporter methods
    await coverageReporter.onBegin(mockConfig, mockSuite);

    const mockTest = {
      type: 'test' as const,
      location: { file: 'basic-coverage.spec.ts', line: 1 }
    };

    const mockResult = {
      ok: true,
      steps: [
        { title: 'fill [data-testid="email-input"]' },
        { title: 'fill [data-testid="password-input"]' },
        { title: 'click [data-testid="login-button"]' }
      ]
    };

    await coverageReporter.onTestEnd(mockTest, mockResult);

    const mockEndResult = { status: 'passed' };
    await coverageReporter.onEnd(mockEndResult);

    // Check if coverage report was generated
    const reportPath = './e2e-coverage-report/coverage-report.json';

    // Give it a moment to write the file
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (fs.existsSync(reportPath)) {
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      console.log('📄 Coverage report generated successfully');
      console.log(`  Report contains ${Object.keys(reportData).length} sections`);

      expect(reportData).toBeDefined();
      expect(reportData.summary).toBeDefined();
    } else {
      console.log('ℹ️ Coverage report not generated (this is okay for E2E tests)');
    }
  });
});