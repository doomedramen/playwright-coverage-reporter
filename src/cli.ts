#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { PlaywrightCoverEngine } from './core/engine';
import { PlaywrightCoverConfig, SelectorType } from './types';
import { PlaywrightConfigReader } from './utils/playwright-config-reader';

interface CliOptions {
  config?: string;
  include?: string[];
  exclude?: string[];
  output?: string;
  format?: 'console' | 'json' | 'html' | 'all';
  threshold?: number;
  verbose?: boolean;
  'static-analysis'?: boolean;
  'runtime-tracking'?: boolean;
  'discover-elements'?: boolean;
  'test-pattern'?: string[];
  'page-url'?: string[];
  pageUrl?: string[]; // Commander.js converts kebab-case to camelCase
  'web-server'?: boolean;
  'playwright-config'?: string;
}

const program = new Command();

program
  .name('playwright-coverage')
  .description('Coverage tool for Playwright E2E tests')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze test coverage for Playwright tests')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-i, --include <patterns...>', 'Include file patterns (default: ["**/*.spec.ts", "**/*.test.ts"])')
  .option('-e, --exclude <patterns...>', 'Exclude file patterns (default: ["node_modules/**", "dist/**"])')
  .option('-o, --output <path>', 'Output directory for reports (default: ./coverage-report)')
  .option('-f, --format <format>', 'Report format (console|json|html|lcov|istanbul|all)', 'console')
  .option('-t, --threshold <percentage>', 'Coverage threshold percentage (default: 80)', '80')
  .option('-v, --verbose', 'Verbose output')
  .option('--static-analysis', 'Enable static code analysis', true)
  .option('--runtime-tracking', 'Enable runtime tracking during tests', false)
  .option('--discover-elements', 'Enable element discovery', true)
  .option('--test-pattern <patterns...>', 'Test file patterns')
  .option('--page-url <urls...>', 'Page URLs to analyze')
  .option('--web-server', 'Start dev server automatically from Playwright config')
  .option('--no-web-server', 'Disable automatic dev server startup')
  .option('--playwright-config <path>', 'Path to Playwright config file (default: playwright.config.js)')
  .action(async (options: CliOptions) => {
    try {
      const config = await loadConfiguration(options);
      const engine = new PlaywrightCoverEngine(config);

      console.log('🔍 Starting Playwright coverage analysis...');

      if (options.verbose) {
        console.log('CLI Options:', JSON.stringify(options, null, 2));
        console.log('Configuration:', config);
      }

      const report = await engine.analyzeCoverage();

      console.log('✅ Analysis complete!');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .option('-f, --force', 'Overwrite existing configuration file')
  .action(async (options: { force?: boolean }) => {
    try {
      const configPath = 'playwright-coverage.config.js';

      if (fs.existsSync(configPath) && !options.force) {
        console.log(`❌ Configuration file ${configPath} already exists. Use --force to overwrite.`);
        return;
      }

      const defaultConfig: PlaywrightCoverConfig = {
        include: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
        ignoreElements: [
          '[data-testid="skip-coverage"]',
          '.test-only',
          '[aria-hidden="true"]'
        ],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'all',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: false,
        pageUrls: [],
        webServer: undefined
      };

      const configContent = `
// Playwright Coverage Reporter Configuration
module.exports = ${JSON.stringify(defaultConfig, null, 2)};
`;

      fs.writeFileSync(configPath, configContent);
      console.log(`✅ Configuration file created: ${configPath}`);
      console.log('💡 You can now customize the configuration and run: playwright-coverage analyze');

    } catch (error) {
      console.error('❌ Failed to create configuration file:', error);
      process.exit(1);
    }
  });

program
  .command('fixture')
  .description('Generate test fixture code')
  .option('-o, --output <path>', 'Output file for fixture (default: coverage-fixture.ts)')
  .action(async (options: { output?: string }) => {
    try {
      const outputPath = options.output || 'coverage-fixture.ts';

      const fixtureCode = generateFixtureCode();

      fs.writeFileSync(outputPath, fixtureCode);
      console.log(`✅ Fixture code generated: ${outputPath}`);
      console.log('💡 Import and use this fixture in your Playwright tests');

    } catch (error) {
      console.error('❌ Failed to generate fixture code:', error);
      process.exit(1);
    }
  });

program
  .command('mismatch')
  .description('Analyze selector mismatches between tests and page elements')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-i, --include <patterns...>', 'Include file patterns (default: ["**/*.spec.ts", "**/*.test.ts"])')
  .option('-e, --exclude <patterns...>', 'Exclude file patterns (default: ["node_modules/**", "dist/**"])')
  .option('-v, --verbose', 'Verbose output')
  .option('--page-url <urls...>', 'Page URLs to analyze')
  .option('--web-server', 'Start dev server automatically from Playwright config')
  .option('--no-web-server', 'Disable automatic dev server startup')
  .option('--playwright-config <path>', 'Path to Playwright config file (default: playwright.config.js)')
  .action(async (options: CliOptions) => {
    try {
      const config = await loadConfiguration(options);
      const engine = new PlaywrightCoverEngine(config);

      console.log('🔍 Starting Playwright selector mismatch analysis...');

      if (options.verbose) {
        console.log('CLI Options:', JSON.stringify(options, null, 2));
        console.log('Configuration:', config);
      }

      await engine.analyzeSelectorMismatches();

      console.log('✅ Mismatch analysis complete!');

    } catch (error) {
      console.error('❌ Mismatch analysis failed:', error);
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Run a demo of the coverage tool')
  .option('-o, --output <path>', 'Output directory (default: ./demo-report)')
  .option('-f, --format <format>', 'Report format (console|json|html|lcov|istanbul|all)', 'console')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options: { output?: string; format?: string; verbose?: boolean }) => {
    try {
      const outputPath = options.output || './demo-report';

      console.log('🎭 Running Playwright Coverage Demo...');

      // Create demo scenario
      await runDemo(outputPath, options.format, options.verbose);

      console.log('✅ Demo complete!');
      console.log(`📄 Report generated in: ${outputPath}`);

    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

/**
 * Load configuration from file and command line options
 */
async function loadConfiguration(options: CliOptions): Promise<PlaywrightCoverConfig> {
  const playwrightConfigReader = new PlaywrightConfigReader();
  let config: PlaywrightCoverConfig;

  // Step 1: Load Playwright Coverage config
  if (options.config && fs.existsSync(options.config)) {
    // Load from specified configuration file
    const configModule = require(path.resolve(options.config));
    config = configModule.default || configModule;
  } else if (fs.existsSync('playwright-coverage.config.js')) {
    // Load default configuration file
    const configModule = require('./playwright-coverage.config.js');
    config = configModule.default || configModule;
  } else {
    // Use default configuration
    config = getDefaultConfig();
  }

  // Step 2: Auto-detect and merge Playwright config
  const playwrightConfigPath = options['playwright-config'];
  const playwrightConfig = await playwrightConfigReader.loadConfig(playwrightConfigPath);

  if (playwrightConfig) {
    console.log('📋 Found Playwright configuration, auto-merging settings...');

    // Show what we found
    const summary = playwrightConfigReader.getConfigSummary(playwrightConfig);
    if (summary.length > 0 && options.verbose) {
      console.log('📋 Playwright Config Summary:');
      summary.forEach(line => console.log(`  ${line}`));
    }

    // Merge configurations
    config = playwrightConfigReader.mergeIntoCoverageConfig(playwrightConfig, config);
  }

  // Step 3: Override with command line options (CLI takes precedence)
  // Only override if the user actually provided the option (not just the default)

  if (options.include && options.include.length > 0) {
    config.include = options.include;
  }

  if (options.exclude && options.exclude.length > 0) {
    config.exclude = options.exclude;
  }

  if (options.output) {
    config.outputPath = options.output;
  }

  if (options.format && options.format !== 'console') {
    config.reportFormat = options.format;
  }

  if (options.threshold && options.threshold !== 80) {
    config.coverageThreshold = parseInt(options.threshold.toString());
  }

  if (options['static-analysis'] !== undefined && options['static-analysis'] !== true) {
    config.staticAnalysis = options['static-analysis'];
  }

  if (options['runtime-tracking'] !== undefined && options['runtime-tracking'] !== false) {
    config.runtimeTracking = options['runtime-tracking'];
  }

  if (options['discover-elements'] !== undefined && options['discover-elements'] !== true) {
    config.discoverElements = options['discover-elements'];
  }

  // Commander.js converts kebab-case to camelCase, so check both
  const pageUrls = options['page-url'] || options['pageUrl'];
  if (pageUrls && pageUrls.length > 0) {
    config.pageUrls = pageUrls;
    console.log(`📍 Using ${pageUrls.length} URLs from command line: ${pageUrls.join(', ')}`);
  }

  // Only override webServer if the user explicitly set it
  // User can explicitly disable auto-detected web server with --no-web-server
  if (options['web-server'] !== undefined) {
    config.webServer = options['web-server'];
  }

  if (options['playwright-config']) {
    config.playwrightConfigPath = options['playwright-config'];
  }

  return config;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): PlaywrightCoverConfig {
  return {
    include: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],
    exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
    ignoreElements: [
      '[data-testid="skip-coverage"]',
      '.test-only',
      '[aria-hidden="true"]'
    ],
    coverageThreshold: 80,
    outputPath: './coverage-report',
    reportFormat: 'console',
    discoverElements: true,
    staticAnalysis: true,
    runtimeTracking: false,
    pageUrls: [],
    webServer: undefined
  };
}

/**
 * Generate fixture code
 */
function generateFixtureCode(): string {
  return `
// Playwright Coverage Fixture
// Import this fixture in your Playwright test files

import { test as base } from '@playwright/test';
import { CoverageTracker } from 'playwright-coverage-reporter';

export const test = base.extend({
  // Enhanced page fixture with coverage tracking
  page: async ({ page }, use) => {
    const tracker = new CoverageTracker();

    // Start tracking when page is created
    await tracker.startTracking(page);

    await use(page);

    // Stop tracking and get results
    const coverageData = await tracker.stopTracking();

    // Store coverage data for reporting
    if (global.playwrightCoverageData) {
      global.playwrightCoverageData.push(coverageData);
    } else {
      global.playwrightCoverageData = [coverageData];
    }
  }
});

export { expect } from '@playwright/test';

// Example usage:
/*
import { test, expect } from './coverage-fixture';

test('example test with coverage', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button:has-text("Submit")');
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  // All interactions are automatically tracked for coverage
});
*/
`;
}

/**
 * Run demo scenario
 */
async function runDemo(outputPath: string, format: string = 'console', verbose: boolean = false): Promise<void> {
  const { PlaywrightCoverEngine } = await import('./core/engine');
  const { chromium } = await import('playwright');

  // Create demo configuration
  const config: PlaywrightCoverConfig = {
    include: ['demo/**/*.spec.ts'],
    exclude: [],
    ignoreElements: [],
    coverageThreshold: 70,
    outputPath,
    reportFormat: format as any,
    discoverElements: true,
    staticAnalysis: true,
    runtimeTracking: false
  };

  // Create demo test files
  await createDemoFiles();

  // Launch browser and discover elements from a demo page
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Create a simple HTML page with interactive elements
  const demoHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Demo Page</title>
</head>
<body>
    <h1>Demo Application</h1>

    <nav>
        <a href="/home">Home</a>
        <a href="/about">About</a>
        <button id="menu-toggle">Menu</button>
    </nav>

    <form>
        <input type="email" placeholder="Email" data-testid="email-input">
        <input type="password" placeholder="Password" data-testid="password-input">
        <button type="submit">Login</button>
        <button type="button" onclick="alert('Reset!')">Reset</button>
    </form>

    <div>
        <input type="checkbox" id="remember">
        <label for="remember">Remember me</label>
    </div>

    <div>
        <input type="radio" name="plan" id="basic">
        <label for="basic">Basic Plan</label>
        <input type="radio" name="plan" id="premium">
        <label for="premium">Premium Plan</label>
    </div>

    <select data-testid="country-select">
        <option value="">Select Country</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
    </select>

    <textarea placeholder="Comments" data-testid="comments"></textarea>

    <div>
        <button onclick="addToCart()">Add to Cart</button>
        <button onclick="checkout()">Checkout</button>
        <button onclick="contact()">Contact Support</button>
    </div>

    <script>
        function addToCart() { console.log('Added to cart'); }
        function checkout() { console.log('Checkout'); }
        function contact() { console.log('Contact'); }
    </script>
</body>
</html>
  `;

  await page.setContent(demoHtml);

  // Discover elements
  const { ElementDiscoverer } = await import('./utils/element-discoverer');
  const discoverer = new ElementDiscoverer();
  const elements = await discoverer.discoverElements(page);

  await browser.close();

  // Create mock test selectors
  const testSelectors = [
    {
      raw: 'button:has-text("Login")',
      normalized: 'button:has-text("...")',
      type: SelectorType.TEXT,
      lineNumber: 10,
      filePath: 'demo/login.spec.ts',
      context: 'await page.click'
    },
    {
      raw: '[data-testid="email-input"]',
      normalized: '[data-testid="..."]',
      type: SelectorType.TEST_ID,
      lineNumber: 11,
      filePath: 'demo/login.spec.ts',
      context: 'await page.fill'
    },
    {
      raw: 'a[href="/about"]',
      normalized: 'a[href="..."]',
      type: SelectorType.CSS,
      lineNumber: 15,
      filePath: 'demo/navigation.spec.ts',
      context: 'await page.click'
    }
  ];

  // Calculate coverage
  const { CoverageCalculator } = await import('./utils/coverage-calculator');
  const calculator = new CoverageCalculator();
  const coverage = calculator.calculateCoverage(elements, testSelectors, 'demo-page');

  // Generate report
  const { CoverageReporter } = await import('./reporters/coverage-reporter');
  const reporter = new CoverageReporter({
    outputPath,
    format: 'all',
    threshold: config.coverageThreshold,
    verbose: true
  });

  const coverageReport = {
    summary: {
      totalElements: elements.length,
      coveredElements: coverage.coveredElements,
      coveragePercentage: coverage.coveragePercentage,
      pages: 1,
      testFiles: 2
    },
    pages: [{
      url: 'demo-page',
      elements,
      coverage
    }],
    uncoveredElements: coverage.uncoveredElements,
    recommendations: calculator.generateRecommendations(coverage)
  };

  await reporter.generateReport(coverageReport);
}

/**
 * Create demo test files
 */
async function createDemoFiles(): Promise<void> {
  const demoDir = './demo';

  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }

  // Demo login test
  const loginTest = `
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('button:has-text("Login")');

    await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('button:has-text("Login")');

    await expect(page.locator('[data-testid="error"]')).toBeVisible();
  });
});
  `;

  // Demo navigation test
  const navigationTest = `
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to pages', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/about"]');
    await expect(page).toHaveURL('/about');

    await page.click('button:has-text("Menu")');
    await expect(page.locator('[data-testid="menu"]')).toBeVisible();
  });
});
  `;

  fs.writeFileSync(path.join(demoDir, 'login.spec.ts'), loginTest);
  fs.writeFileSync(path.join(demoDir, 'navigation.spec.ts'), navigationTest);

  console.log('📁 Created demo test files in ./demo/');
}