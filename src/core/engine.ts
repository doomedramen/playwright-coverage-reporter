import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { StaticAnalyzer } from '../analyzers/static-analyzer';
import { ElementDiscoverer } from '../utils/element-discoverer';
import { CoverageCalculator } from '../utils/coverage-calculator';
import { CoverageReporter } from '../reporters/coverage-reporter';
import { SelectorAnalyzer, SelectorAnalysisReport } from '../utils/selector-analyzer';
import { WebServerManager } from '../utils/web-server-manager';
import { PlaywrightCoverConfig, CoverageReport, PageCoverage, TestSelector, PageElement } from '../types';

export class PlaywrightCoverEngine {
  private config: PlaywrightCoverConfig;
  private staticAnalyzer: StaticAnalyzer;
  private elementDiscoverer: ElementDiscoverer;
  private coverageCalculator: CoverageCalculator;
  private coverageReporter: CoverageReporter;
  private selectorAnalyzer: SelectorAnalyzer;
  private webServerManager: WebServerManager;

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
    this.selectorAnalyzer = new SelectorAnalyzer();
    this.webServerManager = new WebServerManager();
  }

  /**
   * Main method to analyze test coverage
   */
  async analyzeCoverage(): Promise<CoverageReport> {
    console.log('🚀 Starting Playwright coverage analysis...');

    let webServerStarted = false;

    try {
      // Step 0: Start web server if configured
      if (this.config.webServer) {
        webServerStarted = await this.startWebServerIfNeeded();
      }

      // Step 1: Static analysis of test files
      console.log('📖 Analyzing test files...');
      const testSelectors = await this.performStaticAnalysis();

      // Step 2: Discover interactive elements on pages
      console.log('🔍 Discovering interactive elements...');
      const pageCoverages = await this.discoverPageElements();

      // Step 3: Calculate coverage
      console.log('📊 Calculating coverage...');

      // Calculate coverage for each page using test selectors
      pageCoverages.forEach(pageCoverage => {
        const coverage = this.coverageCalculator.calculateCoverage(
          pageCoverage.elements,
          testSelectors.selectors,
          pageCoverage.url
        );
        pageCoverage.coverage = coverage;
      });

      // Aggregate coverage from all pages
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

    } finally {
      // Step 7: Clean up web server if we started it
      if (webServerStarted) {
        await this.webServerManager.stopAllServers();
      }
    }
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

          // Check if page loads successfully
          const pageLoadResult = await this.checkPageLoad(page, url);
          if (!pageLoadResult.success) {
            console.warn(`⚠️ Page ${url} failed to load: ${pageLoadResult.error}`);

            // Create a failed page coverage entry
            pageCoverages.push({
              url,
              elements: [],
              coverage: {
                totalElements: 0,
                coveredElements: 0,
                uncoveredElements: [],
                coveragePercentage: 0,
                coverageByType: {} as Record<string, number>,
                elementsByPage: {
                  [url]: {
                    total: 0,
                    covered: 0,
                    elements: []
                  }
                }
              }
            });
            await page.close();
            continue;
          }

          // Discover elements
          const discoveredElements = await this.elementDiscoverer.discoverElements(page);
          const processedElements = await this.elementDiscoverer.convertDiscoveredElements(discoveredElements);

          // Filter out ignored elements
          const filteredElements = this.filterIgnoredElements(processedElements);

          if (filteredElements.length === 0) {
            console.warn(`⚠️ No interactive elements found on ${url} - page may have loaded but no interactive content detected`);
          } else {
            console.log(`✅ Found ${filteredElements.length} interactive elements on ${url}`);
          }

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

          // Add failed page coverage entry
          pageCoverages.push({
            url,
            elements: [],
            coverage: {
              totalElements: 0,
              coveredElements: 0,
              uncoveredElements: [],
              coveragePercentage: 0,
              coverageByType: {} as Record<string, number>,
              elementsByPage: {
                [url]: {
                  total: 0,
                  covered: 0,
                  elements: []
                }
              }
            }
          });
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

    // Add user-specified URLs from config (highest priority)
    if (this.config.pageUrls && this.config.pageUrls.length > 0) {
      // Check if web server is running on a different port and update URLs
      const updatedUrls = await this.updateUrlsForRunningServers(this.config.pageUrls);
      urls.push(...updatedUrls);
      console.log(`📍 Using ${updatedUrls.length} URLs from configuration: ${updatedUrls.join(', ')}`);
    }

    // Add user-specified URLs from environment variable
    if (process.env.PLAYWRIGHT_COVERAGE_URLS) {
      const envUrls = process.env.PLAYWRIGHT_COVERAGE_URLS.split(',').map(url => url.trim());
      urls.push(...envUrls);
      console.log(`📍 Using ${envUrls.length} URLs from environment: ${envUrls.join(', ')}`);
    }

    // Try to discover URLs from test files (only if no config URLs)
    if (urls.length === 0) {
      const testUrls = await this.extractUrlsFromTests();
      if (testUrls.length > 0) {
        // Convert relative URLs to absolute by adding localhost base
        const absoluteUrls = testUrls.map(url => {
          if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
          }
          return `http://localhost:3000${url.startsWith('/') ? url : '/' + url}`;
        });
        urls.push(...absoluteUrls);
        console.log(`🔍 Discovered ${testUrls.length} URLs from test files (converted to absolute): ${absoluteUrls.join(', ')}`);
      }
    }

    // Add common local development URLs if no URLs found
    if (urls.length === 0) {
      const defaultUrls = [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://localhost:4200',
        'http://localhost:8000'
      ];
      urls.push(...defaultUrls);
      console.log(`🔍 Using default local URLs: ${defaultUrls.join(', ')}`);
    }

    return urls.filter(url => url && url.length > 0);
  }

  /**
   * Update URLs to match actual running server ports (fallback port detection)
   */
  private async updateUrlsForRunningServers(configUrls: string[]): Promise<string[]> {
    const updatedUrls: string[] = [];

    for (const configUrl of configUrls) {
      try {
        const url = new URL(configUrl);
        const expectedPort = parseInt(url.port) || 3000;
        let urlUpdated = false;

        // Check if the expected port is actually running
        const isRunning = await this.webServerManager.isServerRunning(configUrl);
        if (isRunning) {
          updatedUrls.push(configUrl);
          urlUpdated = true;
          continue;
        }

        // Check fallback ports to see if server is running on a different port
        const fallbackPorts = [expectedPort + 1, expectedPort + 2, 3001, 3002, 3003, 8000, 8001, 8080, 8081];

        for (const fallbackPort of fallbackPorts) {
          const fallbackUrl = `${url.protocol}//${url.hostname}:${fallbackPort}`;
          if (await this.webServerManager.isServerRunning(fallbackUrl)) {
            console.log(`🔄 Updating URL from ${configUrl} to ${fallbackUrl} (fallback port detected)`);
            updatedUrls.push(fallbackUrl);
            urlUpdated = true;
            break;
          }
        }

        // If no fallback port worked, keep the original URL (it will fail later)
        if (!urlUpdated) {
          updatedUrls.push(configUrl);
        }

      } catch (error) {
        // Invalid URL, keep as-is
        updatedUrls.push(configUrl);
      }
    }

    return updatedUrls;
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
   * Check if a page loads successfully and return the result
   */
  private async checkPageLoad(page: Page, url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Navigate to the page with timeout
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      if (!response) {
        return { success: false, error: 'No response received' };
      }

      const status = response.status();

      if (status >= 400) {
        let errorType = 'Unknown error';
        if (status >= 500) {
          errorType = 'Server error (500)';
        } else if (status >= 400) {
          errorType = 'Client error (4xx)';
        }

        return {
          success: false,
          error: `${errorType}: HTTP ${status}`
        };
      }

      // Check if page actually loaded (has content)
      const title = await page.title();
      if (!title || title === '') {
        // Try waiting a bit more for dynamic content
        await page.waitForTimeout(2000);
      }

      return { success: true };

    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        return { success: false, error: 'Page load timeout' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup page with additional configurations
   */
  private async setupPage(page: Page): Promise<void> {
    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Add console logging with enhanced error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.warn(`Browser error on ${page.url()}: ${msg.text()}`);
      }
    });

    // Track response errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.warn(`HTTP ${response.status()} error on ${response.url()}`);
        if (response.status() >= 500) {
          console.error(`⚠️ Server error detected: ${response.status()} on ${response.url()} - This may affect coverage analysis`);
        }
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
   * Analyze selector mismatches between tests and actual page elements
   */
  async analyzeSelectorMismatches(): Promise<SelectorAnalysisReport> {
    console.log('🔍 Analyzing selector mismatches...');

    let webServerStarted = false;

    try {
      // Step 0: Start web server if configured
      if (this.config.webServer) {
        webServerStarted = await this.startWebServerIfNeeded();
      }

      // Get test selectors and page elements
      const testResult = await this.performStaticAnalysis();
      const pageCoverages = await this.discoverPageElements();

      // Flatten all page elements
      const allPageElements: PageElement[] = [];
      pageCoverages.forEach(pageCoverage => {
        allPageElements.push(...pageCoverage.elements);
      });

      // Analyze mismatches
      const analysis = this.selectorAnalyzer.analyzeSelectorMismatch(
        testResult.selectors,
        allPageElements
      );

      // Display results
      console.log('\n📊 Selector Mismatch Analysis:');
      console.log(`Total selectors in tests: ${analysis.totalSelectors}`);
      console.log(`Selectors that match elements: ${analysis.matchedSelectors}`);
      console.log(`Selectors with no matches: ${analysis.unmatchedSelectors}`);

      if (analysis.unmatchedSelectors > 0) {
        console.log('\n❌ Common Mismatch Issues:');
        const typeCounts = this.getMismatchTypeCounts(analysis.mismatches);
        Object.entries(typeCounts).forEach(([type, count]) => {
          if (count > 0) {
            console.log(`  ${type}: ${count} failing selectors`);
          }
        });

        console.log('\n🔍 Sample Mismatches:');
        analysis.mismatches.slice(0, 5).forEach(mismatch => {
          console.log(`  • ${mismatch.testSelector.raw} (${mismatch.testSelector.type})`);
          console.log(`    Reason: ${mismatch.reason}`);
          if (mismatch.possibleMatches.length > 0) {
            console.log(`    Possible matches: ${mismatch.possibleMatches.length} similar elements`);
          }
          console.log('');
        });
      }

      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });

      return analysis;

    } finally {
      // Clean up web server if we started it
      if (webServerStarted) {
        await this.webServerManager.stopAllServers();
      }
    }
  }

  /**
   * Start web server if needed and return whether we started it
   */
  private async startWebServerIfNeeded(): Promise<boolean> {
    if (!this.config.webServer) {
      return false;
    }

    try {
      let webServerConfig;

      if (this.config.webServer === true) {
        // Auto-detect from Playwright config
        console.log('🔍 Looking for Playwright web server configuration...');
        webServerConfig = await this.webServerManager.extractFromPlaywrightConfig(this.config.playwrightConfigPath);

        if (!webServerConfig) {
          console.warn('⚠️ No web server configuration found in Playwright config. Skipping server start.');
          return false;
        }
      } else {
        // Use provided configuration
        webServerConfig = this.config.webServer;
      }

      console.log('🚀 Starting web server for coverage analysis...');
      const serverStatus = await this.webServerManager.startWebServer(webServerConfig);
      return serverStatus.startedByTool;

    } catch (error) {
      console.error('❌ Failed to start web server:', error);
      throw error;
    }
  }

  /**
   * Get mismatch counts by selector type
   */
  private getMismatchTypeCounts(mismatches: any[]): Record<string, number> {
    const counts: Record<string, number> = {};

    mismatches.forEach(mismatch => {
      const type = mismatch.testSelector.type;
      counts[type] = (counts[type] || 0) + 1;
    });

    return counts;
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