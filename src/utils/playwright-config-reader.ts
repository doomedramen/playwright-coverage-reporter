import { PlaywrightCoverConfig } from '../types';

export interface PlaywrightConfig {
  testDir?: string;
  testMatch?: string[];
  testIgnore?: string[];
  webServer?: {
    command: string;
    url?: string;
    port?: number;
    reuseExistingServer?: boolean;
    timeout?: number;
    env?: Record<string, string>;
  } | {
    command: string;
    url?: string;
    port?: number;
    reuseExistingServer?: boolean;
    timeout?: number;
    env?: Record<string, string>;
  }[];
  projects?: Array<{
    name?: string;
    testDir?: string;
    testMatch?: string[];
    testIgnore?: string[];
  }>;
}

export class PlaywrightConfigReader {
  /**
   * Load and parse Playwright configuration file
   */
  async loadConfig(configPath?: string): Promise<PlaywrightConfig | null> {
    const path = require('path');
    const fs = require('fs');

    const possiblePaths = [
      configPath ? path.resolve(configPath) : null,
      path.resolve('playwright.config.js'),
      path.resolve('playwright.config.ts'),
      path.resolve('playwright.config.mjs')
    ].filter(Boolean);

    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          console.log(`📋 Loading Playwright configuration from ${configPath}`);

          // Handle different file types
          const config = await this.loadConfigFile(configPath);
          if (config) {
            return config as PlaywrightConfig;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load Playwright config from ${configPath}:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Load a specific config file, handling different module types
   */
  private async loadConfigFile(configPath: string): Promise<any> {
    const path = require('path');

    // Clear require cache to ensure fresh load
    try {
      delete require.cache[require.resolve(configPath)];
    } catch {
      // Module might not be cached yet, ignore error
    }

    // Handle different file extensions
    if (configPath.endsWith('.ts')) {
      return this.loadTypeScriptConfig(configPath);
    } else if (configPath.endsWith('.mjs')) {
      return this.loadESModuleConfig(configPath);
    } else {
      // CommonJS (.js)
      const configModule = require(configPath);
      return configModule.default || configModule;
    }
  }

  /**
   * Load TypeScript config using dynamic import
   */
  private async loadTypeScriptConfig(configPath: string): Promise<any> {
    const path = require('path');

    try {
      // Try to use dynamic import for ES modules/TypeScript
      const moduleUrl = `file://${path.resolve(configPath)}`;
      const configModule = await import(moduleUrl);
      return configModule.default || configModule;
    } catch (error) {
      // Fallback: try transpiling with ts-node if available
      try {
        const tsNode = require('ts-node');
        tsNode.register();
        const configModule = require(configPath);
        return configModule.default || configModule;
      } catch (tsNodeError) {
        throw new Error(`TypeScript config loading failed. Please install ts-node or convert to CommonJS: ${error.message}`);
      }
    }
  }

  /**
   * Load ES module config
   */
  private async loadESModuleConfig(configPath: string): Promise<any> {
    const path = require('path');

    try {
      const moduleUrl = `file://${path.resolve(configPath)}`;
      const configModule = await import(moduleUrl);
      return configModule.default || configModule;
    } catch (error) {
      throw new Error(`ES module loading failed: ${error.message}`);
    }
  }

  /**
   * Extract test patterns from Playwright config
   */
  extractTestPatterns(config: PlaywrightConfig): {
    include: string[];
    exclude: string[];
  } {
    const include: string[] = [];
    const exclude: string[] = [];

    // Default Playwright patterns
    const defaultInclude = ['**/*.spec.ts', '**/*.test.ts'];
    const defaultExclude = ['**/node_modules/**', '**/dist/**'];

    // Handle testMatch patterns
    if (config.testMatch) {
      include.push(...config.testMatch);
    } else {
      include.push(...defaultInclude);
    }

    // Handle testIgnore patterns
    if (config.testIgnore) {
      exclude.push(...config.testIgnore);
    }

    // Handle testDir - convert to glob pattern
    if (config.testDir) {
      const testDirPattern = config.testDir.endsWith('/')
        ? config.testDir.slice(0, -1)
        : config.testDir;

      // Prepend testDir to relative patterns
      const adjustedInclude = include.map(pattern => {
        if (pattern.startsWith('**/')) {
          return `${testDirPattern}/${pattern}`;
        }
        if (!pattern.includes('/')) {
          return `${testDirPattern}/${pattern}`;
        }
        return pattern;
      });

      include.length = 0;
      include.push(...adjustedInclude);
    } else {
      // Default testDir
      include.unshift('tests/**', 'e2e/**');
    }

    // Add default exclude patterns if none provided
    if (exclude.length === 0) {
      exclude.push(...defaultExclude);
    }

    // Add coverage report directory to exclusions
    exclude.push('**/coverage/**', '**/coverage-report/**');

    return { include, exclude };
  }

  /**
   * Merge Playwright config into PlaywrightCover config
   */
  mergeIntoCoverageConfig(
    playwrightConfig: PlaywrightConfig,
    coverageConfig: PlaywrightCoverConfig
  ): PlaywrightCoverConfig {
    const merged = { ...coverageConfig };

    // Extract and merge test patterns
    const testPatterns = this.extractTestPatterns(playwrightConfig);

    // Only override if user hasn't explicitly set include patterns
    // Check if the current include patterns are the defaults
    const isDefaultInclude = coverageConfig.include.length === 3 &&
         coverageConfig.include[0] === '**/*.spec.ts' &&
         coverageConfig.include[1] === '**/*.test.ts' &&
         coverageConfig.include[2] === '**/*.e2e.ts';

    if (isDefaultInclude || !coverageConfig.include || coverageConfig.include.length === 0) {
      merged.include = testPatterns.include;
    }

    // Only override if user hasn't explicitly set exclude patterns
    // Check if the current exclude patterns are the defaults
    const isDefaultExclude = coverageConfig.exclude.length === 3 &&
         coverageConfig.exclude[0] === 'node_modules/**' &&
         coverageConfig.exclude[1] === 'dist/**' &&
         coverageConfig.exclude[2] === '**/coverage/**';

    if (isDefaultExclude || !coverageConfig.exclude) {
      merged.exclude = testPatterns.exclude;
    }

    // Automatically enable web server if found in Playwright config
    if (playwrightConfig.webServer) {
      console.log('🚀 Found web server configuration in Playwright config, auto-enabling dev server...');

      if (Array.isArray(playwrightConfig.webServer)) {
        // Use the first web server if multiple are configured
        merged.webServer = playwrightConfig.webServer[0];
        console.log(`📋 Using web server: ${playwrightConfig.webServer[0].command}`);
      } else {
        merged.webServer = playwrightConfig.webServer;
        console.log(`📋 Using web server: ${playwrightConfig.webServer.command}`);
      }
    }

    return merged;
  }

  /**
   * Get summary of Playwright configuration
   */
  getConfigSummary(config: PlaywrightConfig): string[] {
    const summary: string[] = [];

    if (config.testDir) {
      summary.push(`Test Directory: ${config.testDir}`);
    }

    if (config.testMatch) {
      summary.push(`Test Patterns: ${config.testMatch.join(', ')}`);
    }

    if (config.testIgnore) {
      summary.push(`Ignore Patterns: ${config.testIgnore.join(', ')}`);
    }

    if (config.webServer) {
      if (Array.isArray(config.webServer)) {
        summary.push(`Web Servers: ${config.webServer.map(ws => ws.command).join(', ')}`);
      } else {
        summary.push(`Web Server: ${config.webServer.command}`);
      }
    }

    if (config.projects && config.projects.length > 0) {
      summary.push(`Projects: ${config.projects.length} configured`);
    }

    return summary;
  }
}