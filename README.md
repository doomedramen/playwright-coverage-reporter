# 🎯 Playwright Coverage Reporter

[![npm version](https://badge.fury.io/js/playwright-coverage-reporter.svg)](https://badge.fury.io/js/playwright-coverage-reporter)
[![CI](https://github.com/DoomedRamen/playwright-coverage-reporter/workflows/CI/badge.svg)](https://github.com/DoomedRamen/playwright-coverage-reporter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter/branch/main/graph/badge.svg)](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter)

> 📊 Native Playwright integration for UI element coverage analysis. Discover interactive elements during test execution and generate comprehensive coverage reports.

Playwright Coverage Reporter helps you ensure your E2E tests are thoroughly testing all interactive elements on your web pages. It integrates directly with Playwright's test runner to analyze coverage during actual test execution.

## ✨ Features

### Core Coverage Features
- 🔍 **Cross-Test Coverage Aggregation**: Track which elements are covered by ANY test across your entire test suite
- 📈 **Persistent Coverage Data**: Coverage data persists across test runs to build comprehensive coverage maps
- 🎯 **Smart Recommendations**: Get prioritized suggestions for uncovered elements with generated test code
- 📊 **Multiple Report Formats**: Console, JSON, HTML, and LCOV coverage reports with detailed insights
- 🔍 **Runtime Element Discovery**: Automatically discover interactive elements during test execution
- 🎯 **Istanbul Integration**: Export coverage data in LCOV format for CI/CD integration
- 📸 **Screenshot Capture**: Capture screenshots of uncovered elements for visual debugging

### Enterprise Features
- ⚡ **Performance Optimization**: Batch processing, concurrency control, and memory management for large test suites
- 🛡️ **Advanced Error Handling**: Intelligent error recovery with detailed guidance and troubleshooting steps
- 🔧 **Configuration Validation**: Comprehensive validation with actionable recommendations and debug mode
- 🎯 **Element Filtering**: Advanced filtering system with presets for comprehensive, essential, and minimal coverage
- 📊 **Performance Monitoring**: Built-in performance metrics and optimization recommendations
- 🚀 **Zero Configuration**: ✨ **NEW!** Works out of the box with automatic element discovery from test files
- 🏗️ **TypeScript Support**: Full TypeScript support with comprehensive type definitions

## 🚀 Quick Start

### Installation

```bash
npm install -D playwright-coverage-reporter
```

### Zero Configuration Setup ✨

**v3.0.0+ - Works out of the box!** The reporter now automatically discovers elements from your test files and requires zero configuration:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],  // Keep your existing reporters
    ['playwright-coverage-reporter'] // Just add this line!
  ],
});
```

That's it! 🎉 The reporter will automatically:
- ✅ Analyze your test files to discover selectors
- ✅ Create synthetic elements for coverage tracking
- ✅ Generate meaningful coverage reports
- ✅ Work with any existing Playwright tests
- ✅ Use a 0% threshold by default for mixed test suites (no configuration needed!)

### Basic Usage (with customization)

If you want to customize the behavior, you can add options:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],  // Keep your existing reporters
    ['playwright-coverage-reporter', {
      outputPath: './coverage-report',
      threshold: 80,
      verbose: true,
      elementDiscovery: true  // Enable cross-test coverage aggregation
    }]
  ],
});
```

**Alternative: Class-based Configuration**
```typescript
import { defineConfig } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],  // Keep your existing reporters
    [PlaywrightCoverageReporter, {
      outputPath: './coverage-report',
      threshold: 80,
      verbose: true,
      elementDiscovery: true  // Enable cross-test coverage aggregation
    }]
  ],
});
```

> **Note**: The string-based approach is recommended as it's more robust and avoids potential module resolution issues in some environments.

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

## 🔧 Configuration

### Configuration Options

All configuration is done directly in your `playwright.config.ts` reporter section:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| **Core Options** | | | |
| `outputPath` | string | `./coverage-report` | Directory for coverage reports |
| `format` | string | `console` | Report format: `console`, `html`, `json`, `lcov`, `all` |
| `threshold` | number | `0` | Coverage threshold percentage (0-100) |
| `verbose` | boolean | `false` | Enable detailed logging |
| `elementDiscovery` | boolean | `true` | Auto-discover elements on page load |
| `runtimeDiscovery` | boolean | `false` | Track interactions during tests |
| `pageUrls` | string[] | `[]` | Specific pages to analyze |
| `captureScreenshots` | boolean | `false` | Enable screenshots for debugging |
| | | | |
| **Enterprise Features** | | | |
| `validateConfig` | boolean | `true` | Enable comprehensive configuration validation |
| `debugMode` | boolean | `false` | Enable debug information and performance analysis |
| `performanceProfile` | string | `'development'` | Performance preset: `development`, `ci`, `large`, `minimal` |
| `elementFilter` | object/string | `undefined` | Element filtering configuration or preset name |
| `enableErrorRecovery` | boolean | `true` | Enable automatic error recovery with degraded mode |
| `cacheResults` | boolean | `true` | Enable result caching for better performance |
| `maxConcurrency` | number | `profile-dependent` | Maximum concurrent operations |
| `timeoutMs` | number | `30000` | Operation timeout in milliseconds |

### Threshold Configuration

The coverage threshold determines when the reporter will fail your test run based on coverage percentage:

```typescript
// No threshold enforcement (good for mixed test suites with CLI tests)
export default defineConfig({
  reporter: [['playwright-coverage-reporter', { threshold: 0 }]]
});

// Standard coverage enforcement (good for pure UI test suites)
export default defineConfig({
  reporter: [['playwright-coverage-reporter', { threshold: 80 }]]
});

// Dogfooding setup (ensure your own code has good coverage)
export default defineConfig({
  reporter: [['playwright-coverage-reporter', { threshold: 85 }]]
});
```

**Recommended Thresholds:**
- **0%**: Mixed test suites (CLI + UI tests), development environments
- **70-80%**: Standard UI test suites, good balance of coverage vs. practicality
- **85-95%**: Dogfooding, critical applications, high-quality standards
- **100%**: Not recommended (can be counterproductive and brittle)

### Configuration Presets

Choose from pre-configured setups:

```typescript
// Development setup with detailed HTML reports
import { PlaywrightCoverageReporter, CoveragePresets } from 'playwright-coverage-reporter';

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

### Performance Optimization

For large test suites, use performance profiles to optimize execution:

```typescript
import { defineConfig } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      performanceProfile: 'ci', // Optimized for CI/CD
      maxConcurrency: 2,        // Limit concurrent operations
      cacheResults: true,        // Enable caching
      timeoutMs: 60000          // Longer timeout for large suites
    }]
  ],
});
```

**Available Performance Profiles:**
- `development`: Optimized for local development with detailed logging
- `ci`: Optimized for CI/CD with minimal resource usage
- `large`: Optimized for large test suites with aggressive batching
- `minimal`: Minimal resource usage for constrained environments

### Element Filtering

Filter which elements to include in coverage analysis:

```typescript
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      // Use preset
      elementFilter: 'essential',

      // Or custom configuration
      elementFilter: {
        includeTypes: ['button', 'input', 'link'],
        excludeTypes: ['div', 'span'],
        includeSelectors: ['[data-testid]', '[role="button"]'],
        excludeSelectors: ['.hidden', '[aria-hidden="true"]'],
        minVisibility: 0.5,
        includeHidden: false
      }
    }]
  ],
});
```

**Filter Presets:**
- `comprehensive`: Include all interactive elements
- `essential`: Only critical elements (buttons, inputs, links)
- `minimal`: Bare minimum elements for basic coverage
- `forms`: Form-related elements only
- `navigation`: Navigation elements only

### Debug Mode

Enable comprehensive debugging for troubleshooting:

```typescript
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      debugMode: true,
      validateConfig: true,
      verbose: true
    }]
  ],
});
```

### CI/CD Integration

#### Enhanced GitHub Actions
```yaml
name: Tests with Coverage
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test
        env:
          PLAYWRIGHT_COVERAGE_FORMAT: json
          PLAYWRIGHT_COVERAGE_THRESHOLD: 80
          PLAYWRIGHT_COVERAGE_VERBOSE: true

      - name: Upload coverage reports
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage-report/

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('coverage-report/coverage-summary.json')) {
              const coverage = JSON.parse(fs.readFileSync('coverage-report/coverage-summary.json', 'utf8'));

              const comment = `
              ## 📊 Playwright Coverage Report

              | Metric | Value |
              |--------|-------|
              | Coverage | ${coverage.coveragePercentage}% |
              | Elements | ${coverage.coveredElements}/${coverage.totalElements} |
              | Tests | ${coverage.testFiles} |

              ${coverage.coveragePercentage < 80 ? '⚠️ Coverage below threshold!' : '✅ Coverage threshold met'}
              `;

              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Configuration Validation Errors
**Issue**: Configuration validation failed during initialization
**Solution**:
- Enable `debugMode: true` in configuration for more details
- Check for invalid option values or missing required fields
- Verify your playwright.config.ts syntax

#### Performance Issues
**Issue**: Coverage analysis is too slow or consumes too much memory
**Solution**:
- Use `performanceProfile: 'ci'` or `'minimal'` for better performance
- Set `maxConcurrency` to limit concurrent operations
- Enable `cacheResults: true` for better performance on subsequent runs
- Use element filtering to reduce the number of elements analyzed

#### Low Coverage Percentage
**Issue**: Getting 0% or very low coverage despite having tests
**Solution**:
- Ensure `elementDiscovery: true` is set in your configuration
- Check that tests are actually interacting with elements
- Verify selectors in tests match actual page elements
- Use `debugMode: true` to see detailed discovery logs

#### Coverage Reports Not Generated
**Issue**: No coverage reports are created after running tests
**Solution**:
- Ensure PlaywrightCoverageReporter is properly configured in your playwright.config.ts
- Check that tests are passing (failed tests are excluded from coverage)
- Verify the output directory permissions
- Check for initialization errors in console output

#### Error Recovery Mode
**Issue**: Reporter falls back to degraded mode
**Solution**:
- Check console for specific error messages and guidance
- Enable `debugMode: true` to identify configuration issues
- Fix underlying configuration problems and restart tests
- Some errors are recoverable and will provide specific guidance

#### TypeScript Configuration Issues
**Issue**: TypeScript errors when importing the reporter
**Solution**:
- Ensure you're using TypeScript files (`.ts`)
- Check that the package is properly installed: `npm install -D playwright-coverage-reporter`
- Make sure your tsconfig.json includes the node_modules type resolution

#### Memory Issues in Large Projects
**Issue**: Out of memory errors with large test suites
**Solution**:
- Use `performanceProfile: 'large'` or `performanceProfile: 'minimal'`
- Reduce `maxConcurrency` to limit parallel processing
- Enable element filtering to reduce scope
- Increase system memory or run tests in smaller batches

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