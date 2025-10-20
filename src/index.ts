// Playwright Coverage Reporter - Main Exports

// Primary export: Playwright Reporter (default export for Playwright compatibility)
export { default } from './reporter/coverage-reporter';
export { PlaywrightCoverageReporter } from './reporter/coverage-reporter';
export type { CoverageReporterOptions } from './reporter/coverage-reporter';

// Note: Fixtures are not exported by default to avoid @playwright/test duplicate imports
// This prevents conflicts when importing the package in playwright.config.ts

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

// Screenshot capture utility
export { ScreenshotCapture } from './utils/screenshot-capture';

// Note: CLI functionality is handled separately via the bin entry in package.json
// to avoid conflicts with Playwright's CLI resolution
