import * as fs from 'fs';
import * as path from 'path';
import { PageElement, ElementType } from '../types';

interface CoverageRecord {
  selector: string;
  type: string;
  text?: string;
  id?: string;
  className?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  discoveredIn: {
    url: string;
    timestamp: number;
    discoverySource: string;
  }[];
  coveredBy: {
    testFile: string;
    testName: string;
    timestamp: number;
    interactionType?: string;
  }[];
  isHidden?: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface AggregatedCoverage {
  totalElements: number;
  coveredElements: number;
  uncoveredElements: CoverageRecord[];
  coveragePercentage: number;
  coverageByType: Record<string, {
    total: number;
    covered: number;
    percentage: number;
  }>;
  coverageByPage: Record<string, {
    total: number;
    covered: number;
    uncovered: CoverageRecord[];
  }>;
  testFiles: string[];
  lastUpdated: number;
}

export class CoverageAggregator {
  private coverageDataPath: string;
  private coverageRecords: Map<string, CoverageRecord> = new Map();
  private testCoverage: Map<string, Set<string>> = new Map(); // testFile -> set of selectors

  constructor(outputPath: string = './coverage-report') {
    this.coverageDataPath = path.join(outputPath, '.coverage-data.json');
    this.loadExistingData();
  }

  /**
   * Load existing coverage data from disk
   */
  private loadExistingData(): void {
    try {
      if (fs.existsSync(this.coverageDataPath)) {
        const data = fs.readFileSync(this.coverageDataPath, 'utf-8');
        const parsed = JSON.parse(data);

        // Load coverage records
        if (parsed.records) {
          this.coverageRecords = new Map(Object.entries(parsed.records));
        }

        // Load test coverage
        if (parsed.testCoverage) {
          this.testCoverage = new Map(
            Object.entries(parsed.testCoverage).map(([key, value]) => [
              key,
              new Set(value as string[])
            ])
          );
        }

        console.log(`📊 Loaded existing coverage data: ${this.coverageRecords.size} elements, ${this.testCoverage.size} test files`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load existing coverage data:', error);
    }
  }

  /**
   * Save coverage data to disk
   */
  private saveData(): void {
    try {
      const outputDir = path.dirname(this.coverageDataPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const data = {
        records: Object.fromEntries(this.coverageRecords),
        testCoverage: Object.fromEntries(
          Array.from(this.testCoverage.entries()).map(([key, value]) => [
            key,
            Array.from(value)
          ])
        ),
        lastUpdated: Date.now()
      };

      fs.writeFileSync(this.coverageDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to save coverage data:', error);
    }
  }

  /**
   * Add discovered elements from a test run
   */
  addDiscoveredElements(elements: PageElement[], testFile: string, testName: string): void {
    const timestamp = Date.now();

    elements.forEach(element => {
      const key = this.getElementKey(element);

      if (!this.coverageRecords.has(key)) {
        // New element discovered
        this.coverageRecords.set(key, {
          selector: element.selector,
          type: element.type,
          text: element.text,
          id: element.id,
          className: element.class,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
          discoveredIn: [{
            url: element.discoveryContext?.split('-')[1] || 'unknown',
            timestamp,
            discoverySource: element.discoverySource || 'unknown'
          }],
          coveredBy: [],
          isHidden: !element.isVisible,
          boundingBox: element.boundingBox
        });
      } else {
        // Update existing element
        const record = this.coverageRecords.get(key)!;
        record.lastSeenAt = timestamp;

        // Add discovery source if different
        const lastDiscovery = record.discoveredIn[record.discoveredIn.length - 1];
        const currentUrl = element.discoveryContext?.split('-')[1] || 'unknown';
        if (lastDiscovery.url !== currentUrl) {
          record.discoveredIn.push({
            url: currentUrl,
            timestamp,
            discoverySource: element.discoverySource || 'unknown'
          });
        }
      }
    });

    this.saveData();
  }

  /**
   * Mark elements as covered by a test
   */
  markElementsCovered(elements: PageElement[], testFile: string, testName: string, interactionType?: string): void {
    const timestamp = Date.now();

    // Ensure test file exists in test coverage map
    if (!this.testCoverage.has(testFile)) {
      this.testCoverage.set(testFile, new Set());
    }

    elements.forEach(element => {
      const key = this.getElementKey(element);

      // Add to test coverage
      this.testCoverage.get(testFile)!.add(key);

      // Try to find matching coverage record with flexible matching
      let matchedRecord = this.coverageRecords.get(key);

      // If exact match not found, try flexible matching
      if (!matchedRecord) {
        matchedRecord = this.findMatchingRecord(element);
      }

      // Update coverage record
      if (matchedRecord) {
        // Check if this test already covered this element
        const existingCoverage = matchedRecord.coveredBy.find(
          coverage => coverage.testFile === testFile && coverage.testName === testName
        );

        if (!existingCoverage) {
          matchedRecord.coveredBy.push({
            testFile,
            testName,
            timestamp,
            interactionType
          });
        }
      }
    });

    this.saveData();
  }

  /**
   * Generate aggregated coverage report
   */
  generateAggregatedCoverage(): AggregatedCoverage {
    const allRecords = Array.from(this.coverageRecords.values());
    const coveredElements = allRecords.filter(record => record.coveredBy.length > 0);
    const uncoveredElements = allRecords.filter(record => record.coveredBy.length === 0);

    // Calculate coverage by type
    const coverageByType: Record<string, { total: number; covered: number; percentage: number }> = {};
    const typeGroups = this.groupBy(allRecords, 'type');

    for (const [type, elements] of Object.entries(typeGroups)) {
      const covered = elements.filter(el => el.coveredBy.length > 0).length;
      coverageByType[type] = {
        total: elements.length,
        covered,
        percentage: elements.length > 0 ? Math.round((covered / elements.length) * 100) : 0
      };
    }

    // Calculate coverage by page
    const coverageByPage: Record<string, { total: number; covered: number; uncovered: CoverageRecord[] }> = {};
    const pageGroups = this.groupBy(uncoveredElements, 'discoveredIn.0.url');

    for (const [url, elements] of Object.entries(pageGroups)) {
      const totalElements = allRecords.filter(el =>
        el.discoveredIn.some(discovery => discovery.url === url)
      ).length;
      const covered = totalElements - elements.length;

      coverageByPage[url] = {
        total: totalElements,
        covered,
        uncovered: elements
      };
    }

    return {
      totalElements: allRecords.length,
      coveredElements: coveredElements.length,
      uncoveredElements,
      coveragePercentage: allRecords.length > 0 ? Math.round((coveredElements.length / allRecords.length) * 100) : 0,
      coverageByType,
      coverageByPage,
      testFiles: Array.from(this.testCoverage.keys()),
      lastUpdated: Date.now()
    };
  }

  /**
   * Get uncovered elements with recommendations
   */
  getUncoveredElementsWithRecommendations(): {
    element: CoverageRecord;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    suggestedTest: string;
  }[] {
    const aggregated = this.generateAggregatedCoverage();

    return aggregated.uncoveredElements.map(element => {
      const { recommendation, priority, suggestedTest } = this.generateRecommendation(element);
      return {
        element,
        recommendation,
        priority,
        suggestedTest
      };
    }).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate test recommendations for uncovered elements
   */
  private generateRecommendation(element: CoverageRecord): {
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    suggestedTest: string;
  } {
    const selector = element.selector;
    const type = element.type;
    const text = element.text;
    const id = element.id;

    let recommendation = '';
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let suggestedTest = '';

    // High priority for critical elements
    if (type === 'button' && (text?.includes('submit') || text?.includes('save') || text?.includes('delete'))) {
      priority = 'high';
      recommendation = `Critical button "${text}" is not tested. This could lead to major functionality issues.`;
      suggestedTest = `test('should handle ${text} button', async ({ page }) => {\n  await page.click('${selector}');\n  // Add assertions for expected behavior\n});`;
    } else if (type === 'input' && (id?.includes('email') || id?.includes('password') || id?.includes('login'))) {
      priority = 'high';
      recommendation = `Critical input field "${id || selector}" is not tested. Authentication and user data are at risk.`;
      suggestedTest = `test('should fill and validate ${id || selector}', async ({ page }) => {\n  await page.fill('${selector}', 'test-value');\n  // Add validation assertions\n});`;
    } else if (selector.includes('[data-testid]')) {
      priority = 'medium';
      recommendation = `Element with test ID "${selector}" is not covered despite being explicitly marked for testing.`;
      suggestedTest = `test('should interact with ${selector}', async ({ page }) => {\n  await page.click('${selector}');\n  // Add expected behavior assertions\n});`;
    } else if (type === 'button') {
      priority = 'medium';
      recommendation = `Button "${text || selector}" is not tested. User interactions may not work as expected.`;
      suggestedTest = `test('should click ${text || selector} button', async ({ page }) => {\n  await page.click('${selector}');\n  // Verify button action\n});`;
    } else if (type === 'link') {
      priority = 'medium';
      recommendation = `Link "${text || selector}" is not tested. Navigation may be broken.`;
      suggestedTest = `test('should navigate with ${text || selector} link', async ({ page }) => {\n  await page.click('${selector}');\n  // Verify navigation\n});`;
    } else {
      priority = 'low';
      recommendation = `Interactive element "${selector}" is not tested. Consider adding test coverage.`;
      suggestedTest = `test('should interact with ${selector}', async ({ page }) => {\n  await page.click('${selector}');\n  // Add appropriate assertions\n});`;
    }

    return { recommendation, priority, suggestedTest };
  }

  /**
   * Clear all coverage data (for fresh starts)
   */
  clearAllData(): void {
    this.coverageRecords.clear();
    this.testCoverage.clear();

    try {
      if (fs.existsSync(this.coverageDataPath)) {
        fs.unlinkSync(this.coverageDataPath);
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear coverage data:', error);
    }
  }

  /**
   * Clean up duplicate selectors and merge coverage data
   */
  cleanupDuplicates(): void {
    const selectorMap = new Map<string, CoverageRecord>();
    const mergedTestCoverage = new Map<string, Set<string>>();

    // Merge records with flexible selector matching
    for (const record of this.coverageRecords.values()) {
      const key = this.normalizeSelectorForMatching(record.selector);
      const existing = selectorMap.get(key);

      if (!existing) {
        selectorMap.set(key, record);
      } else {
        // Merge coverage data
        existing.coveredBy.push(...record.coveredBy);
        existing.discoveredIn.push(...record.discoveredIn);

        // Update timestamps
        existing.firstSeenAt = Math.min(existing.firstSeenAt, record.firstSeenAt);
        existing.lastSeenAt = Math.max(existing.lastSeenAt, record.lastSeenAt);
      }
    }

    // Remove duplicate coverage entries
    for (const record of selectorMap.values()) {
      const uniqueCoverage = new Map<string, typeof record.coveredBy[0]>();

      record.coveredBy.forEach(coverage => {
        const key = `${coverage.testFile}:${coverage.testName}`;
        uniqueCoverage.set(key, coverage);
      });

      record.coveredBy = Array.from(uniqueCoverage.values());
    }

    // Update the data structures
    this.coverageRecords.clear();
    selectorMap.forEach((record, key) => {
      this.coverageRecords.set(this.getElementKey(record), record);
    });

    // Rebuild test coverage map
    for (const [testFile, selectors] of this.testCoverage.entries()) {
      const normalizedSelectors = new Set<string>();

      for (const selector of selectors) {
        const record = this.coverageRecords.get(selector);
        if (record) {
          normalizedSelectors.add(this.getElementKey(record));
        }
      }

      if (normalizedSelectors.size > 0) {
        mergedTestCoverage.set(testFile, normalizedSelectors);
      }
    }

    this.testCoverage = mergedTestCoverage;

    console.log(`🧹 Cleaned up duplicates: ${selectorMap.size} unique selectors remaining`);

    this.saveData();
  }

  /**
   * Get coverage statistics for a specific test file
   */
  getTestFileCoverage(testFile: string): {
    totalElements: number;
    coveredElements: number;
    uncoveredElements: CoverageRecord[];
    coveragePercentage: number;
  } {
    const coveredSelectors = this.testCoverage.get(testFile) || new Set();
    const allRecords = Array.from(this.coverageRecords.values());
    const covered = allRecords.filter(record =>
      coveredSelectors.has(this.getElementKey(record))
    );
    const uncovered = allRecords.filter(record =>
      !coveredSelectors.has(this.getElementKey(record))
    );

    return {
      totalElements: allRecords.length,
      coveredElements: covered.length,
      uncoveredElements: uncovered,
      coveragePercentage: allRecords.length > 0 ? Math.round((covered.length / allRecords.length) * 100) : 0
    };
  }

  /**
   * Helper methods
   */
  private getElementKey(element: PageElement | CoverageRecord): string {
    return `${element.selector}-${element.type}`;
  }

  /**
   * Find matching coverage record with flexible matching
   */
  private findMatchingRecord(element: PageElement): CoverageRecord | null {
    const allRecords = Array.from(this.coverageRecords.values());

    // Try to find a record that matches this element
    for (const record of allRecords) {
      if (this.isElementMatch(element, record)) {
        return record;
      }
    }

    return null;
  }

  /**
   * Check if two elements match (flexible matching)
   */
  private isElementMatch(element1: PageElement, record: CoverageRecord): boolean {
    // Exact selector match
    if (element1.selector === record.selector) {
      return true;
    }

    // Type match and selector similarity
    if (element1.type === record.type) {
      // Check for selector patterns that are equivalent
      const normalized1 = this.normalizeSelectorForMatching(element1.selector);
      const normalized2 = this.normalizeSelectorForMatching(record.selector);

      if (normalized1 === normalized2) {
        return true;
      }

      // Check for CSS attribute selectors that might be quoted differently
      if (this.areAttributeSelectorsEqual(element1.selector, record.selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize selector for matching (more aggressive than display normalization)
   */
  private normalizeSelectorForMatching(selector: string): string {
    // Remove quotes around attribute values
    let normalized = selector.replace(/(\w+)=['"`]([^'"`]*)['"`]/g, '$1=$2');

    // Remove outer quotes
    if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))) {
      normalized = normalized.slice(1, -1);
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Check if two attribute selectors are equal (ignoring quote differences)
   */
  private areAttributeSelectorsEqual(selector1: string, selector2: string): boolean {
    // Extract attribute selectors from both
    const attrs1 = selector1.match(/\[[^\]]+\]/g) || [];
    const attrs2 = selector2.match(/\[[^\]]+\]/g) || [];

    if (attrs1.length !== attrs2.length) {
      return false;
    }

    // Normalize each attribute selector and compare
    for (let i = 0; i < attrs1.length; i++) {
      const normalized1 = attrs1[i].replace(/(\w+)=['"`]([^'"`]*)['"`]/g, '$1=$2');
      const normalized2 = attrs2[i].replace(/(\w+)=['"`]([^'"`]*)['"`]/g, '$1=$2');

      if (normalized1 !== normalized2) {
        return false;
      }
    }

    return true;
  }

  private groupBy<T>(array: T[], key: string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = this.getNestedValue(item, key);
      const groupKey = value || 'unknown';
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get screenshot data for uncovered elements
   */
  getUncoveredElementsForScreenshots(): Array<{ selector: string; type?: string; text?: string }> {
    const aggregated = this.generateAggregatedCoverage();
    return aggregated.uncoveredElements.map(element => ({
      selector: element.selector,
      type: element.type,
      text: element.text
    }));
  }
}