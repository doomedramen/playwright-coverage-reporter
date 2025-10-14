import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up test environment...');

  // Ensure the build is up to date
  const { execSync } = require('child_process');
  const path = require('path');

  try {
    execSync('npm run build', {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe'
    });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    throw error;
  }

  // Clean up any previous test artifacts
  const fs = require('fs');
  const tempDir = path.join(__dirname, 'temp');

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up previous test artifacts');
  }
}

export default globalSetup;