/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test configuration
    testTimeout: 30000,
    hookTimeout: 10000,

    // Test environment
    environment: 'node',

    // Test files
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],

    // Exclude E2E tests from unit test runs
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
      'tests/fixtures/**',
      'tests/utils/**',
      'dist/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },

    // Setup files
    setupFiles: [],

    // Global variables
    globals: false,

    // Watch mode
    watch: false,

    // Reporter
    reporter: ['default', 'junit'],
    outputFile: {
      junit: 'test-results/unit-test-results.xml'
    },

    // Use single thread to avoid process.chdir() issues in CLI tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },

    // Retry configuration
    retry: 2,

    // Verbose output
    verbose: true,

    // Allow only and skip
    allowOnly: process.env.CI !== 'true'
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests')
    }
  },

  // Define global constants
  define: {
    __TEST__: 'true'
  }
});