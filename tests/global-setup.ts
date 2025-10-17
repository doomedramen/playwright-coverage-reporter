import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright test setup...');

  // Ensure test-results directory exists
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Start test server if needed
  if (config.webServer) {
    console.log('🌐 Starting test server...');
    // The web server will be started by Playwright automatically
  }

  // Global browser setup for any pre-test operations
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // You can perform any global setup operations here, such as:
  // - Seeding databases
  // - Setting up test data
  // - Verifying external services are available

  console.log('✅ Global setup completed');

  // Return teardown function
  return async () => {
    await browser.close();
    console.log('🧹 Global teardown completed');
  };
}

export default globalSetup;