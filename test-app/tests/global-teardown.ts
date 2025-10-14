import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...');
  // You can stop servers or perform other cleanup here
  console.log('✅ Cleanup completed');
}

export default globalTeardown;