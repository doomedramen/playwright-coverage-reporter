# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-17

### 🎉 "Just Works" Release - Zero Configuration Required

This is a major usability improvement that makes the coverage reporter work out of the box with zero configuration required.

### ✨ New Features

- **🚀 Zero Configuration**: The reporter now automatically works out of the box with no setup required
- **🔍 Smart Element Discovery**: Automatically discovers selectors from test files and creates synthetic elements for coverage tracking
- **🧠 Intelligent Defaults**: Smart configuration that adapts based on available page URLs
- **🎯 Automatic Coverage**: Generates meaningful coverage reports from any existing Playwright tests

### 🔧 Key Improvements

- **Smart Default Configuration**:
  - If `pageUrls` are provided → enable `elementDiscovery`
  - If no `pageUrls` → enable `runtimeDiscovery` automatically
  - Eliminates configuration conflicts that caused 0 elements to be discovered
- **Synthetic Element Creation**: Automatically creates "synthetic elements" from extracted selectors during test execution
- **Enhanced Static Analysis**: Better integration between static selector extraction and coverage aggregation
- **Improved Element Discovery**: Elements are now added to the aggregator before being marked as covered

### 🚨 Bug Fixes

- **Fixed 0 Elements Issue**: Resolved the major issue where coverage reports showed 0 total elements
- **Configuration Conflicts**: Fixed conflicts between `elementDiscovery` and `runtimeDiscovery` settings
- **Coverage Aggregation**: Fixed issue where discovered elements weren't properly tracked across test runs

### 📊 Before vs After

**Before (v2.0.x)**:
```
📈 SUMMARY:
  Total Interactive Elements: 0
  Covered Elements: 0
  Coverage Percentage: 0%
```

**After (v2.1.0)**:
```
📈 SUMMARY:
  Total Interactive Elements: 52
  Covered Elements: 15
  Coverage Percentage: 29%
```

### 🎯 Zero Configuration Setup

```typescript
// v2.1.0+ - Just add this line and it works!
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [
    ['list'],
    ['playwright-coverage-reporter'] // That's it! 🎉
  ],
});
```

### 💡 Benefits

- **✅ Zero Setup**: Works immediately with any existing Playwright tests
- **🎯 Automatic Discovery**: No need to specify page URLs or configuration
- **📊 Meaningful Reports**: Always generates useful coverage data
- **🔄 Backward Compatible**: Existing configurations continue to work unchanged

### 🧪 Technical Changes

- **Enhanced Constructor Logic**: Smart defaults based on configuration parameters
- **Improved Static Analysis**: Better integration with `CoverageAggregator`
- **Synthetic Element Tracking**: Elements are created from selectors and properly tracked
- **Better Error Prevention**: Configuration conflicts are automatically resolved

## [2.0.27] - 2025-01-15

### 🎯 Cross-Test Coverage Aggregation

This major enhancement introduces intelligent cross-test coverage analysis that tracks which elements are covered by ANY test across your entire test suite, not just individual test runs.

### ✨ New Features

- **🔄 Persistent Coverage Data**: Coverage data is saved to `.coverage-data.json` and persists across test runs
- **📊 Cross-Test Analysis**: Elements are considered "covered" if ANY test in your suite interacts with them
- **🎯 Smart Recommendations**: Get prioritized suggestions for uncovered elements with generated test code
- **🚨 Priority-Based Warnings**: High-priority alerts for critical elements (submit buttons, delete actions, etc.)
- **📈 Coverage by Type**: Detailed breakdown by element type (buttons, inputs, links, etc.)
- **📄 Page-Level Insights**: See which pages have the best/worst coverage across your entire suite

### 🔧 Key Improvements

- **Enhanced Coverage Calculator**: `CoverageAggregator` class for intelligent cross-test analysis
- **Smart Element Mapping**: Better conversion between SelectorType and ElementType enums
- **Improved Recommendations**: Generated test code with proper Playwright syntax
- **Better Data Persistence**: Reliable storage and retrieval of coverage data across runs
- **Enhanced Error Handling**: More robust handling of edge cases and malformed data

### 📊 New Report Features

```
📊 CROSS-TEST COVERAGE REPORT
══════════════════════════════════════════════════

📈 SUMMARY:
  Total Interactive Elements: 45
  Covered Elements: 38
  Uncovered Elements: 7
  Coverage Percentage: 84%
  Test Files: 12

🚨 HIGH PRIORITY UNCOVERED ELEMENTS:
  ❌ #delete-account (button): Critical delete button is not tested
  ❌ #export-data (button): Important export functionality is not covered
```

### 🛠️ Technical Changes

- **New `CoverageAggregator` Class**: Core engine for cross-test coverage analysis
- **Enhanced Type Safety**: Fixed TypeScript compilation errors and improved type mappings
- **Better Data Models**: Improved interfaces for coverage records and recommendations
- **Persistent Storage**: JSON-based storage system for coverage data
- **Smart Element Discovery**: Enhanced runtime element discovery with better tracking

### 🧪 Testing Updates

- **Enhanced Test Coverage**: Added tests for cross-test aggregation functionality
- **Fixed Type Issues**: Resolved TypeScript compilation errors
- **Improved Error Handling**: Better test coverage for edge cases
- **Updated CLI Tests**: Fixed test expectations for actual CLI output format

### 💡 Benefits

- **True Coverage Visibility**: See which elements are NEVER tested by ANY test
- **Prioritized Testing**: Focus on critical elements that need test coverage
- **Team Collaboration**: Shared coverage data works across entire development teams
- **Progress Tracking**: Monitor coverage improvement across multiple test runs
- **Better ROI**: Focus testing efforts on elements that actually need coverage

## [2.0.0] - 2025-01-14

### 🎉 MAJOR RELEASE - Playwright-First Architecture

This release represents a complete architectural transformation from a standalone CLI tool to a native Playwright reporter integration, leveraging Playwright's existing TypeScript infrastructure rather than fighting against it.

### ✨ New Features

- **🎯 Native Playwright Reporter Integration**: Seamless integration with Playwright test runner through native reporter API
- **🔄 Runtime Element Discovery**: Discover interactive elements during test execution for real-time coverage analysis
- **📋 Configuration Presets**: Ready-to-use configurations for different environments (development, CI, comprehensive, testing)
- **🛠️ Enhanced CLI Commands**:
  - `setup-reporter` - Generate Playwright reporter configurations
  - `validate-reporter` - Validate existing configurations
  - `migrate-to-reporter` - Migrate from standalone CLI to reporter approach
- **🌍 Environment Variable Support**: Configure through environment variables for CI/CD integration
- **📊 Multiple Report Formats**: Console, JSON, HTML, LCOV, Istanbul, and all-in-one output
- **🔍 Configuration Validation**: Comprehensive validation with detailed error messages
- **📸 Screenshot Capture**: Optional screenshots for uncovered elements during testing
- **🎭 Demo Mode**: Built-in demo for testing and evaluation

### 🏗️ Architecture Changes

- **Playwright-First Design**: Leverages Playwright's TypeScript compilation and execution infrastructure
- **Reporter Pattern**: Uses Playwright's native reporter API (onBegin, onTestBegin, onTestEnd, onEnd)
- **Hybrid Analysis**: Combines static code analysis with runtime element discovery
- **Improved Performance**: Eliminates duplicate TypeScript processing by using Playwright's existing infrastructure

### 🔄 Migration Features

- **Automatic Migration**: Built-in tools to migrate from standalone CLI configuration to reporter configuration
- **Backward Compatibility**: Existing standalone CLI commands still work for legacy use cases
- **Gradual Transition**: Allows teams to migrate at their own pace

### 🛠️ Enhanced CLI

```bash
# New Playwright-first workflow
npx playwright-coverage setup-reporter --type development
npx playwright test
open coverage-report/index.html

# Migration from standalone CLI
npx playwright-coverage migrate-to-reporter --config old-config.js --output playwright.config.ts
```

### 📦 Package Updates

- **Version**: 1.0.17 → 2.0.0 (major version bump due to architectural changes)
- **Description**: Updated to reflect native Playwright integration
- **Dependencies**: Enhanced with Playwright reporter dependencies

### 🧪 Testing

- **Comprehensive Test Suite**: 56 tests covering all major functionality
- **End-to-End Testing**: Complete workflow verification from setup to report generation
- **Test Coverage**: 86% test pass rate (48/56 tests passing)
- **Multiple Test Scenarios**: CLI commands, configuration validation, reporter functionality

### 📚 Documentation

- **Updated README**: Comprehensive documentation for Playwright reporter usage
- **Migration Guide**: Step-by-step guide for upgrading from standalone CLI
- **Troubleshooting Section**: Common issues and solutions
- **Benefits Comparison**: Clear advantages of Playwright-first approach

### 🔧 Configuration Examples

```typescript
// Development preset
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      threshold: 70,
      format: 'html',
      runtimeDiscovery: true,
      captureScreenshots: true
    }]
  ]
});

// CI preset
export default defineConfig({
  reporter: [
    [PlaywrightCoverageReporter, {
      threshold: 80,
      format: 'json',
      runtimeDiscovery: false
    }]
  ]
});
```

### 🎯 Benefits of v2.0.0

- **✅ Native Integration**: Works seamlessly with Playwright's existing infrastructure
- **🚀 Better Performance**: Eliminates duplicate TypeScript processing
- **🔄 Runtime Discovery**: Real-time element discovery during test execution
- **🛠️ Enhanced Tooling**: Better CLI commands and configuration management
- **📊 Improved Reporting**: Multiple output formats and better visualization
- **🔧 Easy Migration**: Built-in tools for upgrading from v1.x
- **🧪 Better Testing**: More comprehensive test coverage and validation

### ⚠️ Breaking Changes

- **Architecture**: Migration from standalone CLI to Playwright reporter required for full benefits
- **Configuration**: New configuration format and options
- **Dependencies**: Updated to leverage Playwright's native APIs

### 🔮 Migration Path

1. **Backup**: Backup existing configurations
2. **Migration**: Use `npx playwright-coverage migrate-to-reporter` to convert configurations
3. **Update**: Update Playwright config to use the new reporter
4. **Test**: Run tests with new setup
5. **Verify**: Check coverage reports and adjust as needed

---

## [1.0.17] - 2025-01-13

### 🐛 Bug Fixes
- Fixed page URL configuration parsing for multi-URL setups
- Resolved false positive 100% coverage when pages fail to load
- Fixed TypeScript configuration loading issues
- Improved error handling for invalid configurations

### 🔧 Improvements
- Enhanced page discovery with better timeout handling
- Improved selector matching algorithms
- Better error messages for configuration issues

---

## [1.0.0] - 2025-01-10

### 🎉 Initial Release

### ✨ Features
- **Standalone CLI Tool**: Coverage analysis for Playwright E2E tests
- **Element Discovery**: Automatic discovery of interactive elements (buttons, inputs, links, forms)
- **Static Analysis**: Extract selectors from test files using AST parsing
- **Coverage Calculation**: Intelligent matching between page elements and test selectors
- **Multiple Report Formats**: Console, JSON, HTML, LCOV, Istanbul support
- **Configuration System**: Flexible configuration with validation
- **CLI Commands**: analyze, init, fixture, mismatch, demo commands

### 🏗️ Architecture
- **Static Analysis Approach**: Parse test files and discover page elements separately
- **CLI-First Design**: Command-line tool for coverage analysis
- **Multiple Output Formats**: Support for CI/CD integration with Istanbul formats

### 📦 Initial Package
- Version 1.0.0 with core functionality
- npm package publication
- GitHub Actions CI/CD pipeline
- Automated versioning with lefthook