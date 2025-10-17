import { describe, it, expect, beforeEach } from 'vitest';
import { CoverageCalculator } from '../../src/utils/coverage-calculator';
import { PageElement, TestSelector, ElementType, SelectorType } from '../../src/types';

describe('CoverageCalculator', () => {
  let calculator: CoverageCalculator;

  beforeEach(() => {
    calculator = new CoverageCalculator();
  });

  describe('calculateCoverage', () => {
    it('should calculate 0% coverage for no elements', () => {
      const elements: PageElement[] = [];
      const selectors: TestSelector[] = [];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.totalElements).toBe(0);
      expect(result.coveredElements).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.uncoveredElements).toHaveLength(0);
    });

    it('should calculate 0% coverage for uncovered elements', () => {
      const elements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        }
      ];
      const selectors: TestSelector[] = [];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.totalElements).toBe(1);
      expect(result.coveredElements).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.uncoveredElements).toHaveLength(1);
    });

    it('should calculate 100% coverage for all covered elements', () => {
      const elements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        }
      ];
      const selectors: TestSelector[] = [
        {
          raw: 'button[type="submit"]',
          normalized: 'button[type=submit]',
          type: SelectorType.CSS,
          filePath: 'test.spec.ts',
          lineNumber: 10
        }
      ];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.totalElements).toBe(1);
      expect(result.coveredElements).toBe(1);
      expect(result.coveragePercentage).toBe(100);
      expect(result.uncoveredElements).toHaveLength(0);
    });

    it('should calculate partial coverage correctly', () => {
      const elements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        },
        {
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'Email input',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:11'
        },
        {
          selector: '.error-message',
          type: ElementType.TEXT,
          text: 'Error message',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:12'
        }
      ];
      const selectors: TestSelector[] = [
        {
          raw: 'button[type="submit"]',
          normalized: 'button[type=submit]',
          type: SelectorType.CSS,
          filePath: 'test.spec.ts',
          lineNumber: 10
        },
        {
          raw: '.error-message',
          normalized: '.error-message',
          type: SelectorType.CSS,
          filePath: 'test.spec.ts',
          lineNumber: 12
        }
      ];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.totalElements).toBe(3);
      expect(result.coveredElements).toBe(2);
      expect(result.coveragePercentage).toBe(67); // rounded
      expect(result.uncoveredElements).toHaveLength(1);
      expect(result.uncoveredElements[0].selector).toBe('input[name="email"]');
    });

    it('should provide coverage by type', () => {
      const elements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        },
        {
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'Email input',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:11'
        },
        {
          selector: 'input[name="password"]',
          type: ElementType.INPUT,
          text: 'Password input',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:12'
        }
      ];
      const selectors: TestSelector[] = [
        {
          raw: 'button[type="submit"]',
          normalized: 'button[type=submit]',
          type: SelectorType.CSS,
          filePath: 'test.spec.ts',
          lineNumber: 10
        }
      ];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.coverageByType[ElementType.BUTTON]).toBe(100);
      expect(result.coverageByType[ElementType.INPUT]).toBe(0);
    });

    it('should provide page-specific coverage when URL is provided', () => {
      const elements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        }
      ];
      const selectors: TestSelector[] = [];
      const pageUrl = 'http://localhost:3000/login';
      const result = calculator.calculateCoverage(elements, selectors, pageUrl);

      expect(result.elementsByPage[pageUrl]).toBeDefined();
      expect(result.elementsByPage[pageUrl].total).toBe(1);
      expect(result.elementsByPage[pageUrl].covered).toBe(0);
      expect(result.elementsByPage[pageUrl].elements).toHaveLength(1);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate critical recommendations for low coverage', () => {
      const lowCoverage = {
        totalElements: 100,
        coveredElements: 30,
        uncoveredElements: [],
        coveragePercentage: 30,
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(lowCoverage);

      expect(recommendations).toContain('Critical: Your test coverage is below 50%. Consider adding more E2E tests.');
    });

    it('should generate good coverage recommendations', () => {
      const goodCoverage = {
        totalElements: 50,
        coveredElements: 40,
        uncoveredElements: [],
        coveragePercentage: 80,
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(goodCoverage);

      expect(recommendations.some(r => r.includes('Excellent:') || r.includes('Good:'))).toBe(true);
    });

    it('should handle zero elements gracefully', () => {
      const zeroCoverage = {
        totalElements: 0,
        coveredElements: 0,
        uncoveredElements: [],
        coveragePercentage: 0,
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(zeroCoverage);

      expect(recommendations).toContain('Critical: No interactive elements were discovered. Check if pages are loading correctly or if element discovery is working.');
    });

    it('should generate priority-based recommendations for uncovered elements', () => {
      const uncoveredElements: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:10'
        },
        {
          selector: 'input[name="email"]',
          type: ElementType.INPUT,
          text: 'Email',
          isVisible: true,
          isEnabled: true,
          discoverySource: 'static-analysis',
          discoveryContext: 'test.spec.ts:11'
        }
      ];

      const coverageWithUncovered = {
        totalElements: 2,
        coveredElements: 0,
        uncoveredElements,
        coveragePercentage: 0,
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(coverageWithUncovered);

      expect(recommendations.some(r => r.includes('High Priority:'))).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should generate type-specific recommendations', () => {
      const coverageWithLowTypeCoverage = {
        totalElements: 10,
        coveredElements: 5,
        uncoveredElements: [],
        coveragePercentage: 50,
        coverageByType: {
          [ElementType.BUTTON]: 25,
          [ElementType.INPUT]: 75,
          [ElementType.LINK]: 100
        } as Record<ElementType, number>,
        elementsByPage: {}
      };

      const recommendations = calculator.generateRecommendations(coverageWithLowTypeCoverage);

      expect(recommendations.some(r => r.includes('Low coverage for button'))).toBe(true);
    });
  });

  describe('aggregatePageCoverage', () => {
    it('should aggregate coverage from multiple pages', () => {
      const pageCoverages = [
        {
          url: 'http://localhost:3000/login',
          elements: [
            {
              selector: 'input[name="email"]',
              type: ElementType.INPUT,
              text: 'Email',
              isVisible: true,
              isEnabled: true,
              discoverySource: 'static-analysis',
              discoveryContext: 'login.spec.ts:10'
            },
            {
              selector: 'button[type="submit"]',
              type: ElementType.BUTTON,
              text: 'Submit',
              isVisible: true,
              isEnabled: true,
              discoverySource: 'static-analysis',
              discoveryContext: 'login.spec.ts:11'
            }
          ],
          coverage: {
            totalElements: 2,
            coveredElements: 1,
            uncoveredElements: [
              {
                selector: 'button[type="submit"]',
                type: ElementType.BUTTON,
                text: 'Submit',
                isVisible: true,
                isEnabled: true,
                discoverySource: 'static-analysis',
                discoveryContext: 'login.spec.ts:11'
              }
            ],
            coveragePercentage: 50,
            coverageByType: {} as Record<ElementType, number>,
            elementsByPage: {}
          }
        },
        {
          url: 'http://localhost:3000/dashboard',
          elements: [
            {
              selector: '.user-menu',
              type: ElementType.BUTTON,
              text: 'User menu',
              isVisible: true,
              isEnabled: true,
              discoverySource: 'static-analysis',
              discoveryContext: 'dashboard.spec.ts:10'
            }
          ],
          coverage: {
            totalElements: 1,
            coveredElements: 1,
            uncoveredElements: [],
            coveragePercentage: 100,
            coverageByType: {} as Record<ElementType, number>,
            elementsByPage: {}
          }
        }
      ];

      const result = calculator.aggregatePageCoverage(pageCoverages);

      expect(result.totalElements).toBe(3);
      expect(result.coveredElements).toBe(2);
      expect(result.coveragePercentage).toBe(67);
      expect(result.elementsByPage).toHaveProperty('http://localhost:3000/login');
      expect(result.elementsByPage).toHaveProperty('http://localhost:3000/dashboard');
    });

    it('should handle empty page coverages', () => {
      const result = calculator.aggregatePageCoverage([]);

      expect(result.totalElements).toBe(0);
      expect(result.coveredElements).toBe(0);
      expect(result.coveragePercentage).toBe(0);
    });
  });

  describe('generateSelectorInsights', () => {
    it('should analyze selector effectiveness', () => {
      const selectors: TestSelector[] = [
        {
          raw: 'button[type="submit"]',
          normalized: 'button[type=submit]',
          type: SelectorType.CSS,
          filePath: 'test.spec.ts',
          lineNumber: 10
        },
        {
          raw: 'Submit',
          normalized: 'Submit',
          type: SelectorType.TEXT,
          filePath: 'test.spec.ts',
          lineNumber: 11
        }
      ];

      const coverage = {
        totalElements: 10,
        coveredElements: 8,
        uncoveredElements: [],
        coveragePercentage: 80,
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };

      const insights = calculator.generateSelectorInsights(selectors, coverage);

      expect(insights.coverageBySelectorType).toHaveProperty('css');
      expect(insights.coverageBySelectorType).toHaveProperty('text');
      expect(insights.coverageBySelectorType.css.count).toBe(1);
      expect(insights.coverageBySelectorType.text.count).toBe(1);
    });
  });
});