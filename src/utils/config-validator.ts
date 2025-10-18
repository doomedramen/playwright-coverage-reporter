import { CoverageReporterOptions } from '../reporter/coverage-reporter';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: string;
}

export interface ConfigDebugInfo {
  config: CoverageReporterOptions;
  environment: {
    nodeVersion: string;
    playwrightVersion: string;
    platform: string;
    envVars: Record<string, string>;
  };
  validation: ValidationResult;
  recommendations: string[];
}

/**
 * Comprehensive configuration validator with detailed error reporting
 */
export class ConfigValidator {
  private static readonly VALID_FORMATS = ['console', 'json', 'html', 'lcov', 'istanbul', 'all'];
  private static readonly DEFAULT_THRESHOLD = 80;
  private static readonly MAX_THRESHOLD = 100;
  private static readonly MIN_THRESHOLD = 0;

  /**
   * Validate configuration with detailed error reporting
   */
  static validate(config: CoverageReporterOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate outputPath
    this.validateOutputPath(config, errors, warnings);

    // Validate format
    this.validateFormat(config, errors, warnings);

    // Validate threshold
    this.validateThreshold(config, errors, warnings);

    // Validate boolean options
    this.validateBooleanOptions(config, errors, warnings);

    // Validate pageUrls
    this.validatePageUrls(config, errors, warnings);

    // Validate combinations
    this.validateCombinations(config, errors, warnings);

    const valid = errors.length === 0;
    const summary = this.generateSummary(valid, errors, warnings);

    return {
      valid,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Validate outputPath
   */
  private static validateOutputPath(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!config.outputPath) {
      errors.push({
        field: 'outputPath',
        message: 'Output path is required',
        severity: 'error',
        suggestion: 'Set outputPath to "./coverage-report" or your preferred directory'
      });
      return;
    }

    if (typeof config.outputPath !== 'string') {
      errors.push({
        field: 'outputPath',
        message: 'Output path must be a string',
        severity: 'error',
        suggestion: 'Use a string value like "./coverage-report"'
      });
      return;
    }

    if (config.outputPath.includes(' ')) {
      warnings.push({
        field: 'outputPath',
        message: 'Output path contains spaces, which may cause issues on some systems',
        severity: 'warning',
        suggestion: 'Consider using hyphens or underscores instead of spaces'
      });
    }

    if (config.outputPath.startsWith('../')) {
      warnings.push({
        field: 'outputPath',
        message: 'Output path is outside the project directory',
        severity: 'warning',
        suggestion: 'Consider using a path within the project directory'
      });
    }
  }

  /**
   * Validate format
   */
  private static validateFormat(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!config.format) {
      errors.push({
        field: 'format',
        message: 'Format is required',
        severity: 'error',
        suggestion: `Use one of: ${this.VALID_FORMATS.join(', ')}`
      });
      return;
    }

    if (!this.VALID_FORMATS.includes(config.format)) {
      errors.push({
        field: 'format',
        message: `Invalid format: ${config.format}`,
        severity: 'error',
        suggestion: `Use one of: ${this.VALID_FORMATS.join(', ')}`
      });
    }

    if (config.format === 'all' && config.verbose) {
      warnings.push({
        field: 'format',
        message: 'Using format "all" with verbose mode may generate excessive output',
        severity: 'warning',
        suggestion: 'Consider using specific formats or disable verbose mode'
      });
    }
  }

  /**
   * Validate threshold
   */
  private static validateThreshold(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (config.threshold === undefined || config.threshold === null) {
      warnings.push({
        field: 'threshold',
        message: 'No threshold specified, using default',
        severity: 'warning',
        suggestion: `Consider setting an explicit threshold (recommended: ${this.DEFAULT_THRESHOLD}%)`
      });
      return;
    }

    if (typeof config.threshold !== 'number') {
      errors.push({
        field: 'threshold',
        message: 'Threshold must be a number',
        severity: 'error',
        suggestion: 'Use a number between 0 and 100'
      });
      return;
    }

    if (config.threshold < this.MIN_THRESHOLD || config.threshold > this.MAX_THRESHOLD) {
      errors.push({
        field: 'threshold',
        message: `Threshold must be between ${this.MIN_THRESHOLD} and ${this.MAX_THRESHOLD}`,
        severity: 'error',
        suggestion: 'Use a percentage between 0 and 100'
      });
      return;
    }

    if (config.threshold > 95) {
      warnings.push({
        field: 'threshold',
        message: 'Very high threshold may be difficult to maintain',
        severity: 'warning',
        suggestion: 'Consider a more achievable threshold like 80-90%'
      });
    }

    if (config.threshold < 50) {
      warnings.push({
        field: 'threshold',
        message: 'Very low threshold may not provide meaningful coverage goals',
        severity: 'warning',
        suggestion: 'Consider a higher threshold like 70-80%'
      });
    }
  }

  /**
   * Validate boolean options
   */
  private static validateBooleanOptions(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const booleanOptions = [
      'verbose',
      'elementDiscovery',
      'runtimeDiscovery',
      'captureScreenshots'
    ];

    booleanOptions.forEach(option => {
      if (config[option as keyof CoverageReporterOptions] !== undefined &&
          typeof config[option as keyof CoverageReporterOptions] !== 'boolean') {
        errors.push({
          field: option,
          message: `${option} must be a boolean (true or false)`,
          severity: 'error',
          suggestion: `Use ${option}: true or ${option}: false`
        });
      }
    });

    // Check for potentially problematic combinations
    if (config.runtimeDiscovery && !config.elementDiscovery) {
      warnings.push({
        field: 'runtimeDiscovery',
        message: 'Runtime discovery is enabled but element discovery is disabled',
        severity: 'warning',
        suggestion: 'Enable elementDiscovery for better results with runtime discovery'
      });
    }

    if (config.captureScreenshots && config.format === 'console') {
      warnings.push({
        field: 'captureScreenshots',
        message: 'Screenshots are enabled but format is console only',
        severity: 'warning',
        suggestion: 'Add html or json format to see screenshots'
      });
    }
  }

  /**
   * Validate pageUrls
   */
  private static validatePageUrls(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    if (!config.pageUrls) {
      return;
    }

    if (!Array.isArray(config.pageUrls)) {
      errors.push({
        field: 'pageUrls',
        message: 'pageUrls must be an array',
        severity: 'error',
        suggestion: 'Use pageUrls: ["http://localhost:3000", "https://example.com"]'
      });
      return;
    }

    if (config.pageUrls.length === 0) {
      warnings.push({
        field: 'pageUrls',
        message: 'pageUrls is empty',
        severity: 'warning',
        suggestion: 'Add URLs to analyze or remove the pageUrls option'
      });
      return;
    }

    config.pageUrls.forEach((url, index) => {
      if (typeof url !== 'string') {
        errors.push({
          field: `pageUrls[${index}]`,
          message: 'Each URL must be a string',
          severity: 'error',
          suggestion: 'Ensure all URLs are valid string values'
        });
        return;
      }

      if (!url.trim()) {
        errors.push({
          field: `pageUrls[${index}]`,
          message: 'Empty URL found',
          severity: 'error',
          suggestion: 'Remove empty URLs or provide valid URLs'
        });
        return;
      }

      // Check for trailing spaces
      if (url !== url.trim()) {
        errors.push({
          field: `pageUrls[${index}]`,
          message: 'URL contains leading or trailing spaces',
          severity: 'error',
          suggestion: 'Remove spaces from URL'
        });
        return;
      }

      try {
        new URL(url);
      } catch {
        errors.push({
          field: `pageUrls[${index}]`,
          message: `Invalid URL format: ${url}`,
          severity: 'error',
          suggestion: 'Use valid URLs like "http://localhost:3000" or "https://example.com"'
        });
      }
    });

    // Check for duplicate URLs
    const uniqueUrls = new Set(config.pageUrls);
    if (uniqueUrls.size !== config.pageUrls.length) {
      warnings.push({
        field: 'pageUrls',
        message: 'Duplicate URLs found in pageUrls array',
        severity: 'warning',
        suggestion: 'Remove duplicate URLs'
      });
    }
  }

  /**
   * Validate option combinations
   */
  private static validateCombinations(
    config: CoverageReporterOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    // CI-specific validations
    const isCI = process.env.CI === 'true';
    if (isCI) {
      if (config.format === 'html' && !config.verbose) {
        warnings.push({
          field: 'format',
          message: 'HTML format in CI may not be useful',
          severity: 'warning',
          suggestion: 'Consider using JSON or LCOV format for CI/CD integration'
        });
      }

      if (config.captureScreenshots) {
        let message = 'Screenshots in CI may consume significant storage';
        let suggestion = 'Disable screenshots in CI or ensure cleanup';

        if (config.format === 'console') {
          message = 'Screenshots in CI may consume significant storage and format is console only';
          suggestion = 'Disable screenshots in CI or add html/json format to see screenshots';
        }

        warnings.push({
          field: 'captureScreenshots',
          message,
          severity: 'warning',
          suggestion
        });
      }

      if (config.runtimeDiscovery) {
        warnings.push({
          field: 'runtimeDiscovery',
          message: 'Runtime discovery can be unreliable in CI environments',
          severity: 'warning',
          suggestion: 'Consider disabling runtimeDiscovery in CI'
        });
      }
    }

    // Performance considerations
    if (config.pageUrls && config.pageUrls.length > 10) {
      warnings.push({
        field: 'pageUrls',
        message: 'Large number of URLs may impact performance',
        severity: 'warning',
        suggestion: 'Consider testing critical pages or using pagination'
      });
    }
  }

  /**
   * Generate validation summary
   */
  private static generateSummary(
    valid: boolean,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): string {
    if (valid && warnings.length === 0) {
      return '✅ Configuration is valid';
    }

    if (valid) {
      return `⚠️ Configuration is valid but has ${warnings.length} warning(s)`;
    }

    return `❌ Configuration has ${errors.length} error(s)${warnings.length > 0 ? ` and ${warnings.length} warning(s)` : ''}`;
  }

  /**
   * Generate comprehensive debug information
   */
  static generateDebugInfo(config: CoverageReporterOptions): ConfigDebugInfo {
    const validation = this.validate(config);
    const recommendations = this.generateRecommendations(config, validation);

    return {
      config,
      environment: {
        nodeVersion: process.version,
        playwrightVersion: this.getPlaywrightVersion(),
        platform: process.platform,
        envVars: this.getRelevantEnvVars()
      },
      validation,
      recommendations
    };
  }

  /**
   * Generate recommendations based on configuration and validation
   */
  private static generateRecommendations(
    config: CoverageReporterOptions,
    validation: ValidationResult
  ): string[] {
    const recommendations: string[] = [];

    // Format recommendations
    if (config.format === 'console') {
      recommendations.push('Consider adding HTML format for visual coverage reports');
    }

    if (!config.format.includes('json') && process.env.CI === 'true') {
      recommendations.push('Add JSON format for better CI/CD integration');
    }

    // Performance recommendations
    if (!config.runtimeDiscovery && config.pageUrls && config.pageUrls.length > 0) {
      recommendations.push('Enable runtimeDiscovery for more accurate coverage tracking');
    }

    // Threshold recommendations
    if (!config.threshold || config.threshold < 70) {
      recommendations.push('Consider setting a higher coverage threshold (70-80%)');
    }

    // Development vs CI recommendations
    if (process.env.NODE_ENV === 'development') {
      if (!config.verbose) {
        recommendations.push('Enable verbose mode during development for better insights');
      }
      if (!config.captureScreenshots) {
        recommendations.push('Enable screenshots during development for debugging');
      }
    }

    // Best practice recommendations
    if (!config.pageUrls || config.pageUrls.length === 0) {
      recommendations.push('Specify pageUrls to analyze specific pages for better coverage accuracy');
    }

    return recommendations;
  }

  /**
   * Get Playwright version
   */
  private static getPlaywrightVersion(): string {
    try {
      const packageJson = require('../../../package.json');
      const playwrightVersion = packageJson.dependencies?.['@playwright/test'] ||
                               packageJson.devDependencies?.['@playwright/test'];
      return playwrightVersion || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get relevant environment variables
   */
  private static getRelevantEnvVars(): Record<string, string> {
    const relevantVars = [
      'CI',
      'NODE_ENV',
      'PLAYWRIGHT_COVERAGE_OUTPUT',
      'PLAYWRIGHT_COVERAGE_FORMAT',
      'PLAYWRIGHT_COVERAGE_THRESHOLD',
      'PLAYWRIGHT_COVERAGE_VERBOSE'
    ];

    const result: Record<string, string> = {};
    relevantVars.forEach(varName => {
      const value = process.env[varName];
      if (value !== undefined) {
        result[varName] = value;
      }
    });

    return result;
  }

  /**
   * Print validation results to console
   */
  static printValidationResults(validation: ValidationResult): void {
    console.log('\n🔍 Configuration Validation Results');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Status: ${validation.summary}\n`);

    if (validation.errors.length > 0) {
      console.log('❌ Errors:');
      validation.errors.forEach(error => {
        console.log(`  • ${error.field}: ${error.message}`);
        if (error.suggestion) {
          console.log(`    💡 ${error.suggestion}`);
        }
      });
      console.log('');
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      validation.warnings.forEach(warning => {
        console.log(`  • ${warning.field}: ${warning.message}`);
        if (warning.suggestion) {
          console.log(`    💡 ${warning.suggestion}`);
        }
      });
      console.log('');
    }
  }

  /**
   * Print debug information
   */
  static printDebugInfo(debugInfo: ConfigDebugInfo): void {
    console.log('\n🐛 Debug Information');
    console.log('═══════════════════════════════════════════════════');

    console.log('📊 Environment:');
    console.log(`  Node.js: ${debugInfo.environment.nodeVersion}`);
    console.log(`  Playwright: ${debugInfo.environment.playwrightVersion}`);
    console.log(`  Platform: ${debugInfo.environment.platform}`);

    if (Object.keys(debugInfo.environment.envVars).length > 0) {
      console.log('  Environment Variables:');
      Object.entries(debugInfo.environment.envVars).forEach(([key, value]) => {
        console.log(`    ${key}=${value}`);
      });
    }

    console.log('\n⚙️ Configuration:');
    console.log(JSON.stringify(debugInfo.config, null, 2));

    console.log('\n✅ Validation:');
    this.printValidationResults(debugInfo.validation);

    if (debugInfo.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      debugInfo.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
      console.log('');
    }
  }
}