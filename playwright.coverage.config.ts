import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from './src/reporter/coverage-reporter';
import path from 'path';

export default defineConfig({
  // Directory for test files
  testDir: './tests/integration',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI.
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html'], // Keep HTML reporter for test results
    ['json', { outputFile: 'test-results.json' }],
    ['list'], // Simple console reporter for test output
    [
      PlaywrightCoverageReporter,
      {
        outputPath: './integration-coverage-report',
        format: 'console', // Show coverage in console during tests
        threshold: 70, // Lower threshold for integration tests
        verbose: true, // Show detailed logs
        elementDiscovery: true, // Enable element discovery
        runtimeDiscovery: false, // Start with false for basic integration test
        pageUrls: [], // Let tests navigate to pages
        captureScreenshots: false // Disable screenshots for cleaner output
      }
    ]
  ],

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // You can add other browsers if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server for test application
  webServer: {
    command: 'npx serve test-app -l 3000',
    url: 'http://localhost:3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global settings for all tests
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',
  },

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  outputDir: 'test-results',

  // Global setup and teardown
  globalSetup: path.join(__dirname, 'tests/global-setup.ts'),
});