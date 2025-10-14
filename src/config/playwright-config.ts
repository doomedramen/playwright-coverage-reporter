import { CoverageReporterOptions } from '../reporter/coverage-reporter';

/**
 * Configuration helper for Playwright coverage reporter
 */
export class PlaywrightCoverageConfig {
  /**
   * Create a basic configuration for the coverage reporter
   */
  static basic(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    return {
      outputPath: './coverage-report',
      format: 'console',
      threshold: 80,
      verbose: false,
      elementDiscovery: true,
      pageUrls: [],
      runtimeDiscovery: false,
      captureScreenshots: false,
      ...options
    };
  }

  /**
   * Create a comprehensive configuration with all features enabled
   */
  static comprehensive(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    return {
      outputPath: './coverage-report',
      format: 'all',
      threshold: 80,
      verbose: true,
      elementDiscovery: true,
      pageUrls: [],
      runtimeDiscovery: true,
      captureScreenshots: true,
      ...options
    };
  }

  /**
   * Create a CI/CD friendly configuration
   */
  static ci(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    return {
      outputPath: './coverage-report',
      format: 'json', // JSON for CI processing
      threshold: 80,
      verbose: false,
      elementDiscovery: true,
      pageUrls: [], // URLs should be configured in CI
      runtimeDiscovery: false, // Runtime discovery can be flaky in CI
      captureScreenshots: false,
      ...options
    };
  }

  /**
   * Create a development-friendly configuration
   */
  static development(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    return {
      outputPath: './coverage-report',
      format: 'html', // HTML for local viewing
      threshold: 70, // Lower threshold for development
      verbose: true,
      elementDiscovery: true,
      pageUrls: ['http://localhost:3000'], // Common dev server
      runtimeDiscovery: true,
      captureScreenshots: true,
      ...options
    };
  }

  /**
   * Create configuration for specific testing scenarios
   */
  static forTesting(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    return {
      outputPath: './test-coverage-report',
      format: 'console',
      threshold: 100, // Expect full coverage in test scenarios
      verbose: true,
      elementDiscovery: true,
      pageUrls: [], // Test-specific URLs
      runtimeDiscovery: true,
      captureScreenshots: false,
      ...options
    };
  }

  /**
   * Validate configuration options
   */
  static validate(config: CoverageReporterOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate threshold
    if (config.threshold !== undefined && (config.threshold < 0 || config.threshold > 100)) {
      errors.push('Threshold must be between 0 and 100');
    }

    // Validate format
    const validFormats = ['console', 'json', 'html', 'lcov', 'istanbul', 'all'];
    if (config.format && !validFormats.includes(config.format)) {
      errors.push(`Format must be one of: ${validFormats.join(', ')}`);
    }

    // Validate output path
    if (config.outputPath && typeof config.outputPath !== 'string') {
      errors.push('Output path must be a string');
    }

    // Validate page URLs
    if (config.pageUrls && !Array.isArray(config.pageUrls)) {
      errors.push('Page URLs must be an array');
    } else if (config.pageUrls) {
      config.pageUrls.forEach((url, index) => {
        if (typeof url !== 'string' || !url.trim()) {
          errors.push(`Page URL at index ${index} must be a non-empty string`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Merge multiple configurations (later configs override earlier ones)
   */
  static merge(...configs: Partial<CoverageReporterOptions>[]): CoverageReporterOptions {
    return configs.reduce((merged, config) => ({
      ...merged,
      ...config
    }), this.basic());
  }

  /**
   * Get configuration from environment variables
   */
  static fromEnvironment(): Partial<CoverageReporterOptions> {
    const config: Partial<CoverageReporterOptions> = {};

    if (process.env.PLAYWRIGHT_COVERAGE_OUTPUT) {
      config.outputPath = process.env.PLAYWRIGHT_COVERAGE_OUTPUT;
    }

    if (process.env.PLAYWRIGHT_COVERAGE_FORMAT) {
      config.format = process.env.PLAYWRIGHT_COVERAGE_FORMAT as any;
    }

    if (process.env.PLAYWRIGHT_COVERAGE_THRESHOLD) {
      config.threshold = parseInt(process.env.PLAYWRIGHT_COVERAGE_THRESHOLD, 10);
    }

    if (process.env.PLAYWRIGHT_COVERAGE_VERBOSE) {
      config.verbose = process.env.PLAYWRIGHT_COVERAGE_VERBOSE === 'true';
    }

    if (process.env.PLAYWRIGHT_COVERAGE_RUNTIME_DISCOVERY) {
      config.runtimeDiscovery = process.env.PLAYWRIGHT_COVERAGE_RUNTIME_DISCOVERY === 'true';
    }

    if (process.env.PLAYWRIGHT_COVERAGE_SCREENSHOTS) {
      config.captureScreenshots = process.env.PLAYWRIGHT_COVERAGE_SCREENSHOTS === 'true';
    }

    if (process.env.PLAYWRIGHT_COVERAGE_PAGE_URLS) {
      config.pageUrls = process.env.PLAYWRIGHT_COVERAGE_PAGE_URLS.split(',').map(url => url.trim());
    }

    return config;
  }

  /**
   * Create configuration with environment variable support
   */
  static withEnvironment(baseConfig: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
    const envConfig = this.fromEnvironment();
    return this.merge(baseConfig, envConfig);
  }
}

/**
 * Predefined configurations for common use cases
 */
export const CoveragePresets = {
  basic: PlaywrightCoverageConfig.basic,
  comprehensive: PlaywrightCoverageConfig.comprehensive,
  ci: PlaywrightCoverageConfig.ci,
  development: PlaywrightCoverageConfig.development,
  testing: PlaywrightCoverageConfig.forTesting
};

/**
 * Configuration factory with sensible defaults
 */
export function createCoverageConfig(options: Partial<CoverageReporterOptions> = {}): CoverageReporterOptions {
  return PlaywrightCoverageConfig.basic(options);
}