import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter, CoveragePresets } from 'playwright-coverage-reporter';

export default defineConfig({
  // Your existing Playwright configuration
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'], // Playwright HTML reporter
    ['json', { outputFile: 'test-results.json' }], // Playwright JSON reporter
    // Coverage reporter configuration
    [
      PlaywrightCoverageReporter,
      CoveragePresets.development({
        outputPath: './coverage-report',
        format: 'html', // Generate HTML coverage report
        threshold: 80,
        verbose: true,
        elementDiscovery: true,
        pageUrls: [
          'http://localhost:3000', // Your app's development URL
          'http://localhost:3000/login',
          'http://localhost:3000/dashboard'
        ],
        runtimeDiscovery: true, // Discover elements during test execution
        captureScreenshots: false // Set to true to capture screenshots of uncovered elements
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
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile configurations
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});