/**
 * Unit Tests for ConfigValidator Utility
 *
 * These tests verify the core functionality of the configuration validation system,
 * including validation rules, error reporting, recommendations, and debug information.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigValidator, ValidationError, ValidationResult, ConfigDebugInfo } from '../../src/utils/config-validator';
import { CoverageReporterOptions } from '../../src/reporter/coverage-reporter';

describe('ConfigValidator', () => {
  // Store original environment
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };

    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Validation Output Path', () => {
    test('should accept valid output path', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.summary).toBe('✅ Configuration is valid');
    });

    test('should error when outputPath is missing', () => {
      const config: CoverageReporterOptions = {
        format: 'console'
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('outputPath');
      expect(result.errors[0].message).toBe('Output path is required');
      expect(result.errors[0].severity).toBe('error');
      expect(result.errors[0].suggestion).toBe('Set outputPath to "./coverage-report" or your preferred directory');
    });

    test('should error when outputPath is not a string', () => {
      const config: CoverageReporterOptions = {
        outputPath: 123 as any,
        format: 'console'
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('outputPath');
      expect(result.errors[0].message).toBe('Output path must be a string');
    });

    test('should warn when outputPath contains spaces', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage report',
        format: 'console',
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('outputPath');
      expect(result.warnings[0].message).toContain('contains spaces');
    });

    test('should warn when outputPath is outside project directory', () => {
      const config: CoverageReporterOptions = {
        outputPath: '../outside-coverage',
        format: 'console',
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('outputPath');
      expect(result.warnings[0].message).toContain('outside the project directory');
    });
  });

  describe('Validation Format', () => {
    test('should accept valid formats', () => {
      const validFormats = ['console', 'json', 'html', 'lcov', 'istanbul', 'all'];

      validFormats.forEach(format => {
        const config: CoverageReporterOptions = {
          outputPath: './coverage-report',
          format: format as any
        };

        const result = ConfigValidator.validate(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should error when format is missing', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report'
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('format');
      expect(result.errors[0].message).toBe('Format is required');
      expect(result.errors[0].suggestion).toContain('console, json, html, lcov, istanbul, all');
    });

    test('should error for invalid format', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'invalid' as any
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('format');
      expect(result.errors[0].message).toBe('Invalid format: invalid');
    });

    test('should warn when using "all" format with verbose mode', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'all',
        verbose: true,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('format');
      expect(result.warnings[0].message).toContain('excessive output');
    });
  });

  describe('Validation Threshold', () => {
    test('should accept valid threshold', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should warn when threshold is not specified', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console'
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('threshold');
      expect(result.warnings[0].message).toBe('No threshold specified, using default');
      expect(result.warnings[0].suggestion).toContain('80%');
    });

    test('should error when threshold is not a number', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: '80' as any
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('threshold');
      expect(result.errors[0].message).toBe('Threshold must be a number');
    });

    test('should error when threshold is out of range', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 150
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('threshold');
      expect(result.errors[0].message).toBe('Threshold must be between 0 and 100');
    });

    test('should warn for very high threshold', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 98
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('threshold');
      expect(result.warnings[0].message).toContain('Very high threshold');
      expect(result.warnings[0].suggestion).toContain('80-90%');
    });

    test('should warn for very low threshold', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 30
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('threshold');
      expect(result.warnings[0].message).toContain('Very low threshold');
      expect(result.warnings[0].suggestion).toContain('70-80%');
    });
  });

  describe('Validation Boolean Options', () => {
    test('should accept valid boolean options', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        verbose: true,
        elementDiscovery: false,
        runtimeDiscovery: true,
        captureScreenshots: false
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should error when boolean options are not boolean', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        verbose: 'true' as any
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('verbose');
      expect(result.errors[0].message).toBe('verbose must be a boolean (true or false)');
    });

    test('should warn when runtimeDiscovery is enabled but elementDiscovery is disabled', () => {
      // Clear CI environment to avoid extra warnings for this test
      delete process.env.CI;

      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        elementDiscovery: false,
        runtimeDiscovery: true,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('runtimeDiscovery');
      expect(result.warnings[0].message).toContain('element discovery is disabled');
    });

    test('should warn when screenshots are enabled but format is console only', () => {
      // Clear CI environment to avoid extra warnings for this test
      delete process.env.CI;

      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        captureScreenshots: true,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('captureScreenshots');
      expect(result.warnings[0].message).toContain('format is console only');
    });
  });

  describe('Validation Page URLs', () => {
    test('should accept valid page URLs', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: ['http://localhost:3000', 'https://example.com'],
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should handle null pageUrls gracefully', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: null as any,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should warn when pageUrls is empty', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: [],
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('pageUrls');
      expect(result.warnings[0].message).toBe('pageUrls is empty');
    });

    test('should error when pageUrls is not an array', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: 'http://localhost:3000' as any
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('pageUrls');
      expect(result.errors[0].message).toBe('pageUrls must be an array');
    });

    test('should error for invalid URL format', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: ['not-a-url', 'http://localhost:3000']
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('pageUrls[0]');
      expect(result.errors[0].message).toBe('Invalid URL format: not-a-url');
    });

    test('should error for empty URL', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: ['', 'http://localhost:3000']
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('pageUrls[0]');
      expect(result.errors[0].message).toBe('Empty URL found');
    });

    test('should warn for duplicate URLs', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: ['http://localhost:3000', 'http://localhost:3000'],
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('pageUrls');
      expect(result.warnings[0].message).toBe('Duplicate URLs found in pageUrls array');
    });
  });

  describe('Validation Combinations', () => {
    test('should warn about HTML format in CI', () => {
      process.env.CI = 'true';
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'html',
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('format');
      expect(result.warnings[0].message).toContain('HTML format in CI');
    });

    test('should warn about screenshots in CI', () => {
      process.env.CI = 'true';
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        captureScreenshots: true,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      // Should have 2 warnings: one for CI screenshots, one for format=console with screenshots
      expect(result.warnings).toHaveLength(2);

      const screenshotWarnings = result.warnings.filter(w => w.field === 'captureScreenshots');
      expect(screenshotWarnings).toHaveLength(2);
      // One warning should mention CI
      const ciWarning = screenshotWarnings.find(w => w.message.includes('CI'));
      expect(ciWarning).toBeDefined();
      expect(ciWarning?.message).toContain('Screenshots in CI');

      // The other warning should mention console format
      const consoleWarning = screenshotWarnings.find(w => w.message.includes('console only'));
      expect(consoleWarning).toBeDefined();
    });

    test('should warn about runtime discovery in CI', () => {
      process.env.CI = 'true';
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        runtimeDiscovery: true,
        threshold: 80,
        elementDiscovery: true
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('runtimeDiscovery');
      expect(result.warnings[0].message).toContain('Runtime discovery can be unreliable');
    });

    test('should warn about large number of URLs', () => {
      const manyUrls = Array.from({ length: 15 }, (_, i) => `http://localhost:300${i}`);
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: manyUrls,
        threshold: 80
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('pageUrls');
      expect(result.warnings[0].message).toContain('Large number of URLs');
    });
  });

  describe('Debug Information Generation', () => {
    test('should generate comprehensive debug information', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'json',
        threshold: 85,
        verbose: true,
        elementDiscovery: true,
        pageUrls: ['http://localhost:3000']
      };

      const debugInfo = ConfigValidator.generateDebugInfo(config);

      expect(debugInfo.config).toEqual(config);
      expect(debugInfo.environment).toBeDefined();
      expect(debugInfo.environment.nodeVersion).toBeDefined();
      expect(debugInfo.environment.playwrightVersion).toBeDefined();
      expect(debugInfo.environment.platform).toBeDefined();
      expect(debugInfo.validation).toBeDefined();
      expect(debugInfo.recommendations).toBeDefined();
      expect(Array.isArray(debugInfo.recommendations)).toBe(true);
    });

    test('should include validation results in debug info', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'invalid' as any
      };

      const debugInfo = ConfigValidator.generateDebugInfo(config);

      expect(debugInfo.validation.valid).toBe(false);
      expect(debugInfo.validation.errors).toHaveLength(1);
      expect(debugInfo.validation.errors[0].field).toBe('format');
    });

    test('should provide relevant recommendations', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 60,
        verbose: false,
        elementDiscovery: false,
        pageUrls: ['http://localhost:3000']
      };

      const debugInfo = ConfigValidator.generateDebugInfo(config);

      expect(debugInfo.recommendations).toContain(
        'Consider setting a higher coverage threshold (70-80%)'
      );
      expect(debugInfo.recommendations).toContain(
        'Enable runtimeDiscovery for more accurate coverage tracking'
      );
      expect(debugInfo.recommendations).toContain(
        'Consider adding HTML format for visual coverage reports'
      );
    });
  });

  describe('Console Output Methods', () => {
    test('should print validation results', () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();
      const validation: ValidationResult = {
        valid: false,
        errors: [
          {
            field: 'format',
            message: 'Invalid format',
            severity: 'error',
            suggestion: 'Use a valid format'
          }
        ],
        warnings: [
          {
            field: 'threshold',
            message: 'Very low threshold',
            severity: 'warning',
            suggestion: 'Use a higher threshold'
          }
        ],
        summary: '❌ Configuration has 1 error(s) and 1 warning(s)'
      };

      ConfigValidator.printValidationResults(validation);

      expect(mockLog).toHaveBeenCalledWith('\n🔍 Configuration Validation Results');
      expect(mockLog).toHaveBeenCalledWith('═══════════════════════════════════════════════════');
      expect(mockLog).toHaveBeenCalledWith(`Status: ${validation.summary}\n`);
      expect(mockLog).toHaveBeenCalledWith('❌ Errors:');
      expect(mockLog).toHaveBeenCalledWith('  • format: Invalid format');
      expect(mockLog).toHaveBeenCalledWith('    💡 Use a valid format');
      expect(mockLog).toHaveBeenCalledWith('');
      expect(mockLog).toHaveBeenCalledWith('⚠️ Warnings:');
      expect(mockLog).toHaveBeenCalledWith('  • threshold: Very low threshold');
      expect(mockLog).toHaveBeenCalledWith('    💡 Use a higher threshold');
      expect(mockLog).toHaveBeenCalledWith('');
    });

    test('should print debug information', () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation();
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'json',
        threshold: 80
      };

      const debugInfo = ConfigValidator.generateDebugInfo(config);
      ConfigValidator.printDebugInfo(debugInfo);

      expect(mockLog).toHaveBeenCalledWith('\n🐛 Debug Information');
      expect(mockLog).toHaveBeenCalledWith('═══════════════════════════════════════════════════');
      expect(mockLog).toHaveBeenCalledWith('📊 Environment:');
      expect(mockLog).toHaveBeenCalledWith('\n⚙️ Configuration:');
      expect(mockLog).toHaveBeenCalledWith('\n✅ Validation:');
      expect(mockLog).toHaveBeenCalledWith('💡 Recommendations:');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty configuration gracefully', () => {
      const config: CoverageReporterOptions = {};

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('outputPath');
    });

    test('should handle configuration with unknown properties', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 80,
        unknownProperty: 'value' as any
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should handle threshold values at boundaries', () => {
      const edgeCases = [
        { threshold: 0 },
        { threshold: 100 },
        { threshold: 1 },
        { threshold: 99 }
      ];

      edgeCases.forEach(({ threshold }) => {
        const config: CoverageReporterOptions = {
          outputPath: './coverage-report',
          format: 'console',
          threshold
        };

        const result = ConfigValidator.validate(config);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should handle pageUrls with trailing spaces', () => {
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: ['http://localhost:3000  ', '  https://example.com  ']
      };

      const result = ConfigValidator.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe('pageUrls[0]');
      expect(result.errors[1].field).toBe('pageUrls[1]');
    });
  });

  describe('Summary Generation', () => {
    test('should generate success summary', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        summary: ''
      };

      // Access private method through reflection for testing
      const configValidator = ConfigValidator as any;
      const summary = configValidator.generateSummary(result.valid, result.errors, result.warnings);

      expect(summary).toBe('✅ Configuration is valid');
    });

    test('should generate warning summary', () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [
          {
            field: 'threshold',
            message: 'Low threshold',
            severity: 'warning',
            suggestion: 'Increase threshold'
          }
        ],
        summary: ''
      };

      const configValidator = ConfigValidator as any;
      const summary = configValidator.generateSummary(result.valid, result.errors, result.warnings);

      expect(summary).toBe('⚠️ Configuration is valid but has 1 warning(s)');
    });

    test('should generate error summary', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            field: 'format',
            message: 'Invalid format',
            severity: 'error',
            suggestion: 'Use valid format'
          }
        ],
        warnings: [],
        summary: ''
      };

      const configValidator = ConfigValidator as any;
      const summary = configValidator.generateSummary(result.valid, result.errors, result.warnings);

      expect(summary).toBe('❌ Configuration has 1 error(s)');
    });

    test('should generate error and warning summary', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [
          {
            field: 'format',
            message: 'Invalid format',
            severity: 'error',
            suggestion: 'Use valid format'
          }
        ],
        warnings: [
          {
            field: 'threshold',
            message: 'Low threshold',
            severity: 'warning',
            suggestion: 'Increase threshold'
          }
        ],
        summary: ''
      };

      const configValidator = ConfigValidator as any;
      const summary = configValidator.generateSummary(result.valid, result.errors, result.warnings);

      expect(summary).toBe('❌ Configuration has 1 error(s) and 1 warning(s)');
    });
  });

  describe('Performance and Scaling', () => {
    test('should handle large pageUrl arrays efficiently', () => {
      // Use valid URLs by using different paths instead of invalid ports
      const largePageUrls = Array.from({ length: 1000 }, (_, i) => `http://localhost:3000/page${i}`);
      const config: CoverageReporterOptions = {
        outputPath: './coverage-report',
        format: 'console',
        pageUrls: largePageUrls,
        threshold: 80
      };

      const startTime = Date.now();
      const result = ConfigValidator.validate(config);
      const endTime = Date.now();

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1); // Warning about large number of URLs
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should validate configuration quickly for typical use cases', () => {
      const typicalConfigs = [
        {
          outputPath: './coverage-report',
          format: 'json',
          threshold: 80
        },
        {
          outputPath: './coverage-report',
          format: 'html',
          threshold: 70,
          verbose: true
        },
        {
          outputPath: './coverage-report',
          format: 'all',
          threshold: 90,
          elementDiscovery: true,
          runtimeDiscovery: true
        }
      ];

      typicalConfigs.forEach(config => {
        const startTime = Date.now();
        const result = ConfigValidator.validate(config);
        const endTime = Date.now();

        expect(result.valid).toBe(true);
        expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      });
    });
  });
});