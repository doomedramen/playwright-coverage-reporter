// Main exports for playwright-cover

export { PlaywrightCoverEngine } from './core/engine';
export { StaticAnalyzer } from './analyzers/static-analyzer';
export { ElementDiscoverer } from './utils/element-discoverer';
export { CoverageCalculator } from './utils/coverage-calculator';
export { CoverageReporter } from './reporters/coverage-reporter';
export { test as coverageTest } from './fixtures/coverage-fixture';

// Type exports
export type {
  PlaywrightCoverConfig,
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

// Default export
import { PlaywrightCoverEngine } from './core/engine';
import { PlaywrightCoverConfig } from './types';

export default class PlaywrightCover {
  private engine: PlaywrightCoverEngine;

  constructor(config: Partial<PlaywrightCoverConfig> = {}) {
    const defaultConfig: PlaywrightCoverConfig = {
      include: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],
      exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
      ignoreElements: [],
      coverageThreshold: 80,
      outputPath: './coverage-report',
      reportFormat: 'console',
      discoverElements: true,
      staticAnalysis: true,
      runtimeTracking: false,
      ...config
    };

    this.engine = new PlaywrightCoverEngine(defaultConfig);
  }

  async analyze(): Promise<any> {
    return this.engine.analyzeCoverage();
  }

  async generateSummary(): Promise<void> {
    return this.engine.generateSummary();
  }

  async analyzeTestFile(testFilePath: string) {
    return this.engine.analyzeTestFile(testFilePath);
  }
}