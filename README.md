# 🎯 Playwright Coverage Reporter

[![npm version](https://badge.fury.io/js/playwright-coverage-reporter.svg)](https://badge.fury.io/js/playwright-coverage-reporter)
[![CI](https://github.com/DoomedRamen/playwright-coverage-reporter/workflows/CI/badge.svg)](https://github.com/DoomedRamen/playwright-coverage-reporter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter/branch/main/graph/badge.svg)](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter)

> 📊 UI element coverage reporter for Playwright E2E tests. Discover interactive elements, analyze selector coverage, and generate comprehensive reports with Istanbul support.

Playwright Coverage Reporter helps you ensure your E2E tests are thoroughly testing all interactive elements on your web pages. It discovers buttons, inputs, links, and other interactive elements, then analyzes your test files to see which elements are being tested.

## ✨ Features

- 🔍 **Element Discovery**: Automatically discover all interactive elements (buttons, inputs, links, forms, etc.) on your web pages
- 📈 **Coverage Analysis**: Analyze test files to determine which elements are covered by selectors
- 🔧 **Selector Mismatch Analysis**: Identify why test selectors aren't matching actual page elements with specific recommendations
- 📊 **Multiple Reports**: Generate console, JSON, HTML, LCOV, and Istanbul-compatible coverage reports
- 🎯 **Istanbul Integration**: Export coverage data in LCOV and Istanbul formats for CI/CD integration
- ⚡ **Easy Setup**: Simple CLI interface with minimal configuration required
- 🏗️ **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- 🎛️ **Flexible Configuration**: Extensive configuration options for different project needs
- 🌐 **Multi-Page Support**: Analyze coverage across multiple pages and web applications

## 🚀 Quick Start

### Installation

```bash
npm install -D playwright-coverage-reporter
```

### Basic Usage

```bash
# Analyze coverage in your Playwright tests
npx playwright-coverage analyze

# Generate reports in all formats
npx playwright-coverage analyze --format all --output ./coverage-report

# Run a demo to see how it works
npx playwright-coverage demo
```

### Integration with Playwright

1. **Initialize configuration**:
```bash
npx playwright-coverage init
```

2. **Create a coverage fixture**:
```bash
npx playwright-coverage fixture -o src/test/coverage-fixture.ts
```

3. **Use in your tests**:
```typescript
import { test, expect } from './coverage-fixture';

test('login flow with coverage', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
});
```

## 📖 Usage

### CLI Commands

#### `analyze`
Analyze test coverage for Playwright tests.

```bash
npx playwright-coverage analyze [options]
```

**Options:**
- `-c, --config <path>` - Path to configuration file
- `-i, --include <patterns...>` - Include file patterns (default: `["**/*.spec.ts", "**/*.test.ts"]`)
- `-e, --exclude <patterns...>` - Exclude file patterns
- `-o, --output <path>` - Output directory (default: `./coverage-report`)
- `-f, --format <format>` - Report format: `console|json|html|lcov|istanbul|all`
- `-t, --threshold <percentage>` - Coverage threshold (default: 80)
- `-v, --verbose` - Verbose output
- `--page-url <urls...>` - Page URLs to analyze

#### `mismatch`
Analyze selector mismatches between tests and page elements.

```bash
npx playwright-coverage mismatch [options]
```

**Options:**
- `-c, --config <path>` - Path to configuration file
- `-i, --include <patterns...>` - Include file patterns (default: `["**/*.spec.ts", "**/*.test.ts"]`)
- `-e, --exclude <patterns...>` - Exclude file patterns
- `-v, --verbose` - Verbose output
- `--page-url <urls...>` - Page URLs to analyze

The `mismatch` command helps identify why your test selectors aren't matching actual page elements, providing specific recommendations for improving test coverage.

#### `demo`
Run a demonstration of the coverage tool.

```bash
npx playwright-coverage demo [options]
```

#### `init`
Initialize a configuration file.

```bash
npx playwright-coverage init [--force]
```

#### `fixture`
Generate test fixture code.

```bash
npx playwright-coverage fixture [-o <output>]
```

### Configuration

Create a `playwright-coverage.config.js` file:

```javascript
module.exports = {
  // Test files to include
  include: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e.ts'],

  // Files and directories to exclude
  exclude: ['node_modules/**', 'dist/**', '**/coverage/**'],

  // Elements to ignore during discovery
  ignoreElements: [
    '[data-testid="skip-coverage"]',
    '.test-only',
    '[aria-hidden="true"]'
  ],

  // Page URLs to analyze for element discovery
  pageUrls: [
    'http://localhost:3000',
    'http://localhost:3000/login',
    'http://localhost:3000/admin'
  ],

  // Coverage threshold percentage
  coverageThreshold: 80,

  // Output directory for reports
  outputPath: './coverage-report',

  // Report format(s)
  reportFormat: 'all',

  // Enable element discovery
  discoverElements: true,

  // Enable static code analysis
  staticAnalysis: true,

  // Enable runtime tracking during tests
  runtimeTracking: false
};
```

## 📊 Reports

### Coverage Report
```
🔍 Starting Playwright coverage analysis...
📊 Coverage Summary:
   Total Elements: 24
   Covered Elements: 18
   Coverage: 75% ⚠️

📄 Coverage by Type:
   Buttons: 8/10 (80%)
   Inputs: 6/8 (75%)
   Links: 4/6 (67%)

🎯 Uncovered Elements:
   • button: "Submit Order" (demo-page:checkout.spec.ts:15)
   • input: "Search" (demo-page:search.spec.ts:8)
```

### Selector Mismatch Analysis
```
🔍 Analyzing selector mismatches...
📊 Selector Mismatch Analysis:
Total selectors in tests: 699
Selectors that match elements: 15
Selectors with no matches: 684

❌ Common Mismatch Issues:
  css: 450 failing selectors
  text: 120 failing selectors
  test-id: 114 failing selectors

🔍 Sample Mismatches:
  • button[type="submit"] (css)
    Reason: CSS selector 'button[type="submit"]' matches no elements
  • :text("Sign In") (text)
    Reason: Text selector 'Sign In' not found. Current page text: Login, Register

💡 Recommendations:
  • Add data-testid attributes to interactive elements for more reliable testing
  • 114 test ID selectors are failing - verify test IDs match actual elements
  • Consider using test IDs instead of text selectors for better stability
```

### HTML Report
Generate an interactive HTML report with detailed element information and coverage breakdowns.

### Istanbul/LCOV Reports
Export coverage data in standard Istanbul formats for CI/CD integration with tools like Codecov, Coveralls, or GitHub's coverage visualization.

## 🔧 Advanced Usage

### Custom Element Discovery

Configure element discovery for your specific application:

```javascript
module.exports = {
  ignoreElements: [
    '[data-testid="skip-coverage"]',
    '.test-only',
    '[aria-hidden="true"]',
    '.development-only'
  ],
  discoverElements: true
};
```

### CI/CD Integration

#### GitHub Actions
```yaml
- name: Coverage Analysis
  run: npx playwright-coverage analyze --format istanbul --output coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

#### Multiple Page Analysis
```bash
npx playwright-coverage analyze --page-url "https://example.com" --page-url "https://app.example.com"
```

### Runtime Tracking

For more accurate coverage, enable runtime tracking:

```javascript
// In your test configuration
module.exports = {
  runtimeTracking: true,
  // This will track actual interactions during test execution
};
```

## 🎯 How It Works

1. **Static Analysis**: Scans your test files to extract all selectors used in Playwright test commands
2. **Element Discovery**: Launches a browser to discover all interactive elements on specified pages
3. **Coverage Calculation**: Matches discovered elements against test selectors to determine coverage
4. **Report Generation**: Creates comprehensive reports in multiple formats

## 📋 Examples

### Basic E2E Test Coverage

```typescript
import { test } from '@playwright/test';

test('user registration flow', async ({ page }) => {
  await page.goto('/register');

  // These interactions will be tracked for coverage
  await page.fill('[data-testid="username"]', 'john_doe');
  await page.fill('[data-testid="email"]', 'john@example.com');
  await page.fill('[data-testid="password"]', 'securepassword');
  await page.click('button[type="submit"]');

  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

### Coverage Analysis Result

After running the coverage analysis, you'll get a detailed report showing:
- Which elements are covered by tests
- Which interactive elements are missing test coverage
- Coverage percentages by element type
- Recommendations for improving coverage

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

# Run demo
npm run test:demo
```

## 🔄 Version Management

This project uses **lefthook** and **package-bump** for automatic version management:

### Pre-commit Hooks
- **Linting**: Automatically lints code before commits
- **Build & Test**: Ensures code builds and tests pass before committing
- **Version Bump**: Automatically bumps patch version when source files change
- **Staging**: Automatically stages the bumped `package.json` for commit

### Manual Version Bumps
```bash
npm run release        # Patch version (1.0.0 → 1.0.1)
npm run release:minor  # Minor version (1.0.0 → 1.1.0)
npm run release:major  # Major version (1.0.0 → 2.0.0)
```

### Publishing Workflow
1. Make changes to source files
2. Git commit triggers automatic version bump (pre-commit hook)
3. Push to main branch triggers npm publish (GitHub Actions)
4. GitHub release is created automatically

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