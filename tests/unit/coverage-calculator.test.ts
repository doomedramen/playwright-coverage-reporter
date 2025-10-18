/**
 * Unit Tests for CoverageCalculator Utility
 *
 * These tests verify the functionality of calculating test coverage by comparing
 * discovered elements with tested selectors, including various matching algorithms.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { CoverageCalculator } from '../../src/utils/coverage-calculator';
import { PageElement, TestSelector, CoverageResult, PageCoverage, ElementType, SelectorType } from '../../src/types';

describe('CoverageCalculator', () => {
  let calculator: CoverageCalculator;
  let mockPageElements: PageElement[];
  let mockTestSelectors: TestSelector[];

  beforeEach(() => {
    calculator = new CoverageCalculator();

    // Mock page elements
    mockPageElements = [
      {
        selector: 'button[data-testid="submit-button"]',
        type: ElementType.BUTTON,
        text: 'Submit Form',
        id: 'submit-button',
        class: 'btn btn-primary',
        isVisible: true,
        boundingBox: { x: 100, y: 200, width: 100, height: 40 },
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static',
        role: 'button',
        accessibleName: 'Submit Form',
        xpath: '//button[@data-testid="submit-button"]'
      },
      {
        selector: 'input[type="email"][id="email-input"]',
        type: ElementType.INPUT,
        text: '',
        id: 'email-input',
        class: 'form-control',
        isVisible: true,
        boundingBox: { x: 100, y: 100, width: 200, height: 30 },
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static',
        role: 'textbox',
        accessibleName: 'Email Address',
        xpath: '//input[@id="email-input"]'
      },
      {
        selector: 'a[href="/login"]',
        type: ElementType.ANCHOR,
        text: 'Login',
        id: 'login-link',
        class: 'nav-link',
        isVisible: true,
        boundingBox: { x: 50, y: 50, width: 50, height: 20 },
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static',
        role: 'link',
        accessibleName: 'Login',
        xpath: '//a[@href="/login"]'
      },
      {
        selector: '.error-message',
        type: ElementType.SPAN,
        text: 'Invalid credentials',
        id: 'error-msg',
        class: 'error-message hidden',
        isVisible: false,
        boundingBox: null,
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static'
      }
    ];

    // Mock test selectors
    mockTestSelectors = [
      {
        raw: 'data-testid="submit-button"',
        normalized: 'submit-button',
        type: SelectorType.TEST_ID,
        filePath: 'login.spec.ts'
      },
      {
        raw: 'text="Submit Form"',
        normalized: 'Submit Form',
        type: SelectorType.TEXT,
        filePath: 'login.spec.ts'
      },
      {
        raw: 'role="button"',
        normalized: 'button',
        type: SelectorType.ROLE,
        filePath: 'login.spec.ts'
      },
      {
        raw: 'input[id="email-input"]',
        normalized: 'input[id="email-input"]',
        type: SelectorType.CSS,
        filePath: 'login.spec.ts'
      },
      {
        raw: 'label="Email Address"',
        normalized: 'Email Address',
        type: SelectorType.LABEL,
        filePath: 'login.spec.ts'
      },
      {
        raw: '//button[@data-testid="submit-button"]',
        normalized: '//button[@data-testid="submit-button"]',
        type: SelectorType.XPATH,
        filePath: 'login.spec.ts'
      },
      {
        raw: 'text="Non Existent Element"',
        normalized: 'Non Existent Element',
        type: SelectorType.TEXT,
        filePath: 'login.spec.ts'
      }
    ];
  });

  describe('calculateCoverage', () => {
    test('should calculate 0% coverage for no elements', () => {
      const elements: PageElement[] = [];
      const selectors: TestSelector[] = [];
      const result = calculator.calculateCoverage(elements, selectors);

      expect(result.totalElements).toBe(0);
      expect(result.coveredElements).toBe(0);
      expect(result.coveragePercentage).toBe(0);
      expect(result.uncoveredElements).toHaveLength(0);
    });

    test('should calculate 0% coverage for uncovered elements', () => {
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

    test('should calculate 100% coverage for all covered elements', () => {
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

    test('should calculate partial coverage correctly', () => {
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

    test('should provide coverage by type', () => {
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

    test('should provide page-specific coverage when URL is provided', () => {
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
    test('should generate critical recommendations for low coverage', () => {
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

    test('should generate good coverage recommendations', () => {
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

    test('should handle zero elements gracefully', () => {
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

    test('should generate priority-based recommendations for uncovered elements', () => {
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

    test('should generate type-specific recommendations', () => {
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
    test('should aggregate coverage from multiple pages', () => {
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

    test('should handle empty page coverages', () => {
      const result = calculator.aggregatePageCoverage([]);

      expect(result.totalElements).toBe(0);
      expect(result.coveredElements).toBe(0);
      expect(result.coveragePercentage).toBe(0);
    });
  });

  describe('generateSelectorInsights', () => {
    test('should analyze selector effectiveness', () => {
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

  // Additional comprehensive test cases
  describe('Basic Coverage Calculation (Enhanced)', () => {
    test('should calculate coverage correctly', () => {
      const coverage = calculator.calculateCoverage(mockPageElements, mockTestSelectors, 'http://example.com');

      expect(coverage).toHaveProperty('totalElements', 4);
      expect(coverage).toHaveProperty('coveredElements');
      expect(coverage).toHaveProperty('uncoveredElements');
      expect(coverage).toHaveProperty('coveragePercentage');
      expect(coverage).toHaveProperty('coverageByType');
      expect(coverage).toHaveProperty('elementsByPage');
      expect(Array.isArray(coverage.uncoveredElements)).toBe(true);
      expect(typeof coverage.coveragePercentage).toBe('number');
    });

    test('should handle empty page elements', () => {
      const coverage = calculator.calculateCoverage([], mockTestSelectors);

      expect(coverage.totalElements).toBe(0);
      expect(coverage.coveredElements).toBe(0);
      expect(coverage.coveragePercentage).toBe(0);
      expect(coverage.uncoveredElements).toHaveLength(0);
      expect(coverage.elementsByPage).toEqual({});
    });

    test('should handle empty test selectors', () => {
      const coverage = calculator.calculateCoverage(mockPageElements, []);

      expect(coverage.totalElements).toBe(4);
      expect(coverage.coveredElements).toBe(0);
      expect(coverage.coveragePercentage).toBe(0);
      expect(coverage.uncoveredElements).toHaveLength(4);
    });

    test('should include page URL in elementsByPage when provided', () => {
      const coverage = calculator.calculateCoverage(mockPageElements, mockTestSelectors, 'http://example.com');

      expect(coverage.elementsByPage).toHaveProperty('http://example.com');
      expect(coverage.elementsByPage['http://example.com']).toEqual({
        total: 4,
        covered: expect.any(Number),
        elements: mockPageElements
      });
    });

    test('should calculate coverage by type correctly', () => {
      const coverage = calculator.calculateCoverage(mockPageElements, mockTestSelectors);

      expect(coverage.coverageByType).toHaveProperty(ElementType.BUTTON);
      expect(coverage.coverageByType).toHaveProperty(ElementType.INPUT);
      expect(coverage.coverageByType).toHaveProperty(ElementType.ANCHOR);
      expect(coverage.coverageByType).toHaveProperty(ElementType.SPAN);

      // Coverage percentages should be between 0 and 100
      Object.values(coverage.coverageByType).forEach(percentage => {
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Selector Matching', () => {
    test('should match data-testid selectors correctly', () => {
      const testIdSelectors: TestSelector[] = [
        {
          raw: 'data-testid="submit-button"',
          normalized: 'submit-button',
          type: SelectorType.TEST_ID
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, testIdSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
      expect(coverage.coveragePercentage).toBeGreaterThan(0);
    });

    test('should match text selectors correctly', () => {
      const textSelectors: TestSelector[] = [
        {
          raw: 'text="Submit Form"',
          normalized: 'Submit Form',
          type: SelectorType.TEXT
        },
        {
          raw: 'text="Invalid credentials"',
          normalized: 'Invalid credentials',
          type: SelectorType.TEXT
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, textSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should match role selectors correctly', () => {
      const roleSelectors: TestSelector[] = [
        {
          raw: 'role="button"',
          normalized: 'button',
          type: SelectorType.ROLE
        },
        {
          raw: 'role="link"',
          normalized: 'link',
          type: SelectorType.ROLE
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, roleSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should match CSS selectors correctly', () => {
      const cssSelectors: TestSelector[] = [
        {
          raw: '#email-input',
          normalized: '#email-input',
          type: SelectorType.CSS
        },
        {
          raw: '.btn-primary',
          normalized: '.btn-primary',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, cssSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should match label selectors correctly', () => {
      const labelSelectors: TestSelector[] = [
        {
          raw: 'label="Email Address"',
          normalized: 'Email Address',
          type: SelectorType.LABEL
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, labelSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should match XPath selectors correctly', () => {
      const xpathSelectors: TestSelector[] = [
        {
          raw: '//button[@data-testid="submit-button"]',
          normalized: '//button[@data-testid="submit-button"]',
          type: SelectorType.XPATH
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, xpathSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });
  });

  describe('Direct Matching', () => {
    test('should match exact selectors', () => {
      const exactSelectors: TestSelector[] = [
        {
          raw: 'button[data-testid="submit-button"]',
          normalized: 'button[data-testid="submit-button"]',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, exactSelectors);

      expect(coverage.coveredElements).toBe(1);
    });

    test('should match ID selectors', () => {
      const idSelectors: TestSelector[] = [
        {
          raw: '#submit-button',
          normalized: '#submit-button',
          type: SelectorType.CSS
        },
        {
          raw: '#email-input',
          normalized: '#email-input',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, idSelectors);

      expect(coverage.coveredElements).toBe(2);
    });

    test('should match class selectors', () => {
      const classSelectors: TestSelector[] = [
        {
          raw: '.btn',
          normalized: '.btn',
          type: SelectorType.CSS
        },
        {
          raw: '.error-message',
          normalized: '.error-message',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, classSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should match tag selectors', () => {
      const tagSelectors: TestSelector[] = [
        {
          raw: 'button',
          normalized: 'button',
          type: SelectorType.CSS
        },
        {
          raw: 'input',
          normalized: 'input',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, tagSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });
  });

  describe('Attribute Matching', () => {
    test('should match attribute selectors', () => {
      const attributeSelectors: TestSelector[] = [
        {
          raw: 'input[id="email-input"]',
          normalized: 'input[id="email-input"]',
          type: SelectorType.CSS
        },
        {
          raw: 'button[role="button"]',
          normalized: 'button[role="button"]',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, attributeSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should handle attribute selectors without values', () => {
      const noValueSelectors: TestSelector[] = [
        {
          raw: 'input[role]',
          normalized: 'input[role]',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, noValueSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });
  });

  describe('Case Sensitivity', () => {
    test('should handle case-insensitive text matching', () => {
      const caseInsensitiveSelectors: TestSelector[] = [
        {
          raw: 'text="submit form"',
          normalized: 'submit form',
          type: SelectorType.TEXT
        },
        {
          raw: 'text="LOGIN"',
          normalized: 'LOGIN',
          type: SelectorType.TEXT
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, caseInsensitiveSelectors);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });

    test('should handle case-insensitive label matching', () => {
      const caseInsensitiveLabel: TestSelector[] = [
        {
          raw: 'label="email address"',
          normalized: 'email address',
          type: SelectorType.LABEL
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, caseInsensitiveLabel);

      expect(coverage.coveredElements).toBeGreaterThan(0);
    });
  });

  describe('Duplicate Element Prevention', () => {
    test('should not match the same element multiple times', () => {
      const duplicateSelectors: TestSelector[] = [
        {
          raw: 'data-testid="submit-button"',
          normalized: 'submit-button',
          type: SelectorType.TEST_ID
        },
        {
          raw: 'text="Submit Form"',
          normalized: 'Submit Form',
          type: SelectorType.TEXT
        },
        {
          raw: 'role="button"',
          normalized: 'button',
          type: SelectorType.ROLE
        }
        // All these selectors could match the same button element
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, duplicateSelectors);

      // Should not count the same element multiple times
      expect(coverage.coveredElements).toBeLessThanOrEqual(3);
      expect(coverage.coveredElements).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle elements with missing properties', () => {
      const incompleteElements: PageElement[] = [
        {
          selector: 'button',
          type: ElementType.BUTTON,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
          // Missing id, class, text, role, etc.
        }
      ];

      const coverage = calculator.calculateCoverage(incompleteElements, mockTestSelectors);

      expect(coverage.totalElements).toBe(1);
      expect(coverage).toBeDefined();
    });

    test('should handle selectors with missing properties', () => {
      const incompleteSelectors: TestSelector[] = [
        {
          raw: 'incomplete',
          normalized: 'incomplete',
          type: SelectorType.CSS
          // Missing filePath
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, incompleteSelectors);

      expect(coverage).toBeDefined();
    });

    test('should handle unknown selector types', () => {
      const unknownTypeSelector: TestSelector[] = [
        {
          raw: 'unknown-selector',
          normalized: 'unknown-selector',
          type: 'unknown' as SelectorType
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, unknownTypeSelector);

      expect(coverage.coveredElements).toBe(0);
    });

    test('should handle malformed selectors gracefully', () => {
      const malformedSelectors: TestSelector[] = [
        {
          raw: 'text=', // Missing text value
          normalized: 'text=',
          type: SelectorType.TEXT
        },
        {
          raw: 'role=', // Missing role value
          normalized: 'role=',
          type: SelectorType.ROLE
        },
        {
          raw: '[invalid', // Malformed CSS
          normalized: '[invalid',
          type: SelectorType.CSS
        }
      ];

      const coverage = calculator.calculateCoverage(mockPageElements, malformedSelectors);

      expect(coverage).toBeDefined();
      expect(coverage.coveredElements).toBe(0);
    });
  });

  describe('Performance and Scaling', () => {
    test('should handle large numbers of elements efficiently', () => {
      const largeElementSet: PageElement[] = [];
      for (let i = 0; i < 1000; i++) {
        largeElementSet.push({
          selector: `button[data-testid="button-${i}"]`,
          type: ElementType.BUTTON,
          text: `Button ${i}`,
          id: `button-${i}`,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        });
      }

      const largeSelectorSet: TestSelector[] = [];
      for (let i = 0; i < 500; i++) {
        largeSelectorSet.push({
          raw: `data-testid=button-${i}`,
          normalized: `button-${i}`,
          type: SelectorType.TEST_ID
        });
      }

      const startTime = Date.now();
      const coverage = calculator.calculateCoverage(largeElementSet, largeSelectorSet);
      const endTime = Date.now();

      expect(coverage.totalElements).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle large numbers of selectors efficiently', () => {
      const largeSelectorSet: TestSelector[] = [];
      for (let i = 0; i < 1000; i++) {
        largeSelectorSet.push({
          raw: `text=Button ${i}`,
          normalized: `Button ${i}`,
          type: SelectorType.TEXT
        });
      }

      const startTime = Date.now();
      const coverage = calculator.calculateCoverage(mockPageElements, largeSelectorSet);
      const endTime = Date.now();

      expect(coverage).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});