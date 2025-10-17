import { TestSelector, ElementType, SelectorType } from '../types';
import { CoverageAggregator } from '../utils/coverage-aggregator';
import { ConfigValidator } from '../utils/config-validator';
import { ErrorHandler, CoverageAnalysisError, ErrorCodes } from '../utils/error-handler';
import { PerformanceOptimizer, PerformancePresets } from '../utils/performance-optimizer';
import { ElementFilter } from '../utils/element-filter';

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
  title?: string;
}

interface Suite extends BaseTestEntry {
  type: 'suite';
  entries?: (BaseTestEntry)[];
  suites?: Suite[];
  tests?: TestCase[];
}

interface TestResult {
  ok?: boolean;
  status?: string;
  retry?: number;
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

  // Enhanced configuration options
  validateConfig?: boolean; // Enable configuration validation
  debugMode?: boolean; // Enable debug information
  performanceProfile?: 'development' | 'ci' | 'large' | 'minimal'; // Performance optimization preset
  elementFilter?: string | any; // Element filtering configuration
  enableErrorRecovery?: boolean; // Enable automatic error recovery
  cacheResults?: boolean; // Enable result caching
  maxConcurrency?: number; // Maximum concurrent operations
  timeoutMs?: number; // Operation timeout
  cleanupDuplicates?: boolean; // Clean up duplicate selectors on startup
}

export class PlaywrightCoverageReporter {
  private options: CoverageReporterOptions;
  private testedSelectors: TestSelector[] = [];
  private testFiles: Set<string> = new Set();
  private aggregator: CoverageAggregator;
  private elementFilter: ElementFilter;
  private performanceOptimizer: PerformanceOptimizer;

  // Enhanced error handling and validation
  private configValidation: any;
  private hasErrors: boolean = false;

  constructor(options: CoverageReporterOptions = {}) {
    try {
      // Smart defaults to ensure the tool "just works"
      const hasPageUrls = options.pageUrls && options.pageUrls.length > 0;
      const shouldUseElementDiscovery = options.elementDiscovery ?? (hasPageUrls ? true : false);
      const shouldUseRuntimeDiscovery = options.runtimeDiscovery ?? (!hasPageUrls ? true : false);

      this.options = {
        outputPath: options.outputPath || './coverage-report',
        format: options.format || 'console',
        threshold: options.threshold ?? 0,
        verbose: options.verbose || false,
        elementDiscovery: shouldUseElementDiscovery,
        pageUrls: options.pageUrls || [],
        runtimeDiscovery: shouldUseRuntimeDiscovery,
        captureScreenshots: options.captureScreenshots || false,
        validateConfig: options.validateConfig ?? true,
        debugMode: options.debugMode || false,
        performanceProfile: options.performanceProfile || 'development',
        enableErrorRecovery: options.enableErrorRecovery ?? true,
        cacheResults: options.cacheResults ?? true,
        maxConcurrency: options.maxConcurrency,
        timeoutMs: options.timeoutMs || 30000,
        cleanupDuplicates: options.cleanupDuplicates ?? true // Enable by default
      };

      // Enhanced initialization with validation and performance optimization
      this.initializeEnhancedFeatures();

      if (this.options.verbose) {
        console.log('📊 Playwright Coverage Reporter initialized with enhanced features');
        if (this.options.debugMode) {
          this.printDebugInfo();
        }
      }
    } catch (error) {
      console.error('❌ Error in reporter constructor:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize enhanced features with error handling
   */
  private initializeEnhancedFeatures(): void {
    try {
      // Validate configuration
      if (this.options.validateConfig) {
        this.configValidation = ConfigValidator.validate(this.options);
        if (!this.configValidation.valid) {
          if (this.options.debugMode) {
            ConfigValidator.printValidationResults(this.configValidation);
          }
          if (this.configValidation.errors.length > 0) {
            throw ErrorHandler.createInvalidConfigError(
              `Configuration validation failed: ${this.configValidation.errors.map(e => e.message).join(', ')}`
            );
          }
        }
      }

      // Initialize performance optimizer
      const perfConfig = PerformancePresets[this.options.performanceProfile] || PerformancePresets.development;
      this.performanceOptimizer = new PerformanceOptimizer({
        ...perfConfig,
        maxConcurrency: this.options.maxConcurrency || perfConfig.maxConcurrency,
        timeoutMs: this.options.timeoutMs || perfConfig.timeoutMs
      });

      // Initialize element filter
      if (this.options.elementFilter) {
        if (typeof this.options.elementFilter === 'string') {
          this.elementFilter = ElementFilter.fromConfigString(this.options.elementFilter);
        } else {
          this.elementFilter = new ElementFilter(this.options.elementFilter);
        }
      } else {
        this.elementFilter = new ElementFilter(); // Default filter
      }

      // Validate element filter configuration
      const filterValidation = this.elementFilter.validateConfig();
      if (!filterValidation.valid && this.options.verbose) {
        console.warn('⚠️ Element filter configuration issues:', filterValidation.errors);
      }

      // Initialize coverage aggregator
      this.aggregator = new CoverageAggregator(this.options.outputPath);

      // Clean up duplicate selectors if enabled
      if (this.options.cleanupDuplicates) {
        this.aggregator.cleanupDuplicates();
      }

      // Start performance monitoring
      this.performanceOptimizer.startSession();

    } catch (error) {
      throw ErrorHandler.handleError(error as Error, {
        operation: 'initialization',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle initialization errors gracefully
   */
  private handleInitializationError(error: any): void {
    const coverageError = ErrorHandler.handleError(error, {
      operation: 'initialization',
      timestamp: new Date()
    });

    this.hasErrors = true;

    if (coverageError.recoverable && this.options.enableErrorRecovery) {
      console.warn('⚠️ Coverage reporter initialization failed, running in degraded mode');
      // Initialize with minimal configuration for recovery
      this.aggregator = new CoverageAggregator('./coverage-report');
      this.elementFilter = new ElementFilter();
      this.performanceOptimizer = new PerformanceOptimizer(PerformancePresets.minimal);
    } else {
      console.error('❌ Coverage reporter initialization failed:', coverageError.message);
      if (this.options.debugMode && coverageError.guidance) {
        console.error('\n' + coverageError.message);
        if (coverageError.guidance.title) {
          console.error(`💡 ${coverageError.guidance.title}`);
          console.error(`${coverageError.guidance.description}`);
        }
      }
    }
  }

  /**
   * Print debug information
   */
  private printDebugInfo(): void {
    if (this.options.debugMode) {
      console.log('\n🐛 Debug Information');
      console.log('═'.repeat(50));

      const debugInfo = ConfigValidator.generateDebugInfo(this.options);
      console.log('Configuration:', JSON.stringify(this.options, null, 2));

      const filterStats = this.elementFilter.getStats();
      console.log('Element Filter Impact:', filterStats.estimatedImpact);

      if (filterStats.recommendations.length > 0) {
        console.log('Filter Recommendations:');
        filterStats.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      console.log('═'.repeat(50));
    }
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
    // Check both ok and status - some Playwright versions use status instead of ok
    const isSuccessful = result.ok === true || result.status === 'passed';
    if (!isSuccessful) return; // Skip failed tests

    // Extract selectors from test results and errors
    const selectors = await this.extractSelectorsFromTest(test, result);

    // Mark covered elements in the aggregator
    if (selectors.length > 0) {
      const pageElements = selectors.map(selector => ({
        selector: selector.normalized,
        type: this.mapSelectorTypeToElementType(selector.type),
        text: selector.raw,
        id: this.extractIdFromSelector(selector.normalized),
        class: this.extractClassFromSelector(selector.normalized),
        isVisible: true,
        isEnabled: true,
        discoverySource: 'test-execution' as const,
        discoveryContext: `${Date.now()}-${test.location.file}`
      }));

      // First, add these as discovered elements (for synthetic coverage)
      this.aggregator.addDiscoveredElements(
        pageElements,
        test.location.file,
        test.title || 'unknown'
      );

      // Then mark them as covered
      this.aggregator.markElementsCovered(
        pageElements,
        test.location.file,
        test.title || 'unknown',
        'test-interaction'
      );

      if (this.options.verbose) {
        console.log(`✅ Marked ${selectors.length} elements as covered by ${test.title}`);
      }
    }
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

    // Handle entries if available
    if (suite.entries && Array.isArray(suite.entries)) {
      for (const entry of suite.entries) {
        if (entry.type === 'test') {
          tests.push(entry as TestCase);
        } else if (entry.type === 'suite') {
          tests.push(...this.getAllTests(entry as Suite));
        }
      }
    }

    // Handle direct suites and tests properties
    if (suite.suites && Array.isArray(suite.suites)) {
      for (const subSuite of suite.suites) {
        tests.push(...this.getAllTests(subSuite));
      }
    }

    if (suite.tests && Array.isArray(suite.tests)) {
      tests.push(...suite.tests);
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

        // Create synthetic elements from discovered selectors for coverage tracking
        if (selectors.length > 0) {
          const syntheticElements = selectors.map(selector => ({
            selector: selector.normalized,
            type: this.mapSelectorTypeToElementType(selector.type),
            text: selector.raw,
            id: this.extractIdFromSelector(selector.normalized),
            class: this.extractClassFromSelector(selector.normalized),
            isVisible: true,
            isEnabled: true,
            discoverySource: 'static-analysis' as const,
            discoveryContext: `${testFile}:${selector.lineNumber || 0}`
          }));

          // Add these as potential elements that could be covered
          this.aggregator.addDiscoveredElements(
            syntheticElements,
            testFile,
            'static-analysis'
          );

          if (this.options.verbose) {
            console.log(`🔍 Added ${syntheticElements.length} synthetic elements from ${testFile}`);
          }
        }
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
  private async extractSelectorsFromTest(test: TestCase, result: TestResult): Promise<TestSelector[]> {
    const allSelectors: TestSelector[] = [];

    // Extract selectors from test steps and errors
    if (result.steps) {
      for (const step of result.steps) {
        // Enhanced selector extraction from step data
        const stepSelectors = await this.extractSelectorsFromStep(step, test);
        allSelectors.push(...stepSelectors);
      }
    }

    // Also parse the test file to get comprehensive selector coverage
    const fileSelectors = await this.extractSelectorsFromTestFile(test.location.file);
    allSelectors.push(...fileSelectors);

    return allSelectors;
  }

  /**
   * Extract selectors from a test step
   */
  private async extractSelectorsFromStep(step: any, test: TestCase): Promise<TestSelector[]> {
    const selectors: TestSelector[] = [];

    // Parse step title for selectors
    const titleSelectors = this.extractSelectorsFromText(step.title);
    const titleTestSelectors = titleSelectors.map(selector => ({
      raw: selector.raw,
      normalized: selector.normalized,
      type: selector.type,
      lineNumber: test.location.line,
      filePath: test.location.file,
      context: step.title
    }));
    selectors.push(...titleTestSelectors);

    // Parse step data if available (includes screenshots, errors, etc.)
    if (step.error) {
      const errorSelectors = this.extractSelectorsFromText(step.error.message);
      const errorTestSelectors = errorSelectors.map(selector => ({
        raw: selector.raw,
        normalized: selector.normalized,
        type: selector.type,
        lineNumber: test.location.line,
        filePath: test.location.file,
        context: step.title
      }));
      selectors.push(...errorTestSelectors);
    }

    // Add found selectors to our collection
    for (const selector of selectors) {
      this.testedSelectors.push(selector);
    }

    return selectors;
  }

  /**
   * Extract selectors from text content
   */
  private extractSelectorsFromText(text: string): Array<{
    raw: string;
    normalized: string;
    type: SelectorType;
  }> {
    const selectors: Array<{ raw: string; normalized: string; type: SelectorType }> = [];

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
  private async extractSelectorsFromTestFile(testFile: string): Promise<TestSelector[]> {
    try {
      const { StaticAnalyzer } = await import('../analyzers/static-analyzer');
      const analyzer = new StaticAnalyzer();
      const fileSelectors = await analyzer.analyzeFile(testFile);

      // Merge with existing selectors, avoiding duplicates
      const newSelectors: TestSelector[] = [];
      for (const selector of fileSelectors) {
        const exists = this.testedSelectors.some(existing =>
          existing.normalized === selector.normalized &&
          existing.filePath === selector.filePath
        );

        if (!exists) {
          this.testedSelectors.push(selector);
          newSelectors.push(selector);
        }
      }

      return newSelectors;
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️ Failed to extract selectors from test file ${testFile}:`, error);
      }
      return [];
    }
  }

  /**
   * Generate final coverage report
   */
  private async generateCoverageReport() {
    try {
      // Get aggregated coverage data
      const aggregatedCoverage = this.aggregator.generateAggregatedCoverage();
      const uncoveredWithRecommendations = this.aggregator.getUncoveredElementsWithRecommendations();

      // Generate console report
      if (this.options.format === 'console' || this.options.format === 'all') {
        this.generateConsoleReport(aggregatedCoverage, uncoveredWithRecommendations);
      }

      // Generate JSON report
      if (this.options.format === 'json' || this.options.format === 'all') {
        this.generateJsonReport(aggregatedCoverage, uncoveredWithRecommendations);
      }

      // Generate HTML report
      if (this.options.format === 'html' || this.options.format === 'all') {
        this.generateHtmlReport(aggregatedCoverage, uncoveredWithRecommendations);
      }

      // Check threshold
      if (aggregatedCoverage.coveragePercentage < this.options.threshold) {
        console.log(`\n❌ Coverage ${aggregatedCoverage.coveragePercentage}% is below threshold ${this.options.threshold}%`);
      } else {
        console.log(`\n✅ Coverage ${aggregatedCoverage.coveragePercentage}% meets threshold ${this.options.threshold}%`);
      }

    } catch (error) {
      console.warn('⚠️ Failed to generate coverage report:', error);
    }
  }

  /**
   * Generate console coverage report
   */
  private generateConsoleReport(aggregated: any, recommendations: any[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CROSS-TEST COVERAGE REPORT');
    console.log('='.repeat(60));

    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total Interactive Elements: ${aggregated.totalElements}`);
    console.log(`  Covered Elements: ${aggregated.coveredElements}`);
    console.log(`  Uncovered Elements: ${aggregated.uncoveredElements.length}`);
    console.log(`  Coverage Percentage: ${aggregated.coveragePercentage}%`);
    console.log(`  Test Files: ${aggregated.testFiles.length}`);

    console.log(`\n📋 COVERAGE BY TYPE:`);
    Object.entries(aggregated.coverageByType).forEach(([type, stats]: [string, any]) => {
      const coverageBar = '█'.repeat(Math.floor(stats.percentage / 5)) + '░'.repeat(20 - Math.floor(stats.percentage / 5));
      console.log(`  ${type.padEnd(15)} ${stats.percentage.toString().padStart(3)}% ${coverageBar} (${stats.covered}/${stats.total})`);
    });

    console.log(`\n📄 COVERAGE BY PAGE:`);
    Object.entries(aggregated.coverageByPage).forEach(([url, stats]: [string, any]) => {
      const coverage = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
      console.log(`  ${url}: ${coverage}% (${stats.covered}/${stats.total} elements)`);
    });

    if (recommendations.length > 0) {
      console.log(`\n🚨 HIGH PRIORITY UNCOVERED ELEMENTS:`);
      const highPriority = recommendations.filter(r => r.priority === 'high').slice(0, 5);
      highPriority.forEach(({ element, recommendation }) => {
        console.log(`  ❌ ${element.selector} (${element.type}): ${recommendation}`);
      });

      if (recommendations.length > highPriority.length) {
        console.log(`  ... and ${recommendations.length - highPriority.length} more elements`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Generate JSON coverage report
   */
  private generateJsonReport(aggregated: any, recommendations: any[]): void {
    const fs = require('fs');
    const path = require('path');
    const outputPath = this.options.outputPath || './coverage-report';

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const reportData = {
      summary: {
        totalElements: aggregated.totalElements,
        coveredElements: aggregated.coveredElements,
        uncoveredElements: aggregated.uncoveredElements.length,
        coveragePercentage: aggregated.coveragePercentage,
        testFiles: aggregated.testFiles.length,
        lastUpdated: aggregated.lastUpdated
      },
      coverageByType: aggregated.coverageByType,
      coverageByPage: aggregated.coverageByPage,
      uncoveredElements: aggregated.uncoveredElements,
      recommendations: recommendations,
      testFiles: aggregated.testFiles,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(outputPath, 'coverage-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Generate separate file for recommendations
    const recommendationsData = {
      recommendations: recommendations,
      summary: {
        total: recommendations.length,
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      }
    };

    fs.writeFileSync(
      path.join(outputPath, 'coverage-recommendations.json'),
      JSON.stringify(recommendationsData, null, 2)
    );
  }

  /**
   * Generate HTML coverage report
   */
  private generateHtmlReport(aggregated: any, recommendations: any[]): void {
    const fs = require('fs');
    const path = require('path');
    const outputPath = this.options.outputPath || './coverage-report';

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const html = this.generateHtmlContent(aggregated, recommendations);
    fs.writeFileSync(path.join(outputPath, 'coverage-report.html'), html);
  }

  /**
   * Generate HTML content for coverage report
   */
  private generateHtmlContent(aggregated: any, recommendations: any[]): string {
    const coveragePercentage = aggregated.coveragePercentage;
    const threshold = this.options.threshold;
    const status = coveragePercentage >= threshold ? 'PASS' : 'FAIL';
    const statusColor = coveragePercentage >= threshold ? '#28a745' : '#dc3545';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .status { font-size: 2.5em; font-weight: bold; margin: 0; }
        .coverage-percentage { font-size: 3em; font-weight: bold; color: ${statusColor}; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #495057; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        .coverage-bar { background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 5px 0; }
        .coverage-fill { height: 20px; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e9ecef; }
        th { background: #f8f9fa; font-weight: 600; }
        .priority-high { color: #dc3545; font-weight: bold; }
        .priority-medium { color: #ffc107; font-weight: bold; }
        .priority-low { color: #6c757d; }
        .code { background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9em; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="status">${status}</h1>
            <div class="coverage-percentage">${coveragePercentage}%</div>
            <p>Coverage across all test files</p>
        </div>

        <div class="content">
            <div class="summary">
                <div class="metric">
                    <div class="metric-value">${aggregated.totalElements}</div>
                    <div class="metric-label">Total Elements</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${aggregated.coveredElements}</div>
                    <div class="metric-label">Covered Elements</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${aggregated.uncoveredElements.length}</div>
                    <div class="metric-label">Uncovered Elements</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${aggregated.testFiles.length}</div>
                    <div class="metric-label">Test Files</div>
                </div>
            </div>

            <div class="section">
                <h2>Coverage by Element Type</h2>
                ${Object.entries(aggregated.coverageByType).map(([type, stats]: [string, any]) => `
                    <div style="margin: 15px 0;">
                        <strong>${type}:</strong> ${stats.percentage}% (${stats.covered}/${stats.total})
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: ${stats.percentage}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>High Priority Uncovered Elements</h2>
                ${recommendations.filter(r => r.priority === 'high').slice(0, 10).map(({ element, recommendation, suggestedTest }) => `
                    <div class="recommendation">
                        <h4><span class="code">${element.selector}</span> (${element.type})</h4>
                        <p><strong>Issue:</strong> ${recommendation}</p>
                        <details>
                            <summary>Suggested Test</summary>
                            <pre><code>${suggestedTest}</code></pre>
                        </details>
                    </div>
                `).join('') || '<p>No high priority uncovered elements found! 🎉</p>'}
            </div>

            <div class="section">
                <h2>All Uncovered Elements</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Selector</th>
                            <th>Type</th>
                            <th>Text</th>
                            <th>Priority</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recommendations.map(({ element, recommendation, priority }) => `
                            <tr>
                                <td><span class="code">${element.selector}</span></td>
                                <td>${element.type}</td>
                                <td>${element.text || '-'}</td>
                                <td><span class="priority-${priority}">${priority.toUpperCase()}</span></td>
                                <td>${recommendation}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>`;
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
   * Map SelectorType to ElementType for coverage aggregation
   */
  private mapSelectorTypeToElementType(selectorType: SelectorType): ElementType {
    // Default mapping based on typical usage patterns
    switch (selectorType) {
      case SelectorType.TEXT:
      case SelectorType.LABEL:
      case SelectorType.ROLE:
        return ElementType.INTERACTIVE_ELEMENT;
      case SelectorType.TEST_ID:
        return ElementType.CLICKABLE_ELEMENT;
      case SelectorType.ALT_TEXT:
        return ElementType.CLICKABLE_ELEMENT;
      case SelectorType.PLACEHOLDER:
        return ElementType.INPUT;
      case SelectorType.CSS:
      case SelectorType.XPATH:
      default:
        return ElementType.CLICKABLE_ELEMENT; // Default to clickable for generic selectors
    }
  }

  /**
   * Helper methods for selector processing
   */
  private extractIdFromSelector(selector: string): string | undefined {
    const idMatch = selector.match(/#([^#\s\[\]>]+)/);
    return idMatch ? idMatch[1] : undefined;
  }

  private extractClassFromSelector(selector: string): string | undefined {
    const classMatch = selector.match(/\.([^\s\[\]>]+)/);
    return classMatch ? classMatch[1] : undefined;
  }

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

    // Remove surrounding quotes but preserve internal quotes for attribute values
    let normalized = selector.trim();

    // Remove outer quotes if present (but not inner quotes)
    if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith("'") && normalized.endsWith("'"))) {
      normalized = normalized.slice(1, -1);
    }

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Only normalize values for specific patterns that shouldn't affect selector matching
    // Keep attribute values as they are for proper selector matching
    normalized = normalized.replace(/\$\{[^}]*\}/g, '...'); // Template literals
    normalized = normalized.replace(/\+\s*['"`][^'"`]*['"`]/g, '...'); // String concatenation

    // Only normalize text content in getByText for display purposes (not for matching)
    // Don't normalize attributes that are used for DOM matching
    if (normalized.includes('text=') && !normalized.includes('[')) {
      normalized = normalized.replace(/text=["'][^"']*["']/g, 'text="..."');
    }
    if (normalized.includes(':text(')) {
      normalized = normalized.replace(/:\s*text\(["'][^"']*["']\)/g, ':text(...)');
    }

    // Only normalize role attributes in getByRole for display purposes
    if (normalized.startsWith('getByRole') && normalized.includes('role=')) {
      normalized = normalized.replace(/role=["'][^"']*["']/g, 'role="..."');
    }

    // Don't truncate selectors - they need to remain intact for proper matching
    return normalized;
  }

  private inferSelectorType(selector: string): SelectorType {
    if (!selector) return SelectorType.CSS; // Default to CSS for empty selectors

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

export default PlaywrightCoverageReporter;