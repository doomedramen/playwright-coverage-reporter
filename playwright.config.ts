import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from './src/reporter/coverage-reporter';

/**
 * Playwright configuration for the playwright-coverage-reporter project
 *
 * This configuration supports both regular testing and coverage reporting scenarios:
 * 1. Unit tests for tool code (without functionality testing)
 * 2. Comprehensive functionality tests for selector coverage
 */
export default defineConfig({
  // Test directory configuration (only E2E tests for Playwright)
  testDir: './tests/e2e',

  // Global test configuration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.COVERAGE_ENABLED === 'true' ? [
    ['list'],
    ['html', { outputFolder: 'playwright-html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    [
      PlaywrightCoverageReporter, {
        outputPath: './coverage-report',
        format: ['json', 'html', 'console'],
        threshold: process.env.COVERAGE_THRESHOLD ? parseInt(process.env.COVERAGE_THRESHOLD) : 80,
        verbose: process.env.CI !== 'true',
        elementDiscovery: true,
        pageUrls: [
          'http://localhost:3000/login',
          'http://localhost:3000/dashboard',
          'http://localhost:3000/dynamic-content'
        ],
        runtimeDiscovery: true,
        captureScreenshots: process.env.CI === 'true',
        elementFilter: 'interactive',
        debugMode: process.env.DEBUG === 'true'
      }
    ]
  ] : [
    ['list'],
    ['html', { outputFolder: 'playwright-html-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  // Test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    // Browser settings
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Trace configuration
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',

    // Screenshot configuration
    screenshot: process.env.CI ? 'only-on-failure' : 'off',

    // Video configuration
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // User agent
    userAgent: 'playwright-coverage-reporter-test/1.0.0'
  },

  // Project configuration for different browsers
  projects: [
    // E2E functionality tests - Chrome
    {
      name: 'e2e-chrome',
      use: {
        ...devices['Desktop Chrome'],
        // E2E specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      }
    },

    // E2E functionality tests - Firefox
    {
      name: 'e2e-firefox',
      use: { ...devices['Desktop Firefox'] }
    },

    // E2E functionality tests - Safari (if on macOS)
    ...(process.platform === 'darwin' ? [{
      name: 'e2e-safari',
      use: { ...devices['Desktop Safari'] }
    }] : []),

    // Mobile responsive tests
    {
      name: 'mobile-tests',
      testMatch: '**/mobile*.test.ts',
      use: { ...devices['iPhone 13'] }
    },

    // Tablet responsive tests
    {
      name: 'tablet-tests',
      testMatch: '**/tablet*.test.ts',
      use: { ...devices['iPad Pro'] }
    }
  ],

  // Web server configuration for local testing (only when running with coverage)
  ...(process.env.COVERAGE_ENABLED === 'true' ? {
    webServer: {
      command: 'npm run test:server',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'ignore',
      stderr: 'pipe'
    }
  } : {}),

  // Global test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 1000,
      animations: 'allow'
    },
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 1000
    }
  },

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Metadata for test reporting
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Browser Version': process.env.BROWSER_VERSION || 'latest',
    'Coverage Enabled': process.env.COVERAGE_ENABLED === 'true',
    'Coverage Threshold': process.env.COVERAGE_THRESHOLD || '80%'
  }
});