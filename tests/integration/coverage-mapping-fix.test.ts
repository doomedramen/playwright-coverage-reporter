import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { CoverageAggregator } from '../../src/utils/coverage-aggregator';
import { PlaywrightCoverageReporter } from '../../src/reporter/coverage-reporter';
import { PageElement, ElementType } from '../../src/types';

describe('Coverage Mapping Fix Integration Tests', () => {
  let tempDir: string;
  let aggregator: CoverageAggregator;
  let reporter: PlaywrightCoverageReporter;

  beforeEach(() => {
    tempDir = mkdirSync(join(tmpdir(), 'coverage-mapping-test-'), { recursive: true });
    aggregator = new CoverageAggregator(tempDir);
    reporter = new PlaywrightCoverageReporter({
      outputPath: tempDir,
      format: 'console',
      threshold: 0,
      verbose: true,
      debugMode: true,
      cleanupDuplicates: true,
      runtimeDiscovery: true,
      elementDiscovery: false
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Selector Normalization Consistency', () => {
    it('should normalize selectors consistently between static analysis and test execution', () => {
      // Test the actual selectors from the user's report
      const testCases = [
        {
          input: 'input[name="email"]',
          expectedStatic: 'input[name=email]',
          expectedReporter: 'input[name="email"]',
          expectedMatching: 'input[name=email]',
          type: 'clickable-element'
        },
        {
          input: 'input[name=\'password\']',
          expectedStatic: 'input[name=password]',
          expectedReporter: 'input[name=\'password\']',
          expectedMatching: 'input[name=password]',
          type: 'clickable-element'
        },
        {
          input: 'button[type="submit"]',
          expectedStatic: 'button[type=submit]',
          expectedReporter: 'button[type="submit"]',
          expectedMatching: 'button[type=submit]',
          type: 'clickable-element'
        },
        {
          input: '.success-message',
          expectedStatic: '.success-message',
          expectedReporter: '.success-message',
          expectedMatching: '.success-message',
          type: 'text-element'
        }
      ];

      testCases.forEach(({ input, expectedStatic, expectedReporter, expectedMatching, type }) => {
        // Test static analyzer normalization
        const staticNormalized = normalizeSelectorForStatic(input);
        expect(staticNormalized).toBe(expectedStatic);

        // Test reporter normalization
        const reporterNormalized = normalizeSelectorForReporter(input);
        expect(reporterNormalized).toBe(expectedReporter);

        // Test aggregator normalization for matching
        const aggregatorNormalized = normalizeSelectorForMatching(input);
        expect(aggregatorNormalized).toBe(expectedMatching);
      });
    });

    it('should handle complex CSS selectors with quotes', () => {
      const complexSelectors = [
        'input[data-testid="email-input"]',
        'button[aria-label="Submit Form"]',
        'select[name="country"]',
        'div[class="form-group"] input[type="text"]'
      ];

      complexSelectors.forEach(selector => {
        const staticNormalized = normalizeSelectorForStatic(selector);
        const reporterNormalized = normalizeSelectorForReporter(selector);
        const matchingNormalized = normalizeSelectorForMatching(selector);

        // Static removes quotes, reporter preserves them, matching removes them
        expect(staticNormalized).not.toContain('"');
        expect(staticNormalized).not.toContain("'");

        expect(matchingNormalized).not.toContain('"');
        expect(matchingNormalized).not.toContain("'");

        // Static and matching should be the same
        expect(staticNormalized).toBe(matchingNormalized);
      });
    });
  });

  describe('Coverage Mapping with Different Selector Formats', () => {
    it('should map coverage when selectors have different quote styles', () => {
      // Create discovered elements with quoted selectors (from static analysis)
      const discoveredElements: PageElement[] = [
        {
          selector: 'input[name=email]',
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          id: 'email',
          class: 'form-control',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        },
        {
          selector: 'input[name=password]',
          type: ElementType.INPUT,
          text: 'input[name="password"]',
          id: 'password',
          class: 'form-control',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:11'
        }
      ];

      // Add discovered elements
      aggregator.addDiscoveredElements(discoveredElements, 'login.spec.ts', 'static-analysis');

      // Create coverage elements with quoted selectors (from test execution)
      const coverageElements: PageElement[] = [
        {
          selector: 'input[name="email"]', // Note: different quote style
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          id: 'email',
          class: 'form-control',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        },
        {
          selector: 'input[name=\'password\']', // Note: different quote style
          type: ElementType.INPUT,
          text: 'input[name="password"]',
          id: 'password',
          class: 'form-control',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        }
      ];

      // Mark elements as covered
      aggregator.markElementsCovered(coverageElements, 'login.spec.ts', 'should login with valid credentials', 'fill');

      // Generate coverage report
      const coverage = aggregator.generateAggregatedCoverage();

      // Verify coverage mapping worked
      expect(coverage.totalElements).toBe(2);
      expect(coverage.coveredElements).toBe(2);
      expect(coverage.coveragePercentage).toBe(100);
    });

    it('should handle attribute selectors with various quote combinations', () => {
      const testCases = [
        { discovered: 'button[type=submit]', covered: 'button[type="submit"]' },
        { discovered: 'input[name=email]', covered: 'input[name=\'email\']' },
        { discovered: 'select[data-testid="country-select"]', covered: 'select[data-testid=country-select]' },
        { discovered: 'div[class="container"]', covered: 'div[class=\'container\']' }
      ];

      testCases.forEach(({ discovered, covered }) => {
        // Create discovered element
        const discoveredElement: PageElement = {
          selector: discovered,
          type: ElementType.CLICKABLE_ELEMENT,
          text: discovered,
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        };

        // Create coverage element
        const coverageElement: PageElement = {
          selector: covered,
          type: ElementType.CLICKABLE_ELEMENT,
          text: covered,
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        };

        aggregator.addDiscoveredElements([discoveredElement], 'test.spec.ts', 'static-analysis');
        aggregator.markElementsCovered([coverageElement], 'test.spec.ts', 'test case', 'click');

        const coverage = aggregator.generateAggregatedCoverage();
        expect(coverage.coveredElements).toBe(1);
        expect(coverage.coveragePercentage).toBe(100);

        // Reset for next test case
        aggregator.clearAllData();
      });
    });
  });

  describe('Duplicate Selector Cleanup', () => {
    it('should merge duplicate selectors with different quote styles', () => {
      // Add duplicate elements with different quote styles
      const duplicateElements: PageElement[] = [
        {
          selector: 'input[name=email]',
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test1.spec.ts:10'
        },
        {
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test2.spec.ts:15'
        },
        {
          selector: 'input[name=\'email\']',
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'runtime-discovery',
          discoveryContext: 'page1'
        }
      ];

      aggregator.addDiscoveredElements(duplicateElements, 'test.spec.ts', 'duplicate-test');

      // Before cleanup: should have 3 elements
      let coverage = aggregator.generateAggregatedCoverage();
      expect(coverage.totalElements).toBe(3);

      // Run cleanup
      aggregator.cleanupDuplicates();

      // After cleanup: should have 1 element
      coverage = aggregator.generateAggregatedCoverage();
      expect(coverage.totalElements).toBe(1);
    });

    it('should preserve coverage data during cleanup', () => {
      // Add element with coverage
      const element: PageElement = {
        selector: 'input[name=email]',
        type: ElementType.INPUT,
        text: 'input[name="email"]',
        isVisible: true,
        isEnabled: true,
        discoverySource: 'static-analysis',
        discoveryContext: 'test.spec.ts:10'
      };

      aggregator.addDiscoveredElements([element], 'test.spec.ts', 'static-analysis');

      // Mark as covered
      const coverageElement: PageElement = {
        selector: 'input[name="email"]',
        type: ElementType.INPUT,
        text: 'input[name="email"]',
        isVisible: true,
        isEnabled: true,
        discoverySource: 'test-execution',
        discoveryContext: 'test-execution-12345'
      };

      aggregator.markElementsCovered([coverageElement], 'test.spec.ts', 'test case', 'fill');

      // Verify coverage before cleanup
      let coverage = aggregator.generateAggregatedCoverage();
      expect(coverage.coveredElements).toBe(1);
      expect(coverage.coveragePercentage).toBe(100);

      // Add duplicate
      const duplicateElement: PageElement = {
        selector: 'input[name=\'email\']',
        type: ElementType.INPUT,
        text: 'input[name="email"]',
        isVisible: true,
        isEnabled: true,
        discoverySource: 'runtime-discovery',
        discoveryContext: 'page1'
      };

      aggregator.addDiscoveredElements([duplicateElement], 'test.spec.ts', 'duplicate-test');

      // Now should have 2 elements total, but still 1 covered
      coverage = aggregator.generateAggregatedCoverage();
      expect(coverage.totalElements).toBe(2);
      expect(coverage.coveredElements).toBe(1);
      expect(coverage.coveragePercentage).toBe(50);

      // Run cleanup
      aggregator.cleanupDuplicates();

      // After cleanup: should have 1 element, still covered
      coverage = aggregator.generateAggregatedCoverage();
      expect(coverage.totalElements).toBe(1);
      expect(coverage.coveredElements).toBe(1);
      expect(coverage.coveragePercentage).toBe(100);
    });
  });

  describe('Real-World Test Scenarios', () => {
    it('should handle the user\'s login test scenario correctly', () => {
      // Simulate the user's login test scenario
      const loginTestSelectors = [
        'input[name="email"]',
        'input[name="password"]',
        'button[type="submit"]',
        '.success-message'
      ];

      // Add discovered elements (from static analysis)
      const discoveredElements: PageElement[] = loginTestSelectors.map((selector, index) => ({
        selector: selector.replace(/['"]/g, ''), // Static analyzer removes quotes
        type: selector.includes('button') ? ElementType.CLICKABLE_ELEMENT : ElementType.INPUT,
        text: selector,
        isVisible: true,
        isEnabled: true,
        discoverySource: 'static-analysis',
        discoveryContext: `login.spec.ts:${10 + index}`
      }));

      aggregator.addDiscoveredElements(discoveredElements, 'login.spec.ts', 'static-analysis');

      // Simulate test execution with quoted selectors
      const testExecutionElements: PageElement[] = [
        {
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'input[name="email"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        },
        {
          selector: 'input[name="password"]',
          type: ElementType.INPUT,
          text: 'input[name="password"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        },
        {
          selector: 'button[type="submit"]',
          type: ElementType.CLICKABLE_ELEMENT,
          text: 'button[type="submit"]',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test-execution',
          discoveryContext: 'test-execution-12345'
        }
      ];

      aggregator.markElementsCovered(testExecutionElements, 'login.spec.ts', 'should login successfully with valid credentials', 'fill');

      // Generate coverage report
      const coverage = aggregator.generateAggregatedCoverage();

      // Verify the fix worked
      expect(coverage.totalElements).toBe(4);
      expect(coverage.coveredElements).toBe(3);
      expect(coverage.coveragePercentage).toBe(75); // 3 out of 4 elements covered

      // Verify uncovered elements
      expect(coverage.uncoveredElements).toHaveLength(1);
      expect(coverage.uncoveredElements[0].selector).toBe('.success-message');
    });

    it('should handle complex selectors from real applications', () => {
      const complexSelectors = [
        'form[id="login-form"] input[name="email"]',
        '.form-group:nth-child(2) input[type="password"]',
        'button[type="submit"][disabled]',
        '[data-testid="login-button"].btn-primary',
        '.alert.alert-danger[role="alert"]'
      ];

      // Add discovered elements
      const discoveredElements: PageElement[] = complexSelectors.map((selector, index) => ({
        selector: selector.replace(/['"]/g, ''), // Static analyzer removes quotes
        type: ElementType.CLICKABLE_ELEMENT,
        text: selector,
        isVisible: true,
        isEnabled: true,
        discoverySource: 'static-analysis',
        discoveryContext: `complex.spec.ts:${10 + index}`
      }));

      aggregator.addDiscoveredElements(discoveredElements, 'complex.spec.ts', 'static-analysis');

      // Simulate partial test coverage
      const coveredSelectors = [
        'form[id=login-form] input[name=email]',
        '.form-group:nth-child(2) input[type=password]',
        '[data-testid=login-button].btn-primary'
      ];

      const coveredElements: PageElement[] = coveredSelectors.map((selector, index) => ({
        selector: selector,
        type: ElementType.CLICKABLE_ELEMENT,
        text: selector,
        isVisible: true,
        isEnabled: true,
        discoverySource: 'test-execution',
        discoveryContext: 'test-execution-12345'
      }));

      aggregator.markElementsCovered(coveredElements, 'complex.spec.ts', 'complex test scenario', 'click');

      // Generate coverage report
      const coverage = aggregator.generateAggregatedCoverage();

      // Verify complex selector handling
      expect(coverage.totalElements).toBe(5);
      expect(coverage.coveredElements).toBe(3);
      expect(coverage.coveragePercentage).toBe(60);

      // Verify specific uncovered elements
      const uncoveredSelectors = coverage.uncoveredElements.map(el => el.selector);
      expect(uncoveredSelectors).toContain('button[type=submit][disabled]');
      expect(uncoveredSelectors).toContain('.alert.alert-danger[role=alert]');
    });
  });
});

// Helper functions to simulate the normalization from different parts of the system
function normalizeSelectorForStatic(selector: string): string {
  // Simulate static analyzer normalization (preserves attribute values)
  let normalized = selector.replace(/['"]/g, '').trim();
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
}

function normalizeSelectorForReporter(selector: string): string {
  // Simulate the reporter normalization - it preserves quotes from actual runtime
  return selector.trim();
}

function normalizeSelectorForMatching(selector: string): string {
  // Simulate aggregator normalization for matching (more aggressive)
  let normalized = selector.replace(/(\w+)=['"`]([^'"`]*)['"`]/g, '$1=$2');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}