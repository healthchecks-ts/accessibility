import { Page } from 'playwright';
import { AccessibilityChecker, CheckerResult, CheckType, HealthCheckConfig, Severity } from '../types.js';
import { createAccessibilityIssue } from '../utils.js';

export class ColorContrastChecker implements AccessibilityChecker {
  readonly type = CheckType.COLOR_CONTRAST;

  async check(page: Page, config: HealthCheckConfig): Promise<CheckerResult> {
    const startTime = Date.now();
    const issues = await page.evaluate((thresholdRatio: number) => {
      const results: any[] = [];
      
      // Helper function to convert any color format to hex
      const toHex = (color: string): string => {
        const div = document.createElement('div');
        div.style.color = color;
        document.body.appendChild(div);
        const computedColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        
        const match = computedColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match || !match[1] || !match[2] || !match[3]) return '#000000';
        
        const r = parseInt(match[1], 10);
        const g = parseInt(match[2], 10);
        const b = parseInt(match[3], 10);
        
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      };

      // Get luminance for contrast calculation
      const getLuminance = (hex: string): number => {
        const r = parseInt(hex.substr(1, 2), 16) / 255;
        const g = parseInt(hex.substr(3, 2), 16) / 255;
        const b = parseInt(hex.substr(5, 2), 16) / 255;
        
        const sRGB = [r, g, b].map(c => {
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        
        return 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!;
      };

      const getContrastRatio = (color1: string, color2: string): number => {
        const l1 = getLuminance(color1);
        const l2 = getLuminance(color2);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };

      // Check text elements
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, input, textarea, select, label, li, td, th');
      
      for (const element of Array.from(textElements)) {
        const textContent = element.textContent?.trim();
        if (!textContent || textContent.length === 0) continue;

        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;
        
        // Skip if background is transparent - would need to walk up the DOM tree
        if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') continue;
        
        try {
          const colorHex = toHex(color);
          const bgHex = toHex(backgroundColor);
          const ratio = getContrastRatio(colorHex, bgHex);
          
          if (ratio < thresholdRatio) {
            results.push({
              element: {
                selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                tagName: element.tagName.toLowerCase(),
                attributes: {
                  class: element.className || '',
                },
                innerText: textContent.substring(0, 100),
                outerHTML: element.outerHTML.substring(0, 500),
              },
              severity: ratio < 3 ? 'error' as const : 'warning' as const,
              message: `Poor color contrast ratio: ${ratio.toFixed(2)}:1`,
              description: `Text has insufficient contrast ratio. WCAG AA requires 4.5:1 for normal text, 3:1 for large text.`,
              suggestedFix: `Increase contrast between text (${colorHex}) and background (${bgHex}) colors`,
              ratio,
              colors: { text: colorHex, background: bgHex },
            });
          }
        } catch (error) {
          // Skip elements where color parsing fails
          continue;
        }
      }

      return results;
    }, config.thresholds.colorContrastRatio);

    const accessibilityIssues = issues.map((issue: any) => 
      createAccessibilityIssue(
        CheckType.COLOR_CONTRAST,
        issue.severity === 'error' ? Severity.ERROR : Severity.WARNING,
        config.wcagLevel,
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