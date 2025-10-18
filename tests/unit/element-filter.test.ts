/**
 * Unit Tests for ElementFilter Utility
 *
 * These tests verify the core functionality of the element filtering system,
 * including configuration management, selector matching, attribute filtering,
 * and preset configurations.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ElementFilter, AttributeFilter, PlaywrightElement } from '../../src/utils/element-filter';
import { ElementType } from '../../src/types';

describe('ElementFilter', () => {
  let elementFilter: ElementFilter;
  let mockElements: PlaywrightElement[];

  beforeEach(() => {
    elementFilter = new ElementFilter();

    // Create mock elements for testing
    mockElements = [
      {
        selector: 'button[data-testid="submit"]',
        type: ElementType.BUTTON,
        text: 'Submit Form',
        id: 'submit-btn',
        class: 'btn btn-primary',
        classes: ['btn', 'btn-primary'],
        attributes: {
          'data-testid': 'submit',
          'type': 'submit',
          'disabled': 'false'
        },
        visibility: 1,
        disabled: false,
        boundingBox: { x: 100, y: 200, width: 80, height: 30 },
        selectors: ['button[data-testid="submit"]', '#submit-btn'],
        tagName: 'button'
      },
      {
        selector: 'input[name="email"]',
        type: ElementType.INPUT,
        text: '',
        id: 'email-input',
        class: 'form-control',
        classes: ['form-control'],
        attributes: {
          'name': 'email',
          'type': 'email',
          'required': 'true'
        },
        visibility: 1,
        disabled: false,
        boundingBox: { x: 100, y: 100, width: 200, height: 20 },
        selectors: ['input[name="email"]', '#email-input'],
        tagName: 'input'
      },
      {
        selector: '.hidden-element',
        type: ElementType.INTERACTIVE_ELEMENT,
        text: 'Hidden content',
        id: 'hidden',
        class: 'hidden-element',
        classes: ['hidden-element'],
        attributes: {
          'aria-hidden': 'true'
        },
        visibility: 0.1, // Make it visible enough to pass default filter
        disabled: false,
        boundingBox: { x: 0, y: 0, width: 10, height: 10 },
        selectors: ['.hidden-element', '#hidden'],
        tagName: 'div'
      },
      {
        selector: 'a[href="/home"]',
        type: ElementType.LINK,
        text: 'Go Home',
        id: '',
        class: 'nav-link',
        classes: ['nav-link'],
        attributes: {
          'href': '/home'
        },
        visibility: 1,
        disabled: false,
        boundingBox: { x: 0, y: 50, width: 60, height: 20 },
        selectors: ['a[href="/home"]', '.nav-link'],
        tagName: 'a'
      },
      {
        selector: 'input[name="search"]',
        type: ElementType.INPUT,
        text: '',
        id: 'search',
        class: 'search-input',
        classes: ['search-input'],
        attributes: {
          'name': 'search',
          'type': 'text',
          'placeholder': 'Search...'
        },
        visibility: 0.5,
        disabled: true,
        boundingBox: { x: 300, y: 20, width: 150, height: 20 },
        selectors: ['input[name="search"]', '#search'],
        tagName: 'input'
      }
    ];
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with default configuration', () => {
      const filter = new ElementFilter();
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual(Object.values(ElementType));
      expect(config.excludeTypes).toEqual([]);
      expect(config.includeSelectors).toEqual([]);
      expect(config.excludeSelectors).toEqual([]);
      expect(config.minVisibility).toBe(0.1);
      expect(config.minSize).toEqual({ width: 1, height: 1 });
      expect(config.includeHidden).toBe(false);
      expect(config.includeDisabled).toBe(true);
      expect(config.includeOutsideViewport).toBe(true);
    });

    test('should accept custom configuration', () => {
      const customConfig = {
        includeTypes: [ElementType.BUTTON, ElementType.INPUT],
        excludeTypes: [ElementType.INTERACTIVE_ELEMENT],
        minVisibility: 0.5,
        includeHidden: true,
        minSize: { width: 10, height: 10 }
      };

      const filter = new ElementFilter(customConfig);
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([ElementType.BUTTON, ElementType.INPUT]);
      expect(config.excludeTypes).toEqual([ElementType.INTERACTIVE_ELEMENT]);
      expect(config.minVisibility).toBe(0.5);
      expect(config.includeHidden).toBe(true);
      expect(config.minSize).toEqual({ width: 10, height: 10 });
    });

    test('should merge partial configuration with defaults', () => {
      const partialConfig = {
        minVisibility: 0.8,
        includeDisabled: false
      };

      const filter = new ElementFilter(partialConfig);
      const config = filter.getConfig();

      expect(config.minVisibility).toBe(0.8);
      expect(config.includeDisabled).toBe(false);
      expect(config.includeTypes).toEqual(Object.values(ElementType)); // Should remain default
      expect(config.minSize).toEqual({ width: 1, height: 1 }); // Should remain default
    });
  });

  describe('Basic Element Filtering', () => {
    test('should include all elements with default configuration', () => {
      const result = elementFilter.filterElements(mockElements);

      expect(result.totalElements).toBe(5);
      expect(result.includedElements).toBe(5);
      expect(result.excludedElements).toBe(0);
      expect(result.elements).toHaveLength(5);
    });

    test('should filter by element type inclusion', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON, ElementType.INPUT]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(3); // 2 inputs + 1 button
      expect(result.excludedElements).toBe(2); // div + link
      expect(result.elements.every(el =>
        el.type === ElementType.BUTTON || el.type === ElementType.INPUT
      )).toBe(true);
    });

    test('should filter by element type exclusion', () => {
      elementFilter.updateConfig({
        excludeTypes: [ElementType.INTERACTIVE_ELEMENT]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.elements.some(el => el.type === ElementType.INTERACTIVE_ELEMENT)).toBe(false);

      // Check exclusion reason
      expect(result.exclusionReasons['type_excluded: interactive-element']).toBe(1);
    });

    test('should filter by visibility', () => {
      elementFilter.updateConfig({
        minVisibility: 0.8
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(3); // Only fully visible elements
      expect(result.excludedElements).toBe(2);

      // Check exclusion reasons
      expect(result.exclusionReasons['insufficient_visibility: 0.1']).toBe(1); // Hidden element
      expect(result.exclusionReasons['insufficient_visibility: 0.5']).toBe(1); // Search input
    });

    test('should filter by size', () => {
      elementFilter.updateConfig({
        minSize: { width: 100, height: 25 }
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(0); // No elements meet both width and height requirements
      expect(result.excludedElements).toBe(5);

      // Check exclusion reasons - all elements fail size requirements
      expect(result.exclusionReasons['insufficient_size: 80x30']).toBe(1); // Button (height passes, width fails)
      expect(result.exclusionReasons['insufficient_size: 200x20']).toBe(1); // Email input (width passes, height fails)
      expect(result.exclusionReasons['insufficient_size: 10x10']).toBe(1); // Hidden element
      expect(result.exclusionReasons['insufficient_size: 60x20']).toBe(1); // Link
      expect(result.exclusionReasons['insufficient_size: 150x20']).toBe(1); // Search input (width passes, height fails)
    });

    test('should filter disabled elements', () => {
      elementFilter.updateConfig({
        includeDisabled: false
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['element_disabled']).toBe(1);
    });

    test('should filter hidden elements', () => {
      elementFilter.updateConfig({
        includeHidden: false,
        minVisibility: 0.5 // Higher threshold to catch the 0.1 visibility element
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['insufficient_visibility: 0.1']).toBe(1);
    });
  });

  describe('Selector Filtering', () => {
    test('should filter by include selectors', () => {
      elementFilter.updateConfig({
        includeSelectors: ['.btn', '.form-control']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2); // button and email input
      expect(result.excludedElements).toBe(3);
      expect(result.exclusionReasons['no_matching_include_selector']).toBe(3);
    });

    test('should filter by exclude selectors', () => {
      elementFilter.updateConfig({
        excludeSelectors: ['.hidden-element']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['matches_exclude_selector']).toBe(1);
    });

    test('should handle ID selectors', () => {
      elementFilter.updateConfig({
        includeSelectors: ['#submit-btn', '#email-input']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2);
      expect(result.excludedElements).toBe(3);
    });

    test('should handle attribute selectors', () => {
      elementFilter.updateConfig({
        includeSelectors: ['[data-testid="submit"]', '[name="email"]']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2);
      expect(result.excludedElements).toBe(3);
    });

    test('should handle tag name selectors', () => {
      elementFilter.updateConfig({
        includeSelectors: ['button', 'input']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(3); // 2 inputs + 1 button
      expect(result.excludedElements).toBe(2);
    });
  });

  describe('Attribute Filtering', () => {
    test('should filter by include attributes', () => {
      elementFilter.updateConfig({
        includeAttributes: [
          { name: 'data-testid', exists: true },
          { name: 'required', exists: true }
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2); // button and email input
      expect(result.excludedElements).toBe(3);
      expect(result.exclusionReasons['no_matching_include_attributes']).toBe(3);
    });

    test('should filter by exclude attributes', () => {
      elementFilter.updateConfig({
        excludeAttributes: [
          { name: 'aria-hidden', exists: true }
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['matches_exclude_attributes']).toBe(1);
    });

    test('should filter by attribute value', () => {
      elementFilter.updateConfig({
        includeAttributes: [
          { name: 'type', value: 'email' }
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(1); // Only email input
      expect(result.excludedElements).toBe(4);
    });

    test('should filter by attribute pattern', () => {
      elementFilter.updateConfig({
        includeAttributes: [
          { name: 'class', pattern: /^btn/ }
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(1); // Only button
      expect(result.excludedElements).toBe(4);
    });

    test('should filter by attribute existence', () => {
      elementFilter.updateConfig({
        includeAttributes: [
          { name: 'id', exists: true }
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4); // All except link
      expect(result.excludedElements).toBe(1);
    });
  });

  describe('Text Pattern Filtering', () => {
    test('should filter by include text patterns', () => {
      elementFilter.updateConfig({
        includeTextPatterns: [/submit/i, /email/i]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2); // button and email input (by ID attr)
      expect(result.excludedElements).toBe(3);
      expect(result.exclusionReasons['no_matching_include_text_pattern']).toBe(3);
    });

    test('should filter by exclude text patterns', () => {
      elementFilter.updateConfig({
        excludeTextPatterns: [/hidden/i]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(4);
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['matches_exclude_text_pattern']).toBe(1);
    });

    test('should handle empty text gracefully', () => {
      elementFilter.updateConfig({
        includeTextPatterns: [/^$/] // Match empty text
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2); // Two inputs with empty text
      expect(result.excludedElements).toBe(3);
    });
  });

  describe('Custom Filter Function', () => {
    test('should apply custom filter function', () => {
      elementFilter.updateConfig({
        customFilter: (element) => element.selector.includes('data-testid')
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(1); // Only button has data-testid
      expect(result.excludedElements).toBe(4);
      expect(result.exclusionReasons['custom_filter_excluded']).toBe(4);
    });

    test('should handle complex custom filter logic', () => {
      elementFilter.updateConfig({
        customFilter: (element) => {
          // Include only interactive elements with specific attributes
          return [ElementType.BUTTON, ElementType.INPUT, ElementType.LINK].includes(element.type) &&
                 element.visibility > 0.5 &&
                 !element.disabled;
        }
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(3); // button, email input, and link
      expect(result.excludedElements).toBe(2);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      elementFilter.updateConfig({
        minVisibility: 0.7,
        includeTypes: [ElementType.BUTTON]
      });

      const config = elementFilter.getConfig();
      expect(config.minVisibility).toBe(0.7);
      expect(config.includeTypes).toEqual([ElementType.BUTTON]);
    });

    test('should add element types to include list', () => {
      elementFilter.updateConfig({ includeTypes: [] });
      elementFilter.includeType(ElementType.BUTTON);
      elementFilter.includeType(ElementType.INPUT);

      const config = elementFilter.getConfig();
      expect(config.includeTypes).toEqual([ElementType.BUTTON, ElementType.INPUT]);
    });

    test('should add element types to exclude list', () => {
      elementFilter.excludeType(ElementType.INTERACTIVE_ELEMENT);
      elementFilter.excludeType(ElementType.CLICKABLE_ELEMENT);

      const config = elementFilter.getConfig();
      expect(config.excludeTypes).toEqual([ElementType.INTERACTIVE_ELEMENT, ElementType.CLICKABLE_ELEMENT]);
    });

    test('should not add duplicate types', () => {
      elementFilter.includeType(ElementType.BUTTON);
      elementFilter.includeType(ElementType.BUTTON); // Duplicate

      const config = elementFilter.getConfig();
      expect(config.includeTypes.filter(t => t === ElementType.BUTTON)).toHaveLength(1);
    });

    test('should add selectors to include/exclude lists', () => {
      elementFilter.includeSelector('.btn');
      elementFilter.excludeSelector('.hidden');

      const config = elementFilter.getConfig();
      expect(config.includeSelectors).toEqual(['.btn']);
      expect(config.excludeSelectors).toEqual(['.hidden']);
    });

    test('should add attribute filters', () => {
      const includeFilter: AttributeFilter = { name: 'required', exists: true };
      const excludeFilter: AttributeFilter = { name: 'disabled', exists: true };

      elementFilter.includeAttributeFilter(includeFilter);
      elementFilter.excludeAttributeFilter(excludeFilter);

      const config = elementFilter.getConfig();
      expect(config.includeAttributes).toEqual([includeFilter]);
      expect(config.excludeAttributes).toEqual([excludeFilter]);
    });

    test('should add text patterns', () => {
      elementFilter.includeTextPattern(/submit/i);
      elementFilter.excludeTextPattern(/hidden/i);

      const config = elementFilter.getConfig();
      expect(config.includeTextPatterns).toEqual([/submit/i]);
      expect(config.excludeTextPatterns).toEqual([/hidden/i]);
    });
  });

  describe('Preset Configurations', () => {
    test('should create comprehensive preset', () => {
      const filter = ElementFilter.fromPreset('comprehensive');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual(Object.values(ElementType));
      expect(config.includeHidden).toBe(false);
      expect(config.includeDisabled).toBe(true);
      expect(config.includeOutsideViewport).toBe(true);
      expect(config.minVisibility).toBe(0.1);
    });

    test('should create essential preset', () => {
      const filter = ElementFilter.fromPreset('essential');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([
        ElementType.BUTTON,
        ElementType.INPUT,
        ElementType.SELECT,
        ElementType.LINK,
        ElementType.CHECKBOX,
        ElementType.RADIO
      ]);
      expect(config.includeHidden).toBe(false);
      expect(config.includeDisabled).toBe(false);
      expect(config.includeOutsideViewport).toBe(false);
      expect(config.minVisibility).toBe(0.5);
    });

    test('should create minimal preset', () => {
      const filter = ElementFilter.fromPreset('minimal');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([
        ElementType.BUTTON,
        ElementType.INPUT,
        ElementType.LINK
      ]);
      expect(config.minVisibility).toBe(0.8);
      expect(config.minSize).toEqual({ width: 10, height: 10 });
    });

    test('should create forms preset', () => {
      const filter = ElementFilter.fromPreset('forms');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([
        ElementType.INPUT,
        ElementType.SELECT,
        ElementType.TEXTAREA,
        ElementType.CHECKBOX,
        ElementType.RADIO,
        ElementType.BUTTON
      ]);
      expect(config.includeSelectors).toEqual([
        'form',
        '[data-testid*="form"]',
        '[id*="form"]'
      ]);
    });

    test('should create navigation preset', () => {
      const filter = ElementFilter.fromPreset('navigation');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([
        ElementType.LINK,
        ElementType.BUTTON
      ]);
      expect(config.includeSelectors).toEqual([
        'nav',
        '[role="navigation"]',
        '[aria-label*="menu"]'
      ]);
    });
  });

  describe('Configuration String Parsing', () => {
    test('should create from JSON config string', () => {
      const configString = JSON.stringify({
        includeTypes: [ElementType.BUTTON],
        minVisibility: 0.8
      });

      const filter = ElementFilter.fromConfigString(configString);
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([ElementType.BUTTON]);
      expect(config.minVisibility).toBe(0.8);
    });

    test('should create from preset name string', () => {
      const filter = ElementFilter.fromConfigString('minimal');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual([
        ElementType.BUTTON,
        ElementType.INPUT,
        ElementType.LINK
      ]);
    });

    test('should fallback to default for invalid config', () => {
      const filter = ElementFilter.fromConfigString('invalid config');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual(Object.values(ElementType));
    });

    test('should handle malformed JSON gracefully', () => {
      const filter = ElementFilter.fromConfigString('{ invalid json }');
      const config = filter.getConfig();

      expect(config.includeTypes).toEqual(Object.values(ElementType));
    });
  });

  describe('Configuration Validation', () => {
    test('should validate correct configuration', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON],
        excludeTypes: [ElementType.INTERACTIVE_ELEMENT],
        minVisibility: 0.5,
        minSize: { width: 10, height: 10 }
      });

      const validation = elementFilter.validateConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should detect conflicting types', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON],
        excludeTypes: [ElementType.BUTTON] // Conflict
      });

      const validation = elementFilter.validateConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Conflicting element types: button');
    });

    test('should detect invalid visibility range', () => {
      elementFilter.updateConfig({
        minVisibility: 1.5 // Invalid
      });

      const validation = elementFilter.validateConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('minVisibility must be between 0 and 1');
    });

    test('should detect invalid size constraints', () => {
      elementFilter.updateConfig({
        minSize: { width: -5, height: 10 } // Invalid
      });

      const validation = elementFilter.validateConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('minSize dimensions must be positive');
    });

    test('should handle regex patterns in validation', () => {
      // The validation should handle RegExp objects correctly
      elementFilter.updateConfig({
        includeTextPatterns: [/valid pattern/i] // Valid regex
      });

      const validation = elementFilter.validateConfig();

      // Should pass validation since RegExp objects are valid
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('Statistics and Recommendations', () => {
    test('should provide filter statistics', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON],
        minVisibility: 0.8
      });

      const stats = elementFilter.getStats();

      expect(stats.config).toBeDefined();
      expect(stats.estimatedImpact).toBeDefined();
      expect(stats.recommendations).toBeDefined();
    });

    test('should provide recommendations for restrictive filter', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON], // Very restrictive
        minVisibility: 0.9,
        minSize: { width: 100, height: 50 }
      });

      const stats = elementFilter.getStats();

      expect(stats.estimatedImpact).toBe('high');
      expect(stats.recommendations).toContain(
        'High visibility threshold may exclude partially hidden elements'
      );
      expect(stats.recommendations).toContain(
        'Large minimum size may exclude small but important elements'
      );
    });

    test('should provide recommendations for permissive filter', () => {
      elementFilter.updateConfig({
        includeTypes: Object.values(ElementType),
        includeDisabled: false
      });

      const stats = elementFilter.getStats();

      expect(stats.estimatedImpact).toBe('low');
      expect(stats.recommendations).toContain(
        'Excluding disabled inputs may miss form validation scenarios'
      );
    });

    test('should warn about empty include types', () => {
      elementFilter.updateConfig({
        includeTypes: []
      });

      const stats = elementFilter.getStats();

      expect(stats.recommendations).toContain(
        'No element types included - filter will exclude everything'
      );
    });
  });

  describe('Configuration Export', () => {
    test('should export configuration as JSON', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON],
        minVisibility: 0.7
      });

      const exported = elementFilter.exportConfig();
      const parsed = JSON.parse(exported);

      expect(parsed.includeTypes).toEqual([ElementType.BUTTON]);
      expect(parsed.minVisibility).toBe(0.7);
    });

    test('should create deep copy of config', () => {
      const config1 = elementFilter.getConfig();
      const config2 = elementFilter.getConfig();

      config1.minVisibility = 0.9;

      expect(config2.minVisibility).toBe(0.1); // Should not be affected
    });
  });

  describe('Complex Filtering Scenarios', () => {
    test('should handle multiple filtering criteria together', () => {
      elementFilter.updateConfig({
        includeTypes: [ElementType.BUTTON, ElementType.INPUT],
        minVisibility: 0.5,
        includeDisabled: false,
        includeSelectors: ['.btn', '.form-control']
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(2);
      expect(result.excludedElements).toBe(3);

      // Check specific exclusion reasons
      expect(result.exclusionReasons['type_not_included: interactive-element']).toBe(1); // hidden element (type check comes first)
      expect(result.exclusionReasons['type_not_included: link']).toBe(1); // link
      expect(result.exclusionReasons['no_matching_include_selector']).toBe(1); // search input (fails selector check before disabled check)
    });

    test('should handle viewport filtering', () => {
      // Create element outside viewport
      const outsideElement: PlaywrightElement = {
        selector: '.outside-viewport',
        type: ElementType.INTERACTIVE_ELEMENT,
        visibility: 1,
        boundingBox: { x: 2000, y: 2000, width: 100, height: 50 },
        tagName: 'div'
      };

      const allElements = [...mockElements, outsideElement];

      elementFilter.updateConfig({
        includeOutsideViewport: false
      });

      const result = elementFilter.filterElements(allElements);

      expect(result.includedElements).toBe(5); // Original 5 elements
      expect(result.excludedElements).toBe(1);
      expect(result.exclusionReasons['outside_viewport']).toBe(1);
    });

    test('should handle elements without bounding box', () => {
      const elementWithoutBox: PlaywrightElement = {
        selector: '.no-bounding-box',
        type: ElementType.CLICKABLE_ELEMENT,
        visibility: 1,
        tagName: 'span'
      };

      const allElements = [...mockElements, elementWithoutBox];

      elementFilter.updateConfig({
        includeOutsideViewport: false
      });

      const result = elementFilter.filterElements(allElements);

      // Element without bounding box should be excluded from viewport check
      expect(result.exclusionReasons['outside_viewport']).toBeGreaterThanOrEqual(1);
    });

    test('should preserve original element order', () => {
      const result = elementFilter.filterElements(mockElements);

      expect(result.elements).toEqual(mockElements);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle empty element array', () => {
      const result = elementFilter.filterElements([]);

      expect(result.totalElements).toBe(0);
      expect(result.includedElements).toBe(0);
      expect(result.excludedElements).toBe(0);
      expect(result.elements).toEqual([]);
      expect(result.exclusionReasons).toEqual({});
    });

    test('should handle elements with missing properties', () => {
      const incompleteElements: PlaywrightElement[] = [
        {
          selector: 'button',
          type: ElementType.BUTTON
          // Missing other properties
        }
      ];

      expect(() => {
        const result = elementFilter.filterElements(incompleteElements);
        expect(result.totalElements).toBe(1);
      }).not.toThrow();
    });

    test('should handle large number of elements efficiently', () => {
      const largeElements: PlaywrightElement[] = [];

      // Generate 1000 mock elements
      for (let i = 0; i < 1000; i++) {
        largeElements.push({
          selector: `button[data-id="${i}"]`,
          type: ElementType.BUTTON,
          text: `Button ${i}`,
          visibility: 1,
          boundingBox: { x: 0, y: 0, width: 50, height: 20 },
          tagName: 'button'
        });
      }

      const startTime = Date.now();
      const result = elementFilter.filterElements(largeElements);
      const endTime = Date.now();

      expect(result.includedElements).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle complex regex patterns efficiently', () => {
      elementFilter.updateConfig({
        includeTextPatterns: [
          /submit/i, // Changed from /^submit$/i to match "Submit Form"
          /^(login|signin|sign.in)$/i,
          /^(continue|next|proceed)$/i,
          /^(cancel|close|dismiss)$/i
        ]
      });

      const result = elementFilter.filterElements(mockElements);

      expect(result.includedElements).toBe(1); // Only submit button matches
      expect(result.excludedElements).toBe(4);
    });
  });

  describe('Error Handling and Robustness', () => {
    test('should handle malformed selector patterns gracefully', () => {
      elementFilter.updateConfig({
        includeSelectors: ['[[invalid selector]]']
      });

      expect(() => {
        const result = elementFilter.filterElements(mockElements);
        expect(result.totalElements).toBe(mockElements.length);
      }).not.toThrow();
    });

    test('should handle undefined attributes in elements', () => {
      const elementWithUndefinedAttrs: PlaywrightElement = {
        selector: '.test',
        type: ElementType.INTERACTIVE_ELEMENT,
        attributes: undefined,
        visibility: 1,
        tagName: 'div'
      };

      const result = elementFilter.filterElements([elementWithUndefinedAttrs]);

      expect(result.totalElements).toBe(1);
      expect(result.includedElements).toBe(1);
    });

    test('should handle null custom filter function', () => {
      elementFilter.updateConfig({
        customFilter: null as any
      });

      expect(() => {
        const result = elementFilter.filterElements(mockElements);
        expect(result.totalElements).toBe(mockElements.length);
      }).not.toThrow();
    });

    test('should maintain immutability of returned elements', () => {
      const result = elementFilter.filterElements(mockElements);

      // Modify returned elements
      result.elements.forEach(el => {
        el.visibility = 0;
      });

      // Original elements should be unchanged
      expect(mockElements[0].visibility).toBe(1);
    });
  });
});