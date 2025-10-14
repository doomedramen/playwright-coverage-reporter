# Contributing to Playwright Coverage Reporter

Thank you for your interest in contributing to Playwright Coverage Reporter! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

- **Bug Reports**: Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
- **Feature Requests**: Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
- **Questions**: Start a [Discussion](https://github.com/DoomedRamen/playwright-coverage-reporter/discussions)

### Development Setup

1. **Fork and Clone**:
```bash
git clone https://github.com/your-username/playwright-coverage-reporter.git
cd playwright-coverage-reporter
```

2. **Install Dependencies**:
```bash
npm install
```

3. **Build the Project**:
```bash
npm run build
```

4. **Run Tests**:
```bash
npm test
```

5. **Run Demo**:
```bash
npm run test:demo
```

### Making Changes

1. **Create a Branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make Your Changes**:
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**:
```bash
npm run lint
npm test
npm run build
```

4. **Commit Your Changes**:
   - Use clear and descriptive commit messages
   - Follow the [Conventional Commits](https://conventionalcommits.org/) specification

5. **Submit a Pull Request**:
   - Provide a clear description of your changes
   - Link any relevant issues
   - Ensure all tests pass

## 📝 Code Style

### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid `any` types where possible
- Use interfaces for object shapes

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings
- Include trailing commas where appropriate
- No trailing whitespace

### Naming Conventions

- **Files**: kebab-case (`coverage-calculator.ts`)
- **Classes**: PascalCase (`CoverageCalculator`)
- **Functions/Variables**: camelCase (`calculateCoverage`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_THRESHOLD`)

## 🧪 Testing

### Unit Tests

- Write tests for all new functionality
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

### Integration Tests

- Test the full coverage analysis workflow
- Include real-world test scenarios
- Test CLI commands

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📚 Documentation

### README Updates

- Update the README for new features
- Include examples for new functionality
- Update installation/usage instructions

### Code Documentation

- Use JSDoc comments for public APIs
- Include parameter and return type documentation
- Provide usage examples

## 🚀 Release Process

### Version Bumping

- Follow [Semantic Versioning](https://semver.org/)
- Update version in `package.json`
- Update CHANGELOG.md

### Publishing

- The CI/CD pipeline handles automatic publishing
- Releases are created when version changes are merged to main
- GitHub releases are created automatically

## 🏗️ Project Structure

```
src/
├── cli.ts                 # CLI entry point
├── core/
│   └── engine.ts         # Main orchestration
├── analyzers/
│   └── static-analyzer.ts # Test file analysis
├── utils/
│   ├── element-discoverer.ts
│   └── coverage-calculator.ts
├── reporters/
│   ├── coverage-reporter.ts
│   └── istanbul-reporter.ts
├── fixtures/
│   └── coverage-fixture.ts
└── types/
    └── index.ts          # Type definitions
```

## 🔧 Development Guidelines

### Adding New Features

1. **Design**: Think about the API and user experience first
2. **Types**: Define TypeScript interfaces before implementation
3. **Tests**: Write tests before or alongside implementation
4. **Docs**: Update documentation as you implement
5. **Review**: Self-review your changes before submitting

### Performance Considerations

- Be mindful of memory usage with large test suites
- Optimize element discovery for performance
- Consider async operations for I/O heavy tasks

### Error Handling

- Use proper error types
- Provide meaningful error messages
- Include suggestions for fixing common issues

## 📋 Getting Help

- **Discussions**: [GitHub Discussions](https://github.com/DoomedRamen/playwright-coverage-reporter/discussions)
- **Issues**: [GitHub Issues](https://github.com/DoomedRamen/playwright-coverage-reporter/issues)
- **Documentation**: [README](README.md)

## 📜 Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. Please be respectful and inclusive in all interactions.

---

Thank you for contributing to Playwright Coverage Reporter! 🎉