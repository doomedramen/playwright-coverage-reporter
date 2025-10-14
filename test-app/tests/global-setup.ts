import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up test environment...');
  // You can start servers or perform other setup here
  console.log('✅ Test environment ready');
}

export default globalSetup;