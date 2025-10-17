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
    // Playwright getBy methods - these are reliable and specific
    getByRole: /(?:page|this\.page|locator)\.getByRole\(\s*['"`]([^'"`]+)['"`]/g,
    getByText: /(?:page|this\.page|locator)\.getByText\(\s*['"`]([^'"`]+)['"`]/g,
    getByLabel: /(?:page|this\.page|locator)\.getByLabel\(\s*['"`]([^'"`]+)['"`]/g,
    getByPlaceholder: /(?:page|this\.page|locator)\.getByPlaceholder\(\s*['"`]([^'"`]+)['"`]/g,
    getByAltText: /(?:page|this\.page|locator)\.getByAltText\(\s*['"`]([^'"`]+)['"`]/g,
    getByTitle: /(?:page|this\.page|locator)\.getByTitle\(\s*['"`]([^'"`]+)['"`]/g,
    getByTestId: /(?:page|this\.page|locator)\.getByTestId\(\s*['"`]([^'"`]+)['"`]/g,

    // Playwright locator methods and direct page method calls
    locator: /(?:page|this\.page|locator)\.locator\(\s*['"`]([^'"`]+)['"`]/g,
    pageClick: /(?:page|this\.page)\.click\(\s*['"`]([^'"`]+)['"`]/g,
    pageFill: /(?:page|this\.page)\.fill\(\s*['"`]([^'"`]+)['"`]/g,
    pageType: /(?:page|this\.page)\.type\(\s*['"`]([^'"`]+)['"`]/g,
    pageCheck: /(?:page|this\.page)\.check\(\s*['"`]([^'"`]+)['"`]/g,
    pageUncheck: /(?:page|this\.page)\.uncheck\(\s*['"`]([^'"`]+)['"`]/g,
    pageSelectOption: /(?:page|this\.page)\.selectOption\(\s*['"`]([^'"`]+)['"`]/g,
    pageHover: /(?:page|this\.page)\.hover\(\s*['"`]([^'"`]+)['"`]/g,
    pageFocus: /(?:page|this\.page)\.focus\(\s*['"`]([^'"`]+)['"`]/g,
    pageBlur: /(?:page|this\.page)\.blur\(\s*['"`]([^'"`]+)['"`]/g,

    // XPath patterns
    xpathSelector: /(?:page|this\.page|locator)\.(?:xpath|locator)\(\s*['"`](\/\/[^'"`]*|\/[^'"`]*|\([^'"`]*\))['"`]/g,

    // CSS selectors
    cssSelector: /(?:page|this\.page|locator)\.(?:\$\$\(\s*)?['"`]([.#\[a-zA-Z][a-zA-Z0-9\s\-\[\]>#+\.:^~=()]*)['"`]/g,

    // Test ID patterns
    testIdSelector: /(?:page|this\.page|locator)\.(?:getByTestId|locator)\(\s*['"`]([^'"`]*data-test(?:id)?[^'"`]*)['"`]/g
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

    // Extract selectors using a more robust approach
    const extractedSelectors = this.extractQuotedStringsFromLine(line);

    extractedSelectors.forEach(selector => {
      if (selector && !this.isIgnoredSelector(selector) && this.isValidSelector(selector)) {
        const testSelector: TestSelector = {
          raw: selector,
          normalized: this.normalizeSelector(selector),
          type: this.determineSelectorType(selector, line),
          lineNumber,
          filePath,
          context: this.extractContext(line, line.indexOf(selector))
        };

        selectors.push(testSelector);
      }
    });

    return selectors;
  }

  /**
   * Extract quoted strings from a line, handling nested quotes properly
   */
  private extractQuotedStringsFromLine(line: string): string[] {
    const selectors: string[] = [];

    // Look for Playwright method patterns and extract their quoted arguments
    const playwrightPatterns = [
      // Specific patterns for different Playwright methods
      // getByRole with both syntaxes: getByRole('role', {name: 'value'}) and getByRole({name: 'value'})
      /(?:page|this\.page|locator)\.getByRole\(\s*['"`]([^'"`]*?)['"`]\s*,\s*\{[^}]*name\s*:\s*(['"`])([^'"`]*?)\2/g,
      /(?:page|this\.page|locator)\.getByRole\(\s*\{[^}]*name\s*:\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByLabel\(\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByText\(\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByPlaceholder\(\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByAltText\(\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByTitle\(\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.getByTestId\(\s*(['"`])([^'"`]*?)\1/g,
      // General patterns for other methods
      /(?:page|this\.page|locator)\.(?:click|fill|type|check|uncheck|selectOption|hover|focus|blur|xpath|waitForSelector)\s*\(\s*(['"`])/g,
      // Locator patterns (both direct and chained)
      /(?:page|this\.page|locator)\.locator\(\s*(['"`])/g,
      // Chained locator patterns (specifically for .locator().locator())
      /\.locator\(\s*(['"`])/g,
      // Function call patterns - extract string parameters that look like selectors
      /\w+\.\w+\(\s*(?:page|this\.page|locator)\s*,\s*(['"`])([^'"`]*?)\1/g,
      /(?:page|this\.page|locator)\.\$\$\(\s*(['"`])/g
    ];

    playwrightPatterns.forEach(pattern => {
      let match;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(line)) !== null) {
        if (match[3]) {
          // For getByRole with role parameter: getByRole('role', {name: 'value'})
          // match[3] contains the extracted text (the name value)
          selectors.push(match[3]);
        } else if (match[2]) {
          // For specific patterns with capture groups (getByRole with object, getByLabel, etc.)
          // match[2] contains the extracted text directly
          selectors.push(match[2]);
        } else {
          // For general patterns, fall back to the old method
          const quoteChar = match[1]; // The quote character that started the string
          const startIndex = match.index + match[0].length;

          const selector = this.extractQuotedString(line, startIndex, quoteChar);
          if (selector) {
            selectors.push(selector);
          }
        }
      }
    });

    return selectors;
  }

  /**
   * Extract a complete quoted string from the given starting position
   */
  private extractQuotedString(line: string, startIndex: number, quoteChar: string): string | null {
    let result = '';
    let i = startIndex;
    let inEscape = false;

    while (i < line.length) {
      const char = line[i];

      if (inEscape) {
        // Add escaped character verbatim
        result += char;
        inEscape = false;
      } else if (char === '\\') {
        // Escape character next
        inEscape = true;
      } else if (char === quoteChar) {
        // End of quoted string
        return result;
      } else {
        result += char;
      }

      i++;
    }

    // If we get here, the string wasn't properly closed
    return null;
  }

  /**
   * Normalize selector for comparison
   */
  private normalizeSelector(selector: string): string {
    // Remove quotes and normalize whitespace
    let normalized = selector.replace(/['"]/g, '').trim();

    // Only normalize very dynamic content like UUIDs, timestamps, etc.
    // Keep actual values like 'email', 'password', 'submit' as they are needed for matching

    // Normalize UUID-like patterns (32+ character hex strings)
    normalized = normalized.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '...');

    // Normalize timestamp patterns (13+ digit numbers)
    normalized = normalized.replace(/\b\d{13,}\b/g, '...');

    // Normalize very long random strings (20+ characters of random data)
    normalized = normalized.replace(/\b[a-zA-Z0-9]{20,}\b/g, '...');

    return normalized;
  }

  /**
   * Determine selector type based on pattern and content
   */
  private determineSelectorType(selector: string, line: string): SelectorType {
    // XPath patterns
    if (selector.startsWith('//') || selector.startsWith('/') || selector.startsWith('(')) {
      return SelectorType.XPATH;
    }

    // Check the line context for Playwright method calls
    if (line.includes('getByRole(')) {
      return SelectorType.ROLE;
    }

    if (line.includes('getByText(')) {
      return SelectorType.TEXT;
    }

    if (line.includes('getByLabel(')) {
      return SelectorType.LABEL;
    }

    if (line.includes('getByPlaceholder(')) {
      return SelectorType.PLACEHOLDER;
    }

    if (line.includes('getByAltText(')) {
      return SelectorType.ALT_TEXT;
    }

    if (line.includes('getByTitle(')) {
      return SelectorType.ALT_TEXT;
    }

    if (line.includes('getByTestId(')) {
      return SelectorType.TEST_ID;
    }

    // Test ID patterns
    if (selector.includes('data-testid') || selector.includes('test-id') || selector.includes('data-test')) {
      return SelectorType.TEST_ID;
    }

    // Text patterns
    if (selector.includes('text=') || line.includes('getByText(')) {
      return SelectorType.TEXT;
    }

    // Role patterns
    if (selector.includes('role=') || line.includes('getByRole(')) {
      return SelectorType.ROLE;
    }

    // Label patterns
    if (selector.includes('label=') || line.includes('getByLabel(')) {
      return SelectorType.LABEL;
    }

    // Placeholder patterns
    if (selector.includes('placeholder=') || line.includes('getByPlaceholder(')) {
      return SelectorType.PLACEHOLDER;
    }

    // Alt text patterns
    if (selector.includes('alt=') || line.includes('getByAltText(')) {
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
   * Check if a selector is valid (CSS selector OR Playwright text-based selector)
   */
  private isValidSelector(selector: string): boolean {
    // Must have some selector-like characteristics
    if (!selector || selector.length < 2) return false;

    // Valid CSS selector patterns
    const cssPatterns = [
      // ID selectors
      /^#[a-zA-Z][\w-]*$/,
      // Class selectors
      /^\.[a-zA-Z][\w-]*$/,
      // Tag selectors
      /^[a-zA-Z][a-zA-Z]*$/,
      // Attribute selectors
      /^\[[a-zA-Z][\w-]*(?:=['"`][^'"`]*['"`])?\]$/,
      // Combined selectors (tag.class, tag#id, etc.)
      /^[a-zA-Z][a-zA-Z]*[.#\[\]]/,
      // Pseudo-selectors
      /:[a-zA-Z-]+/,
      // Combinators
      /[>+~]\s*[a-zA-Z.#\[]/,
      // Complex selectors with multiple components
      /[.#\[\]:>+~]/
    ];

    // Text-based selector patterns (for getByLabel, getByRole, getByText, etc.)
    const textPatterns = [
      // Contains spaces (human-readable text)
      /\s+/,
      // Contains common words
      /\b(remember|forgot|password|login|submit|click|button|input|email|username|dashboard|settings|profile|menu|home|about|contact|search|filter|sort|add|remove|edit|delete|save|cancel|ok|yes|no)\b/i,
      // Reasonable length (not too short like single letters, not too long like descriptions)
      /^.{2,50}$/,
      // Not just programming syntax
      /^[^{}()\[\]=<>!|&;]+$/
    ];

    // Must match at least one CSS pattern OR text pattern
    const isCssValid = cssPatterns.some(pattern => pattern.test(selector));
    const isTextValid = textPatterns.some(pattern => pattern.test(selector));

    if (!isCssValid && !isTextValid) return false;

    // Additional validation for common selector formats
    const invalidPatterns: (RegExp | ((s: string) => boolean))[] = [
      // URLs and paths (always invalid)
      /^https?:\/\//,
      /^\/\w+/,
      /^\.\.?\//,
      // JavaScript expressions (always invalid)
      /[=!<>]=/,
      /function/,
      /return/,
      /var\s+\w+/,
      /const\s+\w+/,
      /let\s+\w+/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      // Test description patterns that are definitely not selectors
      /^should\s+/,
      /should\s+login\s+successfully/,
      /should\s+show/,
      /should\s+have/,
      /should\s+be/,
      /valid\s+credentials/,
      /invalid\s+credentials/,
      /click\s+the/,
      /fill\s+the/,
      /expect\s+the/,
      /verify\s+that/,
      /check\s+if/,
      /ensure\s+that/,
      /test\s+that/,
      /assert\s+that/,
      // Partial/incomplete selectors
      /[.\[]$/,
      /\['"`]$/,
      /^\w+\s*$/,
      // Too long to be a selector (likely description)
      (s: string) => s.length > 100
    ];

    // First check if it's a text-based selector (more lenient validation)
    const isTextBased = textPatterns.some(pattern => pattern.test(selector));
    if (isTextBased) {
      // For text-based selectors, still apply strict validation rules
      // URLs and paths should always be rejected, even for text-based selectors
      const textInvalidPatterns = [
        /^https?:\/\//,
        /^\/\w+/,
        /^\.\.?\//,
        // JavaScript expressions should always be rejected
        /[=!<>]=/,
        /function/,
        /return/,
        /var\s+\w+/,
        /const\s+\w+/,
        /let\s+\w+/,
        /if\s*\(/,
        /for\s*\(/,
        /while\s*\(/,
        // Test descriptions that are definitely not selectors
        /should\s+login\s+successfully/,
        /should\s+show/,
        /should\s+have/,
        /should\s+be/,
        /valid\s+credentials/,
        /invalid\s+credentials/,
        /click\s+the/,
        /fill\s+the/,
        /expect\s+the/,
        /verify\s+that/,
        /check\s+if/,
        /ensure\s+that/,
        /test\s+that/,
        /assert\s+that/,
        (s: string) => s.length > 100
      ];
      return !textInvalidPatterns.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(selector);
        } else {
          return pattern(selector);
        }
      });
    }

    // For CSS selectors, use stricter validation
    return !invalidPatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(selector);
      } else {
        return pattern(selector);
      }
    });
  }

  /**
   * Check if a selector should be ignored
   */
  private isIgnoredSelector(selector: string): boolean {
    // First check if it's a text-based selector (be more lenient)
    const textPatterns = [
      // Contains spaces (human-readable text)
      /\s+/,
      // Contains common words that are likely used in getBy methods
      /\b(remember|forgot|password|login|submit|click|button|input|email|username|dashboard|settings|profile|menu|home|about|contact|search|filter|sort|add|remove|edit|delete|save|cancel|ok|yes|no|user|admin|theme|registration|loading|content|item|list|form|validation|error|success|warning|alert|navigation|header|footer|main|section|article|sidebar|tab|panel|modal|dialog|popup|dropdown|select|option|checkbox|radio|link|anchor|text|label|placeholder|title|alt|role|name|value|data|test|id|class|style)\b/i,
      // Reasonable length
      /^.{2,50}$/
    ];

    const isTextBased = textPatterns.some(pattern => pattern.test(selector));

    if (isTextBased) {
      // For text-based selectors, only filter out obvious non-selectors
      const textIgnoredPatterns = [
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
        /describe\(/, // Test suites
        // Test descriptions that are definitely not selectors
        /^should\s+login\s+successfully/,
        /^should\s+show/,
        /^should\s+have/,
        /^should\s+be/,
        /^valid\s+credentials/,
        /^invalid\s+credentials/,
        /click\s+the\s+/,
        /fill\s+the\s+/,
        /expect\s+the\s+/,
        /verify\s+that\s+/,
        /check\s+if\s+/,
        /ensure\s+that\s+/,
        /test\s+that\s+/,
        /assert\s+that\s+/
      ];

      const contentIgnored = [
        'should login successfully',
        'valid credentials',
        'invalid credentials',
        'click the button',
        'fill the input',
        'expect the page',
        'verify that the',
        'check that the',
        'assert that the',
        'should see the',
        'should not see the'
      ];

      return textIgnoredPatterns.some(pattern => pattern.test(selector)) ||
             contentIgnored.some(content => selector.toLowerCase().includes(content));
    }

    // For non-text-based selectors (CSS selectors), be more strict
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
      /describe\(/, // Test suites
      /should\s+/, // Test descriptions starting with "should"
      /^[a-z]+\s+/, // Lowercase text that's likely descriptions
      /^\w+\s+\w+\s+\w+/, // Multi-word lowercase text (likely descriptions)
      /^[A-Z][a-z]+\s+[a-z]+/, // Sentences starting with capital letter
      /login\s+successfully/,
      /valid\s+credentials/,
      /should\s+\w+/,
      /click\s+the/,
      /fill\s+the/,
      /expect\s+the/,
      /verify\s+that/,
      /check\s+if/,
      /ensure\s+that/,
      /test\s+that/,
      /assert\s+that/
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