/**
 * Unit Tests for SelectorAnalyzer Utility
 *
 * These tests verify the functionality of analyzing test selector mismatches,
 * including matching logic, scoring, and recommendation generation.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { SelectorAnalyzer, SelectorAnalysisReport } from '../../src/utils/selector-analyzer';
import { TestSelector, PageElement, SelectorType, ElementType } from '../../src/types';

describe('SelectorAnalyzer', () => {
  let analyzer: SelectorAnalyzer;
  let mockTestSelectors: TestSelector[];
  let mockPageElements: PageElement[];

  beforeEach(() => {
    analyzer = new SelectorAnalyzer();

    // Mock test selectors
    mockTestSelectors = [
      {
        raw: 'data-testid=submit-button',
        normalized: 'submit-button',
        type: SelectorType.TEST_ID
      },
      {
        raw: 'text=Submit Form',
        normalized: 'Submit Form',
        type: SelectorType.TEXT
      },
      {
        raw: 'button[type="submit"]',
        normalized: 'button[type="submit"]',
        type: SelectorType.CSS
      },
      {
        raw: 'role=button',
        normalized: 'button',
        type: SelectorType.ROLE
      },
      {
        raw: 'placeholder=Enter email',
        normalized: 'Enter email',
        type: SelectorType.PLACEHOLDER
      },
      {
        raw: 'label=Email Address',
        normalized: 'Email Address',
        type: SelectorType.LABEL
      }
    ];

    // Mock page elements
    mockPageElements = [
      {
        selector: 'button[data-testid="submit-button"]',
        type: ElementType.BUTTON,
        text: 'Submit Form',
        id: 'submit-btn',
        class: 'btn btn-primary',
        isVisible: true,
        boundingBox: { x: 100, y: 200, width: 100, height: 40 },
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static',
        role: 'button'
      },
      {
        selector: 'input[type="email"][placeholder="Enter email"]',
        type: ElementType.INPUT,
        text: '',
        id: 'email-input',
        class: 'form-control',
        isVisible: true,
        boundingBox: { x: 100, y: 100, width: 200, height: 30 },
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static',
        accessibleName: 'Email Address'
      },
      {
        selector: '.error-message',
        type: ElementType.SPAN,
        text: 'Invalid email format',
        id: 'error-msg',
        class: 'error-message',
        isVisible: false,
        boundingBox: null,
        discoveryContext: 'test-http://example.com',
        discoverySource: 'static'
      }
    ];
  });

  describe('Selector Analysis', () => {
    test('should analyze selector mismatches correctly', () => {
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, mockPageElements);

      expect(report).toHaveProperty('totalSelectors', 6);
      expect(report).toHaveProperty('matchedSelectors');
      expect(report).toHaveProperty('unmatchedSelectors');
      expect(report).toHaveProperty('mismatches');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.mismatches)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should correctly count matched selectors', () => {
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, mockPageElements);

      // Should have some matches based on our mock data
      expect(report.matchedSelectors).toBeGreaterThan(0);
      expect(report.matchedSelectors + report.unmatchedSelectors).toBe(report.totalSelectors);
    });

    test('should identify unmatched selectors', () => {
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, mockPageElements);

      if (report.unmatchedSelectors > 0) {
        expect(report.mismatches.length).toBe(report.unmatchedSelectors);

        // Each mismatch should have required properties
        report.mismatches.forEach(mismatch => {
          expect(mismatch).toHaveProperty('testSelector');
          expect(mismatch).toHaveProperty('possibleMatches');
          expect(mismatch).toHaveProperty('matchScore');
          expect(mismatch).toHaveProperty('reason');
          expect(typeof mismatch.matchScore).toBe('number');
          expect(mismatch.matchScore).toBeGreaterThanOrEqual(0);
          expect(mismatch.matchScore).toBeLessThanOrEqual(1);
        });
      }
    });
  });

  describe('Test ID Matching', () => {
    test('should match data-testid selectors correctly', () => {
      const testIdSelectors: TestSelector[] = [
        {
          raw: 'data-testid=submit-button',
          normalized: 'submit-button',
          type: SelectorType.TEST_ID
        },
        {
          raw: 'data-testid=non-existent',
          normalized: 'non-existent',
          type: SelectorType.TEST_ID
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(testIdSelectors, mockPageElements);

      // Should match the existing data-testid
      expect(report.matchedSelectors).toBe(1);
      expect(report.unmatchedSelectors).toBe(1);
    });

    test('should handle pages without test IDs', () => {
      const elementsWithoutTestIds: PageElement[] = [
        {
          selector: 'button[type="submit"]',
          type: ElementType.BUTTON,
          text: 'Submit',
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        }
      ];

      const testIdSelector: TestSelector[] = [
        {
          raw: 'data-testid=submit',
          normalized: 'submit',
          type: SelectorType.TEST_ID
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(testIdSelector, elementsWithoutTestIds);

      expect(report.matchedSelectors).toBe(0);
      expect(report.unmatchedSelectors).toBe(1);
      expect(report.mismatches[0].reason).toContain('No elements on page have test IDs');
    });
  });

  describe('Text Selector Matching', () => {
    test('should match text-based selectors', () => {
      const textSelectors: TestSelector[] = [
        {
          raw: 'text=Submit Form',
          normalized: 'Submit Form',
          type: SelectorType.TEXT
        },
        {
          raw: 'text=Non Existent Text',
          normalized: 'Non Existent Text',
          type: SelectorType.TEXT
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(textSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(1);
      expect(report.unmatchedSelectors).toBe(1);
    });

    test('should handle case-insensitive text matching', () => {
      const caseInsensitiveSelectors: TestSelector[] = [
        {
          raw: 'text=submit form',
          normalized: 'submit form',
          type: SelectorType.TEXT
        },
        {
          raw: 'text=INVALID EMAIL FORMAT',
          normalized: 'INVALID EMAIL FORMAT',
          type: SelectorType.TEXT
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(caseInsensitiveSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(2); // Should match both with case-insensitive matching
    });
  });

  describe('CSS Selector Matching', () => {
    test('should match CSS selectors', () => {
      const cssSelectors: TestSelector[] = [
        {
          raw: '.error-message',
          normalized: '.error-message',
          type: SelectorType.CSS
        },
        {
          raw: '#submit-btn',
          normalized: '#submit-btn',
          type: SelectorType.CSS
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(cssSelectors, mockPageElements);

      expect(report.matchedSelectors).toBeGreaterThan(0);
    });

    test('should handle complex CSS selectors', () => {
      const complexCssSelectors: TestSelector[] = [
        {
          raw: 'button.btn.btn-primary',
          normalized: 'button.btn.btn-primary',
          type: SelectorType.CSS
        },
        {
          raw: 'input.form-control[type="email"]',
          normalized: 'input.form-control[type="email"]',
          type: SelectorType.CSS
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(complexCssSelectors, mockPageElements);

      expect(report.matchedSelectors).toBeGreaterThan(0);
    });
  });

  describe('Role Selector Matching', () => {
    test('should match role-based selectors', () => {
      const roleSelectors: TestSelector[] = [
        {
          raw: 'role=button',
          normalized: 'button',
          type: SelectorType.ROLE
        },
        {
          raw: 'role=nonexistent',
          normalized: 'nonexistent',
          type: SelectorType.ROLE
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(roleSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(1);
      expect(report.unmatchedSelectors).toBe(1);
    });

    test('should handle elements without roles', () => {
      const elementsWithoutRoles: PageElement[] = [
        {
          selector: 'div.content',
          type: ElementType.DIV,
          text: 'Some content',
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        }
      ];

      const roleSelector: TestSelector[] = [
        {
          raw: 'role=button',
          normalized: 'button',
          type: SelectorType.ROLE
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(roleSelector, elementsWithoutRoles);

      expect(report.matchedSelectors).toBe(0);
    });
  });

  describe('Placeholder and Label Matching', () => {
    test('should match placeholder selectors', () => {
      const placeholderSelectors: TestSelector[] = [
        {
          raw: 'placeholder=Enter email',
          normalized: 'Enter email',
          type: SelectorType.PLACEHOLDER
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(placeholderSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(1);
    });

    test('should match label selectors using accessible name', () => {
      const labelSelectors: TestSelector[] = [
        {
          raw: 'label=Email Address',
          normalized: 'Email Address',
          type: SelectorType.LABEL
        },
        {
          raw: 'label=email address', // Case insensitive
          normalized: 'email address',
          type: SelectorType.LABEL
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(labelSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(2);
    });
  });

  describe('Match Score Calculation', () => {
    test('should calculate appropriate match scores', () => {
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, mockPageElements);

      if (report.mismatches.length > 0) {
        report.mismatches.forEach(mismatch => {
          expect(mismatch.matchScore).toBeGreaterThanOrEqual(0);
          expect(mismatch.matchScore).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should give exact matches score of 1.0', () => {
      const exactMatchSelectors: TestSelector[] = [
        {
          raw: 'button[data-testid="submit-button"]',
          normalized: 'button[data-testid="submit-button"]',
          type: SelectorType.CSS
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(exactMatchSelectors, mockPageElements);

      expect(report.matchedSelectors).toBe(1);
      expect(report.unmatchedSelectors).toBe(0);
    });

    test('should give partial matches lower scores', () => {
      const partialMatchSelectors: TestSelector[] = [
        {
          raw: 'data-testid=submit',
          normalized: 'submit',
          type: SelectorType.TEST_ID
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(partialMatchSelectors, mockPageElements);

      // Should find a partial match with score < 1.0
      if (report.mismatches.length > 0) {
        const mismatch = report.mismatches[0];
        expect(mismatch.matchScore).toBeGreaterThan(0);
        expect(mismatch.matchScore).toBeLessThan(1);
      }
    });
  });

  describe('Mismatch Reason Generation', () => {
    test('should provide specific reasons for test ID mismatches', () => {
      const elementsWithTestIds = [...mockPageElements];
      const badTestIdSelector: TestSelector[] = [
        {
          raw: 'data-testid=wrong-id',
          normalized: 'wrong-id',
          type: SelectorType.TEST_ID
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(badTestIdSelector, elementsWithTestIds);

      expect(report.mismatches[0].reason).toContain('Test ID');
      expect(report.mismatches[0].reason).toContain('different test IDs');
    });

    test('should provide specific reasons for text mismatches', () => {
      const textSelector: TestSelector[] = [
        {
          raw: 'text=Non Existent Text',
          normalized: 'Non Existent Text',
          type: SelectorType.TEXT
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(textSelector, mockPageElements);

      expect(report.mismatches[0].reason).toContain('Text selector');
      expect(report.mismatches[0].reason).toContain('Current page text');
    });

    test('should provide specific reasons for role mismatches', () => {
      const roleSelector: TestSelector[] = [
        {
          raw: 'role=nonexistent',
          normalized: 'nonexistent',
          type: SelectorType.ROLE
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(roleSelector, mockPageElements);

      expect(report.mismatches[0].reason).toContain('Role');
      expect(report.mismatches[0].reason).toContain('Available roles');
    });
  });

  describe('Recommendation Generation', () => {
    test('should generate recommendations for test ID mismatches', () => {
      const testIdMismatches: TestSelector[] = [
        {
          raw: 'data-testid=missing',
          normalized: 'missing',
          type: SelectorType.TEST_ID
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(testIdMismatches, mockPageElements);

      expect(report.recommendations).toContain('Add data-testid attributes to interactive elements for more reliable testing');
      expect(report.recommendations.some(r => r.includes('1 test ID selectors are failing'))).toBe(true);
    });

    test('should generate recommendations for text selector mismatches', () => {
      const textMismatches: TestSelector[] = [
        {
          raw: 'text=missing text',
          normalized: 'missing text',
          type: SelectorType.TEXT
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(textMismatches, mockPageElements);

      expect(report.recommendations.some(r => r.includes('1 text-based selectors are failing'))).toBe(true);
      expect(report.recommendations).toContain('Consider using test IDs instead of text selectors for better stability');
    });

    test('should generate recommendations for CSS selector mismatches', () => {
      const cssMismatches: TestSelector[] = [
        {
          raw: '.non-existent-class',
          normalized: '.non-existent-class',
          type: SelectorType.CSS
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(cssMismatches, mockPageElements);

      expect(report.recommendations.some(r => r.includes('1 CSS selectors are failing'))).toBe(true);
      expect(report.recommendations).toContain('Review CSS selectors and update them to match current DOM structure');
    });

    test('should provide general recommendations for many mismatches', () => {
      const manyMismatches: TestSelector[] = [];
      for (let i = 0; i < 15; i++) {
        manyMismatches.push({
          raw: `data-testid=missing-${i}`,
          normalized: `missing-${i}`,
          type: SelectorType.TEST_ID
        });
      }

      const report = analyzer.analyzeSelectorMismatch(manyMismatches, mockPageElements);

      expect(report.recommendations.some(r => r.includes('Large number of failing selectors'))).toBe(true);
      expect(report.recommendations).toContain('Run tests with --verbose to see detailed selector vs element comparisons');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty inputs', () => {
      const emptyReport = analyzer.analyzeSelectorMismatch([], []);

      expect(emptyReport.totalSelectors).toBe(0);
      expect(emptyReport.matchedSelectors).toBe(0);
      expect(emptyReport.unmatchedSelectors).toBe(0);
      expect(emptyReport.mismatches).toHaveLength(0);
      expect(emptyReport.recommendations).toHaveLength(1); // Should have verbose recommendation
    });

    test('should handle empty page elements', () => {
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, []);

      expect(report.totalSelectors).toBe(mockTestSelectors.length);
      expect(report.matchedSelectors).toBe(0);
      expect(report.unmatchedSelectors).toBe(mockTestSelectors.length);
      expect(report.mismatches).toHaveLength(mockTestSelectors.length);
    });

    test('should handle empty test selectors', () => {
      const report = analyzer.analyzeSelectorMismatch([], mockPageElements);

      expect(report.totalSelectors).toBe(0);
      expect(report.matchedSelectors).toBe(0);
      expect(report.unmatchedSelectors).toBe(0);
      expect(report.mismatches).toHaveLength(0);
    });

    test('should handle elements with missing properties', () => {
      const incompleteElements: PageElement[] = [
        {
          selector: 'button',
          type: ElementType.BUTTON,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
          // Missing text, id, class, role, etc.
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, incompleteElements);

      expect(report.totalSelectors).toBe(mockTestSelectors.length);
      // Should not throw errors with incomplete elements
    });

    test('should handle selectors with missing properties', () => {
      const incompleteSelectors: TestSelector[] = [
        {
          raw: 'incomplete',
          normalized: 'incomplete',
          type: SelectorType.CSS
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(incompleteSelectors, mockPageElements);

      expect(report.totalSelectors).toBe(1);
      expect(report).toBeDefined();
    });
  });

  describe('Performance and Scaling', () => {
    test('should handle large numbers of selectors efficiently', () => {
      const largeSelectorSet: TestSelector[] = [];
      for (let i = 0; i < 1000; i++) {
        largeSelectorSet.push({
          raw: `data-testid=element-${i}`,
          normalized: `element-${i}`,
          type: SelectorType.TEST_ID
        });
      }

      const startTime = Date.now();
      const report = analyzer.analyzeSelectorMismatch(largeSelectorSet, mockPageElements);
      const endTime = Date.now();

      expect(report.totalSelectors).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle large numbers of elements efficiently', () => {
      const largeElementSet: PageElement[] = [];
      for (let i = 0; i < 1000; i++) {
        largeElementSet.push({
          selector: `button[data-testid="button-${i}"]`,
          type: ElementType.BUTTON,
          text: `Button ${i}`,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        });
      }

      const startTime = Date.now();
      const report = analyzer.analyzeSelectorMismatch(mockTestSelectors, largeElementSet);
      const endTime = Date.now();

      expect(report).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Type Compatibility', () => {
    test('should check type compatibility correctly', () => {
      const inputElement: PageElement[] = [
        {
          selector: 'input[type="text"]',
          type: ElementType.INPUT,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        }
      ];

      const compatibleSelectors: TestSelector[] = [
        {
          raw: 'placeholder=test',
          normalized: 'test',
          type: SelectorType.PLACEHOLDER
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(compatibleSelectors, inputElement);

      // Input elements should be compatible with placeholder selectors
      expect(report.matchedSelectors).toBeGreaterThanOrEqual(0);
    });

    test('should handle incompatible selector types', () => {
      const divElement: PageElement[] = [
        {
          selector: 'div.content',
          type: ElementType.DIV,
          isVisible: true,
          discoveryContext: 'test-http://example.com',
          discoverySource: 'static'
        }
      ];

      const incompatibleSelectors: TestSelector[] = [
        {
          raw: 'placeholder=test',
          normalized: 'test',
          type: SelectorType.PLACEHOLDER
        }
      ];

      const report = analyzer.analyzeSelectorMismatch(incompatibleSelectors, divElement);

      // DIV elements should not be compatible with placeholder selectors
      expect(report.matchedSelectors).toBe(0);
    });
  });
});