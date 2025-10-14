# 🎯 Playwright Coverage Reporter

[![npm version](https://badge.fury.io/js/playwright-coverage-reporter.svg)](https://badge.fury.io/js/playwright-coverage-reporter)
[![CI](https://github.com/DoomedRamen/playwright-coverage-reporter/workflows/CI/badge.svg)](https://github.com/DoomedRamen/playwright-coverage-reporter/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter/branch/main/graph/badge.svg)](https://codecov.io/gh/DoomedRamen/playwright-coverage-reporter)

> 📊 **v2.0.0** - Native Playwright integration for UI element coverage analysis. Discover interactive elements, analyze selector coverage, and generate comprehensive reports with Istanbul support. **Now with real E2E test verification!**

Playwright Coverage Reporter helps you ensure your E2E tests are thoroughly testing all interactive elements on your web pages. It discovers buttons, inputs, links, and other interactive elements, then analyzes your test files to see which elements are being tested.

## 🆕 What's New in v2.0.7

### 🔧 **CLI Configuration Fixes**
- **Fixed CLI threshold handling** - Preset defaults now work correctly (development: 70%, testing: 100%)
- **Fixed configuration merge function** - Properly handles `undefined` and `null` values
- **Fixed CLI flag handling** - `--no-runtime-discovery` and `--no-screenshots` work correctly
- **Fixed force flag logic** - Properly exits with error code 1 when overwriting files
- **Fixed JavaScript syntax generation** - CLI now generates valid JavaScript syntax instead of JSON

### ✅ **Test Suite Improvements**
- **53/56 tests passing** - Significant improvement from previous versions
- **All CLI configuration tests passing** - Core functionality fully working
- **Fixed preset configuration handling** - All types (development, ci, testing, basic, comprehensive) work as expected
- **Comprehensive edge case coverage** - Configuration merge and validation improvements

### 🏗️ **Native Playwright Integration**
- **Seamless reporter integration** - no more fighting with TypeScript infrastructure
- **Runtime element discovery** during actual test execution
- **Real-time coverage analysis** based on test interactions

### 🛠️ **Enhanced CLI Tools**
- **setup-reporter**: Generate Playwright configurations automatically
- **validate-reporter**: Verify existing configurations
- **migrate-to-reporter**: Upgrade from standalone CLI
- **All commands verified working** with comprehensive test suite

### 🔧 **Critical Bug Fixes**
- **Fixed coverage calculation bug** - now correctly matches selectors (was 0%, now 48%)
- **TypeScript config warnings resolved** - tool works with minimal warnings
- **Enhanced selector matching** for complex real-world scenarios

## 🆕 What's New in v2.0.0

### ✅ **Verified with Real E2E Tests**
- **48% coverage detection** on comprehensive test application
- **11/23 elements covered** in real-world scenario
- **All report formats working** (HTML, JSON, LCOV, Istanbul)

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
- 🚀 **Zero Configuration**: Automatically uses Playwright config and starts dev servers
- 🔄 **Smart Dev Server Integration**: Auto-detects and starts dev servers from Playwright config

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

#### 🎯 **NEW: Native Playwright Reporter Integration**

The recommended approach is to use the **native Playwright reporter** for seamless integration with your existing test suite.

##### Quick Setup

1. **Set up the reporter**:
```bash
npx playwright-coverage setup-reporter --type development
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

##### Manual Configuration

Add the coverage reporter to your `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    [
      PlaywrightCoverageReporter,
      {
        outputPath: './coverage-report',
        format: 'console',
        threshold: 80,
        verbose: true,
        elementDiscovery: true,
        pageUrls: ['http://localhost:3000'],
        runtimeDiscovery: true
      }
    ]
  ],

  // Rest of your Playwright config...
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

##### Configuration Presets

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

##### Reporter Features

- **🔄 Runtime Discovery**: Discover elements during actual test execution
- **📊 Real-time Analysis**: Coverage calculated from actual test interactions
- **🎯 Test-aware Tracking**: Analyzes test steps and execution context
- **📱 Multi-browser Support**: Works across all Playwright browsers
- **🚀 Zero Setup**: Works out of the box with existing Playwright configs

#### Legacy Standalone Approach

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
- `--web-server` - Force start dev server from Playwright config
- `--no-web-server` - Disable automatic dev server startup
- `--playwright-config <path>` - Path to Playwright config file (default: `playwright.config.js`)

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
- `--web-server` - Force start dev server from Playwright config
- `--no-web-server` - Disable automatic dev server startup
- `--playwright-config <path>` - Path to Playwright config file (default: `playwright.config.js`)

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

#### `setup-reporter` ⭐ **NEW**
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

#### `validate-reporter` ⭐ **NEW**
Validate Playwright reporter configuration.

```bash
npx playwright-coverage validate-reporter [options]
```

**Options:**
- `-c, --config <path>` - Path to Playwright config file (default: `playwright.config.ts`)

#### `migrate-to-reporter` ⭐ **NEW**
Migrate from standalone CLI to Playwright reporter configuration.

```bash
npx playwright-coverage migrate-to-reporter [options]
```

**Options:**
- `-c, --config <path>` - Path to existing playwright-coverage.config.js
- `-o, --output <path>` - Output Playwright config file (default: `playwright.config.ts`)
- `-f, --force` - Overwrite existing configuration file

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

  // Automatically start dev server from Playwright config
  webServer: true,

  // Path to Playwright config file (optional)
  playwrightConfigPath: 'playwright.config.js',

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

## 🚀 Web Server Integration

The tool can automatically start your development server before running coverage analysis, eliminating the need to manually start servers.

### Automatic Dev Server

**🚀 Zero Configuration (Recommended):**
```bash
# Automatically starts dev server if found in Playwright config
npx playwright-coverage analyze

# Use custom Playwright config path
npx playwright-coverage analyze --playwright-config configs/playwright.dev.js

# Explicitly disable auto-start (if server is already running)
npx playwright-coverage analyze --no-web-server
```

**Manual Control:**
```bash
# Force start dev server even if not in Playwright config
npx playwright-coverage analyze --web-server

# Explicitly disable automatic server startup
npx playwright-coverage analyze --no-web-server
```

**Configuration:**
```javascript
module.exports = {
  // Custom Playwright config path (optional)
  playwrightConfigPath: 'playwright.config.js',

  // Rest of configuration...
  pageUrls: ['http://localhost:3000']
};
```

### How It Works

1. **Auto-Detects Playwright Config**: Automatically reads your `playwright.config.js` file
2. **Extracts Patterns**: Pulls test directories, patterns, and server configuration
3. **Starts Server Automatically**: If `webServer` is configured, launches it using the same command Playwright uses
4. **Waits for Ready**: Checks that the server is responding before proceeding
5. **Runs Analysis**: Performs coverage analysis on the running server
6. **Cleanup**: Automatically stops the server when analysis completes

> 💡 **Smart Behavior**: The tool automatically enables dev server startup when it finds `webServer` configuration in your Playwright config. Use `--no-web-server` to disable this behavior.

### Playwright Web Server Configuration

Configure your `playwright.config.js` with a web server:

```javascript
// playwright.config.js
module.exports = {
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },

  // Rest of Playwright config...
};
```

### Manual Web Server Configuration

If you prefer not to use Playwright's web server config, you can configure it directly:

```javascript
// playwright-coverage.config.js
module.exports = {
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000,
    env: {
      NODE_ENV: 'development'
    }
  }
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

## 🔧 Troubleshooting

### Common Issues and Solutions

#### TypeScript Configuration Warnings
**Issue**: Warning about TypeScript config not loading
```
⚠️ Cannot load TypeScript config playwright.config.ts. This requires either ts-node or a compiled JS version.
```
**Solution**: This is just a warning - the tool continues to work correctly. No action needed.

#### Low Coverage Percentage
**Issue**: Getting 0% or very low coverage despite having tests
**Solution**:
- Ensure your test files are being included (`--include patterns`)
- Check that page URLs are accessible and load correctly
- Verify selectors in tests match actual page elements

#### Browser Launch Issues
**Issue**: Browser fails to launch or pages don't load
**Solution**:
- Ensure Playwright browsers are installed: `npx playwright install`
- Check if your application server is running
- Verify page URLs are correct and accessible

#### Coverage Mismatch
**Issue**: Coverage doesn't match expectations
**Solution**:
- Use the `mismatch` command to analyze selector issues
- Check if elements have proper accessible attributes
- Verify test selectors are targeting correct elements

#### File Path Issues
**Issue**: CLI can't find test files or configuration
**Solution**:
- Use absolute paths or run from the correct directory
- Check file permissions and ensure files exist
- Verify include/exclude patterns match your file structure

### Performance Tips

- **Use specific include patterns**: Avoid analyzing unnecessary files
- **Limit page URLs**: Only analyze pages you actually test
- **Disable runtime discovery**: If not needed, set `runtimeDiscovery: false`
- **Use CI preset**: For automated pipelines, use the CI configuration preset

## 🔄 Migration Guide

### From Standalone CLI to Playwright Reporter

If you're currently using the standalone CLI, here's how to migrate:

#### Automatic Migration

```bash
# Automatically migrate your existing configuration
npx playwright-coverage migrate-to-reporter

# This will:
# - Read your playwright-coverage.config.js
# - Create a new playwright.config.ts with the reporter
# - Preserve your existing settings
```

#### Manual Migration

1. **Convert your configuration**:

**Before (standalone):**
```javascript
// playwright-coverage.config.js
module.exports = {
  include: ['**/*.spec.ts'],
  exclude: ['node_modules/**'],
  coverageThreshold: 80,
  outputPath: './coverage-report',
  pageUrls: ['http://localhost:3000'],
  reportFormat: 'html'
};
```

**After (reporter):**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import { PlaywrightCoverageReporter, CoveragePresets } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    ['html'],
    [PlaywrightCoverageReporter, CoveragePresets.development({
      threshold: 80,
      outputPath: './coverage-report',
      pageUrls: ['http://localhost:3000']
    })]
  ],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

2. **Update your CI/CD pipeline**:

**Before:**
```yaml
- name: Coverage Analysis
  run: npx playwright-coverage analyze --format istanbul
```

**After:**
```yaml
- name: Run Tests with Coverage
  run: npx playwright test

- name: Process Coverage Reports
  run: # Coverage is already generated during tests
```

#### Benefits of Migration

- **✅ Native Integration**: Works seamlessly with Playwright's test runner
- **🚀 Better Performance**: No duplicate browser launches
- **📊 Real-time Data**: Coverage based on actual test execution
- **🔄 Automatic**: No separate commands needed
- **📱 Multi-browser**: Coverage across all configured browsers

#### Troubleshooting Migration

**Issue**: My coverage reports are different after migration
- **Solution**: The reporter uses real test execution data instead of static analysis, providing more accurate results

**Issue**: Missing coverage for some elements
- **Solution**: Enable `runtimeDiscovery: true` in your reporter configuration

**Issue**: Tests are running slower
- **Solution**: Disable `runtimeDiscovery` or `elementDiscovery` if not needed

## 🎯 How It Works

1. **Static Analysis**: Scans your test files to extract all selectors used in Playwright test commands
2. **Element Discovery**: Launches a browser to discover all interactive elements on specified pages
3. **Coverage Calculation**: Matches discovered elements against test selectors to determine coverage
4. **Report Generation**: Creates comprehensive reports in multiple formats

## 📋 Examples

### Real-World Usage Examples

#### 1. React Application with Login and Dashboard

**Test file (`tests/auth.spec.ts`):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can login and access dashboard', async ({ page }) => {
    await page.goto('/login');

    // Login form elements
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await page.click('[data-testid="profile-menu"]');
    await page.click('text=Logout');
  });
});
```

**Coverage Result:**
```
📊 Coverage Summary:
   Total Elements: 15
   Covered Elements: 8
   Coverage: 53%

📄 Coverage by Type:
   Buttons: 3/5 (60%)
   Inputs: 2/2 (100%)
   Links: 3/8 (38%)

💡 Recommendations:
   • Add tests for navigation links in header
   • Test the settings button in dashboard
```

#### 2. E-commerce Application

**Test file (`tests/checkout.spec.ts`):**
```typescript
test('complete purchase flow', async ({ page }) => {
  await page.goto('/products/laptop');

  // Product page
  await page.click('button:has-text("Add to Cart")');
  await page.click('[data-testid="cart-icon"]');

  // Checkout process
  await page.click('button:has-text("Proceed to Checkout")');
  await page.fill('#shipping-address', '123 Main St');
  await page.fill('#payment-card', '4111111111111111');
  await page.click('button:has-text("Complete Purchase")');

  // Confirmation
  await expect(page.locator('text=Thank you for your order')).toBeVisible();
});
```

#### 3. Multi-Page Application Analysis

**Configuration for multiple pages:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { PlaywrightCoverageReporter } from 'playwright-coverage-reporter';

export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      outputPath: './coverage-report',
      format: 'all',
      threshold: 75,
      elementDiscovery: true,
      pageUrls: [
        'https://app.example.com',
        'https://app.example.com/login',
        'https://app.example.com/dashboard',
        'https://app.example.com/settings'
      ],
      runtimeDiscovery: true
    }]
  ]
});
```

### Different Selector Patterns Supported

The tool detects and matches various Playwright selector patterns:

```typescript
// All these selectors are detected and analyzed:
await page.click('#submit-button');           // ID selector
await page.fill('[data-testid="email"]');    // Test ID selector
await page.click('button:has-text("Login")'); // Text selector
await page.fill('input[name="username"]');    // Attribute selector
await page.click('role=button');               // Role selector
await page.getByLabel('Email').fill('...');     // Label selector
await page.getByPlaceholder('Password').fill('...'); // Placeholder selector
```

### Coverage Analysis Result

After running the coverage analysis, you'll get a detailed report showing:
- **Elements Covered**: Which interactive elements are tested
- **Missing Coverage**: Elements that need tests
- **Coverage by Type**: Breakdown by button, input, link, etc.
- **Specific Recommendations**: Actionable advice for improving coverage
- **File-level Insights**: Which test files cover which elements

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