import { writeFile } from 'fs/promises';
import { join } from 'path';
import { HealthCheckReport, Reporter, Severity, AccessibilityIssue } from '../types.js';

export class HtmlReporter implements Reporter {
  constructor(private outputDir: string = './reports') {}

  async generate(report: HealthCheckReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `accessibility-report-${timestamp}.html`;
    const filepath = join(this.outputDir, filename);

    const html = this.generateHtml(report);

    try {
      await writeFile(filepath, html, 'utf8');
      console.log(`📄 HTML report saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to write HTML report:', error);
      throw error;
    }
  }

  private generateHtml(report: HealthCheckReport): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Health Check Report</title>
    ${this.getStyles()}
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🔍 Accessibility Health Check Report</h1>
            <div class="metadata">
                Generated on ${report.summary.timestamp.toLocaleDateString()} at ${report.summary.timestamp.toLocaleTimeString()}
            </div>
        </header>

        ${this.generateSummarySection(report)}
        ${this.generatePagesSection(report)}
        ${this.generateIssuesSection(report)}
    </div>

    ${this.getScripts()}
</body>
</html>`;
  }

  private generateSummarySection(report: HealthCheckReport): string {
    const scoreClass = this.getScoreClass(report.summary.overallScore);
    
    return `<section class="summary">
        <h2>📊 Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${report.summary.totalPages}</div>
                <div class="summary-label">Pages Checked</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${this.getIssueClass(report.summary.totalIssues)}">${report.summary.totalIssues}</div>
                <div class="summary-label">Total Issues</div>
            </div>
            <div class="summary-item">
                <div class="summary-value ${scoreClass}">${report.summary.overallScore}/100</div>
                <div class="summary-label">Overall Score</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${Math.round(report.summary.duration / 1000)}s</div>
                <div class="summary-label">Duration</div>
            </div>
        </div>
        
        <div class="wcag-compliance">
            <h3>WCAG Compliance (Level ${report.configuration.wcagLevel})</h3>
            ${this.generateWcagCompliance(report)}
        </div>
    </section>`;
  }

  private generateWcagCompliance(report: HealthCheckReport): string {
    const targetLevel = report.configuration.wcagLevel;
    const compliantPages = report.pages.filter(page => page.wcagCompliance[targetLevel]).length;
    const totalPages = report.pages.length;
    const isCompliant = compliantPages === totalPages;
    
    return `<div class="compliance-status ${isCompliant ? 'compliant' : 'non-compliant'}">
        <div class="compliance-icon">${isCompliant ? '✓' : '✗'}</div>
        <div class="compliance-text">
            ${isCompliant ? 'All pages are WCAG compliant' : `${compliantPages}/${totalPages} pages are compliant`}
        </div>
    </div>`;
  }

  private generatePagesSection(report: HealthCheckReport): string {
    const pagesHtml = report.pages.map(page => `
        <div class="page-card">
            <div class="page-header">
                <h3 class="page-url">${page.url}</h3>
                <div class="page-score ${this.getScoreClass(page.score)}">${page.score}/100</div>
            </div>
            
            <div class="page-stats">
                <div class="stat">
                    <span class="stat-value error">${page.issuesBySeverity[Severity.ERROR] || 0}</span>
                    <span class="stat-label">Errors</span>
                </div>
                <div class="stat">
                    <span class="stat-value warning">${page.issuesBySeverity[Severity.WARNING] || 0}</span>
                    <span class="stat-label">Warnings</span>
                </div>
                <div class="stat">
                    <span class="stat-value info">${page.issuesBySeverity[Severity.INFO] || 0}</span>
                    <span class="stat-label">Info</span>
                </div>
            </div>

            ${page.issues.length > 0 ? `
                <div class="page-issues">
                    <h4>Issues (${page.issues.length})</h4>
                    ${page.issues.map(issue => this.generateIssueHtml(issue)).join('')}
                </div>
            ` : '<div class="no-issues">🎉 No issues found!</div>'}
        </div>
    `).join('');

    return `<section class="pages">
        <h2>📄 Pages</h2>
        ${pagesHtml}
    </section>`;
  }

  private generateIssuesSection(report: HealthCheckReport): string {
    const allIssues = report.pages.flatMap(page => page.issues);
    
    if (allIssues.length === 0) {
      return '<section class="issues"><h2>🎉 No Issues Found</h2></section>';
    }

    // Group issues by type and severity
    const issuesByType: Record<string, AccessibilityIssue[]> = {};
    const issuesBySeverity: Record<string, AccessibilityIssue[]> = {};

    allIssues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = [];
      if (!issuesBySeverity[issue.severity]) issuesBySeverity[issue.severity] = [];
      
      issuesByType[issue.type]!.push(issue);
      issuesBySeverity[issue.severity]!.push(issue);
    });

    return `<section class="issues">
        <h2>🚨 Issues Breakdown</h2>
        
        <div class="breakdown-tabs">
            <button class="tab-button active" onclick="showTab('severity')">By Severity</button>
            <button class="tab-button" onclick="showTab('type')">By Type</button>
        </div>

        <div id="severity-tab" class="tab-content active">
            ${Object.entries(issuesBySeverity)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([severity, issues]) => `
                <div class="breakdown-group">
                    <h3 class="breakdown-title ${severity}">
                        ${this.getSeverityIcon(severity as Severity)} ${severity.toUpperCase()} (${issues.length})
                    </h3>
                    <div class="breakdown-items">
                        ${issues.slice(0, 5).map(issue => this.generateIssueHtml(issue)).join('')}
                        ${issues.length > 5 ? `<div class="more-items">... and ${issues.length - 5} more</div>` : ''}
                    </div>
                </div>
              `).join('')}
        </div>

        <div id="type-tab" class="tab-content">
            ${Object.entries(issuesByType)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([type, issues]) => `
                <div class="breakdown-group">
                    <h3 class="breakdown-title">${type.replace('-', ' ').toUpperCase()} (${issues.length})</h3>
                    <div class="breakdown-items">
                        ${issues.slice(0, 5).map(issue => this.generateIssueHtml(issue)).join('')}
                        ${issues.length > 5 ? `<div class="more-items">... and ${issues.length - 5} more</div>` : ''}
                    </div>
                </div>
              `).join('')}
        </div>
    </section>`;
  }

  private generateIssueHtml(issue: AccessibilityIssue): string {
    return `<div class="issue-card ${issue.severity}">
        <div class="issue-header">
            <span class="issue-severity ${issue.severity}">${this.getSeverityIcon(issue.severity)}</span>
            <span class="issue-title">${issue.message}</span>
            <span class="issue-wcag">WCAG ${issue.wcagReference}</span>
        </div>
        
        <div class="issue-description">${issue.description}</div>
        
        ${issue.element ? `
            <div class="issue-element">
                <strong>Element:</strong> <code>${issue.element.selector}</code>
                ${issue.element.innerText ? `<div class="element-text">Text: "${issue.element.innerText}"</div>` : ''}
            </div>
        ` : ''}
        
        ${issue.suggestedFix ? `
            <div class="issue-fix">
                <strong>💡 Suggested Fix:</strong> ${issue.suggestedFix}
            </div>
        ` : ''}
        
        ${issue.helpUrl ? `
            <div class="issue-help">
                <a href="${issue.helpUrl}" target="_blank" rel="noopener">📖 Learn more</a>
            </div>
        ` : ''}
    </div>`;
  }

  private getSeverityIcon(severity: Severity): string {
    switch (severity) {
      case Severity.ERROR: return '✗';
      case Severity.WARNING: return '⚠';
      case Severity.INFO: return 'ℹ';
      default: return '•';
    }
  }

  private getScoreClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private getIssueClass(count: number): string {
    if (count === 0) return 'excellent';
    if (count <= 5) return 'good';
    if (count <= 15) return 'fair';
    return 'poor';
  }

  private getStyles(): string {
    return `<style>
        * { box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            color: #2563eb;
            font-size: 2.5em;
        }
        
        .metadata {
            color: #666;
            font-size: 0.9em;
        }
        
        .summary {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-item {
            text-align: center;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
        }
        
        .summary-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .summary-label {
            color: #666;
            font-size: 0.9em;
        }
        
        .excellent { color: #10b981; }
        .good { color: #f59e0b; }
        .fair { color: #f97316; }
        .poor { color: #ef4444; }
        
        .wcag-compliance {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
        }
        
        .compliance-status {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            border-radius: 8px;
        }
        
        .compliant {
            background: #dcfce7;
            color: #166534;
        }
        
        .non-compliant {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .compliance-icon {
            font-size: 1.5em;
            font-weight: bold;
        }
        
        .pages {
            margin-bottom: 30px;
        }
        
        .page-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .page-url {
            margin: 0;
            color: #2563eb;
            font-size: 1.2em;
            word-break: break-all;
        }
        
        .page-score {
            font-size: 1.5em;
            font-weight: bold;
            padding: 8px 15px;
            border-radius: 20px;
            background: #f3f4f6;
        }
        
        .page-stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            border-radius: 8px;
            background: #f9fafb;
            min-width: 80px;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
        }
        
        .stat-value.error { color: #ef4444; }
        .stat-value.warning { color: #f59e0b; }
        .stat-value.info { color: #3b82f6; }
        
        .stat-label {
            font-size: 0.8em;
            color: #666;
        }
        
        .no-issues {
            text-align: center;
            padding: 20px;
            color: #10b981;
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .issues {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .breakdown-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .tab-button {
            padding: 10px 20px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
        }
        
        .tab-button.active {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .breakdown-group {
            margin-bottom: 30px;
        }
        
        .breakdown-title {
            font-size: 1.3em;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .breakdown-title.error { color: #ef4444; }
        .breakdown-title.warning { color: #f59e0b; }
        .breakdown-title.info { color: #3b82f6; }
        
        .issue-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            background: #fefefe;
        }
        
        .issue-card.error { border-left: 4px solid #ef4444; }
        .issue-card.warning { border-left: 4px solid #f59e0b; }
        .issue-card.info { border-left: 4px solid #3b82f6; }
        
        .issue-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .issue-severity {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .issue-severity.error { background: #fee2e2; color: #991b1b; }
        .issue-severity.warning { background: #fef3c7; color: #92400e; }
        .issue-severity.info { background: #dbeafe; color: #1e40af; }
        
        .issue-title {
            font-weight: bold;
            flex: 1;
        }
        
        .issue-wcag {
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            color: #666;
        }
        
        .issue-description {
            color: #555;
            margin-bottom: 10px;
        }
        
        .issue-element {
            background: #f8fafc;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 0.9em;
        }
        
        .issue-element code {
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        .element-text {
            margin-top: 5px;
            font-style: italic;
        }
        
        .issue-fix {
            background: #f0f9ff;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 10px;
            border-left: 3px solid #3b82f6;
        }
        
        .issue-help a {
            color: #2563eb;
            text-decoration: none;
        }
        
        .issue-help a:hover {
            text-decoration: underline;
        }
        
        .more-items {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 10px;
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .page-header { flex-direction: column; align-items: flex-start; gap: 10px; }
            .page-stats { flex-wrap: wrap; }
            .breakdown-tabs { flex-wrap: wrap; }
        }
    </style>`;
  }

  private getScripts(): string {
    return `<script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-button').forEach(button => {
                button.classList.remove('active');
            });
            
            // Show selected tab and activate button
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }
    </script>`;
  }
}