#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Get version from package.json
const packageVersion = require('../package.json').version;

program
  .name('playwright-coverage')
  .description('Configuration tool for Playwright Coverage Reporter')
  .version(packageVersion);

program
  .command('setup-reporter')
  .description('Set up Playwright reporter configuration')
  .option('-t, --type <type>', 'Configuration type (development|ci|testing|basic|comprehensive)', 'development')
  .option('-o, --output <path>', 'Output Playwright config file (default: playwright.config.ts)', 'playwright.config.ts')
  .option('-f, --force', 'Overwrite existing configuration file')
  .option('--base-url <url>', 'Base URL for your application (default: http://localhost:3000)', 'http://localhost:3000')
  .option('--threshold <percentage>', 'Coverage threshold percentage')
  .option('--page-urls <urls...>', 'Additional page URLs to analyze')
  .option('--runtime-discovery', 'Enable runtime element discovery', true)
  .option('--no-runtime-discovery', 'Disable runtime element discovery')
  .option('--screenshots', 'Enable screenshot capture', true)
  .option('--no-screenshots', 'Disable screenshot capture')
  .action(async (options: {
    type?: string;
    output?: string;
    force?: boolean;
    baseUrl?: string;
    threshold?: string;
    pageUrls?: string[];
    runtimeDiscovery?: boolean;
    noRuntimeDiscovery?: boolean;
    screenshots?: boolean;
    noScreenshots?: boolean;
  }) => {
    try {
      const configPath = options.output || 'playwright.config.ts';

      if (fs.existsSync(configPath) && !options.force) {
        console.error(`❌ Configuration file ${configPath} already exists. Use --force to overwrite.`);
        process.exit(1);
      }

      console.log('🔧 Setting up Playwright coverage reporter...');

      // Generate Playwright configuration
      const configContent = generatePlaywrightConfig(options);

      fs.writeFileSync(configPath, configContent);
      console.log(`✅ Playwright configuration created: ${configPath}`);

      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Review and customize the configuration in', configPath);
      console.log('2. Run your tests: npx playwright test');
      console.log('3. View the coverage report in ./coverage-report');
      console.log('');
      console.log('💡 For more configuration options, see: https://github.com/DoomedRamen/playwright-coverage-reporter');

    } catch (error) {
      console.error('❌ Failed to set up reporter configuration:', error);
      process.exit(1);
    }
  });

program
  .command('validate-reporter')
  .description('Validate Playwright reporter configuration')
  .option('-c, --config <path>', 'Path to Playwright config file (default: playwright.config.ts)', 'playwright.config.ts')
  .action(async (options: { config?: string }) => {
    try {
      const configPath = options.config || 'playwright.config.ts';

      if (!fs.existsSync(configPath)) {
        console.log(`❌ Configuration file ${configPath} not found.`);
        return;
      }

      console.log('🔍 Validating Playwright coverage reporter configuration...');

      const validation = await validatePlaywrightConfig(configPath);

      if (validation.valid) {
        console.log('✅ Configuration is valid!');
        console.log('');
        console.log('📊 Configuration summary:');
        validation.summary.forEach(line => console.log(`  ✓ ${line}`));
      } else {
        console.log('❌ Configuration has issues:');
        validation.errors.forEach(error => console.log(`  ✗ ${error}`));

        if (validation.warnings.length > 0) {
          console.log('');
          console.log('⚠️  Warnings:');
          validation.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
        }
      }

    } catch (error) {
      console.error('❌ Failed to validate configuration:', error);
      process.exit(1);
    }
  });

program
  .command('debug-config')
  .description('Debug and analyze Playwright coverage configuration')
  .option('-c, --config <path>', 'Path to Playwright config file (default: playwright.config.ts)', 'playwright.config.ts')
  .option('--performance', 'Include performance analysis')
  .option('--filter-stats', 'Include element filter statistics')
  .action(async (options: { config?: string; performance?: boolean; filterStats?: boolean }) => {
    try {
      const { ConfigValidator } = await import('./utils/config-validator');
      const { ElementFilter } = await import('./utils/element-filter');
      const { PerformanceOptimizer } = await import('./utils/performance-optimizer');

      const configPath = options.config || 'playwright.config.ts';

      if (!fs.existsSync(configPath)) {
        console.log(`❌ Configuration file ${configPath} not found.`);
        return;
      }

      console.log('🔍 Analyzing Playwright coverage configuration...');

      // Extract configuration from file
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = extractConfigFromContent(configContent);

      if (!config) {
        console.log('❌ Could not extract coverage configuration from file.');
        return;
      }

      // Generate comprehensive debug info
      const debugInfo = ConfigValidator.generateDebugInfo(config);
      ConfigValidator.printDebugInfo(debugInfo);

      // Performance analysis
      if (options.performance) {
        console.log('\n⚡ Performance Analysis');
        console.log('═'.repeat(50));

        const optimizer = new PerformanceOptimizer();
        const recommendations = optimizer.getOptimizationRecommendations();

        console.log('Recommendations:');
        recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      // Element filter statistics
      if (options.filterStats && config.elementFilter) {
        console.log('\n🎯 Element Filter Analysis');
        console.log('═'.repeat(50));

        let filter;
        if (typeof config.elementFilter === 'string') {
          filter = ElementFilter.fromConfigString(config.elementFilter);
        } else {
          filter = new ElementFilter(config.elementFilter);
        }

        const stats = filter.getStats();
        console.log(`Estimated Impact: ${stats.estimatedImpact}`);
        console.log(`Configuration: ${JSON.stringify(stats.config, null, 2)}`);

        if (stats.recommendations.length > 0) {
          console.log('\nRecommendations:');
          stats.recommendations.forEach(rec => console.log(`  • ${rec}`));
        }
      }

    } catch (error) {
      console.error('❌ Failed to debug configuration:', error);
      process.exit(1);
    }
  });

program
  .command('performance-test')
  .description('Test performance with different optimization settings')
  .option('-t, --test-dir <path>', 'Test directory path (default: ./tests)', './tests')
  .option('-p, --profile <profile>', 'Performance profile (development|ci|large|minimal)', 'development')
  .option('--iterations <count>', 'Number of test iterations (default: 3)', '3')
  .action(async (options: { testDir?: string; profile?: string; iterations?: string }) => {
    try {
      const { PerformanceOptimizer, PerformancePresets } = await import('./utils/performance-optimizer');
      const { glob } = await import('glob');

      const testDir = options.testDir || './tests';
      const profile = options.profile as any;
      const iterations = parseInt(options.iterations || '3');

      console.log('🚀 Running performance test...');
      console.log(`Test Directory: ${testDir}`);
      console.log(`Profile: ${profile}`);
      console.log(`Iterations: ${iterations}`);

      // Find test files
      const testFiles = await glob(`${testDir}/**/*.spec.ts`, { cwd: process.cwd() });
      console.log(`Found ${testFiles.length} test files`);

      const optimizer = new PerformanceOptimizer(PerformancePresets[profile] || PerformancePresets.development);

      // Simulate processing with performance monitoring
      const results = [];
      for (let i = 0; i < iterations; i++) {
        console.log(`\nIteration ${i + 1}/${iterations}:`);

        optimizer.startSession();

        const startTime = Date.now();

        // Simulate processing test files
        await optimizer.processBatched(
          testFiles,
          async (batch) => {
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 10));
            return batch.map(file => ({ file, processed: true }));
          },
          (processed, total) => {
            process.stdout.write(`\rProcessing: ${processed}/${total} files`);
          }
        );

        const endTime = Date.now();
        optimizer.updateSessionMetrics(0, testFiles.length);
        const session = optimizer.endSession();

        console.log(`  Duration: ${endTime - startTime}ms`);
        console.log(`  Memory: ${session?.memoryUsageMB.toFixed(2)}MB`);

        if (session) {
          results.push({
            duration: session.duration,
            memory: session.memoryUsageMB,
            elementsProcessed: session.elementsProcessed
          });
        }
      }

      // Performance summary
      console.log('\n📊 Performance Summary');
      console.log('═'.repeat(50));

      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const avgMemory = results.reduce((sum, r) => sum + r.memory, 0) / results.length;

      console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`Average Memory: ${avgMemory.toFixed(2)}MB`);
      console.log(`Files per Second: ${(testFiles.length / (avgDuration / 1000)).toFixed(2)}`);

      // Recommendations
      const recommendations = optimizer.getOptimizationRecommendations();
      if (recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

    } catch (error) {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    }
  });

program
  .command('filter-test')
  .description('Test element filtering with different configurations')
  .option('-c, --config <string>', 'Filter configuration string or preset name')
  .option('-p, --preset <preset>', 'Filter preset (comprehensive|essential|minimal|forms|navigation)')
  .option('-u, --url <url>', 'Test URL to analyze (default: http://localhost:3000)', 'http://localhost:3000')
  .action(async (options: { config?: string; preset?: string; url?: string }) => {
    try {
      const { ElementFilter } = await import('./utils/element-filter');
      // const { PageAnalyzer } = await import('./analyzers/page-analyzer'); // Commented out to avoid import error

      console.log('🎯 Testing element filtering...');

      // Create filter
      let filter;
      if (options.config) {
        filter = ElementFilter.fromConfigString(options.config);
        console.log(`Using config: ${options.config}`);
      } else if (options.preset) {
        filter = ElementFilter.fromPreset(options.preset as any);
        console.log(`Using preset: ${options.preset}`);
      } else {
        filter = new ElementFilter();
        console.log('Using default filter');
      }

      // Validate filter
      const validation = filter.validateConfig();
      if (!validation.valid) {
        console.log('❌ Filter configuration errors:');
        validation.errors.forEach(error => console.log(`  • ${error}`));
        return;
      }

      console.log(`✅ Filter configuration is valid`);

      // Get filter statistics
      const stats = filter.getStats();
      console.log(`Estimated Impact: ${stats.estimatedImpact}`);

      if (stats.recommendations.length > 0) {
        console.log('Recommendations:');
        stats.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      // Test with actual page (if available)
      console.log(`\n🌐 Testing with URL: ${options.url}`);

      try {
        // const analyzer = new PageAnalyzer(); // Commented out to avoid import error
        // Note: This would require a running browser, so we'll simulate
        console.log('📝 Simulating page analysis...');

        // Create mock elements for testing
        const mockElements = [
          { selector: '#submit-btn', type: 'button' as any, text: 'Submit', visible: true },
          { selector: '#email-input', type: 'input' as any, text: '', visible: true },
          { selector: '.hidden-btn', type: 'button' as any, text: 'Hidden', visible: false },
          { selector: '#cancel-btn', type: 'button' as any, text: 'Cancel', visible: true },
          { selector: '.nav-link', type: 'link' as any, text: 'Home', visible: true }
        ];

        const result = filter.filterElements(mockElements as any);

        console.log(`\n📊 Filter Results:`);
        console.log(`Total Elements: ${result.totalElements}`);
        console.log(`Included Elements: ${result.includedElements}`);
        console.log(`Excluded Elements: ${result.excludedElements}`);

        if (Object.keys(result.exclusionReasons).length > 0) {
          console.log('\nExclusion Reasons:');
          Object.entries(result.exclusionReasons).forEach(([reason, count]) => {
            console.log(`  ${reason}: ${count}`);
          });
        }

      } catch (error) {
        console.log(`⚠️ Could not test with live URL: ${error.message}`);
        console.log('This is expected if there is no server running at the specified URL.');
      }

    } catch (error) {
      console.error('❌ Filter test failed:', error);
      process.exit(1);
    }
  });

program
  .command('migrate-to-reporter')
  .description('Migrate from standalone CLI to Playwright reporter')
  .option('-c, --config <path>', 'Path to existing playwright-coverage.config.js')
  .option('-o, --output <path>', 'Output Playwright config file (default: playwright.config.ts)', 'playwright.config.ts')
  .option('-f, --force', 'Overwrite existing configuration file')
  .action(async (options: { config?: string; output?: string; force?: boolean }) => {
    try {
      const oldConfigPath = options.config || 'playwright-coverage.config.js';
      const newConfigPath = options.output || 'playwright.config.ts';

      if (!fs.existsSync(oldConfigPath)) {
        console.log(`❌ Existing configuration file ${oldConfigPath} not found.`);
        console.log('💡 Use --config to specify the path to your existing configuration.');
        return;
      }

      if (fs.existsSync(newConfigPath) && !options.force) {
        console.log(`❌ Target configuration file ${newConfigPath} already exists. Use --force to overwrite.`);
        return;
      }

      console.log('🔄 Migrating to Playwright reporter configuration...');

      const migrationResult = await migrateToReporter(oldConfigPath, newConfigPath);

      if (migrationResult.success) {
        console.log('✅ Migration complete!');
        console.log(`📄 New configuration created: ${newConfigPath}`);
        console.log('');
        console.log('📋 Changes made:');
        migrationResult.changes.forEach(change => console.log(`  ✓ ${change}`));

        if (migrationResult.warnings.length > 0) {
          console.log('');
          console.log('⚠️  Migration warnings:');
          migrationResult.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
        }

        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Review the migrated configuration');
        console.log('2. Update your test scripts to use: npx playwright test');
        console.log('3. Remove the old CLI commands from your CI pipeline');
      } else {
        console.log('❌ Migration failed:');
        migrationResult.errors.forEach(error => console.log(`  ✗ ${error}`));
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

/**
 * Format configuration object as JavaScript syntax (without quotes around keys)
 */
function formatConfigAsJS(obj: any, indent: number = 2): string {
  const indentStr = ' '.repeat(indent);
  const nextIndentStr = ' '.repeat(indent + 2);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return '[\n' + obj.map(item =>
      nextIndentStr + formatConfigAsJS(item, indent + 2)
    ).join(',\n') + '\n' + indentStr + ']';
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    return '{\n' + keys.map(key => {
      const value = obj[key];
      // Skip undefined values entirely
      if (value === undefined) return null;
      const formattedValue = formatConfigAsJS(value, indent + 2);
      return nextIndentStr + key + ': ' + formattedValue;
    }).filter(line => line !== null).join(',\n') + '\n' + indentStr + '}';
  }

  if (typeof obj === 'string') {
    return `'${obj.replace(/'/g, "\\'")}'`;
  }

  return String(obj);
}

/**
 * Generate Playwright configuration content
 */
function generatePlaywrightConfig(options: {
  type?: string;
  baseUrl?: string;
  threshold?: string;
  pageUrls?: string[];
  runtimeDiscovery?: boolean;
  noRuntimeDiscovery?: boolean;
  screenshots?: boolean;
  noScreenshots?: boolean;
}): string {
  const { CoveragePresets } = require('./config/playwright-config');

  let coverageConfig;
  const type = options.type || 'development';
  const baseUrl = options.baseUrl || 'http://localhost:3000';

  // Build page URLs list
  const pageUrls = [baseUrl];
  if (options.pageUrls) {
    pageUrls.push(...options.pageUrls);
  }

  // Build coverage config based on type
  const configOptions: any = {};

  // Only add threshold if explicitly provided
  if (options.threshold) {
    configOptions.threshold = parseInt(options.threshold);
  }

  // Add page URLs for types that support them
  if (type === 'ci' || type === 'testing' || type === 'comprehensive' || type === 'development') {
    configOptions.pageUrls = pageUrls;
  }

  // Add runtime discovery and screenshot options for types that support them
  if (type === 'comprehensive' || type === 'development') {
    // Handle positive and negative flags - negative flags take precedence
    if (options.noRuntimeDiscovery !== undefined) {
      configOptions.runtimeDiscovery = !options.noRuntimeDiscovery;
    } else if (options.runtimeDiscovery !== undefined) {
      configOptions.runtimeDiscovery = options.runtimeDiscovery;
    }

    if (options.noScreenshots !== undefined) {
      configOptions.captureScreenshots = !options.noScreenshots;
    } else if (options.screenshots !== undefined) {
      configOptions.captureScreenshots = options.screenshots;
    }
  }

  switch (type) {
    case 'ci':
      coverageConfig = CoveragePresets.ci(configOptions);
      break;
    case 'testing':
      coverageConfig = CoveragePresets.testing(configOptions);
      break;
    case 'basic':
      coverageConfig = CoveragePresets.basic(configOptions);
      break;
    case 'comprehensive':
      coverageConfig = CoveragePresets.comprehensive(configOptions);
      break;
    case 'development':
    default:
      coverageConfig = CoveragePresets.development(configOptions);
      break;
  }

  return `import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    [
      PlaywrightCoverageReporter,
      ${formatConfigAsJS(coverageConfig, 6)}
    ]
  ],

  use: {
    baseURL: '${baseUrl}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: '${baseUrl}',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});`;
}

/**
 * Validate Playwright configuration
 */
async function validatePlaywrightConfig(configPath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: string[];
}> {
  const result = {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    summary: [] as string[]
  };

  try {
    // Try to load and parse the configuration
    const configContent = fs.readFileSync(configPath, 'utf-8');

    // Basic checks
    if (!configContent.includes('PlaywrightCoverageReporter')) {
      result.errors.push('PlaywrightCoverageReporter is not imported or configured');
      result.valid = false;
    }

    if (configContent.includes('playwright-coverage-reporter')) {
      result.summary.push('Playwright Coverage Reporter is properly imported');
    }

    // Check for coverage configuration
    if (configContent.includes('threshold')) {
      result.summary.push('Coverage threshold is configured');
    }

    if (configContent.includes('runtimeDiscovery')) {
      result.summary.push('Runtime discovery is configured');
    }

    if (configContent.includes('elementDiscovery')) {
      result.summary.push('Element discovery is configured');
    }

    if (configContent.includes('pageUrls')) {
      result.summary.push('Page URLs are configured');
    }

    // Check output directory
    if (configContent.includes('coverage-report')) {
      result.summary.push('Coverage output directory is set to ./coverage-report');
    } else {
      result.warnings.push('Consider setting a custom output directory for coverage reports');
    }

    // Check format configuration
    if (configContent.includes('format') && configContent.includes('html')) {
      result.summary.push('HTML reports are enabled');
    }

    // Check for potential issues
    if (configContent.includes('runtimeDiscovery: true')) {
      result.warnings.push('Runtime discovery is enabled - this may slow down test execution');
    }

    if (!result.summary.length) {
      result.errors.push('No valid coverage configuration found');
      result.valid = false;
    }

  } catch (error) {
    result.errors.push(`Failed to read configuration file: ${error.message}`);
    result.valid = false;
  }

  return result;
}

/**
 * Migrate from standalone CLI to reporter configuration
 */
async function migrateToReporter(oldConfigPath: string, newConfigPath: string): Promise<{
  success: boolean;
  changes: string[];
  warnings: string[];
  errors: string[];
}> {
  const result = {
    success: true,
    changes: [] as string[],
    warnings: [] as string[],
    errors: [] as string[]
  };

  try {
    // Load old configuration
    const oldConfig = require(path.resolve(oldConfigPath));
    const { CoveragePresets } = require('./config/playwright-config');

    result.changes.push(`Loaded existing configuration from ${oldConfigPath}`);

    // Determine best preset based on old config
    let coverageConfig;
    if (oldConfig.reportFormat === 'json' || process.env.CI) {
      coverageConfig = CoveragePresets.ci();
      result.changes.push('Applied CI-optimized configuration');
    } else if (oldConfig.reportFormat === 'html') {
      coverageConfig = CoveragePresets.development();
      result.changes.push('Applied development configuration');
    } else {
      coverageConfig = CoveragePresets.basic();
      result.changes.push('Applied basic configuration');
    }

    // Migrate specific settings
    if (oldConfig.coverageThreshold) {
      coverageConfig.threshold = oldConfig.coverageThreshold;
      result.changes.push(`Migrated coverage threshold: ${oldConfig.coverageThreshold}%`);
    }

    if (oldConfig.pageUrls && oldConfig.pageUrls.length > 0) {
      coverageConfig.pageUrls = oldConfig.pageUrls;
      result.changes.push(`Migrated ${oldConfig.pageUrls.length} page URLs`);
    }

    if (oldConfig.outputPath) {
      coverageConfig.outputPath = oldConfig.outputPath;
      result.changes.push(`Migrated output path: ${oldConfig.outputPath}`);
    }

    // Generate new Playwright configuration
    const newConfigContent = `import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    [
      PlaywrightCoverageReporter,
      ${formatConfigAsJS(coverageConfig, 6)}
    ]
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});`;

    // Write new configuration
    fs.writeFileSync(newConfigPath, newConfigContent);
    result.changes.push(`Created new Playwright configuration: ${newConfigPath}`);

    // Add warnings for manual configuration needed
    result.warnings.push('Review the baseURL and webServer configuration for your application');
    result.warnings.push('Update test files if they use custom test directories');

  } catch (error) {
    result.errors.push(`Migration failed: ${error.message}`);
    result.success = false;
  }

  return result;
}

/**
 * Extract configuration from config file content
 */
function extractConfigFromContent(configContent: string): any {
  try {
    // Look for PlaywrightCoverageReporter configuration
    const reporterMatch = configContent.match(/PlaywrightCoverageReporter,\s*({[\s\S]*?})\s*\]/);
    if (reporterMatch) {
      const configString = reporterMatch[1];
      return eval(`(${configString})`);
    }
  } catch (error) {
    console.warn('Could not extract configuration:', error.message);
  }
  return null;
}