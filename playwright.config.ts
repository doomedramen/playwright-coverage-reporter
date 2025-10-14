import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from './dist/reporter/coverage-reporter.js';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['./dist/reporter/coverage-reporter.js', {
      outputPath: './coverage-report',
      format: 'html',
      threshold: 70,
      verbose: true,
      elementDiscovery: true,
      pageUrls: [
        'http://localhost:3000'
      ],
      runtimeDiscovery: true,
      captureScreenshots: true
    }]
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
});