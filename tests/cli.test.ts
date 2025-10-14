import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

test.describe('CLI Commands', () => {
  const cliPath = path.resolve(__dirname, '../dist/cli.js');

  test.beforeAll(() => {
    // Ensure the CLI is built
    if (!fs.existsSync(cliPath)) {
      execSync('npm run build', { cwd: path.resolve(__dirname, '..') });
    }
  });

  test('should show help', () => {
    const result = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(result).toContain('Coverage tool for Playwright E2E tests');
    expect(result).toContain('analyze');
    expect(result).toContain('init');
    expect(result).toContain('setup-reporter');
    expect(result).toContain('validate-reporter');
  });

  test('should show version', () => {
    const result = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    // Get version from package.json to match CLI version
    const packageVersion = require('../package.json').version;
    expect(result).toContain(packageVersion);
  });

  test('should setup reporter configuration', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'test-playwright.config.ts');

    try {
      execSync(`node ${cliPath} setup-reporter --type basic --output ${configPath}`, {
        cwd: tempDir,
        encoding: 'utf-8'
      });

      expect(fs.existsSync(configPath)).toBe(true);

      const configContent = fs.readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('PlaywrightCoverageReporter');
      expect(configContent).toContain('import { defineConfig, devices } from');
      expect(configContent).toContain('threshold: 80');

    } finally {
      // Cleanup
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should validate reporter configuration', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'test-playwright.config.ts');

    try {
      // Create a valid configuration
      const validConfig = `
import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      threshold: 80,
      outputPath: './coverage-report'
    }]
  ]
});`;

      fs.writeFileSync(configPath, validConfig);

      const result = execSync(`node ${cliPath} validate-reporter --config ${configPath}`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('✅ Configuration is valid!');
      expect(result).toContain('Coverage threshold is configured');

    } finally {
      // Cleanup
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should detect invalid configuration', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'invalid-playwright.config.ts');

    try {
      // Create an invalid configuration
      const invalidConfig = `
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html']]
});`;

      fs.writeFileSync(configPath, invalidConfig);

      const result = execSync(`node ${cliPath} validate-reporter --config ${configPath}`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('❌ Configuration has issues:');
      expect(result).toContain('PlaywrightCoverageReporter is not imported or configured');

    } finally {
      // Cleanup
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should migrate from standalone configuration', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const oldConfigPath = path.join(tempDir, 'playwright-coverage.config.js');
    const newConfigPath = path.join(tempDir, 'migrated-playwright.config.ts');

    try {
      // Create an old configuration
      const oldConfig = {
        include: ['**/*.spec.ts'],
        exclude: ['node_modules/**'],
        coverageThreshold: 85,
        outputPath: './custom-coverage',
        reportFormat: 'html',
        pageUrls: ['http://localhost:3000', 'http://localhost:3000/login']
      };

      fs.writeFileSync(oldConfigPath, `module.exports = ${JSON.stringify(oldConfig, null, 2)};`);

      const result = execSync(`node ${cliPath} migrate-to-reporter --config ${oldConfigPath} --output ${newConfigPath}`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('✅ Migration complete!');
      expect(result).toContain('Migrated coverage threshold: 85%');
      expect(result).toContain('Migrated 2 page URLs');

      expect(fs.existsSync(newConfigPath)).toBe(true);

      const newConfigContent = fs.readFileSync(newConfigPath, 'utf-8');
      expect(newConfigContent).toContain('PlaywrightCoverageReporter');
      expect(newConfigContent).toContain('threshold: 85');

    } finally {
      // Cleanup
      [oldConfigPath, newConfigPath].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  });

  test('should handle setup-reporter with different types', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const types = ['development', 'ci', 'testing', 'basic', 'comprehensive'];

    types.forEach(type => {
      const configPath = path.join(tempDir, `test-${type}-playwright.config.ts`);

      try {
        execSync(`node ${cliPath} setup-reporter --type ${type} --output ${configPath}`, {
          encoding: 'utf-8'
        });

        expect(fs.existsSync(configPath)).toBe(true);

        const configContent = fs.readFileSync(configPath, 'utf-8');
        expect(configContent).toContain('PlaywrightCoverageReporter');

        // Check type-specific settings
        if (type === 'ci') {
          expect(configContent).toContain('format: \'json\'');
        } else if (type === 'development') {
          expect(configContent).toContain('threshold: 70');
        } else if (type === 'testing') {
          expect(configContent).toContain('threshold: 100');
        }

      } finally {
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      }
    });
  });

  test('should handle custom options in setup-reporter', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'custom-playwright.config.ts');

    try {
      execSync(`node ${cliPath} setup-reporter --type comprehensive --base-url http://localhost:8080 --threshold 95 --page-urls http://localhost:8080/admin --no-runtime-discovery --no-screenshots --output ${configPath}`, {
        encoding: 'utf-8'
      });

      expect(fs.existsSync(configPath)).toBe(true);

      const configContent = fs.readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('baseURL: \'http://localhost:8080\'');
      expect(configContent).toContain('threshold: 95');
      expect(configContent).toContain('runtimeDiscovery: false');
      expect(configContent).toContain('captureScreenshots: false');

    } finally {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should handle missing configuration file gracefully', () => {
    const result = execSync(`node ${cliPath} validate-reporter --config nonexistent.config.ts`, {
      encoding: 'utf-8'
    });

    expect(result).toContain('❌ Configuration file nonexistent.config.ts not found.');
  });

  test('should handle force flag in setup-reporter', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'force-test.config.ts');

    try {
      // Create initial file
      fs.writeFileSync(configPath, '// Initial content');

      // First attempt should fail
      expect(() => {
        execSync(`node ${cliPath} setup-reporter --output ${configPath}`, {
          encoding: 'utf-8'
        });
      }).toThrow();

      // With --force should succeed
      execSync(`node ${cliPath} setup-reporter --output ${configPath} --force`, {
        encoding: 'utf-8'
      });

      const configContent = fs.readFileSync(configPath, 'utf-8');
      expect(configContent).toContain('PlaywrightCoverageReporter');
      expect(configContent).not.toContain('// Initial content');

    } finally {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });
});

test.describe('CLI Error Handling', () => {
  const cliPath = path.resolve(__dirname, '../dist/cli.js');

  test('should handle invalid command', () => {
    expect(() => {
      execSync(`node ${cliPath} invalid-command`, { encoding: 'utf-8' });
    }).toThrow();
  });

  test('should handle invalid options', () => {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const configPath = path.join(tempDir, 'invalid-options-test.config.ts');

    try {
      // Some CLI commands may not throw errors immediately, so let's check if it handles gracefully
      const result = execSync(`node ${cliPath} setup-reporter --type invalid-type --output ${configPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // At minimum, it should not crash and should return some output
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    } finally {
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  });

  test('should handle missing required files in migration', () => {
    const result = execSync(`node ${cliPath} migrate-to-reporter --config nonexistent.js`, {
      encoding: 'utf-8'
    });

    expect(result).toContain('❌ Existing configuration file nonexistent.js not found.');
  });
});