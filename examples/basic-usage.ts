/**
 * Example: Basic usage of Playwright Cover
 */

import PlaywrightCover from 'playwright-cover';

async function basicExample() {
  console.log('🎭 Running basic Playwright Cover example...');

  // Create instance with default configuration
  const cover = new PlaywrightCover({
    include: ['tests/**/*.spec.ts'],
    coverageThreshold: 75,
    reportFormat: 'console'
  });

  try {
    // Analyze coverage
    const report = await cover.analyze();

    console.log('\n📊 Coverage Results:');
    console.log(`Total Elements: ${report.summary.totalElements}`);
    console.log(`Covered Elements: ${report.summary.coveredElements}`);
    console.log(`Coverage Percentage: ${report.summary.coveragePercentage}%`);
    console.log(`Pages Analyzed: ${report.summary.pages}`);
    console.log(`Test Files: ${report.summary.testFiles}`);

    // Show recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Show uncovered elements (limited)
    if (report.uncoveredElements.length > 0) {
      console.log('\n⚠️  Sample Uncovered Elements:');
      report.uncoveredElements.slice(0, 5).forEach((element, index) => {
        console.log(`${index + 1}. ${element.type}: ${element.selector} ${element.text ? `(${element.text})` : ''}`);
      });
      if (report.uncoveredElements.length > 5) {
        console.log(`   ... and ${report.uncoveredElements.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  basicExample();
}

export { basicExample };