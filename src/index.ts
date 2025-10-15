// Playwright Coverage Reporter - Main Exports

// Primary export: Playwright Reporter
export { PlaywrightCoverageReporter } from './reporter/coverage-reporter';
export type { CoverageReporterOptions } from './reporter/coverage-reporter';

// Custom fixtures for enhanced element discovery
export { test as coverageTest } from './fixtures/coverage-fixture';
export type { CoverageOptions, CoverageData, CoverageFixture } from './fixtures/coverage-fixture';

// Configuration helpers
export * from './config/playwright-config';

// Type exports
export type {
  PageElement,
  TestSelector,
  CoverageResult,
  CoverageReport,
  PageCoverage,
  ElementType,
  SelectorType
} from './types';

// CLI functionality
export * from './cli';
