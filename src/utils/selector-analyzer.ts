import { TestSelector, PageElement, SelectorType, ElementType } from '../types';

export interface SelectorMismatch {
  testSelector: TestSelector;
  possibleMatches: PageElement[];
  matchScore: number;
  reason: string;
}

export interface SelectorAnalysisReport {
  totalSelectors: number;
  matchedSelectors: number;
  unmatchedSelectors: number;
  mismatches: SelectorMismatch[];
  recommendations: string[];
}

export class SelectorAnalyzer {
  /**
   * Analyze why test selectors aren't matching page elements
   */
  analyzeSelectorMismatch(
    testSelectors: TestSelector[],
    pageElements: PageElement[]
  ): SelectorAnalysisReport {
    const mismatches: SelectorMismatch[] = [];
    let matchedCount = 0;

    for (const testSelector of testSelectors) {
      const matches = this.findPotentialMatches(testSelector, pageElements);
      const matchScore = this.calculateMatchScore(testSelector, matches);

      if (matchScore > 0.5) {
        matchedCount++;
      } else {
        mismatches.push({
          testSelector,
          possibleMatches: matches,
          matchScore,
          reason: this.getMismatchReason(testSelector, pageElements)
        });
      }
    }

    return {
      totalSelectors: testSelectors.length,
      matchedSelectors: matchedCount,
      unmatchedSelectors: testSelectors.length - matchedCount,
      mismatches,
      recommendations: this.generateMismatchRecommendations(mismatches)
    };
  }

  /**
   * Find potential matches for a test selector among page elements
   */
  private findPotentialMatches(
    testSelector: TestSelector,
    pageElements: PageElement[]
  ): PageElement[] {
    const matches: PageElement[] = [];

    for (const element of pageElements) {
      if (this.isPotentialMatch(testSelector, element)) {
        matches.push(element);
      }
    }

    return matches;
  }

  /**
   * Check if a test selector could potentially match an element
   */
  private isPotentialMatch(testSelector: TestSelector, element: PageElement): boolean {
    const { normalized, type } = testSelector;

    switch (type) {
      case SelectorType.TEST_ID:
        return element.selector.includes('data-testid') ||
               element.selector.includes(normalized);

      case SelectorType.TEXT:
        return element.text?.toLowerCase().includes(normalized.toLowerCase()) ||
               normalized.includes(element.text?.toLowerCase() || '');

      case SelectorType.CSS:
        return this.cssMatch(normalized, element);

      case SelectorType.ROLE:
        return element.role === normalized.replace('role=', '');

      case SelectorType.PLACEHOLDER:
        return element.selector.includes('placeholder') &&
               element.selector.includes(normalized);

      case SelectorType.LABEL:
        return element.accessibleName?.toLowerCase().includes(normalized.toLowerCase());

      default:
        return false;
    }
  }

  /**
   * Basic CSS selector matching
   */
  private cssMatch(selector: string, element: PageElement): boolean {
    if (element.selector === selector) return true;
    if (selector.includes(element.text || '')) return true;
    if (selector.includes(element.class || '')) return true;
    if (selector.includes(element.id || '')) return true;
    return false;
  }

  /**
   * Calculate how well a selector matches elements
   */
  private calculateMatchScore(
    testSelector: TestSelector,
    matches: PageElement[]
  ): number {
    if (matches.length === 0) return 0;

    // Exact match gets score 1.0
    const exactMatch = matches.find(e => e.selector === testSelector.raw);
    if (exactMatch) return 1.0;

    // Partial matches get lower scores
    let bestScore = 0;
    for (const match of matches) {
      let score = 0;

      // Same type of selector
      if (this.getTypeCompatibility(testSelector.type, match)) {
        score += 0.3;
      }

      // Text/content similarity
      if (testSelector.raw.toLowerCase().includes(match.text?.toLowerCase() || '')) {
        score += 0.4;
      }

      // Attribute similarity
      if (this.hasAttributeSimilarity(testSelector.raw, match)) {
        score += 0.3;
      }

      bestScore = Math.max(bestScore, score);
    }

    return bestScore;
  }

  /**
   * Check if selector type is compatible with element
   */
  private getTypeCompatibility(selectorType: SelectorType, element: PageElement): boolean {
    switch (selectorType) {
      case SelectorType.TEST_ID:
        return element.selector.includes('data-testid');
      case SelectorType.TEXT:
        return !!element.text;
      case SelectorType.CSS:
        return true; // CSS can match anything
      case SelectorType.ROLE:
        return !!element.role;
      case SelectorType.PLACEHOLDER:
        return element.type === ElementType.INPUT || element.type === ElementType.TEXTAREA;
      default:
        return false;
    }
  }

  /**
   * Check attribute similarity between selector and element
   */
  private hasAttributeSimilarity(selector: string, element: PageElement): boolean {
    const attrs = ['id', 'class', 'type', 'name', 'role'];
    return attrs.some(attr => {
      const elementAttr = (element as any)[attr];
      return elementAttr && selector.includes(elementAttr);
    });
  }

  /**
   * Get reason why selector doesn't match
   */
  private getMismatchReason(testSelector: TestSelector, pageElements: PageElement[]): string {
    const { type, raw } = testSelector;

    switch (type) {
      case SelectorType.TEST_ID:
        const hasTestIds = pageElements.some(e => e.selector.includes('data-testid'));
        return hasTestIds
          ? `Test ID '${raw}' not found. Elements have different test IDs.`
          : `No elements on page have test IDs. Consider adding data-testid attributes.`;

      case SelectorType.TEXT:
        return `Text selector '${raw}' not found. Current page text: ${pageElements.map(e => e.text).join(', ')}`;

      case SelectorType.CSS:
        return `CSS selector '${raw}' matches no elements. Check if selector syntax is correct or if elements exist.`;

      case SelectorType.ROLE:
        const availableRoles = [...new Set(pageElements.map(e => e.role).filter(Boolean))];
        return `Role '${raw}' not found. Available roles: ${availableRoles.join(', ')}`;

      default:
        return `Selector '${raw}' of type '${type}' matches no elements on the page.`;
    }
  }

  /**
   * Generate recommendations based on mismatches
   */
  private generateMismatchRecommendations(mismatches: SelectorMismatch[]): string[] {
    const recommendations: string[] = [];
    const typeCounts = this.getMismatchTypeCounts(mismatches);

    // Test ID issues
    if (typeCounts[SelectorType.TEST_ID] > 0) {
      recommendations.push(`Add data-testid attributes to interactive elements for more reliable testing`);
      recommendations.push(`${typeCounts[SelectorType.TEST_ID]} test ID selectors are failing - verify test IDs match actual elements`);
    }

    // Text selector issues
    if (typeCounts[SelectorType.TEXT] > 0) {
      recommendations.push(`${typeCounts[SelectorType.TEXT]} text-based selectors are failing - text content may have changed`);
      recommendations.push(`Consider using test IDs instead of text selectors for better stability`);
    }

    // CSS selector issues
    if (typeCounts[SelectorType.CSS] > 0) {
      recommendations.push(`${typeCounts[SelectorType.CSS]} CSS selectors are failing - DOM structure may have changed`);
      recommendations.push(`Review CSS selectors and update them to match current DOM structure`);
    }

    // General recommendations
    if (mismatches.length > 10) {
      recommendations.push(`Large number of failing selectors (${mismatches.length}) - consider comprehensive test review`);
    }

    recommendations.push(`Run tests with --verbose to see detailed selector vs element comparisons`);

    return recommendations;
  }

  /**
   * Count mismatches by selector type
   */
  private getMismatchTypeCounts(mismatches: SelectorMismatch[]): Record<SelectorType, number> {
    const counts: Record<SelectorType, number> = {
      [SelectorType.CSS]: 0,
      [SelectorType.XPATH]: 0,
      [SelectorType.TEXT]: 0,
      [SelectorType.ROLE]: 0,
      [SelectorType.TEST_ID]: 0,
      [SelectorType.ALT_TEXT]: 0,
      [SelectorType.PLACEHOLDER]: 0,
      [SelectorType.LABEL]: 0
    };

    mismatches.forEach(mismatch => {
      counts[mismatch.testSelector.type]++;
    });

    return counts;
  }
}