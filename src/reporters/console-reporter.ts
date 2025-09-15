import chalk from 'chalk';
import { HealthCheckReport, PageHealthReport, Severity, Reporter } from '../types.js';

export class ConsoleReporter implements Reporter {
  async generate(report: HealthCheckReport): Promise<void> {
    console.log('\n' + chalk.bold.blue('🔍 Accessibility Health Check Report'));
    console.log(chalk.gray('─'.repeat(60)));
    
    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Pages checked: ${chalk.yellow(report.summary.totalPages)}`);
    console.log(`  Total issues: ${chalk.red(report.summary.totalIssues)}`);
    console.log(`  Overall score: ${this.getScoreColor(report.summary.overallScore)}${report.summary.overallScore}/100${chalk.reset()}`);
    console.log(`  Duration: ${chalk.cyan(Math.round(report.summary.duration / 1000))}s`);
    
    // WCAG Compliance overview
    const allCompliant = report.pages.every(page => page.wcagCompliance[report.configuration.wcagLevel]);
    const complianceStatus = allCompliant ? chalk.green('✓ Compliant') : chalk.red('✗ Non-compliant');
    console.log(`  WCAG ${report.configuration.wcagLevel}: ${complianceStatus}`);

    // Per-page results
    console.log(chalk.bold('\n📄 Pages:'));
    
    for (const page of report.pages) {
      this.renderPageReport(page);
    }

    // Issue breakdown
    if (report.summary.totalIssues > 0) {
      console.log(chalk.bold('\n🚨 Issues Breakdown:'));
      this.renderIssueBreakdown(report);
    }

    console.log('\n' + chalk.gray('─'.repeat(60)));
    
    if (report.summary.totalIssues === 0) {
      console.log(chalk.green.bold('🎉 No accessibility issues found! Great job!'));
    } else {
      console.log(chalk.yellow('💡 Fix the issues above to improve accessibility'));
    }
  }

  private renderPageReport(page: PageHealthReport): void {
    const scoreColor = this.getScoreColor(page.score);
    const issueCount = page.totalIssues;
    
    console.log(`\n  ${chalk.bold(page.url)}`);
    console.log(`    Score: ${scoreColor}${page.score}/100${chalk.reset()}`);
    console.log(`    Issues: ${this.getIssueCountColor(issueCount)}${issueCount}${chalk.reset()}`);
    
    if (issueCount > 0) {
      // Show severity breakdown
      const errors = page.issuesBySeverity[Severity.ERROR] || 0;
      const warnings = page.issuesBySeverity[Severity.WARNING] || 0;
      const info = page.issuesBySeverity[Severity.INFO] || 0;
      
      const breakdown = [];
      if (errors > 0) breakdown.push(chalk.red(`${errors} errors`));
      if (warnings > 0) breakdown.push(chalk.yellow(`${warnings} warnings`));
      if (info > 0) breakdown.push(chalk.blue(`${info} info`));
      
      console.log(`    ${breakdown.join(', ')}`);

      // Show top issues
      const topIssues = page.issues
        .sort((a, b) => {
          const severityWeight = { error: 3, warning: 2, info: 1 };
          return severityWeight[b.severity] - severityWeight[a.severity];
        })
        .slice(0, 3);

      for (const issue of topIssues) {
        const severityIcon = this.getSeverityIcon(issue.severity);
        const severityColor = this.getSeverityColor(issue.severity);
        console.log(`      ${severityIcon} ${severityColor}${issue.message}${chalk.reset()}`);
        if (issue.suggestedFix) {
          console.log(`        ${chalk.gray('Fix:')} ${issue.suggestedFix}`);
        }
      }

      if (page.issues.length > 3) {
        console.log(`      ${chalk.gray(`... and ${page.issues.length - 3} more issues`)}`);
      }
    }
  }

  private renderIssueBreakdown(report: HealthCheckReport): void {
    // Count issues by type across all pages
    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    for (const page of report.pages) {
      for (const issue of page.issues) {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
        issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
      }
    }

    console.log('\n  By Severity:');
    Object.entries(issuesBySeverity)
      .sort(([, a], [, b]) => b - a)
      .forEach(([severity, count]) => {
        const color = this.getSeverityColor(severity as Severity);
        const icon = this.getSeverityIcon(severity as Severity);
        console.log(`    ${icon} ${color}${severity}: ${count}${chalk.reset()}`);
      });

    console.log('\n  By Type:');
    Object.entries(issuesByType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`    • ${type}: ${chalk.yellow(count)}`);
      });
  }

  private getScoreColor(score: number): (text: string) => string {
    if (score >= 90) return chalk.green;
    if (score >= 70) return chalk.yellow;
    return chalk.red;
  }

  private getIssueCountColor(count: number): (text: string) => string {
    if (count === 0) return chalk.green;
    if (count <= 5) return chalk.yellow;
    return chalk.red;
  }

  private getSeverityColor(severity: Severity): (text: string) => string {
    switch (severity) {
      case Severity.ERROR: return chalk.red;
      case Severity.WARNING: return chalk.yellow;
      case Severity.INFO: return chalk.blue;
      default: return chalk.white;
    }
  }

  private getSeverityIcon(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR: return chalk.red('✗');
      case Severity.WARNING: return chalk.yellow('⚠');
      case Severity.INFO: return chalk.blue('ℹ');
      default: return '•';
    }
  }
}