import * as fs from 'fs';
import * as path from 'path';
import { PageCoverage, PageElement, CoverageResult, ElementType } from '../types';

export interface IstanbulCoverage {
  [filePath: string]: {
    path: string;
    statementMap: { [key: string]: any };
    s: { [key: string]: number };
    fnMap: { [key: string]: any };
    f: { [key: string]: number };
    b: { [key: string]: number[] };
    branchMap: { [key: string]: any };
  };
}

export interface FileMapping {
  [elementSelector: string]: {
    filePath: string;
    componentName: string;
    lineNumber: number;
    elementType: ElementType;
  };
}

export class IstanbulReporter {
  private fileMapping: FileMapping;
  private sourceMapCache: Map<string, any>;

  constructor() {
    this.fileMapping = {};
    this.sourceMapCache = new Map();
  }

  /**
   * Generate LCOV format output
   */
  generateLCOV(pageCoverages: PageCoverage[]): string {
    let lcovContent = 'TN:Playwright E2E Coverage\n';

    // Group elements by inferred file paths
    const elementsByFile = this.groupElementsByFile(pageCoverages);

    Object.entries(elementsByFile).forEach(([filePath, elements]) => {
      lcovContent += this.generateFileLCOV(filePath, elements);
    });

    return lcovContent;
  }

  /**
   * Generate Istanbul JSON format output
   */
  generateIstanbulJSON(pageCoverages: PageCoverage[]): IstanbulCoverage {
    const coverage: IstanbulCoverage = {};

    // Group elements by inferred file paths
    const elementsByFile = this.groupElementsByFile(pageCoverages);

    Object.entries(elementsByFile).forEach(([filePath, elements]) => {
      coverage[filePath] = this.generateFileCoverage(filePath, elements);
    });

    return coverage;
  }

  /**
   * Create file mapping from elements to source files
   */
  createFileMapping(pageCoverages: PageCoverage[], sourceFiles: string[] = []): FileMapping {
    const mapping: FileMapping = {};

    // Try to infer file paths from selectors and patterns
    pageCoverages.forEach(pageCoverage => {
      pageCoverage.elements.forEach(element => {
        const filePath = this.inferFilePath(element, sourceFiles);
        if (filePath) {
          mapping[element.selector] = {
            filePath,
            componentName: this.inferComponentName(element),
            lineNumber: 1, // Default line number, could be enhanced with source maps
            elementType: element.type
          };
        }
      });
    });

    this.fileMapping = mapping;
    return mapping;
  }

  /**
   * Infer file path from element selector
   */
  private inferFilePath(element: PageElement, sourceFiles: string[] = []): string | null {
    // Try to infer from test-id or data attributes
    if (element.id && element.id.includes('component-')) {
      const componentName = element.id.replace('component-', '');
      return `src/components/${componentName}/${componentName}.tsx`;
    }

    // Try to infer from class names
    if (element.class) {
      const classes = element.class.split(' ');
      for (const className of classes) {
        if (className.includes('component') || className.includes('page')) {
          return `src/components/${className}/${className}.tsx`;
        }
      }
    }

    // Try to match against source files
    if (sourceFiles.length > 0) {
      for (const sourceFile of sourceFiles) {
        if (this.elementMatchesFile(element, sourceFile)) {
          return sourceFile;
        }
      }
    }

    // Default fallbacks based on element type and context
    const fallbackPaths = {
      [ElementType.BUTTON]: 'src/components/Button/Button.tsx',
      [ElementType.INPUT]: 'src/components/Input/Input.tsx',
      [ElementType.LINK]: 'src/components/Link/Link.tsx',
      [ElementType.SELECT]: 'src/components/Select/Select.tsx',
      [ElementType.TEXTAREA]: 'src/components/Textarea/Textarea.tsx',
      [ElementType.CHECKBOX]: 'src/components/Checkbox/Checkbox.tsx',
      [ElementType.RADIO]: 'src/components/Radio/Radio.tsx',
    };

    return fallbackPaths[element.type] || `src/components/Common/Common.tsx`;
  }

  /**
   * Check if element matches a source file (simple heuristic)
   */
  private elementMatchesFile(element: PageElement, sourceFile: string): boolean {
    const fileName = path.basename(sourceFile, '.tsx').toLowerCase();
    const elementId = (element.id || '').toLowerCase();
    const elementClass = (element.class || '').toLowerCase();
    const elementText = (element.text || '').toLowerCase();

    // Simple matching - could be enhanced with AST parsing
    return elementId.includes(fileName) ||
           elementClass.includes(fileName) ||
           elementText.includes(fileName);
  }

  /**
   * Infer component name from element
   */
  private inferComponentName(element: PageElement): string {
    if (element.id) {
      return element.id.replace(/[-_]/g, '').replace('component', '');
    }

    if (element.class) {
      const classes = element.class.split(' ')[0];
      return classes.replace(/[-_]/g, '');
    }

    if (element.text) {
      return element.text.replace(/[^a-zA-Z0-9]/g, '');
    }

    return 'Unknown';
  }

  /**
   * Group elements by inferred file paths
   */
  private groupElementsByFile(pageCoverages: PageCoverage[]): { [filePath: string]: PageElement[] } {
    const grouped: { [filePath: string]: PageElement[] } = {};

    pageCoverages.forEach(pageCoverage => {
      pageCoverage.elements.forEach(element => {
        const filePath = this.inferFilePath(element);
        if (!grouped[filePath]) {
          grouped[filePath] = [];
        }
        grouped[filePath].push(element);
      });
    });

    return grouped;
  }

  /**
   * Generate LCOV content for a single file
   */
  private generateFileLCOV(filePath: string, elements: PageElement[]): string {
    let lcov = `SF:${filePath}\n`;

    let statementIndex = 1;
    let functionIndex = 1;
    let branchIndex = 1;

    const statements: { [key: string]: number } = {};
    const functions: { [key: string]: number } = {};
    const branches: { [key: string]: number[] } = {};

    elements.forEach(element => {
      const stmtKey = statementIndex.toString();
      const fnKey = functionIndex.toString();
      const branchKey = branchIndex.toString();

      // Create statement mapping for element
      lcov += `FN:${functionIndex},${this.inferComponentName(element)}_${element.type}\n`;
      functions[fnKey] = element.isVisible ? 1 : 0;

      // Create statement for element interaction
      lcov += `FNDA:${element.isVisible ? 1 : 0},${functionIndex}\n`;
      statements[stmtKey] = element.isVisible ? 1 : 0;

      // Create branch for element (tested/untested)
      lcov += `BRDA:${branchIndex},1,0,${this.isElementTested(element) ? 1 : 0}\n`;
      branches[branchKey] = [this.isElementTested(element) ? 1 : 0, this.isElementTested(element) ? 0 : 1];

      statementIndex++;
      functionIndex++;
      branchIndex++;
    });

    const totalFunctions = functionIndex - 1;
    const coveredFunctions = Object.values(functions).filter(f => f > 0).length;
    const totalStatements = statementIndex - 1;
    const coveredStatements = Object.values(statements).filter(s => s > 0).length;
    const totalBranches = branchIndex - 1;
    const coveredBranches = Object.values(branches).filter(b => b[0] > 0).length;

    lcov += `FNF:${totalFunctions}\n`;
    lcov += `FNH:${coveredFunctions}\n`;
    lcov += `LF:${totalStatements}\n`;
    lcov += `LH:${coveredStatements}\n`;
    lcov += `BRF:${totalBranches}\n`;
    lcov += `BRH:${coveredBranches}\n`;
    lcov += `end_of_record\n`;

    return lcov;
  }

  /**
   * Generate Istanbul coverage for a single file
   */
  private generateFileCoverage(filePath: string, elements: PageElement[]): any {
    const coverage: any = {
      path: filePath,
      statementMap: {},
      s: {},
      fnMap: {},
      f: {},
      b: {},
      branchMap: {}
    };

    let statementIndex = 1;
    let functionIndex = 1;
    let branchIndex = 1;

    elements.forEach(element => {
      const stmtKey = statementIndex.toString();
      const fnKey = functionIndex.toString();
      const branchKey = branchIndex.toString();

      // Statement mapping
      coverage.statementMap[stmtKey] = {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 10 }
      };
      coverage.s[stmtKey] = element.isVisible ? 1 : 0;

      // Function mapping
      coverage.fnMap[fnKey] = {
        name: `${this.inferComponentName(element)}_${element.type}`,
        line: 1,
        loc: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 }
        }
      };
      coverage.f[fnKey] = element.isVisible ? 1 : 0;

      // Branch mapping
      coverage.branchMap[branchKey] = {
        loc: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 }
        },
        type: 'branch',
        locations: [{
          start: { line: 1, column: 0 },
          end: { line: 1, column: 10 }
        }]
      };
      coverage.b[branchKey] = [this.isElementTested(element) ? 1 : 0, this.isElementTested(element) ? 0 : 1];

      statementIndex++;
      functionIndex++;
      branchIndex++;
    });

    return coverage;
  }

  /**
   * Check if element is tested (simplified heuristic)
   */
  private isElementTested(element: PageElement): boolean {
    // This would normally be determined by actual test coverage
    // For now, use a heuristic based on element properties
    return element.isVisible && element.isEnabled && element.id !== '';
  }

  /**
   * Save Istanbul coverage files
   */
  async saveCoverageFiles(pageCoverages: PageCoverage[], outputDir: string): Promise<void> {
    // Ensure output directory exists
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Generate and save LCOV file
    const lcovContent = this.generateLCOV(pageCoverages);
    await fs.promises.writeFile(path.join(outputDir, 'lcov.info'), lcovContent);

    // Generate and save Istanbul JSON file
    const istanbulCoverage = this.generateIstanbulJSON(pageCoverages);
    await fs.promises.writeFile(
      path.join(outputDir, 'coverage-final.json'),
      JSON.stringify(istanbulCoverage, null, 2)
    );

    // Save file mapping for debugging
    await fs.promises.writeFile(
      path.join(outputDir, 'element-file-mapping.json'),
      JSON.stringify(this.fileMapping, null, 2)
    );
  }

  /**
   * Calculate coverage summary from Istanbul format
   */
  calculateSummary(coverage: IstanbulCoverage): {
    lines: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
  } {
    const summary = {
      lines: { total: 0, covered: 0, percentage: 0 },
      functions: { total: 0, covered: 0, percentage: 0 },
      branches: { total: 0, covered: 0, percentage: 0 },
      statements: { total: 0, covered: 0, percentage: 0 }
    };

    Object.values(coverage).forEach(fileCoverage => {
      // Lines (using statements as proxy for lines in our case)
      const statements = Object.values(fileCoverage.s);
      summary.lines.total += statements.length;
      summary.lines.covered += statements.filter(s => s > 0).length;

      // Functions
      const functions = Object.values(fileCoverage.f);
      summary.functions.total += functions.length;
      summary.functions.covered += functions.filter(f => f > 0).length;

      // Branches
      Object.values(fileCoverage.b).forEach(branchHits => {
        summary.branches.total += 1;
        summary.branches.covered += branchHits[0] > 0 ? 1 : 0;
      });

      // Statements
      summary.statements.total += statements.length;
      summary.statements.covered += statements.filter(s => s > 0).length;
    });

    // Calculate percentages
    Object.keys(summary).forEach(key => {
      const metric = summary[key as keyof typeof summary];
      metric.percentage = metric.total > 0 ? Math.round((metric.covered / metric.total) * 100) : 0;
    });

    return summary;
  }
}