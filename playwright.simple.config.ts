import { defineConfig, devices } from '@playwright/test';
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
    ['list'] // Simple console reporter for test output
  ],

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server for test application
  webServer: {
    command: 'npx serve test-app -l 1337',
    port: 1337,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Global settings for all tests
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:1337',

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