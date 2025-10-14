import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');

  const fs = require('fs');
  const path = require('path');
  const tempDir = path.join(__dirname, 'temp');

  // Clean up test artifacts
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Clean up any test coverage reports
  const testReports = [
    './test-coverage-report',
    './test-console-report',
    './test-json-report',
    './test-html-report',
    './test-lcov-report',
    './test-istanbul-report'
  ];

  for (const report of testReports) {
    const reportPath = path.resolve(__dirname, '..', report);
    if (fs.existsSync(reportPath)) {
      fs.rmSync(reportPath, { recursive: true, force: true });
    }
  }

  console.log('✅ Cleanup completed');
}

export default globalTeardown;