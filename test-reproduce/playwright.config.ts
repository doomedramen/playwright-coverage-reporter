import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['playwright-coverage-reporter', {
      outputPath: './coverage-report',
      threshold: 80,
      verbose: true
    }]
  ],
});