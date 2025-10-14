import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { StaticAnalyzer } from '../analyzers/static-analyzer';
import { ElementDiscoverer } from '../utils/element-discoverer';
import { CoverageCalculator } from '../utils/coverage-calculator';
import { CoverageReporter } from '../reporters/coverage-reporter';
import { PlaywrightCoverConfig, CoverageReport, PageCoverage, TestSelector, PageElement } from '../types';

export class PlaywrightCoverEngine {
  private config: PlaywrightCoverConfig;
  private staticAnalyzer: StaticAnalyzer;
  private elementDiscoverer: ElementDiscoverer;
  private coverageCalculator: CoverageCalculator;
  private coverageReporter: CoverageReporter;

  constructor(config: PlaywrightCoverConfig) {
    this.config = config;
    this.staticAnalyzer = new StaticAnalyzer();
    this.elementDiscoverer = new ElementDiscoverer();
    this.coverageCalculator = new CoverageCalculator();
    this.coverageReporter = new CoverageReporter({
      outputPath: config.outputPath,
      format: config.reportFormat,
      threshold: config.coverageThreshold,
      verbose: true
    });
  }

  /**
   * Main method to analyze test coverage
   */
  async analyzeCoverage(): Promise<CoverageReport> {
    console.log('🚀 Starting Playwright coverage analysis...');

    // Step 1: Static analysis of test files
    console.log('📖 Analyzing test files...');
    const testSelectors = await this.performStaticAnalysis();

    // Step 2: Discover interactive elements on pages
    console.log('🔍 Discovering interactive elements...');
    const pageCoverages = await this.discoverPageElements();

    // Step 3: Calculate coverage
    console.log('📊 Calculating coverage...');
    const overallCoverage = this.coverageCalculator.aggregatePageCoverage(pageCoverages);

    // Step 4: Generate recommendations
    console.log('💡 Generating recommendations...');
    const recommendations = this.coverageCalculator.generateRecommendations(overallCoverage);

    // Step 5: Create final report
    const coverageReport: CoverageReport = {
      summary: {
        totalElements: overallCoverage.totalElements,
        coveredElements: overallCoverage.coveredElements,
        coveragePercentage: overallCoverage.coveragePercentage,
        pages: pageCoverages.length,
        testFiles: testSelectors.files.length
      },
      pages: pageCoverages,
      uncoveredElements: overallCoverage.uncoveredElements,
      recommendations
    };

    // Step 6: Generate reports
    console.log('📄 Generating reports...');
    await this.coverageReporter.generateReport(coverageReport);

    return coverageReport;
  }

  /**
   * Perform static analysis of test files
   */
  private async performStaticAnalysis(): Promise<{ selectors: TestSelector[]; files: string[] }> {
    if (!this.config.staticAnalysis) {
      return { selectors: [], files: [] };
    }

    try {
      const result = await this.staticAnalyzer.analyzeFiles(this.config.include);

      if (result.errors.length > 0) {
        console.warn('⚠️ Analysis warnings:');
        result.errors.forEach(error => console.warn(`  - ${error}`));
      }

      console.log(`✅ Found ${result.selectors.length} selectors in ${result.files.length} test files`);

      // Show selector statistics
      const stats = this.staticAnalyzer.getSelectorStatistics(result.selectors);
      console.log('📈 Selector breakdown:');
      Object.entries(stats.byType).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`  ${type}: ${count}`);
        }
      });

      return {
        selectors: result.selectors,
        files: result.files
      };

    } catch (error) {
      console.error('❌ Static analysis failed:', error);
      throw error;
    }
  }

  /**
   * Discover interactive elements on pages
   */
  private async discoverPageElements(): Promise<PageCoverage[]> {
    if (!this.config.discoverElements) {
      return [];
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    try {
      const pageCoverages: PageCoverage[] = [];

      // Discover elements from common pages or user-specified URLs
      const urlsToAnalyze = await this.getUrlsToAnalyze();

      for (const url of urlsToAnalyze) {
        console.log(`🔍 Analyzing page: ${url}`);

        try {
          const page = await context.newPage();
          await this.setupPage(page);

          // Navigate to the page
          await page.goto(url, { waitUntil: 'networkidle' });

          // Discover elements
          const discoveredElements = await this.elementDiscoverer.discoverElements(page);
          const processedElements = await this.elementDiscoverer.convertDiscoveredElements(discoveredElements);

          // Filter out ignored elements
          const filteredElements = this.filterIgnoredElements(processedElements);

          console.log(`✅ Found ${filteredElements.length} interactive elements on ${url}`);

          pageCoverages.push({
            url,
            elements: filteredElements,
            coverage: {
              totalElements: filteredElements.length,
              coveredElements: 0,
              uncoveredElements: filteredElements,
              coveragePercentage: 0,
              coverageByType: this.calculateInitialCoverageByType(filteredElements),
              elementsByPage: {
                [url]: {
                  total: filteredElements.length,
                  covered: 0,
                  elements: filteredElements
                }
              }
            }
          });

          await page.close();

        } catch (error) {
          console.warn(`⚠️ Failed to analyze ${url}: ${error}`);
        }
      }

      return pageCoverages;

    } finally {
      await browser.close();
    }
  }

  /**
   * Get URLs to analyze
   */
  private async getUrlsToAnalyze(): Promise<string[]> {
    const urls: string[] = [];

    // Add user-specified URLs if any
    if (process.env.PLAYWRIGHT_COVERAGE_URLS) {
      const envUrls = process.env.PLAYWRIGHT_COVERAGE_URLS.split(',').map(url => url.trim());
      urls.push(...envUrls);
    }

    // Try to discover URLs from test files
    const testUrls = await this.extractUrlsFromTests();
    urls.push(...testUrls);

    // Add common local development URLs if no URLs found
    if (urls.length === 0) {
      urls.push(
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:4200',
        'http://localhost:8000'
      );
    }

    return urls.filter(url => url && url.length > 0);
  }

  /**
   * Extract URLs from test files
   */
  private async extractUrlsFromTests(): Promise<string[]> {
    const urls = new Set<string>();

    try {
      const result = await this.staticAnalyzer.analyzeFiles(this.config.include);

      // Look for goto() calls and other navigation patterns
      const urlPatterns = [
        /page\.goto\(['"`]([^'"`]+)['"`]/g,
        /page\.visit\(['"`]([^'"`]+)['"`]/g,
        /baseUrl\s*=\s*['"`]([^'"`]+)['"`]/g,
        /baseURL\s*=\s*['"`]([^'"`]+)['"`]/g
      ];

      result.selectors.forEach(selector => {
        urlPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(selector.context || '')) !== null) {
            const url = match[1];
            if (url && !url.startsWith('data:') && !url.startsWith('about:')) {
              urls.add(url);
            }
          }
        });
      });

    } catch (error) {
      console.warn('⚠️ Could not extract URLs from tests:', error);
    }

    return Array.from(urls);
  }

  /**
   * Setup page with additional configurations
   */
  private async setupPage(page: Page): Promise<void> {
    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Add console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn(`Browser error on ${page.url()}: ${msg.text()}`);
      }
    });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  }

  /**
   * Filter out ignored elements
   */
  private filterIgnoredElements(elements: PageElement[]): PageElement[] {
    if (!this.config.ignoreElements || this.config.ignoreElements.length === 0) {
      return elements;
    }

    return elements.filter(element => {
      return !this.config.ignoreElements.some(pattern => {
        try {
          // Simple pattern matching for now - could be enhanced with proper selector matching
          if (pattern.startsWith('[') && pattern.includes('=')) {
            // Attribute selector
            const attrMatch = pattern.match(/\[([^=]+)(=["']([^"']+)["'])?]/);
            if (attrMatch) {
              const attrName = attrMatch[1];
              const attrValue = attrMatch[3];

              if (attrValue) {
                const elementAttr = (element as any)[attrName] ||
                                 element.selector.match(new RegExp(`${attrName}=["']([^"']+)["']`))?.[1];
                return elementAttr === attrValue;
              } else {
                return element.selector.includes(attrName);
              }
            }
          }

          return element.selector.includes(pattern) ||
                 element.text?.includes(pattern) ||
                 element.class?.includes(pattern);
        } catch (error) {
          return false;
        }
      });
    });
  }

  /**
   * Calculate initial coverage by type (all uncovered initially)
   */
  private calculateInitialCoverageByType(elements: PageElement[]): Record<string, number> {
    const coverageByType: Record<string, number> = {};

    elements.forEach(element => {
      if (!coverageByType[element.type]) {
        coverageByType[element.type] = 0;
      }
    });

    return coverageByType;
  }

  /**
   * Analyze a specific test file with runtime tracking
   */
  async analyzeTestFile(testFilePath: string): Promise<PageCoverage[]> {
    console.log(`📖 Analyzing test file: ${testFilePath}`);

    // This would require running the actual test file with coverage tracking
    // For now, return static analysis results combined with element discovery

    const testSelectorsResult = await this.staticAnalyzer.analyzeFile(testFilePath);
    const pageCoverages = await this.discoverPageElements();

    // Calculate coverage for this specific test file
    pageCoverages.forEach(pageCoverage => {
      const coverage = this.coverageCalculator.calculateCoverage(
        pageCoverage.elements,
        testSelectorsResult,
        pageCoverage.url
      );
      pageCoverage.coverage = coverage;
    });

    return pageCoverages;
  }

  /**
   * Run coverage analysis on running tests
   */
  async analyzeRunningTests(testCommand?: string): Promise<CoverageReport> {
    console.log('🏃 Running tests with coverage tracking...');

    if (!this.config.runtimeTracking) {
      console.log('⚠️ Runtime tracking is disabled. Use static analysis instead.');
      return this.analyzeCoverage();
    }

    // This would integrate with Playwright test runner
    // For now, delegate to static analysis
    return this.analyzeCoverage();
  }

  /**
   * Generate a summary report without full analysis
   */
  async generateSummary(): Promise<void> {
    console.log('📊 Generating coverage summary...');

    const testResult = await this.performStaticAnalysis();
    const testSelectors = testResult.selectors;
    const stats = this.staticAnalyzer.getSelectorStatistics(testResult.selectors);

    console.log('\n📈 Test File Summary:');
    console.log(`Files analyzed: ${testResult.files.length}`);
    console.log(`Total selectors: ${stats.total}`);

    console.log('\n🎯 Selector Types:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

    console.log('\n📁 Files with most selectors:');
    Object.entries(stats.byFile)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} selectors`);
      });

    console.log('\n🔝 Most common selectors:');
    stats.mostCommon.slice(0, 5).forEach(({ selector, count }) => {
      console.log(`  ${selector}: ${count} occurrences`);
    });
  }
}