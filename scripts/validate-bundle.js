#!/usr/bin/env node

/**
 * Bundle Validation Script
 *
 * This script validates that the built bundle can be imported and used correctly
 * by Playwright. It runs as part of our testing pipeline and CI/CD.
 *
 * Usage: node scripts/validate-bundle.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function validateBundle() {
  console.log('🔍 Validating built bundle...\n');

  let hasErrors = false;

  // Test 1: Basic ESM import
  console.log('1. Testing basic ESM import...');
  try {
    const bundlePath = join(__dirname, '../dist/reporter.js');
    const module = await import(bundlePath);

    console.log('   ✅ Bundle imports successfully');
    console.log('   📦 Available exports:', Object.keys(module).join(', '));

    // Test 2: Default export exists and is a function/class
    console.log('\n2. Testing default export...');
    if (typeof module.default === 'function') {
      console.log('   ✅ Default export is a function/class');
    } else {
      console.log('   ❌ Default export is not a function:', typeof module.default);
      hasErrors = true;
    }

    // Test 3: PlaywrightCoverageReporter class available
    console.log('\n3. Testing PlaywrightCoverageReporter availability...');
    if (module.PlaywrightCoverageReporter) {
      console.log('   ✅ PlaywrightCoverageReporter available');
      console.log('   📝 Type:', typeof module.PlaywrightCoverageReporter);
    } else {
      console.log('   ❌ PlaywrightCoverageReporter not found');
      hasErrors = true;
    }

    // Test 4: Can instantiate the reporter
    console.log('\n4. Testing reporter instantiation...');
    try {
      const reporter = new module.default({ outputPath: './test-coverage-report' });
      console.log('   ✅ Reporter instantiates successfully');
      console.log('   📊 Reporter has required methods:', [
        'onBegin' in reporter,
        'onTestBegin' in reporter,
        'onTestEnd' in reporter,
        'onEnd' in reporter
      ].filter(Boolean).join(', '));
    } catch (error) {
      console.log('   ❌ Failed to instantiate reporter:', error.message);
      hasErrors = true;
    }

    // Test 5: Check bundle size is reasonable
    console.log('\n5. Testing bundle characteristics...');
    try {
      const stats = await import('fs').then(fs => fs.statSync(bundlePath));
      const sizeKB = Math.round(stats.size / 1024);

      console.log(`   📏 Bundle size: ${sizeKB}KB`);

      if (sizeKB < 100) {
        console.log('   ⚠️  Bundle seems too small - may be missing dependencies');
      } else if (sizeKB > 1000) {
        console.log('   ⚠️  Bundle is quite large - consider optimizing');
      } else {
        console.log('   ✅ Bundle size is reasonable');
      }
    } catch (error) {
      console.log('   ⚠️  Could not check bundle size:', error.message);
    }

    // Test 6: Validate ESM module format
    console.log('\n6. Testing ESM module format...');
    try {
      // This should work in ESM environment
      const esmCheck = await import(bundlePath);
      console.log('   ✅ ESM module format is valid');

      // Check that exports are as expected
      const expectedExports = ['default', 'PlaywrightCoverageReporter'];
      const missingExports = expectedExports.filter(exp => !(exp in esmCheck));

      if (missingExports.length === 0) {
        console.log('   ✅ All expected exports present');
      } else {
        console.log('   ❌ Missing exports:', missingExports.join(', '));
        hasErrors = true;
      }
    } catch (error) {
      console.log('   ❌ ESM format validation failed:', error.message);
      hasErrors = true;
    }

    // Test 7: Check for CommonJS compatibility issues
    console.log('\n7. Checking for CommonJS compatibility issues...');
    const sourceContent = await import('fs').then(fs => fs.readFileSync(bundlePath, 'utf8'));

    const cjsIssues = [
      /require\(/g,
      /module\.exports/g,
      /__dirname/g,
      /__filename/g,
      /exports\./g
    ];

    const foundIssues = cjsIssues.filter(pattern => pattern.test(sourceContent));

    if (foundIssues.length === 0) {
      console.log('   ✅ No CommonJS compatibility issues found');
    } else {
      console.log('   ⚠️  Potential CommonJS issues detected:', foundIssues.length);
      foundIssues.forEach(pattern => {
        const match = pattern.exec(sourceContent);
        if (match) console.log(`      - Found: ${match[0]} at line ${sourceContent.substring(0, match.index).split('\n').length}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
      console.log('❌ BUNDLE VALIDATION FAILED');
      console.log('   Please fix the issues above before publishing.');
      process.exit(1);
    } else {
      console.log('✅ BUNDLE VALIDATION PASSED');
      console.log('   The bundle is ready for publication.');
      console.log('='.repeat(60));
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ FATAL ERROR DURING VALIDATION:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateBundle();
}

export { validateBundle };