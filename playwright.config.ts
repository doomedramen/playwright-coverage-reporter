import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from './dist/reporter/coverage-reporter.js';

export default defineConfig({
  testDir: './tests',
  testIgnore: [
    '**/integration/**' // Skip integration tests that require a web server
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['./dist/reporter/coverage-reporter.js', {
      outputPath: './coverage-report',
      format: 'console',
      threshold: 50, // Moderate threshold for basic tests
      verbose: true,
      elementDiscovery: true,
      pageUrls: [],
      runtimeDiscovery: true,
      captureScreenshots: false
    }]
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
});