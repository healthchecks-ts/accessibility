# @healthchecks-ts/accessibility

> A comprehensive TypeScript-powered accessibility health checker that scans websites for WCAG compliance issues

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![WCAG 2.1](https://img.shields.io/badge/WCAG-2.1_AA-blue?style=flat-square)](https://www.w3.org/WAI/WCAG21/Understanding/)

## 🔍 Overview

This tool provides automated accessibility testing for web applications, checking for common WCAG compliance issues including:

- **Alt Text**: Missing or inadequate image descriptions
- **Color Contrast**: Insufficient contrast ratios for text elements
- **Heading Structure**: Improper heading hierarchy and organization
- **ARIA Attributes**: Invalid or missing ARIA labels and roles
- **Form Labels**: Missing or improperly associated form labels
- **Focus Indicators**: Missing or insufficient focus indicators
- **Keyboard Navigation**: Keyboard accessibility issues
- **Landmark Regions**: Missing or improper semantic landmarks

## 🚀 Quick Start

### Installation

```bash
# Install with pnpm (recommended)
pnpm add @healthchecks-ts/accessibility

# Or with npm
npm install @healthchecks-ts/accessibility

# Or with yarn
yarn add @healthchecks-ts/accessibility
```

### Command Line Usage

```bash
# Check a single website
npx accessibility-check https://example.com

# Check multiple websites
npx accessibility-check https://example.com https://another-site.com

# Generate HTML and JSON reports
npx accessibility-check https://example.com --format html json console

# Set WCAG compliance level
npx accessibility-check https://example.com --level AAA

# Custom output directory
npx accessibility-check https://example.com --output ./my-reports

# Run with custom configuration
npx accessibility-check https://example.com --config ./accessibility.config.json
```

### Programmatic Usage

```typescript
import { AccessibilityHealthChecker } from '@healthchecks-ts/accessibility';

const checker = new AccessibilityHealthChecker({
  wcagLevel: 'AA',
  output: {
    format: ['console', 'json', 'html'],
    outputDir: './reports',
  },
});

// Check a single URL
const pageReport = await checker.checkUrl('https://example.com');
console.log(`Score: ${pageReport.score}/100`);
console.log(`Issues found: ${pageReport.totalIssues}`);

// Check multiple URLs
const report = await checker.checkUrls([
  'https://example.com',
  'https://example.com/about',
  'https://example.com/contact',
]);

console.log(`Overall score: ${report.summary.overallScore}/100`);
```

## ⚙️ Configuration

### Configuration File

Create an `accessibility.config.json` file:

```json
{
  "wcagLevel": "AA",
  "checks": {
    "enabled": [
      "alt-text",
      "color-contrast",
      "heading-structure",
      "aria-attributes",
      "form-labels"
    ],
    "disabled": []
  },
  "thresholds": {
    "colorContrastRatio": 4.5,
    "maxHeadingJump": 1
  },
  "output": {
    "format": ["console", "html", "json"],
    "outputDir": "./accessibility-reports",
    "verbose": true
  },
  "browser": {
    "headless": true,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  },
  "timeout": 30000,
  "concurrent": 3
}
```

### CLI Options

| Option                        | Description                          | Default       |
| ----------------------------- | ------------------------------------ | ------------- |
| `--level <level>`             | WCAG compliance level (A, AA, AAA)   | `AA`          |
| `--format <formats...>`       | Output formats (console, json, html) | `['console']` |
| `--output <dir>`              | Output directory for reports         | `./reports`   |
| `--concurrent <num>`          | Number of concurrent checks          | `3`           |
| `--timeout <ms>`              | Timeout per page in milliseconds     | `30000`       |
| `--headless <bool>`           | Run browser in headless mode         | `true`        |
| `--viewport <size>`           | Browser viewport size                | `1920x1080`   |
| `--contrast <ratio>`          | Color contrast ratio threshold       | `4.5`         |
| `--heading-jump <levels>`     | Maximum heading level jump           | `1`           |
| `--disable <checkers...>`     | Disable specific checkers            | `[]`          |
| `--enable-only <checkers...>` | Enable only specific checkers        | `all`         |
| `--config <file>`             | Configuration file path              | -             |
| `-v, --verbose`               | Verbose output                       | `false`       |

## 🧪 Available Checkers

### Alt Text Checker (`alt-text`)

Validates that all images have appropriate alternative text:

- Detects missing `alt` attributes
- Identifies insufficient or redundant alt text
- Suggests meaningful descriptions

### Color Contrast Checker (`color-contrast`)

Ensures adequate color contrast ratios:

- Tests against WCAG AA (4.5:1) and AAA (7:1) standards
- Analyzes text and background color combinations
- Provides specific contrast ratio measurements

### Heading Structure Checker (`heading-structure`)

Validates proper heading hierarchy:

- Ensures single H1 per page
- Detects heading level skips
- Identifies empty or non-descriptive headings

### ARIA Attributes Checker (`aria-attributes`)

Validates ARIA implementation:

- Checks for invalid ARIA attributes
- Validates boolean ARIA values
- Ensures interactive elements have accessible names

### Form Labels Checker (`form-labels`)

Ensures proper form accessibility:

- Validates form control labeling
- Checks label associations (explicit/implicit)
- Identifies missing required field indicators

## 📊 Report Formats

### Console Output

Provides immediate feedback with color-coded severity levels and actionable suggestions.

### HTML Report

Generates a comprehensive, interactive HTML report with:

- Visual score indicators
- Filterable issue lists
- Detailed fix suggestions
- WCAG reference links

### JSON Report

Machine-readable format perfect for CI/CD integration:

```json
{
  "summary": {
    "totalPages": 3,
    "totalIssues": 12,
    "overallScore": 78,
    "timestamp": "2024-09-16T12:00:00.000Z",
    "duration": 5432
  },
  "pages": [
    {
      "url": "https://example.com",
      "score": 85,
      "totalIssues": 4,
      "wcagCompliance": {
        "A": true,
        "AA": false,
        "AAA": false
      },
      "issues": [...]
    }
  ]
}
```

## 🔧 Advanced Usage

### Custom Checker Implementation

```typescript
import { AccessibilityChecker, CheckType, CheckerResult } from '@healthchecks-ts/accessibility';

class CustomChecker implements AccessibilityChecker {
  readonly type = CheckType.CUSTOM;

  async check(page: Page, config: HealthCheckConfig): Promise<CheckerResult> {
    const issues = await page.evaluate(() => {
      // Custom accessibility check logic
      return [];
    });

    return {
      type: this.type,
      issues,
      duration: Date.now() - startTime,
    };
  }
}
```

### Integration with CI/CD

```yaml
# GitHub Actions example
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
      - run: accessibility-check https://your-site.com --format json
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: accessibility-reports
          path: reports/
```

### Custom Reporting

```typescript
import { Reporter, HealthCheckReport } from '@healthchecks-ts/accessibility';

class SlackReporter implements Reporter {
  async generate(report: HealthCheckReport): Promise<void> {
    const message = `Accessibility Check Complete:
    📊 Overall Score: ${report.summary.overallScore}/100
    🔍 Issues Found: ${report.summary.totalIssues}
    📄 Pages Checked: ${report.summary.totalPages}`;

    // Send to Slack webhook
    await fetch(process.env.SLACK_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  }
}
```

## 🌟 Examples

### Basic Website Check

```bash
# Quick accessibility audit
accessibility-check https://example.com

# Output:
# 🔍 Accessibility Health Check Report
# ────────────────────────────────────────────
#
# 📊 Summary:
#   Pages checked: 1
#   Total issues: 8
#   Overall score: 72/100
#   Duration: 3s
#   WCAG AA: ✗ Non-compliant
```

### Comprehensive Multi-page Audit

```bash
accessibility-check \
  https://example.com \
  https://example.com/about \
  https://example.com/contact \
  --level AAA \
  --format html json console \
  --output ./audit-results \
  --concurrent 2 \
  --verbose
```

### Configuration-based Check

```bash
# Using custom configuration file
accessibility-check https://example.com --config ./my-config.json

# Sample configuration file
{
  "wcagLevel": "AA",
  "thresholds": {
    "colorContrastRatio": 7.0
  },
  "checks": {
    "disabled": ["keyboard-navigation"]
  },
  "output": {
    "format": ["html"],
    "verbose": true
  }
}
```

## 🛠️ Development

### Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/healthchecks-ts/accessibility.git
cd accessibility

# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install

# Build the project
pnpm run build

# Run tests
pnpm test

# Run linting
pnpm run lint
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Follow TypeScript best practices
2. Write comprehensive tests for new features
3. Update documentation for any API changes
4. Use conventional commit messages
5. Ensure all tests and linting pass

## 📞 Support

- 📧 Email: support@healthchecks-ts.dev
- 🐛 Issues: [GitHub Issues](https://github.com/healthchecks-ts/accessibility/issues)
- 📖 Documentation: [Full Documentation](https://docs.healthchecks-ts.dev)

## 🙏 Acknowledgments

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/) for accessibility standards
- [Playwright](https://playwright.dev/) for browser automation
- [axe-core](https://github.com/dequelabs/axe-core) for accessibility testing principles
- The accessibility community for continuous guidance and feedback

---

**Made with ❤️ for a more accessible web**
