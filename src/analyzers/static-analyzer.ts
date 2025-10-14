import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { TestSelector, SelectorType } from '../types';

export interface AnalysisResult {
  selectors: TestSelector[];
  files: string[];
  errors: string[];
}

export class StaticAnalyzer {
  private readonly selectorPatterns = {
    // Playwright-specific patterns
    pageGetBy: /(?:page|this\.page|locator)\.getBy\w+\(['"`]([^'"`]+)['"`]\)/g,
    pageLocator: /(?:page|this\.page|locator)\.locator\(['"`]([^'"`]+)['"`]\)/g,
    pageFill: /(?:page|this\.page)\.fill\(['"`]([^'"`]+)['"`]/g,
    pageClick: /(?:page|this\.page)\.click\(['"`]([^'"`]+)['"`]/g,
    pageType: /(?:page|this\.page)\.type\(['"`]([^'"`]+)['"`]/g,
    pageCheck: /(?:page|this\.page)\.check\(['"`]([^'"`]+)['"`]/g,
    pageUncheck: /(?:page|this\.page)\.uncheck\(['"`]([^'"`]+)['"`]/g,
    pageSelectOption: /(?:page|this\.page)\.selectOption\(['"`]([^'"`]+)['"`]/g,
    pageHover: /(?:page|this\.page)\.hover\(['"`]([^'"`]+)['"`]/g,
    pageFocus: /(?:page|this\.page)\.focus\(['"`]([^'"`]+)['"`]/g,
    pageBlur: /(?:page|this\.page)\.blur\(['"`]([^'"`]+)['"`]/g,

    // Locator methods
    locatorClick: /\.click\(\)/g,
    locatorFill: /\.fill\([^)]+\)/g,
    locatorType: /\.type\([^)]+\)/g,
    locatorCheck: /\.check\(\)/g,
    locatorUncheck: /\.uncheck\(\)/g,
    locatorSelectOption: /\.selectOption\([^)]*\)/g,
    locatorHover: /\.hover\(\)/g,
    locatorFocus: /\.focus\(\)/g,

    // Common patterns
    getByRole: /getByRole\(['"`]([^'"`]+)['"`](?:,\s*\{[^}]*\})?\)/g,
    getByText: /getByText\(['"`]([^'"`]+)['"`]/g,
    getByLabel: /getByLabel\(['"`]([^'"`]+)['"`]/g,
    getByPlaceholder: /getByPlaceholder\(['"`]([^'"`]+)['"`]/g,
    getByAltText: /getByAltText\(['"`]([^'"`]+)['"`]/g,
    getByTitle: /getByTitle\(['"`]([^'"`]+)['"`]/g,
    getByTestId: /getByTestId\(['"`]([^'"`]+)['"`]/g,

    // CSS and XPath patterns
    cssSelector: /['"`]([a-zA-Z][a-zA-Z0-9\s\-\[\]>#+\.:^~=()]*)['"`]/g,
    xpathSelector: /['"`](?:\/\/|\/)([^'"`]*(?:\[@[^'"`]*\][^'"`]*)*)['"`]/g,

    // Chained locator patterns
    chainedLocator: /locator\(['"`]([^'"`]+)['"`]\)/g
  };

  /**
   * Analyze test files to extract all selectors
   */
  async analyzeFiles(patterns: string[]): Promise<AnalysisResult> {
    const result: AnalysisResult = {
      selectors: [],
      files: [],
      errors: []
    };

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**'] });

        for (const file of files) {
          if (this.isTestFile(file)) {
            try {
              const fileSelectors = await this.analyzeFile(file);
              result.selectors.push(...fileSelectors);
              result.files.push(file);
            } catch (error) {
              result.errors.push(`Failed to analyze ${file}: ${error}`);
            }
          }
        }
      } catch (error) {
        result.errors.push(`Failed to glob pattern ${pattern}: ${error}`);
      }
    }

    // Remove duplicate selectors
    result.selectors = this.deduplicateSelectors(result.selectors);

    return result;
  }

  /**
   * Analyze a single file for selectors
   */
  async analyzeFile(filePath: string): Promise<TestSelector[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const selectors: TestSelector[] = [];

    lines.forEach((line, index) => {
      const lineSelectors = this.extractSelectorsFromLine(line, filePath, index + 1);
      selectors.push(...lineSelectors);
    });

    return selectors;
  }

  /**
   * Extract selectors from a line of code
   */
  private extractSelectorsFromLine(line: string, filePath: string, lineNumber: number): TestSelector[] {
    const selectors: TestSelector[] = [];

    // Extract using different patterns
    Object.entries(this.selectorPatterns).forEach(([patternName, regex]) => {
      let match;

      // Reset regex lastIndex
      regex.lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        const selector = match[1] || match[0]; // Some patterns capture the selector, others match the whole expression

        if (selector && !this.isIgnoredSelector(selector)) {
          const testSelector: TestSelector = {
            raw: selector,
            normalized: this.normalizeSelector(selector),
            type: this.determineSelectorType(selector, patternName),
            lineNumber,
            filePath,
            context: this.extractContext(line, match.index)
          };

          selectors.push(testSelector);
        }
      }
    });

    return selectors;
  }

  /**
   * Normalize selector for comparison
   */
  private normalizeSelector(selector: string): string {
    // Remove quotes and normalize whitespace
    let normalized = selector.replace(/['"]/g, '').trim();

    // Remove dynamic values
    normalized = normalized.replace(/=["'][^"']*["']/g, '="..."');
    normalized = normalized.replace(/\[.*?\]/g, (match) => {
      // Keep attribute names but normalize values
      if (match.includes('=')) {
        const [attr] = match.split('=');
        return `${attr}="..."`;
      }
      return match;
    });

    // Normalize text content
    normalized = normalized.replace(/text=["'][^"']*["']/g, 'text="..."');
    normalized = normalized.replace(/:\s*text\(["'][^"']*["']\)/g, ':text(...)');

    return normalized;
  }

  /**
   * Determine selector type based on pattern and content
   */
  private determineSelectorType(selector: string, patternName: string): SelectorType {
    // XPath patterns
    if (selector.startsWith('//') || selector.startsWith('/') || selector.startsWith('(')) {
      return SelectorType.XPATH;
    }

    // Playwright getBy patterns
    if (selector.includes('getByRole')) {
      return SelectorType.ROLE;
    }

    if (selector.includes('getByText')) {
      return SelectorType.TEXT;
    }

    if (selector.includes('getByLabel')) {
      return SelectorType.LABEL;
    }

    if (selector.includes('getByPlaceholder')) {
      return SelectorType.PLACEHOLDER;
    }

    if (selector.includes('getByAltText')) {
      return SelectorType.ALT_TEXT;
    }

    if (selector.includes('getByTitle')) {
      return SelectorType.ALT_TEXT;
    }

    if (selector.includes('getByTestId')) {
      return SelectorType.TEST_ID;
    }

    // Test ID patterns
    if (selector.includes('data-testid') || selector.includes('test-id') || selector.includes('data-test')) {
      return SelectorType.TEST_ID;
    }

    // Text patterns
    if (selector.includes('text=') || patternName.includes('Text')) {
      return SelectorType.TEXT;
    }

    // Role patterns
    if (selector.includes('role=') || patternName.includes('Role')) {
      return SelectorType.ROLE;
    }

    // Label patterns
    if (selector.includes('label=') || patternName.includes('Label')) {
      return SelectorType.LABEL;
    }

    // Placeholder patterns
    if (selector.includes('placeholder=') || patternName.includes('Placeholder')) {
      return SelectorType.PLACEHOLDER;
    }

    // Alt text patterns
    if (selector.includes('alt=') || patternName.includes('Alt')) {
      return SelectorType.ALT_TEXT;
    }

    // Default to CSS
    return SelectorType.CSS;
  }

  /**
   * Extract context around the selector match
   */
  private extractContext(line: string, matchIndex?: number): string {
    if (matchIndex === undefined) {
      return line.trim();
    }

    // Extract some context around the match
    const start = Math.max(0, matchIndex - 20);
    const end = Math.min(line.length, matchIndex + 50);

    return line.substring(start, end).trim();
  }

  /**
   * Check if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const testExtensions = ['.spec.ts', '.test.ts', '.e2e.ts', '.spec.js', '.test.js', '.e2e.js'];
    const fileName = path.basename(filePath);

    return testExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Check if a selector should be ignored
   */
  private isIgnoredSelector(selector: string): boolean {
    const ignoredPatterns = [
      /^https?:\/\//, // URLs
      /^about:blank/, // About blank
      /^data:/, // Data URLs
      /^javascript:/, // JavaScript URLs
      /^\s*$/, // Empty selectors
      /^[{}[\]()]+$/, // Just brackets
      /console\.log/, // Console logs
      /expect\(/, // Test assertions
      /test\(/, // Test definitions
      /it\(/, // Test definitions
      /describe\(/ // Test suites
    ];

    return ignoredPatterns.some(pattern => pattern.test(selector));
  }

  /**
   * Remove duplicate selectors
   */
  private deduplicateSelectors(selectors: TestSelector[]): TestSelector[] {
    const seen = new Set<string>();

    return selectors.filter(selector => {
      const key = `${selector.normalized}:${selector.filePath}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  /**
   * Extract selectors from import statements (e.g., imported locators)
   */
  private extractImportedSelectors(content: string, filePath: string): TestSelector[] {
    const selectors: TestSelector[] = [];

    // Look for imports of locators or test objects
    const importPatterns = [
      /import\s+.*?\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/g,
      /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g
    ];

    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importedNames = match[1] ? match[1].split(',').map(name => name.trim()) : [match[0]];
        const importPath = match[2] || match[1];

        // Try to resolve the import and analyze it
        this.analyzeImportedFile(importPath, filePath, importedNames).then(importedSelectors => {
          selectors.push(...importedSelectors);
        }).catch(() => {
          // Ignore if we can't resolve the import
        });
      }
    });

    return selectors;
  }

  /**
   * Analyze imported file for selectors
   */
  private async analyzeImportedFile(importPath: string, fromFile: string, importedNames: string[]): Promise<TestSelector[]> {
    try {
      // Resolve the import path
      const resolvedPath = this.resolveImportPath(importPath, fromFile);

      if (resolvedPath && fs.existsSync(resolvedPath)) {
        return await this.analyzeFile(resolvedPath);
      }
    } catch (error) {
      // Ignore import resolution errors
    }

    return [];
  }

  /**
   * Resolve import path relative to the importing file
   */
  private resolveImportPath(importPath: string, fromFile: string): string | null {
    try {
      if (importPath.startsWith('.')) {
        // Relative import
        const fromDir = path.dirname(fromFile);
        const resolved = path.resolve(fromDir, importPath);

        // Try different extensions
        const extensions = ['.ts', '.js', '.json', '/index.ts', '/index.js'];

        for (const ext of extensions) {
          const fullPath = resolved + ext;
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get selector statistics
   */
  getSelectorStatistics(selectors: TestSelector[]): {
    total: number;
    byType: Record<SelectorType, number>;
    byFile: Record<string, number>;
    mostCommon: Array<{ selector: string; count: number }>;
  } {
    const byType: Record<SelectorType, number> = {} as any;
    const byFile: Record<string, number> = {};
    const selectorCounts: Record<string, number> = {};

    // Initialize
    Object.values(SelectorType).forEach(type => {
      byType[type] = 0;
    });

    selectors.forEach(selector => {
      // Count by type
      byType[selector.type]++;

      // Count by file
      byFile[selector.filePath] = (byFile[selector.filePath] || 0) + 1;

      // Count by normalized selector
      const key = selector.normalized;
      selectorCounts[key] = (selectorCounts[key] || 0) + 1;
    });

    // Get most common selectors
    const mostCommon = Object.entries(selectorCounts)
      .map(([selector, count]) => ({ selector, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: selectors.length,
      byType,
      byFile,
      mostCommon
    };
  }
}