# 🎯 Playwright Coverage Reporter

[![npm version](https://badge.fury.io/js/playwright-coverage-reporter.svg)](https://badge.fury.io/js/playwright-coverage-reporter)
[![CI](https://github.com/DoomedRamen/playwright-coverage-reporter/workflows/CI/badge.svg)](https://github.com/DoomedRamen/playwright-coverage-reporter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter/branch/main/graph/badge.svg)](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter)

> 📊 **v2.0.26** - Native Playwright integration for UI element coverage analysis. Discover interactive elements during test execution and generate comprehensive coverage reports.

Playwright Coverage Reporter helps you ensure your E2E tests are thoroughly testing all interactive elements on your web pages. It integrates directly with Playwright's test runner to analyze coverage during actual test execution.

## ✨ Features

- 🔍 **Cross-Test Coverage Aggregation**: Track which elements are covered by ANY test across your entire test suite
- 📈 **Persistent Coverage Data**: Coverage data persists across test runs to build comprehensive coverage maps
- 🎯 **Smart Recommendations**: Get prioritized suggestions for uncovered elements with generated test code
- 📊 **Multiple Report Formats**: Console, JSON, HTML, and LCOV coverage reports with detailed insights
- 🔍 **Runtime Element Discovery**: Automatically discover interactive elements during test execution
- 🎯 **Istanbul Integration**: Export coverage data in LCOV format for CI/CD integration
- ⚡ **Easy Setup**: Simple Playwright config integration - no separate configuration files needed
- 🏗️ **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🎛️ **Flexible Configuration**: Extensive configuration options for different project needs
- 🚀 **Zero Configuration**: Works out of the box with existing Playwright configs

## 🚀 Quick Start

### Installation

```bash
npm install -D playwright-coverage-reporter
```

### Basic Usage

1. **Add to your existing `playwright.config.ts`**:
```typescript
import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  // ... your existing configuration
  reporter: [
    ['html'],  // Keep your existing reporters
    [PlaywrightCoverageReporter, {
      outputPath: './coverage-report',
      threshold: 80,
      verbose: true
    }]
  ],
  // ... rest of your config
});
```

2. **Run your tests**:
```bash
npx playwright test
```

3. **View the coverage report**:
```bash
# Console output appears automatically during test execution
# For HTML report: open coverage-report/index.html
```

That's it! No separate configuration files needed - everything is configured directly in your Playwright config.

## 🔄 Cross-Test Coverage Aggregation

The most powerful feature of this reporter is **cross-test coverage aggregation**. Unlike traditional coverage tools that only look at individual test runs, this system tracks coverage across your entire test suite and persists data between test runs.

### How It Works

1. **Persistent Storage**: Coverage data is saved to `.coverage-data.json` in your output directory
2. **Cross-Test Analysis**: Elements are considered "covered" if ANY test in your suite interacts with them
3. **Smart Recommendations**: Get prioritized suggestions for elements that no test covers

### Example Output

```
📊 CROSS-TEST COVERAGE REPORT
══════════════════════════════════════════════════

📈 SUMMARY:
  Total Interactive Elements: 45
  Covered Elements: 38
  Uncovered Elements: 7
  Coverage Percentage: 84%
  Test Files: 12

📋 COVERAGE BY TYPE:
  button:          84% ████████████░░░░ (16/19)
  input:           90% ██████████████░░ (9/10)
  link:            75% ████████░░░░░░░ (9/12)
  select:          100% ████████████████ (2/2)

🚨 HIGH PRIORITY UNCOVERED ELEMENTS:
  ❌ #delete-account (button): Critical delete button is not tested. This could lead to major functionality issues.
  ❌ #export-data (button): Important export functionality is not covered by any tests.
```

### Benefits

- **Identify Gaps**: Find elements that NO test in your entire suite covers
- **Prioritize Testing**: Get high-priority recommendations for critical elements
- **Track Progress**: See coverage improve across multiple test runs
- **Team Collaboration**: Shared coverage data works for entire development teams

### Automatic Setup (Optional)

If you prefer automatic setup, you can use the CLI:

```bash
npx playwright-coverage setup-reporter --type development
```

## 🔧 Configuration

### Configuration Options

All configuration is done directly in your `playwright.config.ts` reporter section:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputPath` | string | `./coverage-report` | Directory for coverage reports |
| `format` | string | `console` | Report format: `console`, `html`, `json`, `lcov`, `all` |
| `threshold` | number | `80` | Coverage threshold percentage (0-100) |
| `verbose` | boolean | `false` | Enable detailed logging |
| `elementDiscovery` | boolean | `true` | Auto-discover elements on page load |
| `runtimeDiscovery` | boolean | `false` | Track interactions during tests |
| `pageUrls` | string[] | `[]` | Specific pages to analyze |
| `captureScreenshots` | boolean | `false` | Enable screenshots for debugging |

### Configuration Presets

Choose from pre-configured setups:

```typescript
// Development setup with detailed HTML reports
import { CoveragePresets } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, CoveragePresets.development()]
  ]
});

// CI/CD setup with JSON reports
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, CoveragePresets.ci()]
  ]
});

// Comprehensive setup with all features
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, CoveragePresets.comprehensive()]
  ]
});
```

### Environment Variables

You can also configure options via environment variables:

```bash
PLAYWRIGHT_COVERAGE_OUTPUT=./custom-coverage
PLAYWRIGHT_COVERAGE_FORMAT=html
PLAYWRIGHT_COVERAGE_THRESHOLD=90
PLAYWRIGHT_COVERAGE_VERBOSE=true
PLAYWRIGHT_COVERAGE_RUNTIME_DISCOVERY=true
```

## 🛠️ CLI Tools

The CLI provides helper commands for configuration management:

### `setup-reporter`

Set up Playwright reporter configuration.

```bash
npx playwright-coverage setup-reporter [options]
```

**Options:**
- `-t, --type <type>` - Configuration type: `development|ci|testing|basic|comprehensive` (default: `development`)
- `-o, --output <path>` - Output Playwright config file (default: `playwright.config.ts`)
- `-f, --force` - Overwrite existing configuration file
- `--base-url <url>` - Base URL for your application (default: `http://localhost:3000`)
- `--threshold <percentage>` - Coverage threshold percentage (default: `80`)
- `--page-urls <urls...>` - Additional page URLs to analyze
- `--no-runtime-discovery` - Disable runtime element discovery
- `--no-screenshots` - Disable screenshot capture

**Examples:**
```bash
# Development setup
npx playwright-coverage setup-reporter --type development

# CI/CD setup
npx playwright-coverage setup-reporter --type ci --base-url https://staging.example.com

# Comprehensive setup with custom pages
npx playwright-coverage setup-reporter --type comprehensive --page-urls /admin /dashboard --threshold 95
```

### `validate-reporter`

Validate Playwright reporter configuration.

```bash
npx playwright-coverage validate-reporter [options]
```

**Options:**
- `-c, --config <path>` - Path to Playwright config file (default: `playwright.config.ts`)

### `migrate-to-reporter`

Migrate from standalone CLI to Playwright reporter configuration.

```bash
npx playwright-coverage migrate-to-reporter [options]
```

**Options:**
- `-c, --config <path>` - Path to existing playwright-coverage.config.js
- `-o, --output <path>` - Output Playwright config file (default: `playwright.config.ts`)
- `-f, --force` - Overwrite existing configuration file

## 📊 Reports

### Console Report

```
📊 CROSS-TEST COVERAGE REPORT
══════════════════════════════════════════════════

📈 SUMMARY:
  Total Interactive Elements: 45
  Covered Elements: 38
  Uncovered Elements: 7
  Coverage Percentage: 84%
  Test Files: 12

📋 COVERAGE BY TYPE:
  button:          84% ████████████░░░░ (16/19)
  input:           90% ██████████████░░ (9/10)
  link:            75% ████████░░░░░░░ (9/12)
  select:          100% ████████████████ (2/2)

📄 COVERAGE BY PAGE:
  http://localhost:3000/login: 90% (18/20 elements)
  http://localhost:3000/dashboard: 75% (15/20 elements)
  http://localhost:3000/profile: 85% (11/13 elements)

🚨 HIGH PRIORITY UNCOVERED ELEMENTS:
  ❌ #delete-account (button): Critical delete button is not tested. This could lead to major functionality issues.
  ❌ #export-data (button): Important export functionality is not covered by any tests.
  ❌ .notification-settings (checkbox): User preference settings are not tested.

══════════════════════════════════════════════════
```

**Key Features of the Cross-Test Report:**
- **Persistent Data**: Shows coverage across ALL test runs, not just the current one
- **Smart Prioritization**: High-priority warnings for critical elements (submit buttons, delete actions, etc.)
- **Coverage by Type**: Breakdown by element type (buttons, inputs, links, etc.)
- **Page-Level Insights**: See which pages have the best/worst coverage

### HTML Report

Generate an interactive HTML report with detailed element information and coverage breakdowns.

### LCOV Reports

Export coverage data in standard LCOV format for CI/CD integration with tools like Codecov, Coveralls, or GitHub's coverage visualization.

## 🔧 Advanced Usage

### Custom Fixtures

For maximum control, you can use the custom fixtures approach:

```typescript
import { test, expect } from 'playwright-coverage-reporter/fixtures';

test('user flow with coverage tracking', async ({ page, trackInteraction }) => {
  await page.goto('/login');

  // Track interactions automatically
  await trackInteraction('#email', 'fill');
  await page.fill('#email', 'user@example.com');

  await trackInteraction('button[type="submit"]', 'click');
  await page.click('button[type="submit"]');

  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
});
```

### CI/CD Integration

#### GitHub Actions
```yaml
- name: Run Tests with Coverage
  run: npx playwright test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage-report/lcov.info
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Low Coverage Percentage
**Issue**: Getting 0% or very low coverage despite having tests
**Solution**:
- Ensure `elementDiscovery: true` is set in your configuration
- Check that tests are actually interacting with elements
- Verify selectors in tests match actual page elements

#### Coverage Reports Not Generated
**Issue**: No coverage reports are created after running tests
**Solution**:
- Ensure PlaywrightCoverageReporter is properly configured in your playwright.config.ts
- Check that tests are passing (failed tests are excluded from coverage)
- Verify the output directory permissions

#### TypeScript Configuration Issues
**Issue**: TypeScript errors when importing the reporter
**Solution**:
- Ensure you're using TypeScript files (`.ts`)
- Check that the package is properly installed: `npm install -D playwright-coverage-reporter`
- Make sure your tsconfig.json includes the node_modules type resolution

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and standards
- Pull request process
- Issue reporting
- Development setup

### Development

```bash
# Clone the repository
git clone https://github.com/DoomedRamen/playwright-coverage-reporter.git
cd playwright-coverage-reporter

# Install dependencies (this also sets up Git hooks automatically)
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/) for reliable browser automation
- Inspired by the need for better E2E test coverage visibility
- Coverage reporting compatible with [Istanbul](https://istanbul.js.org/) ecosystem

## 📞 Support

- 📖 [Documentation](https://github.com/DoomedRamen/playwright-coverage-reporter#readme)
- 🐛 [Report Issues](https://github.com/DoomedRamen/playwright-coverage-reporter/issues)
- 💬 [Discussions](https://github.com/DoomedRamen/playwright-coverage-reporter/discussions)

---

**Made with ❤️ by [Martin Page](https://github.com/DoomedRamen)**