import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter, CoveragePresets } from 'playwright-coverage-reporter';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }],
    // CI-optimized coverage configuration
    [
      PlaywrightCoverageReporter,
      CoveragePresets.ci({
        outputPath: './coverage-report',
        format: 'json', // JSON for easy processing in CI pipelines
        threshold: 80,
        verbose: false, // Less verbose in CI
        elementDiscovery: true,
        pageUrls: [
          process.env.CI_APP_URL || 'http://localhost:3000',
          `${process.env.CI_APP_URL || 'http://localhost:3000'}/login`,
          `${process.env.CI_APP_URL || 'http://localhost:3000'}/dashboard`
        ],
        runtimeDiscovery: false, // Runtime discovery can be flaky in CI
        captureScreenshots: false // Screenshots not needed in CI coverage reports
      })
    ]
  ],
  use: {
    baseURL: process.env.CI_APP_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI ? undefined : {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers as needed for CI
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});