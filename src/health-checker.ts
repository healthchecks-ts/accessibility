import { Page } from 'playwright';
import { BrowserManager, PageAnalyzer } from './browser.js';
import { ALL_CHECKERS } from './checkers/index.js';
import { ConsoleReporter, JsonReporter, HtmlReporter } from './reporters/index.js';
import { DEFAULT_CONFIG } from './constants.js';
import { calculateScore } from './utils.js';
import {
  HealthChecker,
  HealthCheckConfig,
  PageHealthReport,
  HealthCheckReport,
  CheckType,
  Severity,
  WcagLevel,
} from './types.js';

export class AccessibilityHealthChecker implements HealthChecker {
  private config: HealthCheckConfig;
  private browserManager: BrowserManager;

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.browserManager = new BrowserManager();
  }

  configure(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async checkUrl(url: string): Promise<PageHealthReport> {
    if (!this.browserManager.isLaunched()) {
      await this.browserManager.launch(this.config);
    }

    const page = await this.browserManager.createPage();
    
    try {
      return await this.checkPage(page, url);
    } finally {
      await page.close();
    }
  }

  async checkUrls(urls: string[]): Promise<HealthCheckReport> {
    const startTime = Date.now();
    
    if (!this.browserManager.isLaunched()) {
      await this.browserManager.launch(this.config);
    }

    try {
      const pageReports: PageHealthReport[] = [];
      
      // Process URLs with concurrency limit
      const chunks = this.chunkArray(urls, this.config.concurrent);
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (url) => {
          const page = await this.browserManager.createPage();
          try {
            return await this.checkPage(page, url);
          } finally {
            await page.close();
          }
        });
        
        const chunkResults = await Promise.all(chunkPromises);
        pageReports.push(...chunkResults);
      }

      const duration = Date.now() - startTime;
      const totalIssues = pageReports.reduce((sum, page) => sum + page.totalIssues, 0);
      const overallScore = pageReports.length > 0 
        ? Math.round(pageReports.reduce((sum, page) => sum + page.score, 0) / pageReports.length)
        : 100;

      const report: HealthCheckReport = {
        summary: {
          totalPages: pageReports.length,
          totalIssues,
          overallScore,
          timestamp: new Date(),
          duration,
        },
        pages: pageReports,
        configuration: this.config,
      };

      // Generate reports
      await this.generateReports(report);

      return report;
    } finally {
      await this.browserManager.close();
    }
  }

  private async checkPage(page: Page, url: string): Promise<PageHealthReport> {
    const startTime = Date.now();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
    } catch (error) {
      throw new Error(`Failed to load ${url}: ${error}`);
    }

    const analyzer = new PageAnalyzer(page);
    await analyzer.waitForAccessibilityTree();

    // Run all enabled checkers
    const enabledCheckers = ALL_CHECKERS.filter(checker => 
      this.config.checks.enabled.includes(checker.type) &&
      !this.config.checks.disabled.includes(checker.type)
    );

    const checkerResults = await Promise.all(
      enabledCheckers.map(checker => checker.check(page, this.config))
    );

    const allIssues = checkerResults.flatMap(result => result.issues);
    
    // Calculate statistics
    const issuesBySeverity = {
      [Severity.ERROR]: allIssues.filter(issue => issue.severity === Severity.ERROR).length,
      [Severity.WARNING]: allIssues.filter(issue => issue.severity === Severity.WARNING).length,
      [Severity.INFO]: allIssues.filter(issue => issue.severity === Severity.INFO).length,
    };

    const issuesByType = Object.values(CheckType).reduce((acc, type) => {
      acc[type] = allIssues.filter(issue => issue.type === type).length;
      return acc;
    }, {} as Record<CheckType, number>);

    // Calculate WCAG compliance
    const wcagCompliance = {
      [WcagLevel.A]: this.isWcagCompliant(allIssues, WcagLevel.A),
      [WcagLevel.AA]: this.isWcagCompliant(allIssues, WcagLevel.AA),
      [WcagLevel.AAA]: this.isWcagCompliant(allIssues, WcagLevel.AAA),
    };

    const score = calculateScore(allIssues);
    const duration = Date.now() - startTime;

    return {
      url,
      timestamp: new Date(),
      duration,
      totalIssues: allIssues.length,
      issuesBySeverity,
      issuesByType,
      wcagCompliance,
      issues: allIssues,
      score,
    };
  }

  private isWcagCompliant(issues: any[], level: WcagLevel): boolean {
    return !issues.some(issue => 
      issue.wcagLevel === level && issue.severity === Severity.ERROR
    );
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async generateReports(report: HealthCheckReport): Promise<void> {
    const formats = this.config.output.format;
    const outputDir = this.config.output.outputDir || './reports';

    // Ensure reports directory exists
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const reportPromises: Promise<void>[] = [];

    if (formats.includes('console')) {
      const consoleReporter = new ConsoleReporter();
      reportPromises.push(consoleReporter.generate(report));
    }

    if (formats.includes('json')) {
      const jsonReporter = new JsonReporter(outputDir);
      reportPromises.push(jsonReporter.generate(report));
    }

    if (formats.includes('html')) {
      const htmlReporter = new HtmlReporter(outputDir);
      reportPromises.push(htmlReporter.generate(report));
    }

    await Promise.all(reportPromises);
  }
}