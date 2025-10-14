import { PageElement, TestSelector, CoverageResult, PageCoverage, ElementType, SelectorType } from '../types';

export class CoverageCalculator {
  /**
   * Calculate coverage by comparing discovered elements with tested selectors
   */
  calculateCoverage(
    pageElements: PageElement[],
    testedSelectors: TestSelector[],
    pageUrl?: string
  ): CoverageResult {
    if (pageElements.length === 0) {
      return {
        totalElements: 0,
        coveredElements: 0,
        uncoveredElements: [],
        coveragePercentage: 0, // Changed from 100 to 0 - no elements means no coverage
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: pageUrl ? { [pageUrl]: { total: 0, covered: 0, elements: [] } } : {}
      };
    }

    const matchedElements = new Set<PageElement>();
    const coverageByType: Record<ElementType, { total: number; covered: number }> = {} as any;

    // Initialize coverage by type
    Object.values(ElementType).forEach(type => {
      coverageByType[type] = { total: 0, covered: 0 };
    });

    // Count elements by type
    pageElements.forEach(element => {
      if (!coverageByType[element.type]) {
        coverageByType[element.type] = { total: 0, covered: 0 };
      }
      coverageByType[element.type].total++;
    });

    // Match each tested selector to page elements
    testedSelectors.forEach(testedSelector => {
      const matchedElement = this.findMatchingElement(testedSelector, pageElements, matchedElements);
      if (matchedElement) {
        matchedElements.add(matchedElement);
        if (coverageByType[matchedElement.type]) {
          coverageByType[matchedElement.type].covered++;
        }
      }
    });

    const uncoveredElements = pageElements.filter(element => !matchedElements.has(element));
    const coveredElementsCount = matchedElements.size;
    const coveragePercentage = pageElements.length > 0
      ? Math.round((coveredElementsCount / pageElements.length) * 100)
      : 100;

    // Convert coverage by type to percentages
    const finalCoverageByType: Record<ElementType, number> = {} as any;
    Object.entries(coverageByType).forEach(([type, data]) => {
      finalCoverageByType[type as ElementType] = data.total > 0
        ? Math.round((data.covered / data.total) * 100)
        : 100;
    });

    return {
      totalElements: pageElements.length,
      coveredElements: coveredElementsCount,
      uncoveredElements,
      coveragePercentage,
      coverageByType: finalCoverageByType,
      elementsByPage: pageUrl ? {
        [pageUrl]: {
          total: pageElements.length,
          covered: coveredElementsCount,
          elements: pageElements
        }
      } : {}
    };
  }

  /**
   * Find a page element that matches the tested selector
   */
  private findMatchingElement(
    testedSelector: TestSelector,
    pageElements: PageElement[],
    alreadyMatched: Set<PageElement>
  ): PageElement | null {
    // Try to match against unmatched elements first
    const candidates = pageElements.filter(element => !alreadyMatched.has(element));

    for (const element of candidates) {
      if (this.selectorMatchesElement(testedSelector, element)) {
        return element;
      }
    }

    // If no unmatched element matches, try all elements (some selectors might be generic)
    for (const element of pageElements) {
      if (this.selectorMatchesElement(testedSelector, element)) {
        return element;
      }
    }

    return null;
  }

  /**
   * Enhanced matching algorithm that considers context and fuzzy matching
   */
  private findBestMatchingElement(
    testedSelector: TestSelector,
    pageElements: PageElement[],
    alreadyMatched: Set<PageElement>
  ): PageElement | null {
    const candidates = pageElements.filter(element => !alreadyMatched.has(element));
    const matches: Array<{ element: PageElement; score: number }> = [];

    // Score each candidate based on how well it matches
    for (const element of candidates) {
      const score = this.calculateMatchScore(testedSelector, element);
      if (score > 0) {
        matches.push({ element, score });
      }
    }

    // Return the element with the highest match score
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      return matches[0].element;
    }

    return null;
  }

  /**
   * Calculate a match score between selector and element (0-100)
   */
  private calculateMatchScore(testedSelector: TestSelector, element: PageElement): number {
    let score = 0;
    const { raw, normalized, type } = testedSelector;

    // Exact match gets highest score
    if (this.isDirectMatch(raw, element) || this.isDirectMatch(normalized, element)) {
      score += 100;
    }

    // Type-specific matching with scoring
    switch (type) {
      case SelectorType.TEXT:
        if (this.textContentMatch(raw, element)) {
          score += 90;
          // Bonus for exact text match
          const textMatch = raw.match(/text=["']([^"']+)["']/);
          if (textMatch && element.text && element.text.toLowerCase() === textMatch[1].toLowerCase()) {
            score += 10;
          }
        }
        break;

      case SelectorType.ROLE:
        if (this.roleMatch(raw, element)) {
          score += 95;
        }
        break;

      case SelectorType.TEST_ID:
        if (this.testIdMatch(raw, element)) {
          score += 95;
        }
        break;

      case SelectorType.CSS:
        if (this.cssMatch(raw, element)) {
          score += 80;
          // Bonus for more specific CSS selectors
          if (raw.includes('#') || raw.includes('.')) {
            score += 10;
          }
        }
        break;

      case SelectorType.XPATH:
        if (this.xpathMatch(raw, element)) {
          score += 85;
        }
        break;

      default:
        // Generic matching for other types
        if (this.isDirectMatch(raw, element)) {
          score += 70;
        }
        break;
    }

    // Contextual bonuses
    if (element.discoverySource && testedSelector.filePath) {
      // Bonus if element and selector come from similar contexts
      if (element.discoverySource.includes(testedSelector.filePath.split('/').pop() || '')) {
        score += 5;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Check if a selector matches a page element
   */
  private selectorMatchesElement(selector: TestSelector, element: PageElement): boolean {
    const { raw, normalized, type } = selector;

    // Direct selector match
    if (this.isDirectMatch(raw, element)) {
      return true;
    }

    // Normalized selector match
    if (normalized && this.isDirectMatch(normalized, element)) {
      return true;
    }

    // Type-specific matching
    switch (type) {
      case SelectorType.TEXT:
        return this.textContentMatch(raw, element);
      case SelectorType.ROLE:
        return this.roleMatch(raw, element);
      case SelectorType.TEST_ID:
        return this.testIdMatch(raw, element);
      case SelectorType.ALT_TEXT:
        return this.altTextMatch(raw, element);
      case SelectorType.PLACEHOLDER:
        return this.placeholderMatch(raw, element);
      case SelectorType.LABEL:
        return this.labelMatch(raw, element);
      case SelectorType.XPATH:
        return this.xpathMatch(raw, element);
      case SelectorType.CSS:
        return this.cssMatch(raw, element);
      default:
        return false;
    }
  }

  /**
   * Direct selector matching
   */
  private isDirectMatch(selector: string, element: PageElement): boolean {
    // Exact selector match
    if (selector === element.selector) {
      return true;
    }

    // CSS selector variations
    if (selector.startsWith('#') && element.id) {
      const idValue = selector.slice(1);
      return element.id === idValue;
    }

    if (selector.startsWith('.') && element.class) {
      const classes = selector.split('.').filter(c => c);
      const elementClasses = element.class.split(' ');
      return classes.every(cls => elementClasses.includes(cls));
    }

    // Tag name match
    if (selector === element.selector.split(' ')[0]) {
      return true;
    }

    return false;
  }

  /**
   * Text content matching
   */
  private textContentMatch(selector: string, element: PageElement): boolean {
    const textMatch = selector.match(/text=["']([^"']+)["']/);
    if (!textMatch || !element.text) return false;

    const searchText = textMatch[1].toLowerCase();
    const elementText = element.text.toLowerCase();

    return elementText.includes(searchText) || elementText === searchText;
  }

  /**
   * Role-based matching
   */
  private roleMatch(selector: string, element: PageElement): boolean {
    const roleMatch = selector.match(/role=["']([^"']+)["']/);
    if (!roleMatch || !element.role) return false;

    return element.role === roleMatch[1];
  }

  /**
   * Test ID matching
   */
  private testIdMatch(selector: string, element: PageElement): boolean {
    // Various test ID patterns
    const testIdPatterns = [
      /data-testid=["']([^"']+)["']/,
      /test-id=["']([^"']+)["']/,
      /data-test=["']([^"']+)["']/
    ];

    for (const pattern of testIdPatterns) {
      const match = selector.match(pattern);
      if (match && element.id) {
        return element.id === match[1];
      }
    }

    return false;
  }

  /**
   * Alt text matching
   */
  private altTextMatch(selector: string, element: PageElement): boolean {
    const altMatch = selector.match(/alt=["']([^"']+)["']/);
    if (!altMatch || !element.accessibleName) return false;

    return element.accessibleName.toLowerCase().includes(altMatch[1].toLowerCase());
  }

  /**
   * Placeholder matching
   */
  private placeholderMatch(selector: string, element: PageElement): boolean {
    const placeholderMatch = selector.match(/placeholder=["']([^"']+)["']/);
    if (!placeholderMatch) return false;

    // This would need element placeholder info
    return false;
  }

  /**
   * Label matching
   */
  private labelMatch(selector: string, element: PageElement): boolean {
    const labelMatch = selector.match(/label=["']([^"']+)["']/);
    if (!labelMatch || !element.accessibleName) return false;

    const labelText = labelMatch[1].toLowerCase();
    return element.accessibleName.toLowerCase().includes(labelText);
  }

  /**
   * XPath matching
   */
  private xpathMatch(selector: string, element: PageElement): boolean {
    if (!element.xpath) return false;

    // Simple XPath matching (could be enhanced with XPath parser)
    if (selector === element.xpath) {
      return true;
    }

    // Check for partial XPath matches
    if (selector.endsWith(']') && element.xpath.endsWith(']')) {
      const selectorIndex = selector.match(/\[@id="([^"]+)"\]/);
      const elementIndex = element.xpath.match(/\[@id="([^"]+)"\]/);

      if (selectorIndex && elementIndex && selectorIndex[1] === elementIndex[1]) {
        return true;
      }
    }

    return false;
  }

  /**
   * CSS selector matching
   */
  private cssMatch(selector: string, element: PageElement): boolean {
    // Tag name matching
    if (selector === element.type) {
      return true;
    }

    // Attribute matching
    if (selector.includes('[') && selector.includes(']')) {
      return this.attributeMatch(selector, element);
    }

    // Complex CSS selector matching (simplified)
    const parts = selector.split(' ');
    const lastPart = parts[parts.length - 1];

    // Check if the last part matches the element
    return this.isDirectMatch(lastPart, element);
  }

  /**
   * Attribute matching for CSS selectors
   */
  private attributeMatch(selector: string, element: PageElement): boolean {
    const attrMatch = selector.match(/\[([^=]+)(=["']([^"']+)["'])?\]/);
    if (!attrMatch) return false;

    const attrName = attrMatch[1];
    const attrValue = attrMatch[3];

    switch (attrName) {
      case 'id':
        return attrValue ? element.id === attrValue : !!element.id;
      case 'class':
        if (attrValue) {
          return element.class?.split(' ').includes(attrValue);
        }
        return !!element.class;
      case 'role':
        return attrValue ? element.role === attrValue : !!element.role;
      default:
        return false;
    }
  }

  /**
   * Aggregate coverage from multiple pages
   */
  aggregatePageCoverage(pages: PageCoverage[]): CoverageResult {
    if (pages.length === 0) {
      return {
        totalElements: 0,
        coveredElements: 0,
        uncoveredElements: [],
        coveragePercentage: 0, // Changed from 100 to 0 - no pages means no coverage
        coverageByType: {} as Record<ElementType, number>,
        elementsByPage: {}
      };
    }

    const allElements: PageElement[] = [];
    const allCoveredElements: PageElement[] = [];
    const elementsByPage: Record<string, { total: number; covered: number; elements: PageElement[] }> = {};
    const coverageByType: Record<ElementType, { total: number; covered: number }> = {} as any;

    // Initialize coverage by type
    Object.values(ElementType).forEach(type => {
      coverageByType[type] = { total: 0, covered: 0 };
    });

    // Aggregate data from all pages
    pages.forEach(page => {
      allElements.push(...page.elements);
      allCoveredElements.push(
        ...page.elements.filter(el =>
          page.coverage.uncoveredElements.every(uncovered => uncovered.selector !== el.selector)
        )
      );

      elementsByPage[page.url] = {
        total: page.elements.length,
        covered: page.coverage.coveredElements,
        elements: page.elements
      };

      // Count by type
      page.elements.forEach(element => {
        coverageByType[element.type].total++;
      });

      page.coverage.uncoveredElements.forEach(element => {
        // Element is uncovered, so don't increment covered count
      });

      const coveredInPage = page.elements.filter(el =>
        page.coverage.uncoveredElements.every(uncovered => uncovered.selector !== el.selector)
      );

      coveredInPage.forEach(element => {
        coverageByType[element.type].covered++;
      });
    });

    const uncoveredElements = allElements.filter(el =>
      !allCoveredElements.some(covered => covered.selector === el.selector)
    );

    const totalElements = allElements.length;
    const coveredElements = allCoveredElements.length;
    const coveragePercentage = totalElements > 0
      ? Math.round((coveredElements / totalElements) * 100)
      : 0; // Changed from 100 to 0 - no elements means no coverage

    // Convert to percentages
    const finalCoverageByType: Record<ElementType, number> = {} as any;
    Object.entries(coverageByType).forEach(([type, data]) => {
      finalCoverageByType[type as ElementType] = data.total > 0
        ? Math.round((data.covered / data.total) * 100)
        : 100;
    });

    return {
      totalElements,
      coveredElements,
      uncoveredElements,
      coveragePercentage,
      coverageByType: finalCoverageByType,
      elementsByPage
    };
  }

  /**
   * Generate recommendations based on coverage results
   */
  generateRecommendations(coverage: CoverageResult): string[] {
    const recommendations: string[] = [];

    if (coverage.totalElements === 0) {
      recommendations.push('Critical: No interactive elements were discovered. Check if pages are loading correctly or if element discovery is working.');
      return recommendations;
    }

    // Overall coverage recommendations
    if (coverage.coveragePercentage < 50) {
      recommendations.push('Critical: Your test coverage is below 50%. Consider adding more E2E tests.');
    } else if (coverage.coveragePercentage < 75) {
      recommendations.push('Warning: Test coverage is below 75%. Some interactive elements may not be tested.');
    } else if (coverage.coveragePercentage < 90) {
      recommendations.push('Good: Test coverage is decent but there\'s room for improvement.');
    } else {
      recommendations.push('Excellent: You have comprehensive test coverage!');
    }

    // Check for specific element types with low coverage
    Object.entries(coverage.coverageByType).forEach(([type, percentage]) => {
      if (percentage < 50) {
        recommendations.push(`Low coverage for ${type} elements (${percentage}%). Consider adding tests for these.`);
      } else if (percentage < 75) {
        recommendations.push(`Moderate coverage for ${type} elements (${percentage}%). Some tests may be missing.`);
      }
    });

    // Priority-based recommendations for uncovered elements
    const priorityRecommendations = this.generatePriorityRecommendations(coverage.uncoveredElements);
    recommendations.push(...priorityRecommendations);

    // Test quality recommendations
    const qualityRecommendations = this.generateQualityRecommendations(coverage);
    recommendations.push(...qualityRecommendations);

    return recommendations;
  }

  /**
   * Generate priority-based recommendations for uncovered elements
   */
  private generatePriorityRecommendations(uncoveredElements: PageElement[]): string[] {
    const recommendations: string[] = [];

    // Group by priority based on element type and accessibility
    const highPriority = uncoveredElements.filter(el =>
      el.type === ElementType.BUTTON || el.type === ElementType.INPUT || el.role === 'button'
    );

    const mediumPriority = uncoveredElements.filter(el =>
      el.type === ElementType.SELECT || el.type === ElementType.TEXTAREA || el.role === 'link' || el.role === 'navigation'
    );

    if (highPriority.length > 0) {
      recommendations.push(`High Priority: ${highPriority.length} critical interactive elements (buttons, inputs, links) are not covered by tests.`);
    }

    if (mediumPriority.length > 0) {
      recommendations.push(`Medium Priority: ${mediumPriority.length} important elements (forms, navigation) are not covered by tests.`);
    }

    // Check for elements with accessible names that should be tested
    const accessibleElements = uncoveredElements.filter(el => el.accessibleName);
    if (accessibleElements.length > 0) {
      recommendations.push(`${accessibleElements.length} elements have accessible names but are not tested. Consider using getByRole() or getByText() selectors.`);
    }

    return recommendations;
  }

  /**
   * Generate recommendations about test quality and selector usage
   */
  private generateQualityRecommendations(coverage: CoverageResult): string[] {
    const recommendations: string[] = [];

    // Check for potential test quality issues
    if (coverage.coveragePercentage > 95) {
      recommendations.push('⚠️ Very high coverage detected. Ensure your tests are meaningful and not just clicking everything.');
    }

    // Check if coverage might be artificially inflated
    const totalElements = coverage.totalElements;
    const coveredElements = coverage.coveredElements;

    if (coveredElements > 0 && totalElements > 0) {
      const ratio = coveredElements / totalElements;
      if (ratio > 0.9 && totalElements < 10) {
        recommendations.push('Small number of elements detected with high coverage. Consider testing more complex user flows.');
      }
    }

    return recommendations;
  }

  /**
   * Generate insights about selector effectiveness
   */
  generateSelectorInsights(testedSelectors: TestSelector[], coverage: CoverageResult): {
    mostEffectiveSelectors: Array<{ selector: string; type: string; usage: number }>;
    ineffectiveSelectors: Array<{ selector: string; type: string; reason: string }>;
    coverageBySelectorType: Record<string, { count: number; effectiveness: number }>;
  } {
    const insights = {
      mostEffectiveSelectors: [] as Array<{ selector: string; type: string; usage: number }>,
      ineffectiveSelectors: [] as Array<{ selector: string; type: string; reason: string }>,
      coverageBySelectorType: {} as Record<string, { count: number; effectiveness: number }>
    };

    // Analyze selector usage by type
    const selectorTypeStats: Record<string, { count: number; matched: number }> = {};

    testedSelectors.forEach(selector => {
      const type = selector.type || 'unknown';
      if (!selectorTypeStats[type]) {
        selectorTypeStats[type] = { count: 0, matched: 0 };
      }
      selectorTypeStats[type].count++;
    });

    // Calculate effectiveness (simplified - would need actual matching data)
    Object.entries(selectorTypeStats).forEach(([type, stats]) => {
      const effectiveness = coverage.coveragePercentage > 0 ?
        Math.min((stats.count / testedSelectors.length) * 100, 100) : 0;

      insights.coverageBySelectorType[type] = {
        count: stats.count,
        effectiveness
      };
    });

    return insights;
  }

  private groupUncoveredByType(uncoveredElements: PageElement[]): Record<string, PageElement[]> {
    const grouped: Record<string, PageElement[]> = {};

    uncoveredElements.forEach(element => {
      if (!grouped[element.type]) {
        grouped[element.type] = [];
      }
      grouped[element.type].push(element);
    });

    return grouped;
  }
}