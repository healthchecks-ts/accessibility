import { Page } from 'playwright';
import { AccessibilityChecker, CheckerResult, CheckType, HealthCheckConfig, Severity, WcagLevel } from '../types.js';
import { createAccessibilityIssue } from '../utils.js';

export class HeadingStructureChecker implements AccessibilityChecker {
  readonly type = CheckType.HEADING_STRUCTURE;

  async check(page: Page, config: HealthCheckConfig): Promise<CheckerResult> {
    const startTime = Date.now();
    const issues = await page.evaluate((maxJump: number) => {
      const results: any[] = [];
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      
      if (headings.length === 0) {
        results.push({
          severity: 'warning' as const,
          message: 'No headings found on page',
          description: 'Pages should have a proper heading structure for navigation and screen readers',
          suggestedFix: 'Add at least one h1 heading to establish page hierarchy',
        });
        return results;
      }

      const h1Count = headings.filter(h => h.tagName.toLowerCase() === 'h1').length;
      
      // Check for missing or multiple H1s
      if (h1Count === 0) {
        results.push({
          severity: 'error' as const,
          message: 'No H1 heading found',
          description: 'Every page should have exactly one H1 heading that describes the main content',
          suggestedFix: 'Add a single H1 heading that describes the main purpose of the page',
        });
      } else if (h1Count > 1) {
        results.push({
          severity: 'warning' as const,
          message: `Multiple H1 headings found (${h1Count})`,
          description: 'Pages should typically have only one H1 heading for proper document structure',
          suggestedFix: 'Use only one H1 heading and use H2-H6 for subsections',
        });
      }

      let previousLevel = 0;
      
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i]!;
        const currentLevel = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        
        // Check for empty headings
        if (!text) {
          results.push({
            element: {
              selector: heading.id ? `#${heading.id}` : heading.tagName.toLowerCase(),
              tagName: heading.tagName.toLowerCase(),
              attributes: {
                class: heading.className || '',
              },
              outerHTML: heading.outerHTML,
            },
            severity: 'error' as const,
            message: 'Empty heading found',
            description: 'Headings should contain meaningful text that describes the section',
            suggestedFix: 'Add descriptive text to the heading or remove if not needed',
          });
        }

        // Check for heading level jumps
        if (previousLevel > 0 && currentLevel > previousLevel + maxJump) {
          results.push({
            element: {
              selector: heading.id ? `#${heading.id}` : heading.tagName.toLowerCase(),
              tagName: heading.tagName.toLowerCase(),
              attributes: {
                class: heading.className || '',
              },
              innerText: text.substring(0, 100),
              outerHTML: heading.outerHTML,
            },
            severity: 'warning' as const,
            message: `Heading level skipped: H${previousLevel} to H${currentLevel}`,
            description: 'Heading levels should not skip levels for proper document structure',
            suggestedFix: `Use H${previousLevel + 1} instead of H${currentLevel} for proper hierarchy`,
          });
        }

        // Check for very long headings
        if (text.length > 120) {
          results.push({
            element: {
              selector: heading.id ? `#${heading.id}` : heading.tagName.toLowerCase(),
              tagName: heading.tagName.toLowerCase(),
              attributes: {
                class: heading.className || '',
              },
              innerText: text.substring(0, 100),
              outerHTML: heading.outerHTML,
            },
            severity: 'info' as const,
            message: 'Heading text is very long',
            description: 'Long headings can be difficult to navigate with screen readers',
            suggestedFix: 'Consider shortening the heading while maintaining its descriptive value',
          });
        }

        // Check for headings that are just numbers or symbols
        if (text.match(/^[\d\s\-_\.]+$/)) {
          results.push({
            element: {
              selector: heading.id ? `#${heading.id}` : heading.tagName.toLowerCase(),
              tagName: heading.tagName.toLowerCase(),
              attributes: {
                class: heading.className || '',
              },
              innerText: text,
              outerHTML: heading.outerHTML,
            },
            severity: 'warning' as const,
            message: 'Heading contains only numbers or symbols',
            description: 'Headings should be descriptive and meaningful for screen reader users',
            suggestedFix: 'Add descriptive text to explain what this heading represents',
          });
        }

        previousLevel = currentLevel;
      }

      return results;
    }, config.thresholds.maxHeadingJump);

    const accessibilityIssues = issues.map((issue: any) => 
      createAccessibilityIssue(
        CheckType.HEADING_STRUCTURE,
        issue.severity === 'error' ? Severity.ERROR : 
        issue.severity === 'warning' ? Severity.WARNING : Severity.INFO,
        WcagLevel.A,
        issue.message,
        issue.description,
        issue.element,
        undefined,
        issue.suggestedFix
      )
    );

    return {
      type: this.type,
      issues: accessibilityIssues,
      duration: Date.now() - startTime,
    };
  }
}