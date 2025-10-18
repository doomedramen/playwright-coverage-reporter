/**
 * Unit Tests for ErrorHandler Utility
 *
 * These tests verify the comprehensive error handling and user guidance system,
 * including error creation, management, console output formatting, and recovery logic.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorHandler,
  CoverageAnalysisError,
  ErrorCodes,
  ErrorContext,
  UserGuidance,
  CoverageError
} from '../../src/utils/error-handler';

describe('ErrorHandler', () => {
  let mockConsoleSpy: any;
  let originalEnv: any;

  beforeEach(() => {
    // Mock console to capture output
    mockConsoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Clear error history before each test
    ErrorHandler.clearErrorHistory();
  });

  afterEach(() => {
    mockConsoleSpy?.mockRestore();
    vi.restoreAllMocks();
  });

  describe('CoverageAnalysisError Construction', () => {
    test('should create error with required properties', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.INVALID_CONFIG,
        'Test error message',
        {
          operation: 'test_operation',
          timestamp: new Date()
        }
      );

      expect(error.name).toBe('CoverageAnalysisError');
      expect(error.code).toBe(ErrorCodes.INVALID_CONFIG);
      expect(error.message).toBe('Test error message');
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.context).toBeDefined();
      expect(error.guidance).toBeDefined();
    });

    test('should set recoverable flag correctly', () => {
      const recoverableError = new CoverageAnalysisError(
        ErrorCodes.PAGE_LOAD_FAILED,
        'Recoverable error',
        undefined,
        true
      );

      const nonRecoverableError = new CoverageAnalysisError(
        ErrorCodes.FILE_WRITE_FAILED,
        'Non-recoverable error',
        undefined,
        false
      );

      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    test('should maintain proper stack trace', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.RUNTIME_ERROR,
        'Stack trace test'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CoverageAnalysisError');
    });

    test('should handle missing context gracefully', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.ELEMENT_NOT_FOUND,
        'No context error'
      );

      expect(error.context).toBeUndefined();
      expect(error.guidance).toBeDefined();
    });
  });

  describe('Console Output Formatting', () => {
    test('should format basic error for console', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.INVALID_CONFIG,
        'Configuration validation failed',
        {
          operation: 'config_validation',
          testFile: 'test.spec.ts',
          timestamp: new Date()
        }
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('❌ INVALID_CONFIG: Configuration validation failed');
      expect(output).toContain('📍 Context: config_validation in test.spec.ts');
      expect(output).toContain('💡 Configuration Error');
      expect(output).toContain('✅ This error is recoverable');
    });

    test('should include guidance steps in console output', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.PAGE_LOAD_FAILED,
        'Failed to load page'
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('🔧 Steps to resolve:');
      expect(output).toContain('1. Verify the URL is correct and accessible');
      expect(output).toContain('2. Check if the web server is running');
    });

    test('should include common causes in console output', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.ELEMENT_NOT_FOUND,
        'Element not found'
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('🔍 Common causes:');
      expect(output).toContain('• Page still loading');
      expect(output).toContain('• Incorrect selectors');
    });

    test('should include additional resources when available', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.INVALID_CONFIG,
        'Invalid configuration'
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('📚 Additional resources:');
      expect(output).toContain('Configuration documentation:');
    });

    test('should show non-recoverable warning appropriately', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.FILE_WRITE_FAILED,
        'Cannot write file',
        undefined,
        false
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('⚠️ This error may require restarting your test suite');
      expect(output).not.toContain('✅ This error is recoverable');
    });

    test('should handle error without context', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.RUNTIME_ERROR,
        'Simple runtime error'
      );

      const output = error.getConsoleOutput();

      expect(output).toContain('❌ RUNTIME_ERROR: Simple runtime error');
      expect(output).not.toContain('📍 Context:');
      expect(output).toContain('✅ This error is recoverable');
    });
  });

  describe('Error Serialization', () => {
    test('should convert to JSON properly', () => {
      const context: ErrorContext = {
        operation: 'test_operation',
        testFile: 'test.spec.ts',
        element: { selector: 'button' },
        timestamp: new Date()
      };

      const error = new CoverageAnalysisError(
        ErrorCodes.COVERAGE_CALCULATION_FAILED,
        'Calculation failed',
        context,
        true
      );

      const json = error.toJSON();

      expect(json.name).toBe('CoverageAnalysisError');
      expect(json.code).toBe(ErrorCodes.COVERAGE_CALCULATION_FAILED);
      expect(json.message).toBe('Calculation failed');
      expect(json.context).toEqual(context);
      expect(json.guidance).toBeDefined();
      expect(json.recoverable).toBe(true);
      expect(json.timestamp).toBeInstanceOf(Date);
      expect(json.stack).toBeDefined();
    });
  });

  describe('Static Error Creation Methods', () => {
    test('should create invalid config error', () => {
      const config = { outputPath: 'invalid' };
      const error = ErrorHandler.createInvalidConfigError('Invalid config', config);

      expect(error).toBeInstanceOf(CoverageAnalysisError);
      expect(error.code).toBe(ErrorCodes.INVALID_CONFIG);
      expect(error.message).toBe('Invalid config');
      expect(error.context?.operation).toBe('config_validation');
      expect(error.context?.config).toEqual(config);
    });

    test('should create page load error', () => {
      const error = ErrorHandler.createPageLoadError('https://example.com');

      expect(error.code).toBe(ErrorCodes.PAGE_LOAD_FAILED);
      expect(error.message).toBe('Failed to load page: https://example.com');
      expect(error.context?.operation).toBe('page_load');
      expect(error.context?.element).toEqual({ url: 'https://example.com' });
    });

    test('should create element not found error', () => {
      const error = ErrorHandler.createElementNotFoundError('button.submit', 'page.html');

      expect(error.code).toBe(ErrorCodes.ELEMENT_NOT_FOUND);
      expect(error.message).toBe('Element not found: button.submit');
      expect(error.context?.operation).toBe('element_discovery');
      expect(error.context?.testFile).toBe('page.html');
      expect(error.context?.element).toEqual({ selector: 'button.submit' });
    });

    test('should create file write error', () => {
      const error = ErrorHandler.createFileWriteError('/path/to/file.txt');

      expect(error.code).toBe(ErrorCodes.FILE_WRITE_FAILED);
      expect(error.message).toBe('Failed to write file: /path/to/file.txt');
      expect(error.context?.operation).toBe('file_write');
      expect(error.context?.element).toEqual({ path: '/path/to/file.txt' });
    });

    test('should create timeout error', () => {
      const error = ErrorHandler.createTimeoutError('page_analysis', 5000);

      expect(error.code).toBe(ErrorCodes.TIMEOUT_EXCEEDED);
      expect(error.message).toBe('Operation timed out: page_analysis (5000ms)');
      expect(error.context?.operation).toBe('page_analysis');
    });

    test('should create coverage calculation error', () => {
      const error = ErrorHandler.createCoverageCalculationError('Cannot aggregate data', 'test.spec.ts');

      expect(error.code).toBe(ErrorCodes.COVERAGE_CALCULATION_FAILED);
      expect(error.message).toBe('Cannot aggregate data');
      expect(error.context?.operation).toBe('coverage_calculation');
      expect(error.context?.testFile).toBe('test.spec.ts');
    });
  });

  describe('Error Handling and History', () => {
    test('should handle CoverageAnalysisError correctly', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.INVALID_CONFIG,
        'Test error',
        {
          operation: 'test',
          timestamp: new Date()
        }
      );

      const handledError = ErrorHandler.handleError(error);

      expect(handledError).toBe(error);
      expect(mockConsoleSpy).toHaveBeenCalledWith(error.getConsoleOutput());
    });

    test('should convert regular Error to CoverageError', () => {
      const regularError = new Error('Regular error');
      const context: ErrorContext = {
        operation: 'test_conversion',
        timestamp: new Date()
      };

      const handledError = ErrorHandler.handleError(regularError, context);

      expect(handledError).toBeInstanceOf(CoverageAnalysisError);
      expect(handledError.code).toBe(ErrorCodes.RUNTIME_ERROR);
      expect(handledError.message).toBe('Regular error');
      expect(handledError.context).toEqual(context);
      expect(handledError.stack).toBe(regularError.stack);
    });

    test('should maintain error history within limits', () => {
      // Create more errors than the max limit
      for (let i = 0; i < 55; i++) {
        const error = new CoverageAnalysisError(
          ErrorCodes.RUNTIME_ERROR,
          `Error ${i}`,
          {
            operation: `test_${i}`,
            timestamp: new Date()
          }
        );
        ErrorHandler.handleError(error);
      }

      const history = ErrorHandler.getErrorHistory();
      expect(history).toHaveLength(50); // Should be limited to maxErrors

      // Should keep the most recent errors
      expect(history[0].message).toBe('Error 5'); // First error in history
      expect(history[49].message).toBe('Error 54'); // Last error in history
    });

    test('should clear error history', () => {
      // Add some errors
      ErrorHandler.handleError(new Error('Test 1'));
      ErrorHandler.handleError(new Error('Test 2'));

      expect(ErrorHandler.getErrorHistory()).toHaveLength(2);

      ErrorHandler.clearErrorHistory();

      expect(ErrorHandler.getErrorHistory()).toHaveLength(0);
    });

    test('should get error summary correctly', () => {
      // Add different types of errors
      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.INVALID_CONFIG, 'Config error'));
      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.PAGE_LOAD_FAILED, 'Load error'));
      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.INVALID_CONFIG, 'Another config error'));

      const summary = ErrorHandler.getErrorSummary();

      expect(summary.total).toBe(3);
      expect(summary.byCode[ErrorCodes.INVALID_CONFIG]).toBe(2);
      expect(summary.byCode[ErrorCodes.PAGE_LOAD_FAILED]).toBe(1);
      expect(summary.recent).toHaveLength(3);
      expect(summary.recent[2].message).toBe('Another config error');
    });
  });

  describe('Error Summary Printing', () => {
    test('should print no errors message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      ErrorHandler.printErrorSummary();

      expect(consoleSpy).toHaveBeenCalledWith('✅ No errors encountered');
    });

    test('should print error summary with counts', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      // Add some errors
      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.INVALID_CONFIG, 'Config error'));
      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.PAGE_LOAD_FAILED, 'Load error'));

      ErrorHandler.printErrorSummary();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 Error Summary (2 total errors)'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration Error: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Page Load Failed: 1'));
    });

    test('should print recent errors in summary', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      ErrorHandler.handleError(new CoverageAnalysisError(ErrorCodes.ELEMENT_NOT_FOUND, 'Element error'));

      ErrorHandler.printErrorSummary();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🕐 Recent errors:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('• ELEMENT_NOT_FOUND: Element error'));
    });
  });

  describe('Async Error Handling Wrapper', () => {
    test('should handle successful async operation', async () => {
      const result = await ErrorHandler.withErrorHandling(
        'test_operation',
        async () => {
          return 'success';
        },
        { testFile: 'test.spec.ts' }
      );

      expect(result).toBe('success');
    });

    test('should handle async operation error', async () => {
      const error = new Error('Async operation failed');

      await expect(
        ErrorHandler.withErrorHandling(
          'failing_operation',
          async () => {
            throw error;
          },
          { testFile: 'test.spec.ts' }
        )
      ).rejects.toThrow('Async operation failed');

      expect(mockConsoleSpy).toHaveBeenCalled();
    });

    test('should pass context to error handler', async () => {
      const error = new Error('Context test');

      await expect(
        ErrorHandler.withErrorHandling(
          'context_test',
          async () => {
            throw error;
          },
          { testFile: 'context.spec.ts', element: { selector: 'button' } }
        )
      ).rejects.toThrow();

      const history = ErrorHandler.getErrorHistory();
      const handledError = history[history.length - 1];

      expect(handledError.context?.operation).toBe('context_test');
      expect(handledError.context?.testFile).toBe('context.spec.ts');
      expect(handledError.context?.element).toEqual({ selector: 'button' });
    });

    test('should re-throw non-recoverable errors', async () => {
      const nonRecoverableError = new CoverageAnalysisError(
        ErrorCodes.FILE_WRITE_FAILED,
        'Non-recoverable',
        undefined,
        false
      );

      await expect(
        ErrorHandler.withErrorHandling(
          'non_recoverable_test',
          async () => {
            throw nonRecoverableError;
          }
        )
      ).rejects.toThrow(nonRecoverableError);
    });
  });

  describe('Error Recoverability Detection', () => {
    test('should detect recoverable CoverageAnalysisError', () => {
      const recoverableError = new CoverageAnalysisError(
        ErrorCodes.PAGE_LOAD_FAILED,
        'Recoverable error',
        undefined,
        true
      );

      expect(ErrorHandler.isRecoverable(recoverableError)).toBe(true);
    });

    test('should detect non-recoverable CoverageAnalysisError', () => {
      const nonRecoverableError = new CoverageAnalysisError(
        ErrorCodes.FILE_WRITE_FAILED,
        'Non-recoverable error',
        undefined,
        false
      );

      expect(ErrorHandler.isRecoverable(nonRecoverableError)).toBe(false);
    });

    test('should detect recoverable regular errors by message', () => {
      const timeoutError = new Error('Operation timeout exceeded');
      const networkError = new Error('Network connection failed');
      const connectionError = new Error('Connection refused');

      expect(ErrorHandler.isRecoverable(timeoutError)).toBe(true);
      expect(ErrorHandler.isRecoverable(networkError)).toBe(true);
      expect(ErrorHandler.isRecoverable(connectionError)).toBe(true);
    });

    test('should detect non-recoverable regular errors by message', () => {
      const permissionError = new Error('permission denied');
      const accessError = new Error('access denied');

      expect(ErrorHandler.isRecoverable(permissionError)).toBe(false);
      expect(ErrorHandler.isRecoverable(accessError)).toBe(false);
    });

    test('should default to recoverable for unknown errors', () => {
      const unknownError = new Error('Unknown error occurred');

      expect(ErrorHandler.isRecoverable(unknownError)).toBe(true);
    });
  });

  describe('Retry Suggestions', () => {
    test('should provide retry suggestion for page load errors', () => {
      const error = new CoverageAnalysisError(ErrorCodes.PAGE_LOAD_FAILED, 'Load failed');

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBe('Retry after checking network connectivity and server status');
    });

    test('should provide retry suggestion for timeout errors', () => {
      const error = new CoverageAnalysisError(ErrorCodes.TIMEOUT_EXCEEDED, 'Timeout');

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBe('Retry with increased timeout or reduce scope');
    });

    test('should provide retry suggestion for element not found errors', () => {
      const error = new CoverageAnalysisError(ErrorCodes.ELEMENT_NOT_FOUND, 'Not found');

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBe('Retry after waiting for page to fully load');
    });

    test('should provide retry suggestion for file write errors', () => {
      const error = new CoverageAnalysisError(ErrorCodes.FILE_WRITE_FAILED, 'Write failed');

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBe('Retry after checking permissions and disk space');
    });

    test('should provide generic retry suggestion for other recoverable errors', () => {
      const error = new CoverageAnalysisError(ErrorCodes.INVALID_CONFIG, 'Config error');

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBe('Retry after addressing the issue described above');
    });

    test('should return null for non-recoverable errors', () => {
      const error = new CoverageAnalysisError(
        ErrorCodes.FILE_WRITE_FAILED,
        'Non-recoverable',
        undefined,
        false
      );

      const suggestion = ErrorHandler.getRetrySuggestion(error);

      expect(suggestion).toBeNull();
    });
  });

  describe('Error Code Definitions', () => {
    test('should include all expected error codes', () => {
      const expectedCodes = [
        'INVALID_CONFIG',
        'MISSING_CONFIG',
        'INVALID_OUTPUT_PATH',
        'PAGE_LOAD_FAILED',
        'ELEMENT_NOT_FOUND',
        'SELECTOR_INVALID',
        'COVERAGE_CALCULATION_FAILED',
        'AGGREGATION_FAILED',
        'FILE_WRITE_FAILED',
        'FILE_READ_FAILED',
        'PERMISSION_DENIED',
        'TIMEOUT_EXCEEDED',
        'MEMORY_LIMIT_EXCEEDED',
        'TEST_FAILURE',
        'RUNTIME_ERROR'
      ];

      expectedCodes.forEach(code => {
        expect(Object.values(ErrorCodes)).toContain(code);
      });
    });

    test('should have guidance for common error codes', () => {
      // Test error codes that have guidance defined
      const codesWithGuidance = [
        ErrorCodes.INVALID_CONFIG,
        ErrorCodes.PAGE_LOAD_FAILED,
        ErrorCodes.ELEMENT_NOT_FOUND,
        ErrorCodes.COVERAGE_CALCULATION_FAILED,
        ErrorCodes.FILE_WRITE_FAILED,
        ErrorCodes.TIMEOUT_EXCEEDED,
        ErrorCodes.MEMORY_LIMIT_EXCEEDED
      ];

      codesWithGuidance.forEach(code => {
        const error = new CoverageAnalysisError(code, 'Test');
        expect(error.guidance).toBeDefined();
        expect(error.guidance?.title).toBeDefined();
        expect(error.guidance?.description).toBeDefined();
        expect(error.guidance?.steps).toBeDefined();
        expect(error.guidance?.commonCauses).toBeDefined();
      });
    });

    test('should handle error codes without guidance', () => {
      // Test error codes that might not have guidance
      const codesWithoutGuidance = [
        ErrorCodes.MISSING_CONFIG,
        ErrorCodes.INVALID_OUTPUT_PATH,
        ErrorCodes.SELECTOR_INVALID,
        ErrorCodes.AGGREGATION_FAILED,
        ErrorCodes.FILE_READ_FAILED,
        ErrorCodes.PERMISSION_DENIED,
        ErrorCodes.TEST_FAILURE,
        ErrorCodes.RUNTIME_ERROR
      ];

      codesWithoutGuidance.forEach(code => {
        const error = new CoverageAnalysisError(code, 'Test');
        // These should either have guidance or handle undefined gracefully
        expect(() => {
          const guidance = error.guidance;
          if (guidance) {
            expect(guidance.title).toBeDefined();
          }
        }).not.toThrow();
      });
    });
  });

  describe('Performance and Scaling', () => {
    test('should handle large number of errors efficiently', () => {
      const startTime = Date.now();

      // Create many errors
      for (let i = 0; i < 1000; i++) {
        ErrorHandler.handleError(new Error(`Performance test ${i}`));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);

      const history = ErrorHandler.getErrorHistory();
      expect(history).toHaveLength(50); // Should be limited
    });

    test('should handle complex error objects efficiently', () => {
      const complexContext: ErrorContext = {
        operation: 'complex_operation',
        config: {
          outputPath: '/very/long/path/to/output/directory',
          format: 'json',
          threshold: 80,
          verbose: true,
          elementDiscovery: true,
          pageUrls: new Array(100).fill('https://example.com'),
          runtimeDiscovery: true,
          captureScreenshots: true
        },
        testFile: '/very/long/path/to/test/file/test.spec.ts',
        element: {
          selector: 'very.complex.css.selector.with.many.nesting.levels > div:nth-child(5) > span',
          type: 'button',
          text: 'Very long button text with lots of content'
        },
        stack: new Array(100).fill('at function call').join('\n'),
        timestamp: new Date()
      };

      const startTime = Date.now();

      const error = new CoverageAnalysisError(
        ErrorCodes.COVERAGE_CALCULATION_FAILED,
        'Complex error for performance testing',
        complexContext
      );

      const output = error.getConsoleOutput();
      const json = error.toJSON();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast
      expect(output).toContain('Complex error for performance testing');
      expect(json.context).toBeDefined();
      expect(json.context?.config).toBeDefined();
      expect(json.context?.element).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle error with undefined message', () => {
      const error = new CoverageAnalysisError(ErrorCodes.RUNTIME_ERROR, '');

      expect(error.message).toBe('');
      expect(error.getConsoleOutput()).toContain('❌ RUNTIME_ERROR: ');
    });

    test('should handle error with very long message', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new CoverageAnalysisError(ErrorCodes.RUNTIME_ERROR, longMessage);

      expect(error.getConsoleOutput()).toContain(longMessage);
    });

    test('should handle error with circular reference in context', () => {
      const circularContext: any = {
        operation: 'circular_test',
        timestamp: new Date()
      };
      circularContext.self = circularContext; // Create circular reference

      expect(() => {
        const error = new CoverageAnalysisError(
          ErrorCodes.RUNTIME_ERROR,
          'Circular reference test',
          circularContext
        );
        error.toJSON();
      }).not.toThrow();
    });

    test('should handle error creation with invalid context data', () => {
      expect(() => {
        ErrorHandler.createInvalidConfigError('Test', null);
        ErrorHandler.createPageLoadError(undefined as any);
        ErrorHandler.createElementNotFoundError('');
      }).not.toThrow();
    });
  });
});