// Playwright Coverage Configuration
// Customize this file according to your project needs

module.exports = {
  // Files to include in analysis
  include: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.e2e.ts',
    'tests/**/*.ts',
    'e2e/**/*.ts'
  ],

  // Files to exclude from analysis
  exclude: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/*.d.ts'
  ],

  // Elements to ignore in coverage calculations
  ignoreElements: [
    '[data-testid="skip-coverage"]',
    '.test-only',
    '[aria-hidden="true"]',
    '[disabled]',
    '.invisible',
    '.hidden'
  ],

  // Coverage threshold percentage (will fail if below this)
  coverageThreshold: 80,

  // Output directory for reports
  outputPath: './coverage-report',

  // Report format: 'console', 'json', 'html', 'lcov', 'istanbul', or 'all'
  reportFormat: 'all',

  // Feature flags
  discoverElements: true,    // Discover page elements automatically
  staticAnalysis: true,     // Analyze test files without running them
  runtimeTracking: false    // Track interactions during test execution
};