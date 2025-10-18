/**
 * Unit Tests for PlaywrightConfigReader Utility
 *
 * These tests verify the Playwright configuration loading, parsing, and integration functionality,
 * including support for different file formats, test pattern extraction, and config merging.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightConfigReader, PlaywrightConfig } from '../../src/utils/playwright-config-reader';
import { PlaywrightCoverConfig } from '../../src/types';

describe('PlaywrightConfigReader', () => {
  let configReader: PlaywrightConfigReader;
  let mockConsoleSpy: any;

  beforeEach(() => {
    configReader = new PlaywrightConfigReader();

    // Mock console to capture output
    mockConsoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleSpy?.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Test Pattern Extraction', () => {
    test('should extract patterns from basic config', () => {
      const config: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts', '**/*.test.ts'],
        testIgnore: ['**/node_modules/**', '**/dist/**']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**/*.spec.ts');
      expect(patterns.include).toContain('tests/**/*.test.ts');
      expect(patterns.exclude).toContain('**/node_modules/**');
      expect(patterns.exclude).toContain('**/dist/**');
      expect(patterns.exclude).toContain('**/coverage/**');
      expect(patterns.exclude).toContain('**/coverage-report/**');
    });

    test('should use default patterns when testMatch not specified', () => {
      const config: PlaywrightConfig = {
        testDir: 'e2e'
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('e2e/**/*.spec.ts');
      expect(patterns.include).toContain('e2e/**/*.test.ts');
      expect(patterns.exclude).toContain('**/node_modules/**');
      expect(patterns.exclude).toContain('**/dist/**');
    });

    test('should handle testDir without trailing slash', () => {
      const config: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**/*.spec.ts');
    });

    test('should handle testDir with trailing slash', () => {
      const config: PlaywrightConfig = {
        testDir: 'tests/',
        testMatch: ['**/*.spec.ts']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**/*.spec.ts');
    });

    test('should handle relative patterns correctly', () => {
      const config: PlaywrightConfig = {
        testDir: 'integration',
        testMatch: ['login.spec.ts', 'user/**/*.test.ts']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('integration/login.spec.ts');
      expect(patterns.include).toContain('user/**/*.test.ts'); // Pattern with slash doesn't get testDir prepended
    });

    test('should handle absolute patterns correctly', () => {
      const config: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts', '/absolute/path/**/*.test.ts']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**/*.spec.ts');
      expect(patterns.include).toContain('/absolute/path/**/*.test.ts');
    });

    test('should add default directories when testDir not specified', () => {
      const config: PlaywrightConfig = {
        testMatch: ['**/*.spec.ts']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**');
      expect(patterns.include).toContain('e2e/**');
      expect(patterns.include).toContain('**/*.spec.ts');
    });

    test('should handle empty testMatch array', () => {
      const config: PlaywrightConfig = {
        testMatch: []
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.include).toContain('tests/**');
      expect(patterns.include).toContain('e2e/**');
    });

    test('should handle testIgnore correctly', () => {
      const config: PlaywrightConfig = {
        testIgnore: ['**/fixtures/**', '**/helpers/**']
      };

      const patterns = configReader.extractTestPatterns(config);

      expect(patterns.exclude).toContain('**/fixtures/**');
      expect(patterns.exclude).toContain('**/helpers/**');
      expect(patterns.exclude).toContain('**/coverage/**');
      expect(patterns.exclude).toContain('**/coverage-report/**');
    });
  });

  describe('Config Merging', () => {
    test('should merge Playwright config into coverage config', () => {
      const playwrightConfig: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts'],
        testIgnore: ['**/fixtures/**'],
        webServer: {
          command: 'npm run serve',
          port: 8080,
          url: 'http://localhost:8080'
        }
      };

      const coverageConfig: PlaywrightCoverConfig = {
        include: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
        ignoreElements: [],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'html',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true
      };

      const merged = configReader.mergeIntoCoverageConfig(playwrightConfig, coverageConfig);

      expect(merged.include).toContain('tests/**/*.spec.ts');
      expect(merged.exclude).toContain('**/fixtures/**');
      expect(merged.webServer?.command).toBe('npm run serve');
      expect(merged.webServer?.port).toBe(8080);
      expect(merged.webServer?.url).toBe('http://localhost:8080');
    });

    test('should preserve custom coverage config when not default', () => {
      const playwrightConfig: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts']
      };

      const customCoverageConfig: PlaywrightCoverConfig = {
        include: ['custom/**/*.spec.ts', 'custom/**/*.test.ts'],
        exclude: ['custom/**/node_modules/**', 'custom/**/dist/**'],
        ignoreElements: [],
        coverageThreshold: 90,
        outputPath: './custom-coverage',
        reportFormat: 'json',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true
      };

      const merged = configReader.mergeIntoCoverageConfig(playwrightConfig, customCoverageConfig);

      // Should preserve custom patterns
      expect(merged.include).toEqual(['custom/**/*.spec.ts', 'custom/**/*.test.ts']);
      expect(merged.exclude).toEqual(['custom/**/node_modules/**', 'custom/**/dist/**']);
    });

    test('should handle multiple web servers in Playwright config', () => {
      const playwrightConfig: PlaywrightConfig = {
        webServer: [
          {
            command: 'npm run api',
            port: 3001,
            url: 'http://localhost:3001'
          },
          {
            command: 'npm run app',
            port: 3000,
            url: 'http://localhost:3000'
          }
        ]
      };

      const coverageConfig: PlaywrightCoverConfig = {
        include: ['**/*.spec.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
        ignoreElements: [],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'html',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true
      };

      const merged = configReader.mergeIntoCoverageConfig(playwrightConfig, coverageConfig);

      expect(merged.webServer?.command).toBe('npm run api');
      expect(merged.webServer?.port).toBe(3001);
      expect(merged.webServer?.url).toBe('http://localhost:3001');
    });

    test('should override web server when merging from Playwright config', () => {
      const playwrightConfig: PlaywrightConfig = {
        webServer: {
          command: 'npm run playwright-server',
          port: 3000
        }
      };

      const coverageConfig: PlaywrightCoverConfig = {
        include: ['**/*.spec.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
        ignoreElements: [],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'html',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true,
        webServer: {
          command: 'npm run custom-server',
          port: 8080
        }
      };

      const merged = configReader.mergeIntoCoverageConfig(playwrightConfig, coverageConfig);

      // Should merge from Playwright config
      expect(merged.webServer?.command).toBe('npm run playwright-server');
      expect(merged.webServer?.port).toBe(3000);
    });

    test('should not merge patterns when include/exclude are already customized', () => {
      const playwrightConfig: PlaywrightConfig = {
        testDir: 'different-tests',
        testMatch: ['**/*.different.ts']
      };

      const customCoverageConfig: PlaywrightCoverConfig = {
        include: ['my-custom/**/*.spec.ts'],
        exclude: ['my-custom/**/node_modules/**'],
        ignoreElements: [],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'html',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true
      };

      const merged = configReader.mergeIntoCoverageConfig(playwrightConfig, customCoverageConfig);

      // Should preserve custom patterns, not merge from Playwright config
      expect(merged.include).toEqual(['my-custom/**/*.spec.ts']);
      expect(merged.exclude).toEqual(['my-custom/**/node_modules/**']);
    });
  });

  describe('Config Summary', () => {
    test('should generate comprehensive config summary', () => {
      const config: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: ['**/*.spec.ts', '**/*.test.ts'],
        testIgnore: ['**/node_modules/**', '**/fixtures/**'],
        webServer: {
          command: 'npm start',
          port: 3000,
          url: 'http://localhost:3000',
          reuseExistingServer: true
        },
        projects: [
          { name: 'chromium', testDir: 'chromium-tests' },
          { name: 'firefox', testDir: 'firefox-tests' },
          { name: 'webkit', testDir: 'webkit-tests' }
        ]
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Test Directory: tests');
      expect(summary).toContain('Test Patterns: **/*.spec.ts, **/*.test.ts');
      expect(summary).toContain('Ignore Patterns: **/node_modules/**, **/fixtures/**');
      expect(summary).toContain('Web Server: npm start');
      expect(summary).toContain('Projects: 3 configured');
    });

    test('should handle config with minimal properties', () => {
      const config: PlaywrightConfig = {
        testDir: 'e2e'
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Test Directory: e2e');
      expect(summary).toHaveLength(1);
    });

    test('should handle config with multiple web servers', () => {
      const config: PlaywrightConfig = {
        webServer: [
          { command: 'npm run api' },
          { command: 'npm run app' }
        ]
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Web Servers: npm run api, npm run app');
    });

    test('should handle config with projects only', () => {
      const config: PlaywrightConfig = {
        projects: [
          { name: 'desktop' },
          { name: 'mobile' }
        ]
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Projects: 2 configured');
    });

    test('should handle config with testMatch only', () => {
      const config: PlaywrightConfig = {
        testMatch: ['**/*.e2e.ts', '**/*.integration.ts']
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Test Patterns: **/*.e2e.ts, **/*.integration.ts');
    });

    test('should handle config with testIgnore only', () => {
      const config: PlaywrightConfig = {
        testIgnore: ['**/mocks/**', '**/stubs/**']
      };

      const summary = configReader.getConfigSummary(config);

      expect(summary).toContain('Ignore Patterns: **/mocks/**, **/stubs/**');
    });

    test('should handle empty config object', () => {
      const config: PlaywrightConfig = {};

      const summary = configReader.getConfigSummary(config);

      expect(summary).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle null and undefined values gracefully', () => {
      const config: PlaywrightConfig = {
        testDir: undefined,
        testMatch: undefined,
        testIgnore: undefined,
        webServer: undefined,
        projects: undefined
      };

      expect(() => {
        const patterns = configReader.extractTestPatterns(config);
        const summary = configReader.getConfigSummary(config);
      }).not.toThrow();
    });

    test('should handle invalid test match patterns', () => {
      const config: PlaywrightConfig = {
        testMatch: [''],
        testIgnore: [null as any, undefined as any]
      };

      expect(() => {
        const patterns = configReader.extractTestPatterns(config);
      }).not.toThrow();
    });

    test('should handle malformed project configurations', () => {
      const config: PlaywrightConfig = {
        projects: [
          { name: null as any },
          { testDir: undefined },
          {},
          { name: 'valid', testDir: 'valid-tests' }
        ]
      };

      expect(() => {
        const summary = configReader.getConfigSummary(config);
        expect(summary).toContain('Projects: 4 configured');
      }).not.toThrow();
    });
  });

  describe('Performance and Scaling', () => {
    test('should handle large config objects efficiently', () => {
      const largeProjects = Array.from({ length: 100 }, (_, i) => ({
        name: `project-${i}`,
        testDir: `tests/project-${i}`,
        testMatch: [`**/*.project-${i}.spec.ts`],
        testIgnore: [`**/project-${i}/node_modules/**`]
      }));

      const largeConfig: PlaywrightConfig = {
        testDir: 'tests',
        testMatch: Array.from({ length: 50 }, (_, i) => `**/*.test-${i}.ts`),
        testIgnore: Array.from({ length: 30 }, (_, i) => `**/ignore-${i}/**`),
        projects: largeProjects
      };

      const startTime = Date.now();
      const patterns = configReader.extractTestPatterns(largeConfig);
      const summary = configReader.getConfigSummary(largeConfig);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(patterns.include).toContain('tests/**/*.test-0.ts');
      expect(patterns.include.length).toBeGreaterThanOrEqual(50);
      expect(summary).toContain('Projects: 100 configured');
    });

    test('should handle complex web server configurations', () => {
      const complexWebServers: PlaywrightConfig['webServer'] = Array.from({ length: 10 }, (_, i) => ({
        command: `npm run server-${i}`,
        port: 3000 + i,
        url: `http://localhost:${3000 + i}`,
        reuseExistingServer: i % 2 === 0,
        timeout: 60000 + (i * 1000),
        env: {
          [`SERVER_${i}_PORT`]: String(3000 + i),
          [`SERVER_${i}_ENV`]: 'development'
        }
      }));

      const config: PlaywrightConfig = {
        webServer: complexWebServers
      };

      const summary = configReader.getConfigSummary(config);
      expect(summary[0]).toContain('Web Servers:');
      expect(summary[0]).toContain('npm run server-0');
    });
  });

  describe('Edge Cases', () => {
    test('should handle config with circular references', () => {
      const config: any = { testDir: 'tests' };
      config.self = config; // Create circular reference

      expect(() => {
        const summary = configReader.getConfigSummary(config);
        expect(summary).toContain('Test Directory: tests');
      }).not.toThrow();
    });

    test('should handle config with very long strings', () => {
      const longString = 'a'.repeat(1000);
      const config: PlaywrightConfig = {
        testDir: longString,
        testMatch: [`${longString}/*.spec.ts`]
      };

      expect(() => {
        const patterns = configReader.extractTestPatterns(config);
        const summary = configReader.getConfigSummary(config);
      }).not.toThrow();
    });

    test('should handle config with special characters in patterns', () => {
      const config: PlaywrightConfig = {
        testMatch: ['**/*.spec.ts', '**/*[test].ts', '**/*?(test).ts'],
        testIgnore: ['**/[temp]/**', '**/*(backup)/**']
      };

      expect(() => {
        const patterns = configReader.extractTestPatterns(config);
        expect(patterns.include).toContain('**/*.spec.ts');
        expect(patterns.include).toContain('**/*[test].ts');
        expect(patterns.exclude).toContain('**/[temp]/**');
      }).not.toThrow();
    });

    test('should preserve web server environment variables', () => {
      const config: PlaywrightConfig = {
        webServer: {
          command: 'npm start',
          env: {
            NODE_ENV: 'test',
            PORT: '3000',
            API_URL: 'http://localhost:4000'
          }
        }
      };

      const coverageConfig: PlaywrightCoverConfig = {
        include: ['**/*.spec.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],
        ignoreElements: [],
        coverageThreshold: 80,
        outputPath: './coverage-report',
        reportFormat: 'html',
        discoverElements: true,
        staticAnalysis: true,
        runtimeTracking: true
      };

      const merged = configReader.mergeIntoCoverageConfig(config, coverageConfig);

      expect(merged.webServer?.command).toBe('npm start');
      expect(merged.webServer?.env).toEqual({
        NODE_ENV: 'test',
        PORT: '3000',
        API_URL: 'http://localhost:4000'
      });
    });
  });
});