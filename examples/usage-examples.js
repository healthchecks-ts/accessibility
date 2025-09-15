#!/usr/bin/env node

/**
 * Example usage of @healthchecks-ts/accessibility
 * 
 * This script demonstrates various ways to use the accessibility health checker
 * both programmatically and via CLI commands.
 */

import { AccessibilityHealthChecker, WcagLevel } from '@healthchecks-ts/accessibility';

// Example 1: Basic programmatic usage
async function basicExample() {
  console.log('🔍 Running basic accessibility check...\n');
  
  const checker = new AccessibilityHealthChecker();
  
  try {
    const report = await checker.checkUrl('https://example.com');
    
    console.log(`URL: ${report.url}`);
    console.log(`Score: ${report.score}/100`);
    console.log(`Issues: ${report.totalIssues}`);
    console.log(`WCAG AA Compliant: ${report.wcagCompliance.AA ? '✅' : '❌'}`);
    
    if (report.issues.length > 0) {
      console.log('\nTop Issues:');
      report.issues.slice(0, 3).forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.suggestedFix) {
          console.log(`     Fix: ${issue.suggestedFix}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 2: Advanced configuration
async function advancedExample() {
  console.log('\n🚀 Running advanced accessibility check...\n');
  
  const checker = new AccessibilityHealthChecker({
    wcagLevel: WcagLevel.AAA,
    checks: {
      enabled: ['alt-text', 'color-contrast', 'heading-structure'],
      disabled: ['keyboard-navigation'],
    },
    thresholds: {
      colorContrastRatio: 7.0, // AAA standard
      maxHeadingJump: 1,
    },
    output: {
      format: ['console', 'json', 'html'],
      outputDir: './custom-reports',
      verbose: true,
    },
    browser: {
      headless: true,
      viewport: { width: 1920, height: 1080 },
    },
    timeout: 45000,
    concurrent: 2,
  });

  try {
    const report = await checker.checkUrls([
      'https://example.com',
      'https://example.com/about',
    ]);

    console.log('\n📊 Multi-page Report Summary:');
    console.log(`Pages checked: ${report.summary.totalPages}`);
    console.log(`Total issues: ${report.summary.totalIssues}`);
    console.log(`Overall score: ${report.summary.overallScore}/100`);
    console.log(`Duration: ${Math.round(report.summary.duration / 1000)}s`);

    // Show per-page breakdown
    report.pages.forEach((page, index) => {
      console.log(`\n  Page ${index + 1}: ${page.url}`);
      console.log(`    Score: ${page.score}/100`);
      console.log(`    Issues: ${page.totalIssues}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Example 3: Custom reporter integration
class CustomReporter {
  async generate(report) {
    console.log('\n📋 Custom Report Generated:');
    console.log('================================');
    
    // Calculate success rate
    const successfulPages = report.pages.filter(page => page.score >= 90).length;
    const successRate = Math.round((successfulPages / report.pages.length) * 100);
    
    console.log(`✅ Success Rate: ${successRate}%`);
    console.log(`📈 Average Score: ${report.summary.overallScore}/100`);
    
    // Show worst performing page
    const worstPage = report.pages.reduce((worst, current) => 
      current.score < worst.score ? current : worst
    );
    
    console.log(`🚨 Needs Attention: ${worstPage.url} (${worstPage.score}/100)`);
    
    // Priority issues
    const allIssues = report.pages.flatMap(page => page.issues);
    const errorCount = allIssues.filter(issue => issue.severity === 'error').length;
    const warningCount = allIssues.filter(issue => issue.severity === 'warning').length;
    
    console.log(`🔴 Errors: ${errorCount}`);
    console.log(`🟡 Warnings: ${warningCount}`);
  }
}

// Example 4: CLI command examples
function showCliExamples() {
  console.log('\n🖥️  CLI Usage Examples:');
  console.log('========================\n');
  
  const examples = [
    {
      title: 'Basic check',
      command: 'npx accessibility-check https://example.com'
    },
    {
      title: 'Multiple URLs with HTML report',
      command: 'npx accessibility-check https://example.com https://google.com --format html console'
    },
    {
      title: 'WCAG AAA compliance check',
      command: 'npx accessibility-check https://example.com --level AAA --contrast 7.0'
    },
    {
      title: 'Custom configuration file',
      command: 'npx accessibility-check https://example.com --config ./examples/strict-config.json'
    },
    {
      title: 'Disable specific checkers',
      command: 'npx accessibility-check https://example.com --disable color-contrast keyboard-navigation'
    },
    {
      title: 'Enable only specific checkers',
      command: 'npx accessibility-check https://example.com --enable-only alt-text heading-structure'
    },
    {
      title: 'Verbose output with custom viewport',
      command: 'npx accessibility-check https://example.com --verbose --viewport 1366x768'
    },
    {
      title: 'High concurrency for multiple pages',
      command: 'npx accessibility-check https://example.com/page1 https://example.com/page2 --concurrent 5'
    }
  ];

  examples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.title}:`);
    console.log(`   ${example.command}\n`);
  });
}

// Example 5: Integration patterns
function showIntegrationExamples() {
  console.log('🔧 Integration Examples:');
  console.log('========================\n');

  console.log('GitHub Actions:');
  console.log(`
name: Accessibility Check
on: [push, pull_request]
jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g @healthchecks-ts/accessibility
      - run: accessibility-check ${{ env.WEBSITE_URL }} --format json
      - uses: actions/upload-artifact@v3
        with:
          name: accessibility-reports
          path: reports/
`);

  console.log('\nJest Integration:');
  console.log(`
import { AccessibilityHealthChecker } from '@healthchecks-ts/accessibility';

describe('Accessibility Tests', () => {
  const checker = new AccessibilityHealthChecker();
  
  test('Homepage should be WCAG AA compliant', async () => {
    const report = await checker.checkUrl('http://localhost:3000');
    expect(report.wcagCompliance.AA).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(90);
  });
});
`);

  console.log('\nWebpack Plugin Example:');
  console.log(`
const AccessibilityPlugin = require('@healthchecks-ts/accessibility/webpack');

module.exports = {
  plugins: [
    new AccessibilityPlugin({
      urls: ['http://localhost:8080'],
      wcagLevel: 'AA',
      output: { format: ['html'] }
    })
  ]
};
`);
}

// Run examples
async function runAllExamples() {
  console.log('🎯 @healthchecks-ts/accessibility Examples\n');
  console.log('=========================================\n');

  // Show CLI examples (no async needed)
  showCliExamples();
  
  // Show integration examples
  showIntegrationExamples();
  
  console.log('\n💡 Tips:');
  console.log('- Use --config for consistent team settings');
  console.log('- Generate HTML reports for stakeholder reviews');
  console.log('- Set up CI/CD integration for continuous monitoring');
  console.log('- Start with WCAG Level AA, then progress to AAA');
  console.log('- Use --enable-only for focused testing during development');
  
  console.log('\n📚 More Information:');
  console.log('- Documentation: https://docs.healthchecks-ts.dev');
  console.log('- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/');
  console.log('- Issues & Support: https://github.com/healthchecks-ts/accessibility');

  // Uncomment to run programmatic examples (requires internet connection)
  // await basicExample();
  // await advancedExample();
}

// Run if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicExample,
  advancedExample,
  CustomReporter,
  showCliExamples,
  showIntegrationExamples
};