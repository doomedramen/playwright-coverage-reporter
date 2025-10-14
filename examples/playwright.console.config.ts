import { defineConfig } from '@playwright/test';
import { PlaywrightCoverageReporter, CoveragePresets } from 'playwright-coverage-reporter';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'], // Playwright HTML reporter
    ['json', { outputFile: 'test-results.json' }],
    // Console-only coverage configuration for immediate feedback
    [
      PlaywrightCoverageReporter,
      CoveragePresets.basic({
        format: 'console', // Show coverage report in console
        threshold: 80,
        verbose: true, // Show detailed information
        elementDiscovery: true,
        pageUrls: [
          'http://localhost:3000', // Your app's URL
          'http://localhost:3000/login',
          'http://localhost:3000/dashboard'
        ],
        runtimeDiscovery: true, // Discover elements during test execution
        captureScreenshots: false // No screenshots needed for console output
      })
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
  ],
});