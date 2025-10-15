import { ElementType } from '../types';

// Define PlaywrightElement interface locally to avoid circular dependencies
export interface PlaywrightElement {
  selector: string;
  type: ElementType;
  text?: string;
  id?: string;
  class?: string;
  classes?: string[];
  attributes?: Record<string, string>;
  visibility?: number;
  disabled?: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectors?: string[];
  tagName?: string;
}

/**
 * Element filtering configuration
 */
export interface ElementFilterConfig {
  /**
   * Which element types to include in coverage analysis
   */
  includeTypes: ElementType[];

  /**
   * Which element types to exclude from coverage analysis
   */
  excludeTypes: ElementType[];

  /**
   * Custom CSS selectors to include
   */
  includeSelectors: string[];

  /**
   * Custom CSS selectors to exclude
   */
  excludeSelectors: string[];

  /**
   * Include elements based on attributes
   */
  includeAttributes: AttributeFilter[];

  /**
   * Exclude elements based on attributes
   */
  excludeAttributes: AttributeFilter[];

  /**
   * Include elements based on text content
   */
  includeTextPatterns: RegExp[];

  /**
   * Exclude elements based on text content
   */
  excludeTextPatterns: RegExp[];

  /**
   * Minimum visibility threshold (0-1)
   */
  minVisibility: number;

  /**
   * Minimum size in pixels
   */
  minSize: {
    width: number;
    height: number;
  };

  /**
   * Include hidden elements
   */
  includeHidden: boolean;

  /**
   * Include disabled elements
   */
  includeDisabled: boolean;

  /**
   * Include elements outside viewport
   */
  includeOutsideViewport: boolean;

  /**
   * Custom filter function
   */
  customFilter?: (element: PlaywrightElement) => boolean;
}

/**
 * Attribute filter configuration
 */
export interface AttributeFilter {
  name: string;
  value?: string;
  pattern?: RegExp;
  exists?: boolean;
}

/**
 * Filtering result with statistics
 */
export interface FilteringResult {
  elements: PlaywrightElement[];
  totalElements: number;
  includedElements: number;
  excludedElements: number;
  exclusionReasons: Record<string, number>;
}

/**
 * Comprehensive element filtering system
 */
export class ElementFilter {
  private config: ElementFilterConfig;

  constructor(config: Partial<ElementFilterConfig> = {}) {
    this.config = {
      includeTypes: Object.values(ElementType),
      excludeTypes: [],
      includeSelectors: [],
      excludeSelectors: [],
      includeAttributes: [],
      excludeAttributes: [],
      includeTextPatterns: [],
      excludeTextPatterns: [],
      minVisibility: 0.1,
      minSize: { width: 1, height: 1 },
      includeHidden: false,
      includeDisabled: true,
      includeOutsideViewport: true,
      ...config
    };
  }

  /**
   * Filter elements based on configuration
   */
  filterElements(elements: PlaywrightElement[]): FilteringResult {
    const totalElements = elements.length;
    const includedElements: PlaywrightElement[] = [];
    const exclusionReasons: Record<string, number> = {};

    for (const element of elements) {
      const reason = this.shouldExcludeElement(element);
      if (reason) {
        exclusionReasons[reason] = (exclusionReasons[reason] || 0) + 1;
      } else {
        includedElements.push(element);
      }
    }

    return {
      elements: includedElements,
      totalElements,
      includedElements: includedElements.length,
      excludedElements: totalElements - includedElements.length,
      exclusionReasons
    };
  }

  /**
   * Check if element should be excluded and return reason
   */
  private shouldExcludeElement(element: PlaywrightElement): string | null {
    // Check type inclusion
    if (this.config.includeTypes.length > 0 && !this.config.includeTypes.includes(element.type)) {
      return `type_not_included: ${element.type}`;
    }

    // Check type exclusion
    if (this.config.excludeTypes.includes(element.type)) {
      return `type_excluded: ${element.type}`;
    }

    // Check selector inclusion
    if (this.config.includeSelectors.length > 0) {
      const matchesIncludeSelector = this.config.includeSelectors.some(selector =>
        this.matchesSelector(element, selector)
      );
      if (!matchesIncludeSelector) {
        return 'no_matching_include_selector';
      }
    }

    // Check selector exclusion
    if (this.config.excludeSelectors.some(selector => this.matchesSelector(element, selector))) {
      return 'matches_exclude_selector';
    }

    // Check attribute inclusion
    if (this.config.includeAttributes.length > 0) {
      const matchesIncludeAttributes = this.config.includeAttributes.some(filter =>
        this.matchesAttributeFilter(element, filter)
      );
      if (!matchesIncludeAttributes) {
        return 'no_matching_include_attributes';
      }
    }

    // Check attribute exclusion
    if (this.config.excludeAttributes.some(filter => this.matchesAttributeFilter(element, filter))) {
      return 'matches_exclude_attributes';
    }

    // Check text pattern inclusion
    if (this.config.includeTextPatterns.length > 0) {
      const matchesIncludeText = this.config.includeTextPatterns.some(pattern =>
        pattern.test(element.text || '')
      );
      if (!matchesIncludeText) {
        return 'no_matching_include_text_pattern';
      }
    }

    // Check text pattern exclusion
    if (this.config.excludeTextPatterns.some(pattern =>
        pattern.test(element.text || '')
      )) {
      return 'matches_exclude_text_pattern';
    }

    // Check visibility
    if (!this.config.includeHidden && element.visibility < this.config.minVisibility) {
      return `insufficient_visibility: ${element.visibility}`;
    }

    // Check size
    if (element.boundingBox) {
      const { width, height } = element.boundingBox;
      if (width < this.config.minSize.width || height < this.config.minSize.height) {
        return `insufficient_size: ${width}x${height}`;
      }
    }

    // Check disabled state
    if (!this.config.includeDisabled && element.disabled) {
      return 'element_disabled';
    }

    // Check viewport
    if (!this.config.includeOutsideViewport && !this.isInViewport(element)) {
      return 'outside_viewport';
    }

    // Check custom filter
    if (this.config.customFilter && !this.config.customFilter(element)) {
      return 'custom_filter_excluded';
    }

    return null; // Element should be included
  }

  /**
   * Check if element matches CSS selector
   */
  private matchesSelector(element: PlaywrightElement, selector: string): boolean {
    // Simple selector matching - in a real implementation, this would use
    // a proper CSS selector engine
    if (selector.startsWith('#')) {
      return element.id === selector.substring(1);
    }

    if (selector.startsWith('.')) {
      return element.classes?.includes(selector.substring(1)) || false;
    }

    if (selector.startsWith('[') && selector.endsWith(']')) {
      const attrMatch = selector.slice(1, -1).split('=');
      const attrName = attrMatch[0];
      const attrValue = attrMatch[1]?.replace(/['"]/g, '');
      return element.attributes?.[attrName] === attrValue;
    }

    // Tag name matching
    if (element.tagName === selector.toLowerCase()) {
      return true;
    }

    // Check if selector exists in element's selector list
    return element.selectors?.some(s => s.includes(selector)) || false;
  }

  /**
   * Check if element matches attribute filter
   */
  private matchesAttributeFilter(element: PlaywrightElement, filter: AttributeFilter): boolean {
    const attrValue = element.attributes?.[filter.name];

    if (filter.exists !== undefined) {
      const hasAttribute = attrValue !== undefined;
      return filter.exists ? hasAttribute : !hasAttribute;
    }

    if (attrValue === undefined) {
      return false;
    }

    if (filter.value !== undefined) {
      return attrValue === filter.value;
    }

    if (filter.pattern !== undefined) {
      return filter.pattern.test(attrValue);
    }

    return true;
  }

  /**
   * Check if element is in viewport
   */
  private isInViewport(element: PlaywrightElement): boolean {
    if (!element.boundingBox) {
      return false;
    }

    const { x, y, width, height } = element.boundingBox;

    // Assume viewport size - in a real implementation, this would be
    // retrieved from the actual page viewport
    const viewportWidth = 1920;
    const viewportHeight = 1080;

    return (
      x >= 0 &&
      y >= 0 &&
      x + width <= viewportWidth &&
      y + height <= viewportHeight
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ElementFilterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ElementFilterConfig {
    return { ...this.config };
  }

  /**
   * Add element type to include list
   */
  includeType(type: ElementType): void {
    if (!this.config.includeTypes.includes(type)) {
      this.config.includeTypes.push(type);
    }
  }

  /**
   * Add element type to exclude list
   */
  excludeType(type: ElementType): void {
    if (!this.config.excludeTypes.includes(type)) {
      this.config.excludeTypes.push(type);
    }
  }

  /**
   * Add selector to include list
   */
  includeSelector(selector: string): void {
    if (!this.config.includeSelectors.includes(selector)) {
      this.config.includeSelectors.push(selector);
    }
  }

  /**
   * Add selector to exclude list
   */
  excludeSelector(selector: string): void {
    if (!this.config.excludeSelectors.includes(selector)) {
      this.config.excludeSelectors.push(selector);
    }
  }

  /**
   * Add attribute filter to include list
   */
  includeAttributeFilter(filter: AttributeFilter): void {
    this.config.includeAttributes.push(filter);
  }

  /**
   * Add attribute filter to exclude list
   */
  excludeAttributeFilter(filter: AttributeFilter): void {
    this.config.excludeAttributes.push(filter);
  }

  /**
   * Add text pattern to include list
   */
  includeTextPattern(pattern: RegExp): void {
    this.config.includeTextPatterns.push(pattern);
  }

  /**
   * Add text pattern to exclude list
   */
  excludeTextPattern(pattern: RegExp): void {
    this.config.excludeTextPatterns.push(pattern);
  }

  /**
   * Create filter from preset configuration
   */
  static fromPreset(preset: 'comprehensive' | 'essential' | 'minimal' | 'forms' | 'navigation'): ElementFilter {
    switch (preset) {
      case 'comprehensive':
        return new ElementFilter({
          includeTypes: Object.values(ElementType),
          includeHidden: false,
          includeDisabled: true,
          includeOutsideViewport: true,
          minVisibility: 0.1
        });

      case 'essential':
        return new ElementFilter({
          includeTypes: [
            ElementType.BUTTON,
            ElementType.INPUT,
            ElementType.SELECT,
            ElementType.LINK,
            ElementType.CHECKBOX,
            ElementType.RADIO
          ],
          includeHidden: false,
          includeDisabled: false,
          includeOutsideViewport: false,
          minVisibility: 0.5
        });

      case 'minimal':
        return new ElementFilter({
          includeTypes: [
            ElementType.BUTTON,
            ElementType.INPUT,
            ElementType.LINK
          ],
          includeHidden: false,
          includeDisabled: false,
          includeOutsideViewport: false,
          minVisibility: 0.8,
          minSize: { width: 10, height: 10 }
        });

      case 'forms':
        return new ElementFilter({
          includeTypes: [
            ElementType.INPUT,
            ElementType.SELECT,
            ElementType.TEXTAREA,
            ElementType.CHECKBOX,
            ElementType.RADIO,
            ElementType.BUTTON
          ],
          includeSelectors: ['form', '[data-testid*="form"]', '[id*="form"]'],
          includeHidden: false,
          includeDisabled: true,
          includeOutsideViewport: false,
          minVisibility: 0.3
        });

      case 'navigation':
        return new ElementFilter({
          includeTypes: [
            ElementType.LINK,
            ElementType.BUTTON
          ],
          includeSelectors: ['nav', '[role="navigation"]', '[aria-label*="menu"]'],
          includeHidden: false,
          includeDisabled: false,
          includeOutsideViewport: true,
          minVisibility: 0.2
        });

      default:
        return new ElementFilter();
    }
  }

  /**
   * Create filter from configuration string
   */
  static fromConfigString(configString: string): ElementFilter {
    try {
      const config = JSON.parse(configString);
      return new ElementFilter(config);
    } catch {
      // Try to parse simple preset names
      const preset = configString.toLowerCase() as any;
      if (['comprehensive', 'essential', 'minimal', 'forms', 'navigation'].includes(preset)) {
        return ElementFilter.fromPreset(preset);
      }

      // Fallback to default
      return new ElementFilter();
    }
  }

  /**
   * Export configuration as JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Validate filter configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for conflicting includes and excludes
    const conflictingTypes = this.config.includeTypes.filter(type =>
      this.config.excludeTypes.includes(type)
    );
    if (conflictingTypes.length > 0) {
      errors.push(`Conflicting element types: ${conflictingTypes.join(', ')}`);
    }

    // Check visibility range
    if (this.config.minVisibility < 0 || this.config.minVisibility > 1) {
      errors.push('minVisibility must be between 0 and 1');
    }

    // Check size constraints
    if (this.config.minSize.width < 0 || this.config.minSize.height < 0) {
      errors.push('minSize dimensions must be positive');
    }

    // Check regex patterns
    const allPatterns = [...this.config.includeTextPatterns, ...this.config.excludeTextPatterns];
    for (const pattern of allPatterns) {
      try {
        new RegExp(pattern);
      } catch {
        errors.push(`Invalid regex pattern: ${pattern}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get filter statistics
   */
  getStats(): {
    config: ElementFilterConfig;
    estimatedImpact: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    // Analyze configuration and provide recommendations
    if (this.config.includeTypes.length === 0) {
      recommendations.push('No element types included - filter will exclude everything');
    }

    if (this.config.minVisibility > 0.8) {
      recommendations.push('High visibility threshold may exclude partially hidden elements');
    }

    if (this.config.minSize.width > 50 || this.config.minSize.height > 50) {
      recommendations.push('Large minimum size may exclude small but important elements');
    }

    if (!this.config.includeDisabled && this.config.includeTypes.includes(ElementType.INPUT)) {
      recommendations.push('Excluding disabled inputs may miss form validation scenarios');
    }

    let estimatedImpact = 'moderate';
    if (this.config.includeTypes.length < 3) {
      estimatedImpact = 'high';
    } else if (this.config.includeTypes.length > Object.values(ElementType).length * 0.8) {
      estimatedImpact = 'low';
    }

    return {
      config: this.config,
      estimatedImpact,
      recommendations
    };
  }
}