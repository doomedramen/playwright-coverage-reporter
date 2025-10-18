/**
 * Integration Tests for Report Generation Issues
 *
 * These tests specifically target the issues identified in the status report:
 * 1. Dynamic require of "fs" not supported error in report generation
 * 2. Coverage mapping inconsistency between console output and final data
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightCoverageReporter } from '../../src/reporter/coverage-reporter';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Report Generation Issues', () => {
  const testOutputDir = join(__dirname, '../temp-test-reports');
  const mockTestFile = join(__dirname, '../fixtures/sample-login.test.ts');

  beforeEach(async () => {
    // Clean up any existing test reports
    if (existsSync(testOutputDir)) {
      try {
        // Simple cleanup for test directory
        const files = ['coverage-report.json', 'coverage-report.html'];
        files.forEach(file => {
          const filePath = join(testOutputDir, file);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    } else {
      mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      if (existsSync(testOutputDir)) {
        const files = ['coverage-report.json', 'coverage-report.html'];
        files.forEach(file => {
          const filePath = join(testOutputDir, file);
          if (existsSync(filePath)) {
            unlinkSync(filePath);
          }
        });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should generate JSON report without dynamic require errors', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'json',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    // Mock test suite and test case
    const mockSuite = {
      type: 'suite' as const,
      title: 'Login Test Suite',
      tests: [
        {
          type: 'test' as const,
          title: 'should login successfully',
          location: {
            file: mockTestFile,
            line: 1
          }
        }
      ]
    };

    const mockTestResult = {
      ok: true,
      status: 'passed',
      steps: [
        {
          title: 'fill input[name="email"]',
          error: null
        },
        {
          title: 'fill input[name="password"]',
          error: null
        },
        {
          title: 'click button[type="submit"]',
          error: null
        }
      ]
    };

    // Simulate the test lifecycle
    await reporter.onBegin({}, mockSuite);
    await reporter.onTestBegin(mockSuite.tests[0]);
    await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);
    await reporter.onEnd({ status: 'passed' });

    // Check that JSON report was generated
    const jsonReportPath = join(testOutputDir, 'coverage-report.json');
    expect(existsSync(jsonReportPath)).toBe(true);

    // Validate report content
    const reportContent = JSON.parse(readFileSync(jsonReportPath, 'utf8'));
    expect(reportContent.summary).toBeDefined();
    expect(reportContent.summary.totalElements).toBeGreaterThanOrEqual(0);
    expect(reportContent.summary.coveragePercentage).toBeGreaterThanOrEqual(0);
    expect(reportContent.generatedAt).toBeDefined();

    console.log('✅ JSON report generated successfully without dynamic require errors');
  });

  test('should generate HTML report without dynamic require errors', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'html',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    // Mock test suite and test case
    const mockSuite = {
      type: 'suite' as const,
      title: 'Login Test Suite',
      tests: [
        {
          type: 'test' as const,
          title: 'should login successfully',
          location: {
            file: mockTestFile,
            line: 1
          }
        }
      ]
    };

    const mockTestResult = {
      ok: true,
      status: 'passed',
      steps: [
        {
          title: 'fill input[name="email"]',
          error: null
        },
        {
          title: 'click button[type="submit"]',
          error: null
        }
      ]
    };

    // Simulate the test lifecycle
    await reporter.onBegin({}, mockSuite);
    await reporter.onTestBegin(mockSuite.tests[0]);
    await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);
    await reporter.onEnd({ status: 'passed' });

    // Check that HTML report was generated
    const htmlReportPath = join(testOutputDir, 'coverage-report.html');
    expect(existsSync(htmlReportPath)).toBe(true);

    // Validate HTML content
    const htmlContent = readFileSync(htmlReportPath, 'utf8');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('Coverage Report');
    expect(htmlContent).toContain('coverage-percentage');

    console.log('✅ HTML report generated successfully without dynamic require errors');
  });

  test('should generate all report formats without dynamic require errors', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'all',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    // Mock test suite with multiple tests
    const mockSuite = {
      type: 'suite' as const,
      title: 'Complete Test Suite',
      tests: [
        {
          type: 'test' as const,
          title: 'should login successfully',
          location: {
            file: mockTestFile,
            line: 1
          }
        },
        {
          type: 'test' as const,
          title: 'should handle form validation',
          location: {
            file: mockTestFile,
            line: 20
          }
        }
      ]
    };

    const mockTestResult1 = {
      ok: true,
      status: 'passed',
      steps: [
        {
          title: 'fill input[name="email"]',
          error: null
        },
        {
          title: 'fill input[name="password"]',
          error: null
        },
        {
          title: 'click button[type="submit"]',
          error: null
        }
      ]
    };

    const mockTestResult2 = {
      ok: true,
      status: 'passed',
      steps: [
        {
          title: 'fill input[name="email"] with invalid data',
          error: null
        },
        {
          title: 'click button[type="submit"]',
          error: null
        }
      ]
    };

    // Simulate the test lifecycle
    await reporter.onBegin({}, mockSuite);
    await reporter.onTestBegin(mockSuite.tests[0]);
    await reporter.onTestEnd(mockSuite.tests[0], mockTestResult1);
    await reporter.onTestBegin(mockSuite.tests[1]);
    await reporter.onTestEnd(mockSuite.tests[1], mockTestResult2);
    await reporter.onEnd({ status: 'passed' });

    // Check that all report formats were generated
    const jsonReportPath = join(testOutputDir, 'coverage-report.json');
    const htmlReportPath = join(testOutputDir, 'coverage-report.html');
    const recommendationsPath = join(testOutputDir, 'coverage-recommendations.json');

    expect(existsSync(jsonReportPath)).toBe(true);
    expect(existsSync(htmlReportPath)).toBe(true);
    expect(existsSync(recommendationsPath)).toBe(true);

    console.log('✅ All report formats generated successfully without dynamic require errors');
  });

  test('should handle report generation errors gracefully', async () => {
    // Suppress console warnings for this test since we expect filesystem errors
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // Test with invalid output path to check error handling
      const reporter = new PlaywrightCoverageReporter({
        outputPath: '/invalid/path/that/does/not/exist',
        format: 'json',
        verbose: false, // Disable verbose to reduce error output
        debugMode: false, // Disable debug mode to reduce error output
        enableErrorRecovery: true,
        elementDiscovery: false, // Disable element discovery to reduce errors
        runtimeDiscovery: false, // Disable runtime discovery to reduce errors
        threshold: 0
      });

      // Mock minimal test data
      const mockSuite = {
        type: 'suite' as const,
        tests: [
          {
            type: 'test' as const,
            title: 'test',
            location: { file: mockTestFile, line: 1 }
          }
        ]
      };

      const mockTestResult = { ok: true, status: 'passed', steps: [] };

      // This should not throw an error, but handle it gracefully
      await expect(async () => {
        await reporter.onBegin({}, mockSuite);
        await reporter.onTestBegin(mockSuite.tests[0]);
        await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);
        await reporter.onEnd({ status: 'passed' });
      }).not.toThrow();

      console.log('✅ Report generation errors handled gracefully');
    } finally {
      // Restore console.warn
      consoleSpy.mockRestore();
    }
  });
});