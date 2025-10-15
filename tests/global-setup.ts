import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Playwright coverage integration tests...');

  // Ensure browsers are installed
  const browser = await chromium.launch();
  await browser.close();

  console.log('✅ Global setup completed');
}

export default globalSetup;