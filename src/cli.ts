#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'fs/promises';
import { AccessibilityHealthChecker } from './health-checker.js';
import { WcagLevel, CheckType, HealthCheckConfig } from './types.js';
import { isValidUrl, normalizeUrl } from './utils.js';

const program = new Command();

// Read package.json for version
async function getVersion(): Promise<string> {
  try {
    const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8');
    const pkg = JSON.parse(packageJson);
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function createCLI(): Promise<void> {
  const version = await getVersion();

  program
    .name('accessibility-check')
    .description('A comprehensive TypeScript-powered accessibility health checker')
    .version(version)
    .argument('<urls...>', 'URLs to check for accessibility issues')
    .option('-l, --level <level>', 'WCAG compliance level (A, AA, AAA)', 'AA')
    .option('-f, --format <formats...>', 'Output formats (console, json, html)', ['console'])
    .option('-o, --output <dir>', 'Output directory for reports', './reports')
    .option('-c, --concurrent <num>', 'Number of concurrent checks', '3')
    .option('-t, --timeout <ms>', 'Timeout per page in milliseconds', '30000')
    .option('--headless <bool>', 'Run browser in headless mode', 'true')
    .option('--viewport <size>', 'Browser viewport size (e.g., 1920x1080)', '1920x1080')
    .option('--contrast <ratio>', 'Color contrast ratio threshold', '4.5')
    .option('--heading-jump <levels>', 'Maximum heading level jump', '1')
    .option('--disable <checkers...>', 'Disable specific checkers')
    .option('--enable-only <checkers...>', 'Enable only specific checkers')
    .option('--config <file>', 'Configuration file path')
    .option('-v, --verbose', 'Verbose output')
    .action(async (urls: string[], options) => {
      try {
        await runAccessibilityCheck(urls, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  program.parse();
}

async function runAccessibilityCheck(urls: string[], options: any): Promise<void> {
  const spinner = ora('Initializing accessibility checker...').start();

  try {
    // Validate URLs
    const validUrls = urls.map(url => {
      if (!isValidUrl(url)) {
        const normalized = normalizeUrl(url);
        if (!isValidUrl(normalized)) {
          throw new Error(`Invalid URL: ${url}`);
        }
        return normalized;
      }
      return url;
    });

    // Parse configuration
    const config = await parseConfiguration(options);
    
    spinner.text = `Checking ${validUrls.length} URL${validUrls.length !== 1 ? 's' : ''}...`;

    // Create health checker
    const checker = new AccessibilityHealthChecker(config);

    // Run checks
    let report;
    if (validUrls.length === 1) {
      const pageReport = await checker.checkUrl(validUrls[0]!);
      report = {
        summary: {
          totalPages: 1,
          totalIssues: pageReport.totalIssues,
          overallScore: pageReport.score,
          timestamp: pageReport.timestamp,
          duration: pageReport.duration,
        },
        pages: [pageReport],
        configuration: config,
      };
    } else {
      report = await checker.checkUrls(validUrls);
    }

    spinner.succeed(chalk.green('Accessibility check completed!'));

    // Show quick summary
    if (!config.output.format.includes('console') || config.output.verbose) {
      console.log('\n' + chalk.bold('Quick Summary:'));
      console.log(`  ${chalk.yellow(report.summary.totalPages)} pages checked`);
      console.log(`  ${chalk.red(report.summary.totalIssues)} issues found`);
      console.log(`  Overall score: ${getScoreColor(report.summary.overallScore)}${report.summary.overallScore}/100${chalk.reset()}`);
    }

    // Exit with appropriate code
    process.exit(report.summary.totalIssues > 0 ? 1 : 0);

  } catch (error) {
    spinner.fail(chalk.red('Accessibility check failed'));
    throw error;
  }
}

async function parseConfiguration(options: any): Promise<HealthCheckConfig> {
  let config: Partial<HealthCheckConfig> = {};

  // Load config file if provided
  if (options.config) {
    try {
      const configFile = await readFile(options.config, 'utf8');
      config = JSON.parse(configFile);
    } catch (error) {
      throw new Error(`Failed to load config file: ${error}`);
    }
  }

  // Parse WCAG level
  if (options.level) {
    const level = options.level.toUpperCase();
    if (!Object.values(WcagLevel).includes(level)) {
      throw new Error(`Invalid WCAG level: ${options.level}. Must be A, AA, or AAA`);
    }
    config.wcagLevel = level as WcagLevel;
  }

  // Parse output format
  if (options.format) {
    const formats = Array.isArray(options.format) ? options.format : [options.format];
    const validFormats = ['console', 'json', 'html'];
    
    for (const format of formats) {
      if (!validFormats.includes(format)) {
        throw new Error(`Invalid output format: ${format}. Must be one of: ${validFormats.join(', ')}`);
      }
    }
    
    if (!config.output) config.output = { format: ['console'], verbose: false };
    config.output.format = formats;
  }

  // Parse other options
  if (options.output) {
    if (!config.output) config.output = { format: ['console'], verbose: false };
    config.output.outputDir = options.output;
  }

  if (options.verbose) {
    if (!config.output) config.output = { format: ['console'], verbose: false };
    config.output.verbose = true;
  }

  if (options.concurrent) {
    const concurrent = parseInt(options.concurrent);
    if (isNaN(concurrent) || concurrent < 1 || concurrent > 10) {
      throw new Error('Concurrent option must be a number between 1 and 10');
    }
    config.concurrent = concurrent;
  }

  if (options.timeout) {
    const timeout = parseInt(options.timeout);
    if (isNaN(timeout) || timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
    config.timeout = timeout;
  }

  if (options.headless) {
    if (!config.browser) {
      config.browser = { headless: true, viewport: { width: 1920, height: 1080 } };
    }
    config.browser.headless = options.headless === 'true' || options.headless === true;
  }

  if (options.viewport) {
    const match = options.viewport.match(/^(\d+)x(\d+)$/);
    if (!match) {
      throw new Error('Viewport must be in format "1920x1080"');
    }
    if (!config.browser) {
      config.browser = { headless: true, viewport: { width: 1920, height: 1080 } };
    }
    config.browser.viewport = {
      width: parseInt(match[1]!),
      height: parseInt(match[2]!),
    };
  }

  if (options.contrast) {
    const contrast = parseFloat(options.contrast);
    if (isNaN(contrast) || contrast < 1 || contrast > 21) {
      throw new Error('Contrast ratio must be between 1 and 21');
    }
    if (!config.thresholds) {
      config.thresholds = { colorContrastRatio: 4.5, maxHeadingJump: 1 };
    }
    config.thresholds.colorContrastRatio = contrast;
  }

  if (options.headingJump) {
    const jump = parseInt(options.headingJump);
    if (isNaN(jump) || jump < 1 || jump > 6) {
      throw new Error('Heading jump must be between 1 and 6');
    }
    if (!config.thresholds) {
      config.thresholds = { colorContrastRatio: 4.5, maxHeadingJump: 1 };
    }
    config.thresholds.maxHeadingJump = jump;
  }

  // Parse checker options
  const allCheckerTypes = Object.values(CheckType);
  
  if (options.enableOnly) {
    const enabledCheckers = Array.isArray(options.enableOnly) 
      ? options.enableOnly 
      : [options.enableOnly];
    
    for (const checker of enabledCheckers) {
      if (!allCheckerTypes.includes(checker)) {
        throw new Error(`Invalid checker: ${checker}. Available: ${allCheckerTypes.join(', ')}`);
      }
    }
    
    config.checks = {
      enabled: enabledCheckers,
      disabled: [],
    };
  } else if (options.disable) {
    const disabledCheckers = Array.isArray(options.disable) 
      ? options.disable 
      : [options.disable];
    
    for (const checker of disabledCheckers) {
      if (!allCheckerTypes.includes(checker)) {
        throw new Error(`Invalid checker: ${checker}. Available: ${allCheckerTypes.join(', ')}`);
      }
    }
    
    config.checks = {
      enabled: allCheckerTypes.filter(type => !disabledCheckers.includes(type)),
      disabled: disabledCheckers,
    };
  }

  return config as HealthCheckConfig;
}

function getScoreColor(score: number): (text: string) => string {
  if (score >= 90) return chalk.green;
  if (score >= 70) return chalk.yellow;
  return chalk.red;
}

// Show help for available checkers
program
  .command('list-checkers')
  .description('List all available accessibility checkers')
  .action(() => {
    console.log(chalk.bold('Available Accessibility Checkers:\n'));
    
    const checkers = [
      { name: 'alt-text', description: 'Checks for missing or inadequate alt text on images' },
      { name: 'color-contrast', description: 'Validates color contrast ratios for text elements' },
      { name: 'heading-structure', description: 'Ensures proper heading hierarchy and structure' },
      { name: 'aria-attributes', description: 'Validates ARIA attributes and roles' },
      { name: 'form-labels', description: 'Checks for proper form labeling and associations' },
      { name: 'focus-indicators', description: 'Ensures visible focus indicators for interactive elements' },
      { name: 'keyboard-navigation', description: 'Tests keyboard accessibility and navigation' },
      { name: 'landmark-regions', description: 'Validates proper use of landmark regions' },
    ];

    checkers.forEach(checker => {
      console.log(`  ${chalk.cyan(checker.name.padEnd(20))} ${checker.description}`);
    });

    console.log(`\n${chalk.gray('Use --disable or --enable-only to control which checkers run.')}`);
  });

// Create and run CLI
createCLI().catch(error => {
  console.error(chalk.red('Failed to initialize CLI:'), error);
  process.exit(1);
});