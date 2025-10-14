import { test, expect } from '@playwright/test';
import { PlaywrightCoverageConfig, CoveragePresets } from '../src/config/playwright-config';
import { PlaywrightCoverageReporter } from '../src/reporter/coverage-reporter';

test.describe('PlaywrightCoverageConfig', () => {
  test('should create basic configuration', () => {
    const config = PlaywrightCoverageConfig.basic();

    expect(config.outputPath).toBe('./coverage-report');
    expect(config.format).toBe('console');
    expect(config.threshold).toBe(80);
    expect(config.verbose).toBe(false);
    expect(config.elementDiscovery).toBe(true);
    expect(config.runtimeDiscovery).toBe(false);
    expect(config.captureScreenshots).toBe(false);
  });

  test('should create comprehensive configuration', () => {
    const config = PlaywrightCoverageConfig.comprehensive();

    expect(config.format).toBe('all');
    expect(config.verbose).toBe(true);
    expect(config.runtimeDiscovery).toBe(true);
    expect(config.captureScreenshots).toBe(true);
    expect(config.elementDiscovery).toBe(true);
  });

  test('should create CI configuration', () => {
    const config = PlaywrightCoverageConfig.ci();

    expect(config.format).toBe('json');
    expect(config.verbose).toBe(false);
    expect(config.runtimeDiscovery).toBe(false);
    expect(config.captureScreenshots).toBe(false);
  });

  test('should create development configuration', () => {
    const config = PlaywrightCoverageConfig.development();

    expect(config.format).toBe('html');
    expect(config.threshold).toBe(70);
    expect(config.verbose).toBe(true);
    expect(config.runtimeDiscovery).toBe(true);
    expect(config.captureScreenshots).toBe(true);
  });

  test('should create testing configuration', () => {
    const config = PlaywrightCoverageConfig.forTesting();

    expect(config.threshold).toBe(100);
    expect(config.verbose).toBe(true);
    expect(config.runtimeDiscovery).toBe(true);
    expect(config.outputPath).toBe('./test-coverage-report');
  });

  test('should merge configurations correctly', () => {
    const config = PlaywrightCoverageConfig.merge(
      { threshold: 90 },
      { outputPath: './custom-report' },
      { verbose: true }
    );

    expect(config.threshold).toBe(90);
    expect(config.outputPath).toBe('./custom-report');
    expect(config.verbose).toBe(true);
    expect(config.format).toBe('console'); // Default should remain
  });

  test('should validate configuration', () => {
    const validConfig = {
      outputPath: './coverage-report',
      format: 'console' as const,
      threshold: 80,
      pageUrls: ['http://localhost:3000']
    };

    const validation = PlaywrightCoverageConfig.validate(validConfig);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should detect invalid threshold', () => {
    const invalidConfig = {
      outputPath: './coverage-report',
      format: 'console' as const,
      threshold: 150 // Invalid threshold
    };

    const validation = PlaywrightCoverageConfig.validate(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Threshold must be between 0 and 100');
  });

  test('should detect invalid format', () => {
    const invalidConfig = {
      outputPath: './coverage-report',
      format: 'invalid' as any,
      threshold: 80
    };

    const validation = PlaywrightCoverageConfig.validate(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Format must be one of'))).toBe(true);
  });

  test('should detect invalid page URLs', () => {
    const invalidConfig = {
      outputPath: './coverage-report',
      format: 'console' as const,
      threshold: 80,
      pageUrls: [''] as string[] // Invalid empty URL
    };

    const validation = PlaywrightCoverageConfig.validate(invalidConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('Page URL at index'))).toBe(true);
  });

  test('should load configuration from environment variables', () => {
    // Mock environment variables
    const originalEnv = process.env;

    process.env = {
      ...originalEnv,
      PLAYWRIGHT_COVERAGE_OUTPUT: './env-report',
      PLAYWRIGHT_COVERAGE_FORMAT: 'json',
      PLAYWRIGHT_COVERAGE_THRESHOLD: '90',
      PLAYWRIGHT_COVERAGE_VERBOSE: 'true',
      PLAYWRIGHT_COVERAGE_RUNTIME_DISCOVERY: 'true',
      PLAYWRIGHT_COVERAGE_SCREENSHOTS: 'false',
      PLAYWRIGHT_COVERAGE_PAGE_URLS: 'http://localhost:3000,http://localhost:3000/login'
    };

    try {
      const config = PlaywrightCoverageConfig.fromEnvironment();

      expect(config.outputPath).toBe('./env-report');
      expect(config.format).toBe('json');
      expect(config.threshold).toBe(90);
      expect(config.verbose).toBe(true);
      expect(config.runtimeDiscovery).toBe(true);
      expect(config.captureScreenshots).toBe(false);
      expect(config.pageUrls).toEqual(['http://localhost:3000', 'http://localhost:3000/login']);

    } finally {
      process.env = originalEnv;
    }
  });

  test('should create configuration with environment support', () => {
    // Mock environment variables
    const originalEnv = process.env;

    process.env = {
      ...originalEnv,
      PLAYWRIGHT_COVERAGE_THRESHOLD: '85'
    };

    try {
      const config = PlaywrightCoverageConfig.withEnvironment({
        outputPath: './base-report'
      });

      expect(config.outputPath).toBe('./base-report'); // From base config
      expect(config.threshold).toBe(85); // From environment

    } finally {
      process.env = originalEnv;
    }
  });
});

test.describe('CoveragePresets', () => {
  test('should provide all preset types', () => {
    expect(CoveragePresets.basic).toBeDefined();
    expect(CoveragePresets.comprehensive).toBeDefined();
    expect(CoveragePresets.ci).toBeDefined();
    expect(CoveragePresets.development).toBeDefined();
    expect(CoveragePresets.testing).toBeDefined();
  });

  test('should create functional presets', () => {
    const basicConfig = CoveragePresets.basic();
    const ciConfig = CoveragePresets.ci();
    const devConfig = CoveragePresets.development();

    expect(basicConfig.format).toBe('console');
    expect(ciConfig.format).toBe('json');
    expect(devConfig.format).toBe('html');

    expect(basicConfig.threshold).toBe(80);
    expect(ciConfig.threshold).toBe(80);
    expect(devConfig.threshold).toBe(70);
  });
});

test.describe('Configuration Integration', () => {
  test('should work with PlaywrightCoverageReporter', () => {
    const config = PlaywrightCoverageConfig.comprehensive({
      threshold: 95,
      outputPath: './integration-test-report'
    });

    expect(() => {
      new PlaywrightCoverageReporter(config);
    }).not.toThrow();
  });

  test('should handle configuration overrides', () => {
    const baseConfig = PlaywrightCoverageConfig.basic();
    const overriddenConfig = PlaywrightCoverageConfig.merge(baseConfig, {
      threshold: 99,
      runtimeDiscovery: true
    });

    expect(overriddenConfig.threshold).toBe(99);
    expect(overriddenConfig.runtimeDiscovery).toBe(true);
    expect(overriddenConfig.format).toBe('console'); // Should preserve original
  });

  test('should validate complex configurations', () => {
    const complexConfig = PlaywrightCoverageConfig.comprehensive({
      pageUrls: [
        'http://localhost:3000',
        'https://staging.example.com',
        'http://localhost:3000/admin'
      ],
      threshold: 85,
      captureScreenshots: true
    });

    const validation = PlaywrightCoverageConfig.validate(complexConfig);
    expect(validation.valid).toBe(true);
    expect(complexConfig.pageUrls).toHaveLength(3);
  });
});

test.describe('Configuration Edge Cases', () => {
  test('should handle empty configuration', () => {
    const config = PlaywrightCoverageConfig.basic({});
    expect(config).toBeDefined();
    expect(config.threshold).toBe(80); // Should use default
  });

  test('should handle null and undefined values', () => {
    const config = PlaywrightCoverageConfig.merge(
      { threshold: undefined },
      { outputPath: null as any },
      { verbose: true }
    );

    expect(config.verbose).toBe(true);
    // The merge should handle null/undefined gracefully - check it doesn't crash
    expect(config).toBeDefined();
    // undefined gets overridden, null gets overridden by merge - check the final value is the default
    expect(config.threshold).toBe(80); // Default from basic()
    expect(config.outputPath).toBe('./coverage-report'); // Default from basic()
  });

  test('should handle partial environment configuration', () => {
    const originalEnv = process.env;

    process.env = {
      ...originalEnv,
      PLAYWRIGHT_COVERAGE_THRESHOLD: '75'
      // Other env vars not set
    };

    try {
      const config = PlaywrightCoverageConfig.withEnvironment({
        format: 'html'
      });

      expect(config.threshold).toBe(75); // From environment
      expect(config.format).toBe('html'); // From base config
      expect(config.verbose).toBe(false); // Default value

    } finally {
      process.env = originalEnv;
    }
  });

  test('should handle invalid environment values gracefully', () => {
    const originalEnv = process.env;

    process.env = {
      ...originalEnv,
      PLAYWRIGHT_COVERAGE_THRESHOLD: 'invalid-number',
      PLAYWRIGHT_COVERAGE_VERBOSE: 'not-boolean'
    };

    try {
      const config = PlaywrightCoverageConfig.fromEnvironment();

      // Should handle invalid values gracefully or not include them
      expect(config).toBeDefined();

    } finally {
      process.env = originalEnv;
    }
  });
});