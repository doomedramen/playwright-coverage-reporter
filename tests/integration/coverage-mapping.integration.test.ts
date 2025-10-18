/**
 * Integration Tests for Coverage Mapping Issues
 *
 * These tests specifically target the coverage mapping inconsistency issue:
 * Console shows elements being marked as covered, but coverage data shows them as uncovered
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightCoverageReporter } from '../../src/reporter/coverage-reporter';
import { CoverageAggregator } from '../../src/utils/coverage-aggregator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Coverage Mapping Issues', () => {
  const testOutputDir = join(__dirname, '../temp-test-coverage');
  const mockTestFile = join(__dirname, '../fixtures/sample-login.test.ts');

  beforeEach(async () => {
    // Clean up any existing test coverage data
    if (existsSync(testOutputDir)) {
      try {
        // Clean up coverage data files
        const files = ['.coverage-data.json', 'coverage-report.json'];
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
        const files = ['.coverage-data.json', 'coverage-report.json'];
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

  test('should correctly map console coverage to coverage data persistence', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'json',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    // Mock test suite with specific interactions
    const mockSuite = {
      type: 'suite' as const,
      title: 'Login Coverage Test',
      tests: [
        {
          type: 'test' as const,
          title: 'should login successfully with valid credentials',
          location: {
            file: mockTestFile,
            line: 1
          }
        }
      ]
    };

    // Mock test result with specific interactions that should be tracked
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

    // Capture console output during test execution
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    try {
      // Simulate the test lifecycle
      await reporter.onBegin({}, mockSuite);
      await reporter.onTestBegin(mockSuite.tests[0]);
      await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);
      await reporter.onEnd({ status: 'passed' });

      // Check that console logged coverage marking
      const consoleCalls = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      expect(consoleCalls).toContain('Marked');
      expect(consoleCalls).toContain('elements as covered');

      // Check that coverage data file was created
      const coverageDataPath = join(testOutputDir, '.coverage-data.json');
      expect(existsSync(coverageDataPath)).toBe(true);

      // Validate coverage data consistency
      const coverageData = JSON.parse(readFileSync(coverageDataPath, 'utf8'));

      // Coverage data should have records structure
      const records = coverageData.records || {};
      expect(Object.keys(records).length).toBeGreaterThan(0);

      // Check that elements marked as covered in console are actually covered in data
      let coveredElementsCount = 0;
      let totalElementsCount = 0;

      for (const [elementId, elementData] of Object.entries(records as any)) {
        totalElementsCount++;
        if (elementData.coveredBy && elementData.coveredBy.length > 0) {
          coveredElementsCount++;
        }
      }

      console.log(`📊 Coverage Mapping Test Results:`);
      console.log(`   Total elements: ${totalElementsCount}`);
      console.log(`   Covered elements: ${coveredElementsCount}`);
      console.log(`   Coverage percentage: ${totalElementsCount > 0 ? Math.round((coveredElementsCount / totalElementsCount) * 100) : 0}%`);

      // The key assertion: coverage data should reflect console output
      // If console says elements were marked as covered, data should show them as covered
      expect(coveredElementsCount).toBeGreaterThan(0);

      // Final coverage report should also reflect this
      const reportPath = join(testOutputDir, 'coverage-report.json');
      if (existsSync(reportPath)) {
        const reportData = JSON.parse(readFileSync(reportPath, 'utf8'));
        expect(reportData.summary.coveredElements).toBe(coveredElementsCount);
        expect(reportData.summary.totalElements).toBe(totalElementsCount);
      }

      console.log('✅ Coverage mapping consistency verified');

    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('should maintain coverage data consistency across multiple tests', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'json',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    // Mock multiple tests that interact with same elements
    const mockSuite = {
      type: 'suite' as const,
      title: 'Multi-Test Coverage Suite',
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
          title: 'should handle login failure',
          location: {
            file: mockTestFile,
            line: 20
          }
        }
      ]
    };

    // First test - successful login
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

    // Second test - failed login (same elements)
    const mockTestResult2 = {
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

    // Capture console output
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    try {
      // Simulate the test lifecycle for both tests
      await reporter.onBegin({}, mockSuite);

      // First test
      await reporter.onTestBegin(mockSuite.tests[0]);
      await reporter.onTestEnd(mockSuite.tests[0], mockTestResult1);

      // Second test
      await reporter.onTestBegin(mockSuite.tests[1]);
      await reporter.onTestEnd(mockSuite.tests[1], mockTestResult2);

      await reporter.onEnd({ status: 'passed' });

      // Check console output shows coverage marking for both tests
      const consoleCalls = consoleSpy.mock.calls.map(call => call[0]);
      const coverageMarkingCount = consoleCalls.filter(call =>
        typeof call === 'string' && call.includes('Marked') && call.includes('elements as covered')
      ).length;
      expect(coverageMarkingCount).toBe(2); // Should have logged for both tests

      // Check coverage data persistence
      const coverageDataPath = join(testOutputDir, '.coverage-data.json');
      expect(existsSync(coverageDataPath)).toBe(true);

      const coverageData = JSON.parse(readFileSync(coverageDataPath, 'utf8'));
      const records = coverageData.records || {};

      // Track elements covered by multiple tests
      let elementsCoveredByMultipleTests = 0;
      let totalCoveredElements = 0;

      for (const [elementId, elementData] of Object.entries(records as any)) {
        if (elementData.coveredBy && elementData.coveredBy.length > 0) {
          totalCoveredElements++;
          if (elementData.coveredBy.length > 1) {
            elementsCoveredByMultipleTests++;
          }
        }
      }

      console.log(`📊 Multi-Test Coverage Results:`);
      console.log(`   Total covered elements: ${totalCoveredElements}`);
      console.log(`   Elements covered by multiple tests: ${elementsCoveredByMultipleTests}`);
      console.log(`   Console coverage markings: ${coverageMarkingCount}`);

      // Should have elements covered by multiple tests
      expect(elementsCoveredByMultipleTests).toBeGreaterThan(0);
      expect(totalCoveredElements).toBeGreaterThan(0);

      console.log('✅ Multi-test coverage mapping consistency verified');

    } finally {
      consoleSpy.mockRestore();
    }
  });

  test('should track coverage mapping timing - data written after test completion', async () => {
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'json',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    const mockSuite = {
      type: 'suite' as const,
      tests: [
        {
          type: 'test' as const,
          title: 'timing test',
          location: { file: mockTestFile, line: 1 }
        }
      ]
    };

    const mockTestResult = {
      ok: true,
      status: 'passed',
      steps: [
        {
          title: 'click button[type="submit"]',
          error: null
        }
      ]
    };

    // Track when coverage data is written
    let coverageDataWrittenAt: string | null = null;

    // Mock fs.writeFileSync to track when it's called
    const originalWriteFileSync = require('fs').writeFileSync;
    const writeSpy = vi.spyOn(require('fs'), 'writeFileSync').mockImplementation(
      (path: string, data: string) => {
        if (path.includes('.coverage-data.json')) {
          coverageDataWrittenAt = new Date().toISOString();
        }
        return originalWriteFileSync(path, data);
      }
    );

    try {
      // Execute test lifecycle
      await reporter.onBegin({}, mockSuite);
      await reporter.onTestBegin(mockSuite.tests[0]);

      // Check coverage data before test end
      const coverageDataPath = join(testOutputDir, '.coverage-data.json');
      const beforeTestEnd = existsSync(coverageDataPath);

      await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);

      // Check coverage data immediately after test end
      const afterTestEnd = existsSync(coverageDataPath);
      const immediateData = afterTestEnd ? JSON.parse(readFileSync(coverageDataPath, 'utf8')) : null;

      await reporter.onEnd({ status: 'passed' });

      // Final check
      const finalExists = existsSync(coverageDataPath);
      const finalData = finalExists ? JSON.parse(readFileSync(coverageDataPath, 'utf8')) : null;

      console.log(`📊 Timing Analysis Results:`);
      console.log(`   Coverage data exists before test end: ${beforeTestEnd}`);
      console.log(`   Coverage data exists after test end: ${afterTestEnd}`);
      console.log(`   Coverage data exists after onEnd: ${finalExists}`);
      console.log(`   Data written at: ${coverageDataWrittenAt}`);

      if (immediateData && finalData) {
        const immediateRecords = immediateData.records || {};
        const finalRecords = finalData.records || {};
        const immediateCovered = Object.values(immediateRecords).filter((el: any) => el.coveredBy?.length > 0).length;
        const finalCovered = Object.values(finalRecords).filter((el: any) => el.coveredBy?.length > 0).length;

        console.log(`   Covered elements immediately after test: ${immediateCovered}`);
        console.log(`   Covered elements after onEnd: ${finalCovered}`);

        // Coverage should be consistent between immediate and final data
        expect(immediateCovered).toBe(finalCovered);
      }

      expect(finalExists).toBe(true);
      if (finalData) {
        const records = finalData.records || {};
        const totalElements = Object.keys(records).length;
        const coveredElements = Object.values(records).filter((el: any) => el.coveredBy?.length > 0).length;
        expect(coveredElements).toBeGreaterThan(0);
        console.log(`✅ Coverage mapping timing verified - ${coveredElements}/${totalElements} elements covered`);
      }

    } finally {
      writeSpy.mockRestore();
    }
  });

  test('should preserve coverage data when console shows coverage but file is incomplete', async () => {
    // This test verifies the specific issue where console shows coverage but final data doesn't
    const reporter = new PlaywrightCoverageReporter({
      outputPath: testOutputDir,
      format: 'json',
      verbose: true,
      debugMode: true,
      runtimeDiscovery: true,
      threshold: 0
    });

    const mockSuite = {
      type: 'suite' as const,
      tests: [
        {
          type: 'test' as const,
          title: 'coverage preservation test',
          location: { file: mockTestFile, line: 1 }
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

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    try {
      await reporter.onBegin({}, mockSuite);
      await reporter.onTestBegin(mockSuite.tests[0]);
      await reporter.onTestEnd(mockSuite.tests[0], mockTestResult);
      await reporter.onEnd({ status: 'passed' });

      // Verify console output
      const consoleCalls = consoleSpy.mock.calls.map(call => call[0]).join(' ');
      expect(consoleCalls).toContain('Marked');
      expect(consoleCalls).toContain('elements as covered');

      // Verify data persistence matches console output
      const coverageDataPath = join(testOutputDir, '.coverage-data.json');
      expect(existsSync(coverageDataPath)).toBe(true);

      const coverageData = JSON.parse(readFileSync(coverageDataPath, 'utf8'));
      const records = coverageData.records || {};

      // Extract selectors from console message to verify they're in data
      const consoleSelectors = [
        'input[name=email]',
        'input[name=password]',
        'button[type=submit]'
      ];

      let foundSelectorsInData = 0;
      for (const selector of consoleSelectors) {
        const found = Object.keys(records).some(key => {
          const record = records[key];
          // Check both the key and the selector field in the record
          return key.includes(selector.replace(/[\[\]]/g, '')) ||
                 (record.selector && record.selector.includes(selector));
        });
        if (found) foundSelectorsInData++;
      }

      console.log(`📊 Console vs Data Consistency Results:`);
      console.log(`   Selectors expected from console: ${consoleSelectors.length}`);
      console.log(`   Selectors found in coverage data: ${foundSelectorsInData}`);
      console.log(`   Total elements in data: ${Object.keys(records).length}`);

      // All selectors from console should be present in coverage data
      expect(foundSelectorsInData).toBe(consoleSelectors.length);

      // At least some elements should be marked as covered
      const coveredElements = Object.values(records).filter((el: any) => el.coveredBy?.length > 0);
      expect(coveredElements.length).toBeGreaterThan(0);

      console.log('✅ Console coverage data preservation verified');

    } finally {
      consoleSpy.mockRestore();
    }
  });
});