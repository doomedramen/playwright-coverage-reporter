/**
 * Example: Advanced usage of Playwright Cover
 */

import PlaywrightCover, {
  StaticAnalyzer,
  ElementDiscoverer,
  CoverageCalculator,
  CoverageReporter,
  PlaywrightCoverEngine
} from 'playwright-cover';
import { chromium } from 'playwright';
import { PlaywrightCoverConfig } from 'playwright-cover/types';

async function advancedExample() {
  console.log('🚀 Running advanced Playwright Cover example...');

  // 1. Using individual components
  console.log('\n📖 Step 1: Static Analysis');
  const analyzer = new StaticAnalyzer();
  const analysisResult = await analyzer.analyzeFiles(['examples/*.spec.ts']);

  console.log(`Found ${analysisResult.selectors.length} selectors in ${analysisResult.files.length} files`);
  const stats = analyzer.getSelectorStatistics(analysisResult.selectors);
  console.log('Selector breakdown:', stats.byType);

  // 2. Element Discovery
  console.log('\n🔍 Step 2: Element Discovery');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Create a sample page with various interactive elements
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Page</title>
    </head>
    <body>
        <h1>Sample Application</h1>

        <nav>
            <a href="/home">Home</a>
            <a href="/about">About</a>
            <button id="menu-btn">Menu</button>
        </nav>

        <form>
            <input type="email" placeholder="Email" data-testid="email">
            <input type="password" placeholder="Password" data-testid="password">
            <button type="submit">Login</button>
            <button type="button" onclick="alert('Reset')">Reset</button>
        </form>

        <div>
            <input type="checkbox" id="remember">
            <label for="remember">Remember me</label>
        </div>

        <select data-testid="country">
            <option value="">Select Country</option>
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
        </select>

        <textarea placeholder="Comments" data-testid="comments"></textarea>

        <div>
            <button onclick="addToCart()">Add to Cart</button>
            <button onclick="checkout()">Checkout</button>
        </div>
    </body>
    </html>
  `);

  const discoverer = new ElementDiscoverer();
  const discoveredElements = await discoverer.discoverElements(page);
  const processedElements = await discoverer.convertDiscoveredElements(discoveredElements);

  console.log(`Discovered ${processedElements.length} interactive elements`);

  // Group elements by type
  const elementsByType = processedElements.reduce((groups, element) => {
    groups[element.type] = (groups[element.type] || 0) + 1;
    return groups;
  }, {} as Record<string, number>);

  console.log('Elements by type:', elementsByType);

  // 3. Coverage Calculation
  console.log('\n📊 Step 3: Coverage Calculation');
  const calculator = new CoverageCalculator();
  const coverage = calculator.calculateCoverage(processedElements, analysisResult.selectors);

  console.log(`Coverage: ${coverage.coveragePercentage}%`);
  console.log(`Covered: ${coverage.coveredElements}/${coverage.totalElements}`);
  console.log(`Uncovered: ${coverage.uncoveredElements.length}`);

  // 4. Custom Reporting
  console.log('\n📄 Step 4: Custom Reporting');
  const reporter = new CoverageReporter({
    outputPath: './advanced-example-report',
    format: 'console',
    threshold: 80,
    verbose: true
  });

  const coverageReport = {
    summary: {
      totalElements: coverage.totalElements,
      coveredElements: coverage.coveredElements,
      coveragePercentage: coverage.coveragePercentage,
      pages: 1,
      testFiles: analysisResult.files.length
    },
    pages: [{
      url: 'sample-page',
      elements: processedElements,
      coverage
    }],
    uncoveredElements: coverage.uncoveredElements,
    recommendations: calculator.generateRecommendations(coverage)
  };

  await reporter.generateReport(coverageReport);

  // 5. Using the Engine
  console.log('\n🏁 Step 5: Using the Engine');
  const config: PlaywrightCoverConfig = {
    include: ['examples/*.spec.ts'],
    exclude: ['node_modules/**'],
    coverageThreshold: 70,
    outputPath: './engine-report',
    reportFormat: 'json',
    discoverElements: false, // Skip discovery since we did it manually
    staticAnalysis: true,
    runtimeTracking: false
  };

  const engine = new PlaywrightCoverEngine(config);
  await engine.generateSummary();

  await browser.close();
  console.log('\n✅ Advanced example completed!');
}

// Custom coverage analysis with specific focus
async function customAnalysis() {
  console.log('\n🎯 Custom Analysis: Focus on Forms');

  const analyzer = new StaticAnalyzer();
  const result = await analyzer.analyzeFiles(['examples/**/*.ts']);

  // Filter for form-related selectors
  const formSelectors = result.selectors.filter(selector => {
    const text = selector.raw.toLowerCase();
    return text.includes('input') ||
           text.includes('form') ||
           text.includes('button') ||
           text.includes('select') ||
           text.includes('textarea') ||
           text.includes('checkbox') ||
           text.includes('radio');
  });

  console.log(`Form-related selectors: ${formSelectors.length}/${result.selectors.length}`);

  // Show most common form selectors
  const formSelectorCounts = formSelectors.reduce((counts, selector) => {
    const normalized = selector.normalized;
    counts[normalized] = (counts[normalized] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const topFormSelectors = Object.entries(formSelectorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('Top form selectors:');
  topFormSelectors.forEach(([selector, count], index) => {
    console.log(`${index + 1}. ${selector}: ${count} times`);
  });
}

// Performance analysis
async function performanceAnalysis() {
  console.log('\n⚡ Performance Analysis');

  const startTime = Date.now();

  const analyzer = new StaticAnalyzer();
  const result = await analyzer.analyzeFiles(['examples/**/*.ts']);

  const analysisTime = Date.now() - startTime;
  console.log(`Analysis completed in ${analysisTime}ms`);
  console.log(`Processed ${result.files.length} files`);
  console.log(`Found ${result.selectors.length} selectors`);
  console.log(`Average: ${Math.round(result.selectors.length / result.files.length)} selectors per file`);

  if (result.errors.length > 0) {
    console.log(`Warnings: ${result.errors.length}`);
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await advancedExample();
    await customAnalysis();
    await performanceAnalysis();
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

export {
  advancedExample,
  customAnalysis,
  performanceAnalysis,
  runAllExamples
};