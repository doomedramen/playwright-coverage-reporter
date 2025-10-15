/**
 * Comprehensive error handling and user guidance system
 */

export interface ErrorContext {
  operation: string;
  config?: any;
  testFile?: string;
  element?: any;
  stack?: string;
  timestamp: Date;
}

export interface UserGuidance {
  title: string;
  description: string;
  steps: string[];
  commonCauses: string[];
  additionalResources?: string[];
}

export interface CoverageError extends Error {
  code: string;
  context?: ErrorContext;
  guidance?: UserGuidance;
  recoverable: boolean;
  getConsoleOutput(): string;
}

/**
 * Error types with specific guidance
 */
export enum ErrorCodes {
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_OUTPUT_PATH = 'INVALID_OUTPUT_PATH',

  // Page/Element errors
  PAGE_LOAD_FAILED = 'PAGE_LOAD_FAILED',
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  SELECTOR_INVALID = 'SELECTOR_INVALID',

  // Coverage calculation errors
  COVERAGE_CALCULATION_FAILED = 'COVERAGE_CALCULATION_FAILED',
  AGGREGATION_FAILED = 'AGGREGATION_FAILED',

  // File system errors
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  FILE_READ_FAILED = 'FILE_READ_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Performance errors
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',

  // Test runner errors
  TEST_FAILURE = 'TEST_FAILURE',
  RUNTIME_ERROR = 'RUNTIME_ERROR'
}

/**
 * User guidance definitions for different error types
 */
const ERROR_GUIDANCE: Record<string, UserGuidance> = {
  [ErrorCodes.INVALID_CONFIG]: {
    title: 'Configuration Error',
    description: 'There\'s an issue with your Playwright coverage configuration.',
    steps: [
      'Check your playwright.config.ts file',
      'Verify all required options are present',
      'Ensure option values are of correct type',
      'Run `npx playwright-coverage validate-reporter` for detailed validation'
    ],
    commonCauses: [
      'Missing required configuration options',
      'Invalid option values (wrong type, out of range)',
      'Syntax errors in configuration object'
    ],
    additionalResources: [
      'Configuration documentation: https://github.com/DoomedRamen/playwright-coverage-reporter#configuration'
    ]
  },

  [ErrorCodes.PAGE_LOAD_FAILED]: {
    title: 'Page Load Failed',
    description: 'Unable to load the specified page for coverage analysis.',
    steps: [
      'Verify the URL is correct and accessible',
      'Check if the web server is running',
      'Ensure network connectivity',
      'Try accessing the URL manually in a browser',
      'Check if authentication is required'
    ],
    commonCauses: [
      'Incorrect URL or typo',
      'Web server not running',
      'Network connectivity issues',
      'Authentication required',
      'Page loads too slowly (timeout)'
    ]
  },

  [ErrorCodes.ELEMENT_NOT_FOUND]: {
    title: 'Element Not Found',
    description: 'Unable to locate elements on the page for coverage analysis.',
    steps: [
      'Wait for page to fully load',
      'Check if elements are dynamically loaded',
      'Verify selectors are correct',
      'Increase timeout if page loads slowly',
      'Check if elements are inside iframes'
    ],
    commonCauses: [
      'Page still loading',
      'Elements loaded dynamically with JavaScript',
      'Incorrect selectors',
      'Elements inside iframes or shadow DOM',
      'Page has no interactive elements'
    ]
  },

  [ErrorCodes.COVERAGE_CALCULATION_FAILED]: {
    title: 'Coverage Calculation Failed',
    description: 'Unable to calculate coverage from test data.',
    steps: [
      'Check test files for syntax errors',
      'Verify tests are running successfully',
      'Ensure tests actually interact with page elements',
      'Check for duplicate or conflicting selectors',
      'Review test logs for additional errors'
    ],
    commonCauses: [
      'Tests not interacting with elements',
      'Syntax errors in test files',
      'Conflicting selectors',
      'Empty test files',
      'Tests failing before completion'
    ]
  },

  [ErrorCodes.FILE_WRITE_FAILED]: {
    title: 'File Write Failed',
    description: 'Unable to write coverage report files.',
    steps: [
      'Check output directory permissions',
      'Ensure output directory exists',
      'Verify disk space is available',
      'Check if files are locked by other processes',
      'Try using a different output directory'
    ],
    commonCauses: [
      'Insufficient permissions',
      'Directory doesn\'t exist',
      'Disk full',
      'Files locked by antivirus',
      'Network drive issues'
    ]
  },

  [ErrorCodes.TIMEOUT_EXCEEDED]: {
    title: 'Operation Timeout',
    description: 'Coverage analysis took too long to complete.',
    steps: [
      'Reduce number of pages to analyze',
      'Disable runtime discovery if enabled',
      'Increase timeout configuration',
      'Optimize page performance',
      'Split analysis into smaller batches'
    ],
    commonCauses: [
      'Too many pages to analyze',
      'Slow-loading pages',
      'Complex JavaScript applications',
      'Network latency',
      'Insufficient system resources'
    ]
  },

  [ErrorCodes.MEMORY_LIMIT_EXCEEDED]: {
    title: 'Memory Limit Exceeded',
    description: 'Coverage analysis consumed too much memory.',
    steps: [
      'Reduce number of concurrent pages',
      'Disable verbose logging',
      'Analyze pages in smaller batches',
      'Close other applications',
      'Increase system memory if possible'
    ],
    commonCauses: [
      'Too many pages loaded simultaneously',
      'Large DOM trees',
      'Memory leaks in page JavaScript',
      'Insufficient system memory',
      'Very large test suites'
    ]
  }
};

/**
 * Enhanced error class with user guidance
 */
export class CoverageAnalysisError extends Error implements CoverageError {
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly guidance?: UserGuidance;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    context?: ErrorContext,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'CoverageAnalysisError';
    this.code = code;
    this.context = context;
    this.guidance = ERROR_GUIDANCE[code];
    this.recoverable = recoverable;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CoverageAnalysisError);
    }
  }

  /**
   * Format error for console output with guidance
   */
  getConsoleOutput(): string {
    let output = `\n❌ ${this.code}: ${this.message}\n`;

    if (this.context) {
      output += `📍 Context: ${this.context.operation}`;
      if (this.context.testFile) {
        output += ` in ${this.context.testFile}`;
      }
      output += '\n';
    }

    if (this.guidance) {
      output += `\n💡 ${this.guidance.title}\n`;
      output += `${this.guidance.description}\n\n`;

      output += '🔧 Steps to resolve:\n';
      this.guidance.steps.forEach((step, index) => {
        output += `  ${index + 1}. ${step}\n`;
      });

      if (this.guidance.commonCauses.length > 0) {
        output += '\n🔍 Common causes:\n';
        this.guidance.commonCauses.forEach(cause => {
          output += `  • ${cause}\n`;
        });
      }

      if (this.guidance.additionalResources) {
        output += '\n📚 Additional resources:\n';
        this.guidance.additionalResources.forEach(resource => {
          output += `  • ${resource}\n`;
        });
      }
    }

    if (this.recoverable) {
      output += '\n✅ This error is recoverable. Fix the issue and try again.\n';
    } else {
      output += '\n⚠️ This error may require restarting your test suite.\n';
    }

    return output;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): any {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      guidance: this.guidance,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Error handler utility class
 */
export class ErrorHandler {
  private static errors: CoverageError[] = [];
  private static maxErrors = 50; // Limit error history

  /**
   * Handle and log errors with user guidance
   */
  static handleError(error: Error | CoverageError, context?: ErrorContext): CoverageError {
    let coverageError: CoverageError;

    if (error instanceof CoverageAnalysisError) {
      coverageError = error;
    } else {
      // Convert regular Error to CoverageError
      coverageError = new CoverageAnalysisError(
        ErrorCodes.RUNTIME_ERROR,
        error.message,
        context,
        true
      );
      coverageError.stack = error.stack;
    }

    // Add to error history
    this.errors.push(coverageError);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log error with guidance
    console.error(coverageError.getConsoleOutput());

    return coverageError;
  }

  /**
   * Create specific error types
   */
  static createInvalidConfigError(message: string, config?: any): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.INVALID_CONFIG,
      message,
      {
        operation: 'config_validation',
        config,
        timestamp: new Date()
      }
    );
  }

  static createPageLoadError(url: string, originalError?: Error): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.PAGE_LOAD_FAILED,
      `Failed to load page: ${url}`,
      {
        operation: 'page_load',
        element: { url },
        timestamp: new Date()
      }
    );
  }

  static createElementNotFoundError(selector: string, page?: string): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.ELEMENT_NOT_FOUND,
      `Element not found: ${selector}`,
      {
        operation: 'element_discovery',
        testFile: page,
        element: { selector },
        timestamp: new Date()
      }
    );
  }

  static createFileWriteError(path: string, originalError?: Error): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.FILE_WRITE_FAILED,
      `Failed to write file: ${path}`,
      {
        operation: 'file_write',
        element: { path },
        timestamp: new Date()
      }
    );
  }

  static createTimeoutError(operation: string, timeout: number): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.TIMEOUT_EXCEEDED,
      `Operation timed out: ${operation} (${timeout}ms)`,
      {
        operation,
        timestamp: new Date()
      }
    );
  }

  static createCoverageCalculationError(message: string, testFile?: string): CoverageError {
    return new CoverageAnalysisError(
      ErrorCodes.COVERAGE_CALCULATION_FAILED,
      message,
      {
        operation: 'coverage_calculation',
        testFile,
        timestamp: new Date()
      }
    );
  }

  /**
   * Get error history
   */
  static getErrorHistory(): CoverageError[] {
    return [...this.errors];
  }

  /**
   * Clear error history
   */
  static clearErrorHistory(): void {
    this.errors = [];
  }

  /**
   * Get error summary
   */
  static getErrorSummary(): { total: number; byCode: Record<string, number>; recent: CoverageError[] } {
    const byCode: Record<string, number> = {};

    this.errors.forEach(error => {
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCode,
      recent: this.errors.slice(-5)
    };
  }

  /**
   * Print error summary
   */
  static printErrorSummary(): void {
    const summary = this.getErrorSummary();

    if (summary.total === 0) {
      console.log('✅ No errors encountered');
      return;
    }

    console.log(`\n📊 Error Summary (${summary.total} total errors)`);
    console.log('═══════════════════════════════════════════════════');

    Object.entries(summary.byCode).forEach(([code, count]) => {
      const guidance = ERROR_GUIDANCE[code];
      const title = guidance?.title || code;
      console.log(`  ${title}: ${count}`);
    });

    if (summary.recent.length > 0) {
      console.log('\n🕐 Recent errors:');
      summary.recent.forEach(error => {
        console.log(`  • ${error.code}: ${error.message}`);
      });
    }

    console.log('');
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Partial<ErrorContext>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const errorContext: ErrorContext = {
        operation,
        timestamp: new Date(),
        ...context
      };

      const coverageError = this.handleError(error as Error, errorContext);

      if (!coverageError.recoverable) {
        throw coverageError;
      }

      throw error;
    }
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverable(error: Error): boolean {
    if (error instanceof CoverageAnalysisError) {
      return error.recoverable;
    }

    // Most network and timeout errors are recoverable
    if (error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('connection')) {
      return true;
    }

    // File permission errors might not be recoverable
    if (error.message.includes('permission denied') ||
        error.message.includes('access denied')) {
      return false;
    }

    return true;
  }

  /**
   * Get retry suggestion for error
   */
  static getRetrySuggestion(error: CoverageError): string | null {
    if (!error.recoverable) {
      return null;
    }

    switch (error.code) {
      case ErrorCodes.PAGE_LOAD_FAILED:
        return 'Retry after checking network connectivity and server status';

      case ErrorCodes.TIMEOUT_EXCEEDED:
        return 'Retry with increased timeout or reduce scope';

      case ErrorCodes.ELEMENT_NOT_FOUND:
        return 'Retry after waiting for page to fully load';

      case ErrorCodes.FILE_WRITE_FAILED:
        return 'Retry after checking permissions and disk space';

      default:
        return 'Retry after addressing the issue described above';
    }
  }
}