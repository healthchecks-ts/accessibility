import { Page } from 'playwright';
import { AccessibilityChecker, CheckerResult, CheckType, HealthCheckConfig, Severity, WcagLevel } from '../types.js';
import { createAccessibilityIssue } from '../utils.js';

export class AriaAttributesChecker implements AccessibilityChecker {
  readonly type = CheckType.ARIA_ATTRIBUTES;

  async check(page: Page, _config: HealthCheckConfig): Promise<CheckerResult> {
    const startTime = Date.now();
    const issues = await page.evaluate(() => {
      const results: any[] = [];
      
      // Define valid ARIA attributes and their expected values
      const validAriaAttributes = [
        'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden',
        'aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected',
        'aria-current', 'aria-live', 'aria-atomic', 'aria-busy',
        'aria-controls', 'aria-owns', 'aria-flowto', 'aria-activedescendant',
        'aria-autocomplete', 'aria-disabled', 'aria-dropeffect', 'aria-grabbed',
        'aria-haspopup', 'aria-invalid', 'aria-level', 'aria-multiline',
        'aria-multiselectable', 'aria-orientation', 'aria-posinset',
        'aria-readonly', 'aria-relevant', 'aria-required', 'aria-setsize',
        'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
        'aria-valuetext', 'role'
      ];

      const validRoles = [
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
        'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
        'contentinfo', 'definition', 'dialog', 'directory', 'document',
        'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
        'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
        'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
        'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
        'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
        'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
        'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
        'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
        'tooltip', 'tree', 'treegrid', 'treeitem'
      ];

      // Check all elements with ARIA attributes
      const elementsWithAria = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-hidden], [aria-expanded], [aria-pressed], [aria-checked], [aria-selected], [aria-current], [aria-live], [aria-atomic], [aria-busy], [aria-controls], [aria-owns], [aria-flowto], [aria-activedescendant], [aria-autocomplete], [aria-disabled], [aria-dropeffect], [aria-grabbed], [aria-haspopup], [aria-invalid], [aria-level], [aria-multiline], [aria-multiselectable], [aria-orientation], [aria-posinset], [aria-readonly], [aria-relevant], [aria-required], [aria-setsize], [aria-sort], [aria-valuemax], [aria-valuemin], [aria-valuenow], [aria-valuetext]');

      for (const element of Array.from(elementsWithAria)) {
        const attributes = element.attributes;
        
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i]!;
          const name = attr.name;
          const value = attr.value;

          // Check for invalid ARIA attributes
          if (name.startsWith('aria-') || name === 'role') {
            if (!validAriaAttributes.includes(name)) {
              results.push({
                element: {
                  selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                  tagName: element.tagName.toLowerCase(),
                  attributes: {
                    [name]: value,
                  },
                  outerHTML: element.outerHTML.substring(0, 500),
                },
                severity: 'error' as const,
                message: `Invalid ARIA attribute: ${name}`,
                description: 'Unknown ARIA attributes can cause accessibility issues',
                suggestedFix: `Remove ${name} or use a valid ARIA attribute`,
              });
            }

            // Check for empty ARIA attribute values (where not allowed)
            if (!value && !['aria-hidden', 'aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected'].includes(name)) {
              results.push({
                element: {
                  selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                  tagName: element.tagName.toLowerCase(),
                  attributes: {
                    [name]: value,
                  },
                  outerHTML: element.outerHTML.substring(0, 500),
                },
                severity: 'error' as const,
                message: `Empty value for ARIA attribute: ${name}`,
                description: 'ARIA attributes should have meaningful values',
                suggestedFix: `Provide a descriptive value for ${name} or remove the attribute`,
              });
            }

            // Check for invalid role values
            if (name === 'role' && value && !validRoles.includes(value)) {
              results.push({
                element: {
                  selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                  tagName: element.tagName.toLowerCase(),
                  attributes: {
                    role: value,
                  },
                  outerHTML: element.outerHTML.substring(0, 500),
                },
                severity: 'error' as const,
                message: `Invalid ARIA role: ${value}`,
                description: 'Unknown ARIA roles can cause accessibility issues',
                suggestedFix: `Use a valid ARIA role or remove the role attribute`,
              });
            }

            // Check for boolean ARIA attributes with invalid values
            if (['aria-hidden', 'aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected', 'aria-disabled', 'aria-required', 'aria-readonly', 'aria-multiline', 'aria-multiselectable', 'aria-atomic', 'aria-busy'].includes(name)) {
              if (value && !['true', 'false'].includes(value.toLowerCase())) {
                results.push({
                  element: {
                    selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
                    tagName: element.tagName.toLowerCase(),
                    attributes: {
                      [name]: value,
                    },
                    outerHTML: element.outerHTML.substring(0, 500),
                  },
                  severity: 'error' as const,
                  message: `Invalid boolean value for ${name}: ${value}`,
                  description: 'Boolean ARIA attributes should have values of "true" or "false"',
                  suggestedFix: `Change ${name} value to "true" or "false"`,
                });
              }
            }
          }
        }
      }

      // Check for missing aria-label on interactive elements without text content
      const interactiveElements = document.querySelectorAll('button, a, input[type="button"], input[type="submit"], input[type="reset"]');
      
      for (const element of Array.from(interactiveElements)) {
        const textContent = element.textContent?.trim() || '';
        const ariaLabel = element.getAttribute('aria-label');
        const ariaLabelledby = element.getAttribute('aria-labelledby');
        const hasImage = element.querySelector('img') !== null;
        
        if (!textContent && !ariaLabel && !ariaLabelledby && !hasImage) {
          results.push({
            element: {
              selector: element.id ? `#${element.id}` : element.tagName.toLowerCase(),
              tagName: element.tagName.toLowerCase(),
              attributes: {},
              outerHTML: element.outerHTML.substring(0, 500),
            },
            severity: 'error' as const,
            message: 'Interactive element missing accessible name',
            description: 'Interactive elements need accessible names for screen readers',
            suggestedFix: 'Add aria-label, visible text content, or aria-labelledby attribute',
          });
        }
      }

      return results;
    });

    const accessibilityIssues = issues.map((issue: any) => 
      createAccessibilityIssue(
        CheckType.ARIA_ATTRIBUTES,
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