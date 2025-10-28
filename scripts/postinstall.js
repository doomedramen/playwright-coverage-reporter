#!/usr/bin/env node

import { existsSync } from 'fs';
import { spawnSync } from 'child_process';

// Check if we're in a development environment (has package-lock.json or similar)
// Only install lefthook in development environments
const isDevelopment = existsSync('package-lock.json') || 
                    existsSync('yarn.lock') || 
                    existsSync('pnpm-lock.yaml');

if (isDevelopment) {
  // Check if lefthook is available
  try {
    const result = spawnSync('lefthook', ['--version'], { stdio: 'pipe' });
    
    if (result.status === 0) {
      console.log('🔍 Found lefthook, installing git hooks...');
      const installResult = spawnSync('lefthook', ['install'], { stdio: 'inherit' });
      if (installResult.status === 0) {
        console.log('✅ Git hooks installed successfully');
      } else {
        console.log('⚠️  Failed to install git hooks');
      }
    } else {
      console.log('⚠️  lefthook not found, skipping git hook installation');
    }
  } catch (error) {
    console.log('⚠️  lefthook not found, skipping git hook installation');
  }
} else {
  console.log('📦 Production environment detected, skipping git hook installation');
}