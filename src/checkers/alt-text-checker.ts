import { Page } from 'playwright';
import { AccessibilityChecker, CheckerResult, CheckType, HealthCheckConfig, Severity, WcagLevel } from '../types.js';
import { createAccessibilityIssue } from '../utils.js';

export class AltTextChecker implements AccessibilityChecker {
  readonly type = CheckType.ALT_TEXT;

  async check(page: Page, _config: HealthCheckConfig): Promise<CheckerResult> {
    const startTime = Date.now();
    const issues = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const results = [];

      for (const img of images) {
        const src = img.src;
        const alt = img.alt;
        const hasAlt = Boolean(alt && alt.trim().length > 0);
        
        // Skip decorative images (empty alt is acceptable)
        const isDecorative = alt === '';
        
        // Check for missing alt attribute entirely
        if (!img.hasAttribute('alt')) {
          results.push({
            element: {
              selector: img.id ? `#${img.id}` : `img[src="${src}"]`,
              tagName: img.tagName.toLowerCase(),
              attributes: {
                src: img.src,
                alt: img.alt || '',
              },
              outerHTML: img.outerHTML,
            },
            severity: 'error' as const,
            message: 'Image missing alt attribute',
            description: 'All images must have an alt attribute for screen readers',
            suggestedFix: 'Add alt="" for decorative images or alt="description" for informative images',
          });
        }
        // Check for non-decorative images without meaningful alt text
        else if (!isDecorative && (!hasAlt || alt.length < 3)) {
          results.push({
            element: {
              selector: img.id ? `#${img.id}` : `img[src="${src}"]`,
              tagName: img.tagName.toLowerCase(),
              attributes: {
                src: img.src,
                alt: img.alt || '',
              },
              outerHTML: img.outerHTML,
            },
            severity: 'error' as const,
            message: 'Image has insufficient alt text',
            description: 'Images should have descriptive alt text that conveys the meaning of the image',
            suggestedFix: 'Provide meaningful alt text that describes the image content or purpose',
          });
        }
        // Check for potentially problematic alt text
        else if (hasAlt && (
          alt.toLowerCase().includes('image') ||
          alt.toLowerCase().includes('picture') ||
          alt.toLowerCase().includes('photo') ||
          alt.toLowerCase().startsWith('img_')
        )) {
          results.push({
            element: {
              selector: img.id ? `#${img.id}` : `img[src="${src}"]`,
              tagName: img.tagName.toLowerCase(),
              attributes: {
                src: img.src,
                alt: img.alt || '',
              },
              outerHTML: img.outerHTML,
            },
            severity: 'warning' as const,
            message: 'Alt text may be redundant or non-descriptive',
            description: 'Alt text should describe the content/purpose, not state that it\'s an image',
            suggestedFix: 'Replace with descriptive text about what the image shows or its purpose',
          });
        }
      }

      return results;
    });

    const accessibilityIssues = issues.map((issue: any) => 
      createAccessibilityIssue(
        CheckType.ALT_TEXT,
        issue.severity === 'error' ? Severity.ERROR : Severity.WARNING,
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