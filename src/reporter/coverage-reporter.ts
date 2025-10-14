import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import { PlaywrightCoverEngine } from '../core/engine';
import { PlaywrightCoverConfig, PageElement, TestSelector } from '../types';

// Define basic types for reporter interface
interface BaseTestEntry {
  type: 'test' | 'suite';
}

interface TestCase extends BaseTestEntry {
  type: 'test';
  location: {
    file: string;
    line: number;
  };
}

interface Suite extends BaseTestEntry {
  type: 'suite';
  entries: (BaseTestEntry)[];
}

interface TestResult {
  ok: boolean;
  steps?: any[];
}

interface FullConfig {
  projects?: any[];
}

interface FullResult {
  status: string;
}

export interface CoverageReporterOptions {
  outputPath?: string;
  format?: 'console' | 'json' | 'html' | 'lcov' | 'istanbul' | 'all';
  threshold?: number;
  verbose?: boolean;
  elementDiscovery?: boolean;
  pageUrls?: string[];
  runtimeDiscovery?: boolean; // Enable runtime element discovery during tests
  captureScreenshots?: boolean; // Capture screenshots for uncovered elements
}

export class PlaywrightCoverageReporter {
  private options: CoverageReporterOptions;
  private config: PlaywrightCoverConfig;
  private engine: PlaywrightCoverEngine;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private discoveredElements: Map<string, PageElement[]> = new Map();
  private testedSelectors: TestSelector[] = [];
  private testFiles: Set<string> = new Set();
  private runtimeElements: Map<string, PageElement[]> = new Map(); // Elements discovered during test execution
  private currentPageUrl: string = ''; // Track current page URL for runtime discovery

  constructor(options: CoverageReporterOptions = {}) {
    this.options = {
      outputPath: options.outputPath || './coverage-report',
      format: options.format || 'console',
      threshold: options.threshold || 80,
      verbose: options.verbose || false,
      elementDiscovery: options.elementDiscovery !== false,
      pageUrls: options.pageUrls || [],
      runtimeDiscovery: options.runtimeDiscovery !== false,
      captureScreenshots: options.captureScreenshots || false
    };

    this.config = this.buildConfig();
    this.engine = new PlaywrightCoverEngine(this.config);
  }

  /**
   * Called when test run starts
   */
  async onBegin(config: FullConfig, suite: Suite) {
    try {
      if (this.options.verbose) {
        console.log('🎭 Playwright Coverage Reporter starting...');
      }

      // Discover test files and extract selectors statically
      await this.discoverTests(suite);

      // If element discovery is enabled, discover elements from configured URLs
      if (this.options.elementDiscovery && this.options.pageUrls.length > 0) {
        await this.discoverElementsFromUrls();
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn('⚠️ Error in onBegin:', error);
      }
      // Don't re-throw to avoid crashing the test run
    }
  }

  /**
   * Called when each test starts
   */
  async onTestBegin(test: TestCase) {
    this.testFiles.add(test.location.file);
  }

  /**
   * Called when each test ends - this is where we track actual interactions
   */
  async onTestEnd(test: TestCase, result: TestResult) {
    if (!result.ok) return; // Skip failed tests

    // Extract selectors from test results and errors
    await this.extractSelectorsFromTest(test, result);
  }

  /**
   * Called when test run ends
   */
  async onEnd(result: FullResult) {
    try {
      if (this.options.verbose) {
        console.log('🎭 Generating coverage report...');
      }

      // Calculate coverage using collected data
      await this.generateCoverageReport().catch((error) => {
        if (this.options.verbose) {
          console.warn('⚠️ Failed to generate coverage report:', error);
        }
      });
    } catch (error) {
      if (this.options.verbose) {
        console.warn('⚠️ Error in onEnd:', error);
      }
    }

    // Clean up browser resources (always try to cleanup)
    try {
      await this.cleanup();
    } catch (error) {
      if (this.options.verbose) {
        console.warn('⚠️ Cleanup failed:', error);
      }
    }
  }

  /**
   * Build configuration from reporter options
   */
  private buildConfig(): PlaywrightCoverConfig {
    return {
      include: Array.from(this.testFiles),
      exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
      ignoreElements: [
        '[data-testid="skip-coverage"]',
        '.test-only',
        '[aria-hidden="true"]'
      ],
      coverageThreshold: this.options.threshold || 80,
      outputPath: this.options.outputPath || './coverage-report',
      reportFormat: this.options.format || 'console',
      discoverElements: false, // We handle discovery in the reporter
      staticAnalysis: true,
      runtimeTracking: true,
      pageUrls: this.options.pageUrls || [],
      webServer: false // No server management in reporter mode
    };
  }

  /**
   * Discover test files and extract selectors statically
   */
  private async discoverTests(suite: Suite) {
    const allTests = this.getAllTests(suite);

    for (const test of allTests) {
      if (test.location.file) {
        this.testFiles.add(test.location.file);
      }
    }

    if (this.options.verbose) {
      console.log(`📖 Discovered ${this.testFiles.size} test files`);
    }

    // Use static analyzer to extract selectors from test files
    await this.extractSelectorsFromFiles();
  }

  /**
   * Recursively get all tests from a suite
   */
  private getAllTests(suite: Suite): TestCase[] {
    const tests: TestCase[] = [];

    for (const entry of suite.entries) {
      if (entry.type === 'test') {
        tests.push(entry as TestCase);
      } else if (entry.type === 'suite') {
        tests.push(...this.getAllTests(entry as Suite));
      }
    }

    return tests;
  }

  /**
   * Extract selectors from test files using static analysis
   */
  private async extractSelectorsFromFiles() {
    const { StaticAnalyzer } = await import('../analyzers/static-analyzer');
    const analyzer = new StaticAnalyzer();

    for (const testFile of this.testFiles) {
      try {
        const selectors = await analyzer.analyzeFile(testFile);
        this.testedSelectors.push(...selectors);
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠️ Failed to analyze test file ${testFile}:`, error);
        }
      }
    }

    if (this.options.verbose) {
      console.log(`✅ Extracted ${this.testedSelectors.length} selectors from test files`);
    }
  }

  /**
   * Extract selectors from individual test results
   */
  private async extractSelectorsFromTest(test: TestCase, result: TestResult) {
    // Extract selectors from test steps and errors
    if (result.steps) {
      for (const step of result.steps) {
        // Enhanced selector extraction from step data
        await this.extractSelectorsFromStep(step, test);

        // Runtime element discovery
        if (this.options.runtimeDiscovery) {
          await this.performRuntimeDiscovery(step, test);
        }
      }
    }

    // Also parse the test file to get comprehensive selector coverage
    await this.extractSelectorsFromTestFile(test.location.file);
  }

  /**
   * Extract selectors from a test step
   */
  private async extractSelectorsFromStep(step: any, test: TestCase) {
    // Parse step title for selectors
    const selectors = this.extractSelectorsFromText(step.title);

    // Parse step data if available (includes screenshots, errors, etc.)
    if (step.error) {
      const errorSelectors = this.extractSelectorsFromText(step.error.message);
      selectors.push(...errorSelectors);
    }

    // Add found selectors to our collection
    for (const selector of selectors) {
      this.testedSelectors.push({
        raw: selector.raw,
        normalized: selector.normalized,
        type: selector.type,
        lineNumber: test.location.line,
        filePath: test.location.file,
        context: step.title
      });
    }
  }

  /**
   * Extract selectors from text content
   */
  private extractSelectorsFromText(text: string): Array<{
    raw: string;
    normalized: string;
    type: any;
  }> {
    const selectors: Array<{ raw: string; normalized: string; type: any }> = [];

    // Playwright selector patterns
    const patterns = [
      // getBy methods
      /getBy[A-Za-z]+\(['"`]([^'"`]+)['"`]/g,
      // locator() calls
      /locator\(['"`]([^'"`]+)['"`]/g,
      // Direct selectors in page methods
      /(?:click|fill|type|check|uncheck|selectOption|hover|focus|blur)\(['"`]([^'"`]+)['"`]/g,
      // CSS selectors
      /css=['"`]([^'"`]+)['"`]/g,
      // XPath selectors
      /xpath=['"`]([^'"`]+)['"`]/g,
      // Text selectors
      /text=['"`]([^'"`]+)['"`]/g,
      // Role selectors
      /role=['"`]([^'"`]+)['"`]/g,
      // Test ID selectors
      /test(?:Id)?=['"`]([^'"`]+)['"`]/g,
      // General quoted strings that might be selectors
      /['"`]([a-zA-Z][a-zA-Z0-9\s\-\[\]>#+\.:^~=()]*?)['"`]/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const selector = match[1];
        if (selector && this.looksLikeSelector(selector)) {
          selectors.push({
            raw: selector,
            normalized: this.normalizeSelector(selector),
            type: this.inferSelectorType(selector)
          });
        }
      }
    }

    return selectors;
  }

  /**
   * Extract selectors from the test file itself (comprehensive analysis)
   */
  private async extractSelectorsFromTestFile(testFile: string) {
    try {
      const { StaticAnalyzer } = await import('../analyzers/static-analyzer');
      const analyzer = new StaticAnalyzer();
      const fileSelectors = await analyzer.analyzeFile(testFile);

      // Merge with existing selectors, avoiding duplicates
      for (const selector of fileSelectors) {
        const exists = this.testedSelectors.some(existing =>
          existing.normalized === selector.normalized &&
          existing.filePath === selector.filePath
        );

        if (!exists) {
          this.testedSelectors.push(selector);
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️ Failed to extract selectors from test file ${testFile}:`, error);
      }
    }
  }

  /**
   * Perform runtime element discovery during test execution
   */
  private async performRuntimeDiscovery(step: any, test: TestCase) {
    try {
      // Extract page navigation from step data
      const navigationUrl = this.extractNavigationUrl(step);

      if (navigationUrl) {
        this.currentPageUrl = navigationUrl;

        // If we have a valid URL and haven't discovered elements for it yet
        if (!this.runtimeElements.has(navigationUrl)) {
          await this.discoverElementsFromUrl(navigationUrl, `runtime-${test.location.file}-${test.location.line}`);
        }
      }

      // Also check for page interactions that might reveal new elements
      await this.analyzePageInteractions(step, test);

    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️ Runtime discovery failed for step "${step.title}":`, error);
      }
    }
  }

  /**
   * Extract navigation URL from test step
   */
  private extractNavigationUrl(step: any): string | null {
    const stepText = step.title || step.toString();

    // Common navigation patterns
    const navigationPatterns = [
      /goto['"`]?\s*['"`]([^'"`]+)['"`]/,
      /goto\s*['"`]([^'"`]+)['"`]/,
      /visit\s*['"`]([^'"`]+)['"`]/,
      /navigate\s*to\s*['"`]([^'"`]+)['"`]/,
      // page.goto patterns
      /page\.goto\(['"`]([^'"`]+)['"`]/,
      // Direct URL patterns (less common but possible)
      /(https?:\/\/[^\s'"`]+)/
    ];

    for (const pattern of navigationPatterns) {
      const match = stepText.match(pattern);
      if (match && match[1]) {
        const url = match[1];
        // Convert relative URLs to absolute if needed
        if (url.startsWith('/')) {
          // This would need base URL from config or context
          // For now, return as-is and handle in discovery
          return url;
        } else if (url.startsWith('http')) {
          return url;
        }
      }
    }

    return null;
  }

  /**
   * Discover elements from a specific URL during runtime
   */
  private async discoverElementsFromUrl(url: string, source: string) {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext();
    }

    try {
      if (!this.context) return;

      const page = await this.context.newPage();

      // Configure timeout and navigation
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const { ElementDiscoverer } = await import('../utils/element-discoverer');
      const discoverer = new ElementDiscoverer();

      const elements = await discoverer.discoverElements(page);
      const processedElements = await discoverer.convertDiscoveredElements(elements);

      // Add source information to track where elements were discovered
      const enrichedElements = processedElements.map(element => ({
        ...element,
        discoverySource: source,
        discoveryContext: 'runtime'
      }));

      this.runtimeElements.set(url, enrichedElements);

      if (this.options.verbose) {
        console.log(`🔍 Runtime discovery: ${enrichedElements.length} elements from ${url} (${source})`);
      }

      await page.close();

    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️ Runtime discovery failed for ${url}:`, error);
      }
    }
  }

  /**
   * Analyze page interactions for additional element discovery opportunities
   */
  private async analyzePageInteractions(step: any, test: TestCase) {
    // Look for interactions that might trigger dynamic content
    const interactionPatterns = [
      /click\(/,
      /hover\(/,
      /fill\(/,
      /type\(/,
      /selectOption\(/,
      /check\(/,
      /uncheck\(/,
      /focus\(/,
      /blur\(/,
      // Event triggers
      /fireEvent\(/,
      /dispatchEvent\(/,
      // Waiting for elements
      /waitForSelector\(/,
      /waitForElement\(/,
      /waitFor\(/,
      // Actions that might reveal new elements
      /scroll\(/,
      /evaluate\(/,
      /addScriptTag\(/
    ];

    const stepText = step.title || step.toString();
    const hasInteraction = interactionPatterns.some(pattern => pattern.test(stepText));

    if (hasInteraction && this.currentPageUrl && this.options.runtimeDiscovery) {
      // If there's an interaction and we have a current page URL,
      // we might want to re-discover elements to catch dynamic content
      // For now, just log this - in a full implementation we might
      // want to take screenshots or re-analyze the page
      if (this.options.verbose) {
        console.log(`🎯 Interaction detected: ${stepText} (could reveal new elements)`);
      }
    }
  }

  /**
   * Discover elements from configured URLs
   */
  private async discoverElementsFromUrls() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext();
    }

    const { ElementDiscoverer } = await import('../utils/element-discoverer');
    const discoverer = new ElementDiscoverer();

    for (const url of this.options.pageUrls || []) {
      try {
        if (!this.context) continue;

        const page = await this.context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        const elements = await discoverer.discoverElements(page);
        const processedElements = await discoverer.convertDiscoveredElements(elements);

        this.discoveredElements.set(url, processedElements);

        if (this.options.verbose) {
          console.log(`🔍 Discovered ${processedElements.length} elements from ${url}`);
        }

        await page.close();
      } catch (error) {
        if (this.options.verbose) {
          console.warn(`⚠️ Failed to discover elements from ${url}:`, error);
        }
      }
    }
  }

  /**
   * Generate final coverage report
   */
  private async generateCoverageReport() {
    // Combine pre-configured and runtime discovered elements
    const allElements: PageElement[] = [];

    // Add elements from initial discovery
    for (const elements of this.discoveredElements.values()) {
      allElements.push(...elements);
    }

    // Add runtime discovered elements
    for (const elements of this.runtimeElements.values()) {
      allElements.push(...elements);
    }

    // Deduplicate elements (same selector might be discovered multiple times)
    const uniqueElements = this.deduplicateElements(allElements);

    // Use our existing engine to calculate coverage
    const { CoverageCalculator } = await import('../utils/coverage-calculator');
    const calculator = new CoverageCalculator();
    const coverage = calculator.calculateCoverage(uniqueElements, this.testedSelectors);

    // Generate reports using the istanbul reporter
    const { IstanbulReporter } = await import('../reporters/istanbul-reporter');
    const reporter = new IstanbulReporter();

    // Combine all page sources for comprehensive reporting
    const allPageSources = new Map([
      ...this.discoveredElements.entries(),
      ...this.runtimeElements.entries()
    ]);

    const coverageReport = {
      summary: {
        totalElements: uniqueElements.length,
        coveredElements: coverage.coveredElements,
        coveragePercentage: coverage.coveragePercentage,
        pages: allPageSources.size,
        testFiles: this.testFiles.size,
        runtimeDiscoveredElements: Array.from(this.runtimeElements.values()).reduce((sum, elements) => sum + elements.length, 0),
        preconfiguredElements: Array.from(this.discoveredElements.values()).reduce((sum, elements) => sum + elements.length, 0)
      },
      pages: Array.from(allPageSources.entries()).map(([url, elements]) => ({
        url,
        elements,
        coverage: calculator.calculateCoverage(elements, this.testedSelectors, url),
        isRuntimeDiscovered: this.runtimeElements.has(url)
      })),
      uncoveredElements: coverage.uncoveredElements,
      recommendations: calculator.generateRecommendations(coverage),
      discoveryStats: {
        staticUrls: this.discoveredElements.size,
        runtimeUrls: this.runtimeElements.size,
        totalSelectors: this.testedSelectors.length,
        selectorTypes: this.getSelectorTypeStatistics()
      }
    };

    // Convert PageElement[] to PageCoverage[] for IstanbulReporter
    const pageCoverages = Array.from(allPageSources.entries()).map(([url, elements]) => ({
      url,
      elements,
      coverage: calculator.calculateCoverage(elements, this.testedSelectors, url)
    }));

    // Save coverage files using IstanbulReporter
    await reporter.saveCoverageFiles(pageCoverages, this.config.outputPath);
  }

  /**
   * Deduplicate elements to avoid counting the same element multiple times
   */
  private deduplicateElements(elements: PageElement[]): PageElement[] {
    const seen = new Set<string>();

    return elements.filter(element => {
      // Create a unique key based on selector and type
      const key = `${element.selector}:${element.type}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  /**
   * Get statistics about selector types discovered
   */
  private getSelectorTypeStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const selector of this.testedSelectors) {
      const type = selector.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clean up browser resources
   */
  private async cleanup() {
    try {
      if (this.context) {
        await this.context.close().catch(() => {}); // Ignore errors during context close
        this.context = null;
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    try {
      if (this.browser) {
        await this.browser.close().catch(() => {}); // Ignore errors during browser close
        this.browser = null;
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Helper methods for selector processing
   */
  private looksLikeSelector(str: string): boolean {
    if (!str || str.length < 2) return false;

    // Skip non-selector strings
    const skipPatterns = [
      /^https?:\/\//, // URLs
      /^about:blank/, // About blank
      /^data:/, // Data URLs
      /^javascript:/, // JavaScript URLs
      /^\s*$/, // Empty strings
      /^[{}[\]()]+$/, // Just brackets
      /console\.log/, // Console logs
      /expect\(/, // Test assertions
      /test\(/, // Test definitions
      /it\(/, // Test definitions
      /describe\(/, // Test suites
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/, // Just variable names
      /^\d+$/, // Just numbers
      /^(true|false|null|undefined)$/ // Literal values
    ];

    for (const pattern of skipPatterns) {
      if (pattern.test(str)) return false;
    }

    // Enhanced selector detection patterns
    const selectorPatterns = [
      // CSS selectors
      /[.#\[\]:]/, // Has CSS selector syntax
      // XPath
      /^\/|^\.\./, // Starts with / or ..
      // Playwright-specific
      /getBy|locator|css=|xpath=|text=|role=/,
      // Attributes
      /data-testid|data-test|test-id/,
      // Common HTML elements in context
      /^(button|input|a|div|span|form|select|textarea|h[1-6]|nav|main|header|footer|section|article)([.#\[\:]|$)/,
      // Text content
      /['"`][^'"`]*['"`]/,
      // Pseudo-selectors
      /:hover|:focus|:active|:checked|:selected|:enabled|:disabled/,
      // Structural selectors
      />\s*\w+|\+\s*\w+|~\s*\w+/
    ];

    return selectorPatterns.some(pattern => pattern.test(str));
  }

  private normalizeSelector(selector: string): string {
    if (!selector) return '';

    // Remove quotes
    let normalized = selector.replace(/['"]/g, '').trim();

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Normalize dynamic values
    normalized = normalized.replace(/=["'][^"']*["']/g, '="..."');
    normalized = normalized.replace(/\[.*?\]/g, (match) => {
      // Keep attribute names but normalize values
      if (match.includes('=')) {
        const [attr] = match.split('=');
        return `${attr}="..."`;
      }
      return match;
    });

    // Normalize text content in getByText and similar
    normalized = normalized.replace(/text=["'][^"']*["']/g, 'text="..."');
    normalized = normalized.replace(/:\s*text\(["'][^"']*["']\)/g, ':text(...)');

    // Normalize role attributes
    normalized = normalized.replace(/role=["'][^"']*["']/g, 'role="..."');

    // Truncate very long selectors for readability
    if (normalized.length > 100) {
      normalized = normalized.substring(0, 97) + '...';
    }

    return normalized;
  }

  private inferSelectorType(selector: string): any {
    if (!selector) return 'unknown';

    // Import SelectorType enum for consistency
    const { SelectorType } = require('../types');

    // XPath patterns
    if (selector.startsWith('//') || selector.startsWith('/') || selector.startsWith('(')) {
      return SelectorType.XPATH;
    }

    // Playwright getBy patterns (check both raw and normalized)
    const checkPatterns = [
      { pattern: /getByRole/, type: SelectorType.ROLE },
      { pattern: /getByText/, type: SelectorType.TEXT },
      { pattern: /getByLabel/, type: SelectorType.LABEL },
      { pattern: /getByPlaceholder/, type: SelectorType.PLACEHOLDER },
      { pattern: /getByAltText/, type: SelectorType.ALT_TEXT },
      { pattern: /getByTitle/, type: SelectorType.ALT_TEXT },
      { pattern: /getByTestId/, type: SelectorType.TEST_ID }
    ];

    for (const { pattern, type } of checkPatterns) {
      if (pattern.test(selector)) return type;
    }

    // Test ID patterns
    if (selector.includes('data-testid') || selector.includes('test-id') || selector.includes('data-test')) {
      return SelectorType.TEST_ID;
    }

    // Text patterns
    if (selector.includes('text=') || selector.includes(':text(')) {
      return SelectorType.TEXT;
    }

    // Role patterns
    if (selector.includes('role=')) {
      return SelectorType.ROLE;
    }

    // Label patterns
    if (selector.includes('label=')) {
      return SelectorType.LABEL;
    }

    // Placeholder patterns
    if (selector.includes('placeholder=')) {
      return SelectorType.PLACEHOLDER;
    }

    // Alt text patterns
    if (selector.includes('alt=')) {
      return SelectorType.ALT_TEXT;
    }

    // Default to CSS
    return SelectorType.CSS;
  }
}