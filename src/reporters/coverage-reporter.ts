import * as fs from 'fs';
import * as path from 'path';
import { CoverageReport, CoverageResult, PageElement, ElementType } from '../types';
import { IstanbulReporter } from './istanbul-reporter';

export interface ReporterOptions {
  outputPath?: string;
  format: 'console' | 'json' | 'html' | 'lcov' | 'istanbul' | 'all';
  threshold?: number;
  verbose?: boolean;
}

export class CoverageReporter {
  private options: ReporterOptions;
  private istanbulReporter: IstanbulReporter;

  constructor(options: ReporterOptions = { format: 'console' }) {
    this.options = {
      outputPath: options.outputPath || './coverage-report',
      format: options.format,
      threshold: options.threshold || 80,
      verbose: options.verbose || false
    };
    this.istanbulReporter = new IstanbulReporter();
  }

  /**
   * Generate coverage report in the specified format(s)
   */
  async generateReport(coverageReport: CoverageReport): Promise<void> {
    switch (this.options.format) {
      case 'console':
        this.generateConsoleReport(coverageReport);
        break;
      case 'json':
        await this.generateJsonReport(coverageReport);
        break;
      case 'html':
        await this.generateHtmlReport(coverageReport);
        break;
      case 'lcov':
        await this.generateLcovReport(coverageReport);
        break;
      case 'istanbul':
        await this.generateIstanbulReport(coverageReport);
        break;
      case 'all':
        this.generateConsoleReport(coverageReport);
        await this.generateJsonReport(coverageReport);
        await this.generateHtmlReport(coverageReport);
        await this.generateLcovReport(coverageReport);
        await this.generateIstanbulReport(coverageReport);
        break;
    }

    // Check if coverage meets threshold
    this.checkThreshold(coverageReport);
  }

  /**
   * Generate console report
   */
  private generateConsoleReport(report: CoverageReport): void {
    console.log('\n🎭 Playwright Coverage Report\n');
    console.log('═'.repeat(50));

    // Summary
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Total Interactive Elements: ${report.summary.totalElements}`);
    console.log(`Covered Elements: ${report.summary.coveredElements}`);
    console.log(`Coverage Percentage: ${report.summary.coveragePercentage}%`);
    console.log(`Pages Analyzed: ${report.summary.pages}`);
    console.log(`Test Files: ${report.summary.testFiles}`);

    // Coverage by type
    console.log('\n📈 COVERAGE BY TYPE');
    console.log('─'.repeat(30));
    const typeCoverage = this.calculateTypeCoverage(report);
    Object.entries(typeCoverage).forEach(([type, coverage]) => {
      const icon = this.getCoverageIcon(coverage);
      const typeDisplay = type.replace(/_/g, ' ').toLowerCase();
      console.log(`${icon} ${typeDisplay.padEnd(20)} ${coverage}%`);
    });

    // Page breakdown
    console.log('\n📄 PAGE BREAKDOWN');
    console.log('─'.repeat(30));
    report.pages.forEach(page => {
      const icon = this.getCoverageIcon(page.coverage.coveragePercentage);
      let url;
      try {
        url = new URL(page.url).pathname || page.url;
      } catch {
        url = page.url;
      }
      console.log(`${icon} ${url.padEnd(40)} ${page.coverage.coveragePercentage}%`);
      console.log(`   Elements: ${page.coverage.coveredElements}/${page.coverage.totalElements}`);
    });

    // Uncovered elements
    if (report.uncoveredElements.length > 0) {
      console.log('\n⚠️  UNCOVERED ELEMENTS');
      console.log('─'.repeat(30));
      console.log(`Found ${report.uncoveredElements.length} uncovered interactive elements:`);

      const groupedByType = this.groupElementsByType(report.uncoveredElements);
      Object.entries(groupedByType).forEach(([type, elements]) => {
        console.log(`\n${type.replace(/_/g, ' ').toLowerCase()} (${elements.length}):`);
        elements.slice(0, 5).forEach(element => {
          console.log(`   • ${this.formatElementDescription(element)}`);
        });
        if (elements.length > 5) {
          console.log(`   ... and ${elements.length - 5} more`);
        }
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS');
      console.log('─'.repeat(30));
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '═'.repeat(50));
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(report: CoverageReport): Promise<void> {
    const outputPath = path.join(this.options.outputPath!, 'coverage-report.json');

    // Ensure output directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const jsonReport = {
      ...report,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    await fs.promises.writeFile(outputPath, JSON.stringify(jsonReport, null, 2));
    console.log(`\n📄 JSON report saved to: ${outputPath}`);
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(report: CoverageReport): Promise<void> {
    const outputPath = path.join(this.options.outputPath!, 'index.html');

    // Ensure output directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    const htmlContent = this.generateHtmlContent(report);
    await fs.promises.writeFile(outputPath, htmlContent);

    // Copy CSS and JS files
    await this.copyAssets();

    console.log(`\n🌐 HTML report saved to: ${outputPath}`);
  }

  /**
   * Generate HTML content
   */
  private generateHtmlContent(report: CoverageReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Coverage Report</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🎭 Playwright Coverage Report</h1>
            <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
        </header>

        <section class="summary">
            <h2>📊 Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="metric">${report.summary.totalElements}</div>
                    <div class="label">Total Elements</div>
                </div>
                <div class="summary-card">
                    <div class="metric">${report.summary.coveredElements}</div>
                    <div class="label">Covered Elements</div>
                </div>
                <div class="summary-card">
                    <div class="metric ${this.getCoverageClass(report.summary.coveragePercentage)}">
                        ${report.summary.coveragePercentage}%
                    </div>
                    <div class="label">Coverage</div>
                </div>
                <div class="summary-card">
                    <div class="metric">${report.summary.pages}</div>
                    <div class="label">Pages</div>
                </div>
            </div>
        </section>

        <section class="chart">
            <h2>📈 Coverage by Type</h2>
            <div class="chart-grid">
                ${this.generateTypeChart(report)}
            </div>
        </section>

        <section class="pages">
            <h2>📄 Page Coverage</h2>
            <div class="page-list">
                ${report.pages.map(page => this.generatePageCard(page)).join('')}
            </div>
        </section>

        ${report.uncoveredElements.length > 0 ? `
        <section class="uncovered">
            <h2>⚠️ Uncovered Elements (${report.uncoveredElements.length})</h2>
            <div class="uncovered-list">
                ${this.generateUncoveredElementsList(report.uncoveredElements)}
            </div>
        </section>
        ` : ''}

        ${report.recommendations.length > 0 ? `
        <section class="recommendations">
            <h2>💡 Recommendations</h2>
            <ul class="recommendations-list">
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </section>
        ` : ''}
    </div>

    <script>
        ${this.getReportScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles for HTML report
   */
  private getReportStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 40px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .timestamp {
            opacity: 0.9;
            font-size: 1.1rem;
        }

        section {
            margin-bottom: 40px;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h2 {
            margin-bottom: 20px;
            color: #2c3e50;
            font-size: 1.5rem;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }

        .summary-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }

        .metric {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .metric.excellent { color: #27ae60; }
        .metric.good { color: #f39c12; }
        .metric.warning { color: #e67e22; }
        .metric.critical { color: #e74c3c; }

        .label {
            color: #6c757d;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .type-card {
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
        }

        .type-name {
            font-size: 0.9rem;
            color: #6c757d;
            margin-bottom: 10px;
            text-transform: capitalize;
        }

        .type-coverage {
            font-size: 1.8rem;
            font-weight: bold;
        }

        .page-list {
            display: grid;
            gap: 20px;
        }

        .page-card {
            padding: 20px;
            border-radius: 8px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
        }

        .page-url {
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
        }

        .page-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-bar {
            width: 200px;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #27ae60, #2ecc71);
            transition: width 0.3s ease;
        }

        .uncovered-list {
            display: grid;
            gap: 10px;
        }

        .uncovered-item {
            padding: 15px;
            border-radius: 6px;
            background: #fff5f5;
            border: 1px solid #fed7d7;
        }

        .element-type {
            font-weight: bold;
            color: #c53030;
            margin-bottom: 5px;
        }

        .element-info {
            font-size: 0.9rem;
            color: #6c757d;
        }

        .recommendations-list {
            list-style: none;
        }

        .recommendations-list li {
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
        }

        .recommendations-list li:last-child {
            border-bottom: none;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .summary-grid,
            .chart-grid {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 2rem;
            }
        }
    `;
  }

  /**
   * Generate JavaScript for HTML report
   */
  private getReportScripts(): string {
    return `
        // Add interactive features
        document.addEventListener('DOMContentLoaded', function() {
            // Animate progress bars
            const progressFills = document.querySelectorAll('.progress-fill');
            progressFills.forEach(fill => {
                const width = fill.style.width;
                fill.style.width = '0';
                setTimeout(() => {
                    fill.style.width = width;
                }, 100);
            });

            // Add click-to-expand for uncovered elements
            const uncoveredItems = document.querySelectorAll('.uncovered-item');
            uncoveredItems.forEach(item => {
                item.style.cursor = 'pointer';
                item.addEventListener('click', function() {
                    this.classList.toggle('expanded');
                });
            });
        });
    `;
  }

  private generateTypeChart(report: CoverageReport): string {
    const typeCoverage = this.calculateTypeCoverage(report);

    return Object.entries(typeCoverage).map(([type, coverage]) => {
      const coverageClass = this.getCoverageClass(coverage);
      return `
        <div class="type-card">
            <div class="type-name">${type.replace(/_/g, ' ')}</div>
            <div class="type-coverage ${coverageClass}">${coverage}%</div>
        </div>
      `;
    }).join('');
  }

  private generatePageCard(page: any): string {
    let url;
    try {
      url = new URL(page.url).pathname || page.url;
    } catch {
      url = page.url;
    }
    const coverageClass = this.getCoverageClass(page.coverage.coveragePercentage);

    return `
      <div class="page-card">
        <div class="page-url">${url}</div>
        <div class="page-stats">
          <span>${page.coverage.coveredElements}/${page.coverage.totalElements} elements</span>
          <div class="progress-bar">
            <div class="progress-fill ${coverageClass}" style="width: ${page.coverage.coveragePercentage}%"></div>
          </div>
          <span class="${coverageClass}">${page.coverage.coveragePercentage}%</span>
        </div>
      </div>
    `;
  }

  private generateUncoveredElementsList(elements: PageElement[]): string {
    const groupedByType = this.groupElementsByType(elements);

    return Object.entries(groupedByType).map(([type, typeElements]) => `
      <div class="uncovered-group">
        <h3>${type.replace(/_/g, ' ').toLowerCase()} (${typeElements.length})</h3>
        ${typeElements.slice(0, 10).map(element => `
          <div class="uncovered-item">
            <div class="element-type">${this.formatElementDescription(element)}</div>
            <div class="element-info">
              Selector: <code>${element.selector}</code>
              ${element.text ? `<br>Text: "${element.text}"` : ''}
              ${!element.isVisible ? '<br>⚠️ Hidden element' : ''}
            </div>
          </div>
        `).join('')}
        ${typeElements.length > 10 ? `<p>... and ${typeElements.length - 10} more</p>` : ''}
      </div>
    `).join('');
  }

  private async copyAssets(): Promise<void> {
    // In a real implementation, you might copy additional CSS/JS files here
    // For now, everything is embedded in the HTML
  }

  private calculateTypeCoverage(report: CoverageReport): Record<string, number> {
    const typeCoverage: Record<string, { total: number; covered: number }> = {};

    report.pages.forEach(page => {
      Object.entries(page.coverage.coverageByType).forEach(([type, coverage]) => {
        if (!typeCoverage[type]) {
          typeCoverage[type] = { total: 0, covered: 0 };
        }

        const elementsOfType = page.elements.filter(e => e.type === type);
        typeCoverage[type].total += elementsOfType.length;
        typeCoverage[type].covered += Math.round((coverage / 100) * elementsOfType.length);
      });
    });

    const result: Record<string, number> = {};
    Object.entries(typeCoverage).forEach(([type, data]) => {
      result[type] = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 100;
    });

    return result;
  }

  private groupElementsByType(elements: PageElement[]): Record<string, PageElement[]> {
    return elements.reduce((groups, element) => {
      const type = element.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(element);
      return groups;
    }, {} as Record<string, PageElement[]>);
  }

  private formatElementDescription(element: PageElement): string {
    const parts = [];
    if (element.text) parts.push(`"${element.text.substring(0, 50)}"`);
    if (element.role) parts.push(`[${element.role}]`);
    if (element.type) parts.push(`(${element.type})`);
    if (!element.isVisible) parts.push('hidden');
    if (!element.isEnabled) parts.push('disabled');

    return parts.join(' ') || element.selector;
  }

  private getCoverageIcon(percentage: number): string {
    if (percentage >= 90) return '🟢';
    if (percentage >= 75) return '🟡';
    if (percentage >= 50) return '🟠';
    return '🔴';
  }

  private getCoverageClass(percentage: number): string {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Generate LCOV report
   */
  private async generateLcovReport(report: CoverageReport): Promise<void> {
    const outputPath = path.join(this.options.outputPath!, 'lcov.info');

    // Ensure output directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    // Create file mapping
    this.istanbulReporter.createFileMapping(report.pages);

    // Generate LCOV content
    const lcovContent = this.istanbulReporter.generateLCOV(report.pages);

    await fs.promises.writeFile(outputPath, lcovContent);
    console.log(`\n📄 LCOV report saved to: ${outputPath}`);
  }

  /**
   * Generate Istanbul JSON report
   */
  private async generateIstanbulReport(report: CoverageReport): Promise<void> {
    const outputPath = path.join(this.options.outputPath!, 'coverage-final.json');

    // Ensure output directory exists
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

    // Create file mapping
    this.istanbulReporter.createFileMapping(report.pages);

    // Generate Istanbul JSON
    const istanbulCoverage = this.istanbulReporter.generateIstanbulJSON(report.pages);

    await fs.promises.writeFile(outputPath, JSON.stringify(istanbulCoverage, null, 2));
    console.log(`\n📄 Istanbul JSON report saved to: ${outputPath}`);

    // Calculate and display Istanbul summary
    const summary = this.istanbulReporter.calculateSummary(istanbulCoverage);
    if (this.options.verbose) {
      console.log('\n📊 Istanbul Coverage Summary:');
      console.log(`  Lines: ${summary.lines.percentage}% (${summary.lines.covered}/${summary.lines.total})`);
      console.log(`  Functions: ${summary.functions.percentage}% (${summary.functions.covered}/${summary.functions.total})`);
      console.log(`  Branches: ${summary.branches.percentage}% (${summary.branches.covered}/${summary.branches.total})`);
      console.log(`  Statements: ${summary.statements.percentage}% (${summary.statements.covered}/${summary.statements.total})`);
    }
  }

  private checkThreshold(report: CoverageReport): void {
    if (report.summary.coveragePercentage < this.options.threshold!) {
      console.log(`\n❌ Coverage ${report.summary.coveragePercentage}% is below threshold ${this.options.threshold}%`);
      process.exit(1);
    } else {
      console.log(`\n✅ Coverage ${report.summary.coveragePercentage}% meets threshold ${this.options.threshold}%`);
    }
  }
}