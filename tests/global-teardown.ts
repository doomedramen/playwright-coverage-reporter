import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Clean up any temporary files or resources
  const tempDirs = [
    path.join(process.cwd(), 'test-results', 'temp'),
    path.join(process.cwd(), 'coverage-temp')
  ];

  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`🗑️  Cleaned up temporary directory: ${dir}`);
      } catch (error) {
        console.warn(`⚠️  Could not clean up directory ${dir}:`, error);
      }
    }
  }

  // Generate any final reports or summaries
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    console.log(`📊 Test results directory contains ${files.length} files`);
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;