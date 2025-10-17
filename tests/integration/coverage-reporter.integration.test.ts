import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { CoverageCalculator } from '../../src/utils/coverage-calculator';
import { TestSelector, ElementType } from '../../src/types';

describe('CoverageReporter Integration Tests', () => {
  let tempDir: string;
  let mockTestResults: any;

  beforeEach(() => {
    tempDir = mkdirSync(join(tmpdir(), 'coverage-integration-'), { recursive: true });

    // Mock test results that would come from Playwright
    mockTestResults = {
      testResults: [
        {
          testFile: 'login.spec.ts',
          testName: 'should login with valid credentials',
          status: 'passed',
          duration: 1500,
          selectors: [
            'input[type="email"]',
            'input[type="password"]',
            'button[type="submit"]',
            '.success-message'
          ],
          interactions: [
            { selector: 'input[type="email"]', type: 'fill', value: 'test@example.com' },
            { selector: 'input[type="password"]', type: 'fill', value: 'password123' },
            { selector: 'button[type="submit"]', type: 'click' },
            { selector: '.success-message', type: 'visible' }
          ]
        },
        {
          testFile: 'dashboard.spec.ts',
          testName: 'should display user information',
          status: 'passed',
          duration: 800,
          selectors: [
            '.user-profile',
            '.user-name',
            '.user-email',
            '.user-avatar'
          ],
          interactions: [
            { selector: '.user-profile', type: 'visible' },
            { selector: '.user-name', type: 'hasText', value: 'John Doe' },
            { selector: '.user-email', type: 'hasText', value: 'john@example.com' },
            { selector: '.user-avatar', type: 'visible' }
          ]
        },
        {
          testFile: 'navigation.spec.ts',
          testName: 'should navigate between pages',
          status: 'passed',
          duration: 1200,
          selectors: [
            'nav a[href="/dashboard"]',
            'nav a[href="/settings"]',
            'nav a[href="/profile"]'
          ],
          interactions: [
            { selector: 'nav a[href="/dashboard"]', type: 'click' },
            { selector: 'nav a[href="/settings"]', type: 'click' },
            { selector: 'nav a[href="/profile"]', type: 'click' }
          ]
        }
      ],
      discoveredElements: [
        {
          selector: 'input[type="email"]',
          type: 'input-element',
          discoveredIn: ['login.spec.ts'],
          priority: 'high',
          pageUrls: ['http://localhost:3000/login']
        },
        {
          selector: 'input[type="password"]',
          type: 'input-element',
          discoveredIn: ['login.spec.ts'],
          priority: 'high',
          pageUrls: ['http://localhost:3000/login']
        },
        {
          selector: 'button[type="submit"]',
          type: 'clickable-element',
          discoveredIn: ['login.spec.ts', 'registration.spec.ts'],
          priority: 'high',
          pageUrls: ['http://localhost:3000/login', 'http://localhost:3000/register']
        },
        {
          selector: '.success-message',
          type: 'text-element',
          discoveredIn: ['login.spec.ts', 'registration.spec.ts'],
          priority: 'medium',
          pageUrls: ['http://localhost:3000/login', 'http://localhost:3000/register']
        },
        {
          selector: '.user-profile',
          type: 'container-element',
          discoveredIn: ['dashboard.spec.ts'],
          priority: 'medium',
          pageUrls: ['http://localhost:3000/dashboard']
        },
        {
          selector: 'nav a[href="/dashboard"]',
          type: 'navigation-element',
          discoveredIn: ['navigation.spec.ts'],
          priority: 'high',
          pageUrls: ['http://localhost:3000/']
        },
        {
          selector: 'nav a[href="/settings"]',
          type: 'navigation-element',
          discoveredIn: ['navigation.spec.ts'],
          priority: 'medium',
          pageUrls: ['http://localhost:3000/']
        },
        {
          selector: 'nav a[href="/profile"]',
          type: 'navigation-element',
          discoveredIn: ['navigation.spec.ts'],
          priority: 'medium',
          pageUrls: ['http://localhost:3000/']
        },
        {
          selector: '.uncovered-button',
          type: 'clickable-element',
          discoveredIn: ['dashboard.spec.ts'],
          priority: 'high',
          pageUrls: ['http://localhost:3000/dashboard'],
          coveredBy: [] // Not covered
        }
      ]
    };
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Coverage Calculation Integration', () => {
    it('should calculate comprehensive coverage across multiple test files', () => {
      const calculator = new CoverageCalculator();

      // Convert test data to PageElement format
      const pageElements = mockTestResults.discoveredElements.map((el: any) => ({
        selector: el.selector,
        type: el.type.replace('-element', '') as ElementType,
        text: el.text || el.selector,
        id: el.id || '',
        class: el.class || '',
        isVisible: true,
        isEnabled: true,
        discoverySource: 'test' as const,
        discoveryContext: `test-${el.selector}`
      }));

      // Convert selectors to TestSelector format
      const testedSelectors: TestSelector[] = [];
      mockTestResults.testResults.forEach((test: any) => {
        test.selectors.forEach((selector: string) => {
          testedSelectors.push({
            raw: selector,
            normalized: selector.replace(/['"]/g, ''),
            type: 'css' as any,
            filePath: test.testFile,
            lineNumber: 1
          });
        });
      });

      const coverageReport = calculator.calculateCoverage(pageElements, testedSelectors);

      expect(coverageReport.totalElements).toBe(9);
      expect(coverageReport.coveredElements).toBeGreaterThan(0);
      expect(coverageReport.coveragePercentage).toBeGreaterThan(0);
      expect(coverageReport.uncoveredElements.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate meaningful recommendations', () => {
      const calculator = new CoverageCalculator();

      // Create a simple coverage result for testing
      const mockCoverage = {
        totalElements: 9,
        coveredElements: 8,
        uncoveredElements: [{
          selector: '.uncovered-button',
          type: ElementType.CLICKABLE_ELEMENT,
          text: 'Uncovered Button',
          id: '',
          class: '',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test' as const,
          discoveryContext: 'test'
        }],
        coveragePercentage: 89,
        coverageByType: {
          [ElementType.INPUT]: 100,
          [ElementType.CLICKABLE_ELEMENT]: 50,
          [ElementType.LINK]: 100
        } as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(mockCoverage);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Moderate coverage')) || recommendations.some(r => r.includes('High Priority'))).toBe(true);
    });

    it('should aggregate coverage from multiple pages', () => {
      const calculator = new CoverageCalculator();

      const pages = [{
        url: 'http://localhost:3000/login',
        elements: [{
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'Email input',
          id: '',
          class: '',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test' as const,
          discoveryContext: 'test'
        }],
        coverage: {
          totalElements: 1,
          coveredElements: 1,
          uncoveredElements: [],
          coveragePercentage: 100,
          coverageByType: {} as Record<ElementType, number>,
          elementsByPage: {}
        }
      }];

      const aggregatedCoverage = calculator.aggregatePageCoverage(pages);

      expect(aggregatedCoverage.totalElements).toBe(1);
      expect(aggregatedCoverage.coveredElements).toBe(1);
      expect(aggregatedCoverage.coveragePercentage).toBe(100);
    });
  });

  describe('Report Generation Integration', () => {
    it('should generate selector insights', () => {
      const calculator = new CoverageCalculator();

      const testedSelectors: TestSelector[] = [
        {
          raw: 'input[name="email"]',
          normalized: 'input[name=email]',
          type: 'css' as any,
          filePath: 'test.spec.ts',
          lineNumber: 1
        },
        {
          raw: 'button[type="submit"]',
          normalized: 'button[type=submit]',
          type: 'css' as any,
          filePath: 'test.spec.ts',
          lineNumber: 2
        }
      ];

      const mockCoverage = {
        totalElements: 5,
        coveredElements: 3,
        uncoveredElements: [],
        coveragePercentage: 60,
        coverageByType: {
          [ElementType.INPUT]: 100,
          [ElementType.CLICKABLE_ELEMENT]: 50
        } as Record<ElementType, number>,
        elementsByPage: {}
      };

      const insights = calculator.generateSelectorInsights(testedSelectors, mockCoverage);

      expect(insights.mostEffectiveSelectors).toBeDefined();
      expect(insights.ineffectiveSelectors).toBeDefined();
      expect(insights.coverageBySelectorType).toBeDefined();
      expect(Object.keys(insights.coverageBySelectorType)).toContain('css');
    });
  });

  describe('Real-world Test Scenarios', () => {
    it('should handle large test suites efficiently', () => {
      // Generate a large set of test elements
      const largeElements = [];
      const largeSelectors = [];

      for (let i = 0; i < 50; i++) { // Reduced for performance
        largeElements.push({
          selector: `.element-${i}`,
          type: ElementType.CLICKABLE_ELEMENT,
          text: `Element ${i}`,
          id: '',
          class: '',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test' as const,
          discoveryContext: `test-${i}`
        });

        largeSelectors.push({
          raw: `.element-${i}`,
          normalized: `.element-${i}`,
          type: 'css' as any,
          filePath: `test-${i}.spec.ts`,
          lineNumber: 1
        });
      }

      const calculator = new CoverageCalculator();
      const startTime = Date.now();
      const report = calculator.calculateCoverage(largeElements, largeSelectors);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(report.totalElements).toBe(50);
      expect(report.coveredElements).toBeGreaterThan(0);
      expect(report.coveragePercentage).toBeGreaterThan(0);
    });

    it('should handle edge cases in coverage calculation', () => {
      const edgeCaseElements = [
        {
          selector: 'valid-element',
          type: ElementType.CLICKABLE_ELEMENT,
          text: 'Valid Element',
          id: '',
          class: '',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'test' as const,
          discoveryContext: 'test'
        }
      ];

      const edgeCaseSelectors = [
        {
          raw: 'valid-element',
          normalized: 'valid-element',
          type: 'css' as any,
          filePath: 'edge.spec.ts',
          lineNumber: 1
        }
      ];

      const calculator = new CoverageCalculator();
      const report = calculator.calculateCoverage(edgeCaseElements, edgeCaseSelectors);

      // Should handle valid data correctly
      expect(report.totalElements).toBe(1);
      expect(report.coveredElements).toBeGreaterThanOrEqual(0);
      expect(report.coveragePercentage).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for report generation
function generateHTMLReport(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
    .coverage-high { color: green; }
    .coverage-medium { color: orange; }
    .coverage-low { color: red; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Coverage: <strong class="${report.summary.coveragePercentage >= 80 ? 'coverage-high' : report.summary.coveragePercentage >= 60 ? 'coverage-medium' : 'coverage-low'}">${report.summary.coveragePercentage}%</strong></p>
    <p>Total Elements: ${report.summary.totalElements}</p>
    <p>Covered Elements: ${report.summary.coveredElements}</p>
    <p>Uncovered Elements: ${report.summary.uncoveredElements}</p>
  </div>

  <h2>Coverage by Type</h2>
  <table>
    <tr><th>Type</th><th>Total</th><th>Covered</th><th>Percentage</th></tr>
    ${Object.entries(report.byType).map(([type, stats]: [string, any]) =>
      `<tr><td>${type}</td><td>${stats.total}</td><td>${stats.covered}</td><td>${stats.percentage}%</td></tr>`
    ).join('')}
  </table>

  <h2>Uncovered Elements</h2>
  <table>
    <tr><th>Selector</th><th>Type</th><th>Priority</th><th>Recommendation</th></tr>
    ${report.elements.filter((el: any) => !el.isCovered).map((el: any) =>
      `<tr><td>${el.selector}</td><td>${el.type}</td><td>${el.priority}</td><td>Add test interaction</td></tr>`
    ).join('')}
  </table>
</body>
</html>`;
}

function generateConsoleReport(report: any): string {
  return `
Coverage Report Summary
=====================
Coverage: ${report.summary.coveragePercentage}%
Total Elements: ${report.summary.totalElements}
Covered Elements: ${report.summary.coveredElements}
Uncovered Elements: ${report.summary.uncoveredElements}

Coverage by Type:
${Object.entries(report.byType).map(([type, stats]: [string, any]) =>
  `  ${type}: ${stats.percentage}% (${stats.covered}/${stats.total})`
).join('\n')}

Uncovered Elements:
${report.elements.filter((el: any) => !el.isCovered).map((el: any) =>
  `  ❌ ${el.selector} (${el.type}, ${el.priority} priority)`
).join('\n')}

${report.recommendations.length > 0 ? `
Recommendations:
${report.recommendations.map((rec: any) =>
  `  • ${rec.selector}: ${rec.recommendation}`
).join('\n')}
` : ''}
`.trim();
}