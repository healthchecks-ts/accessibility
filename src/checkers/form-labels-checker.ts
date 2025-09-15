import { Page } from 'playwright';
import { AccessibilityChecker, CheckerResult, CheckType, HealthCheckConfig, Severity, WcagLevel } from '../types.js';
import { createAccessibilityIssue } from '../utils.js';

export class FormLabelsChecker implements AccessibilityChecker {
  readonly type = CheckType.FORM_LABELS;

  async check(page: Page, _config: HealthCheckConfig): Promise<CheckerResult> {
    const startTime = Date.now();
    const issues = await page.evaluate(() => {
      const results: any[] = [];
      
      // Get all form controls that need labels
      const formControls = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select');
      
      for (const control of Array.from(formControls)) {
        const formControl = control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const controlId = formControl.id;
        const controlType = formControl.type || formControl.tagName.toLowerCase();
        
        let hasLabel = false;
        let labelText = '';
        let labelMethod = '';

        // Check for explicit label association via for/id
        if (controlId) {
          const label = document.querySelector(`label[for="${controlId}"]`);
          if (label) {
            hasLabel = true;
            labelText = label.textContent?.trim() || '';
            labelMethod = 'explicit label';
          }
        }

        // Check for implicit label (control wrapped in label)
        if (!hasLabel) {
          const parentLabel = formControl.closest('label');
          if (parentLabel) {
            hasLabel = true;
            labelText = parentLabel.textContent?.trim() || '';
            labelMethod = 'implicit label';
          }
        }

        // Check for aria-label
        if (!hasLabel) {
          const ariaLabel = formControl.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.trim()) {
            hasLabel = true;
            labelText = ariaLabel.trim();
            labelMethod = 'aria-label';
          }
        }

        // Check for aria-labelledby
        if (!hasLabel) {
          const ariaLabelledby = formControl.getAttribute('aria-labelledby');
          if (ariaLabelledby) {
            const labellingElements = ariaLabelledby.split(/\s+/).map(id => 
              document.getElementById(id)
            ).filter(Boolean);
            
            if (labellingElements.length > 0) {
              hasLabel = true;
              labelText = labellingElements.map(el => el!.textContent?.trim()).join(' ');
              labelMethod = 'aria-labelledby';
            }
          }
        }

        // Check for title attribute (not recommended but counts as labeling)
        if (!hasLabel) {
          const title = formControl.getAttribute('title');
          if (title && title.trim()) {
            hasLabel = true;
            labelText = title.trim();
            labelMethod = 'title attribute';
          }
        }

        // Check for placeholder as only labeling method (problematic)
        const placeholder = formControl.getAttribute('placeholder');
        const hasOnlyPlaceholder = !hasLabel && placeholder && placeholder.trim();

        if (!hasLabel && !hasOnlyPlaceholder) {
          results.push({
            element: {
              selector: controlId ? `#${controlId}` : `${controlType}`,
              tagName: formControl.tagName.toLowerCase(),
              attributes: {
                type: controlType,
                name: formControl.getAttribute('name') || '',
                id: controlId || '',
              },
              outerHTML: formControl.outerHTML.substring(0, 500),
            },
            severity: 'error' as const,
            message: 'Form control missing label',
            description: 'All form controls must have associated labels for screen readers',
            suggestedFix: 'Add a <label> element, aria-label, or aria-labelledby attribute',
          });
        } else if (hasOnlyPlaceholder) {
          results.push({
            element: {
              selector: controlId ? `#${controlId}` : `${controlType}`,
              tagName: formControl.tagName.toLowerCase(),
              attributes: {
                type: controlType,
                placeholder: placeholder,
              },
              outerHTML: formControl.outerHTML.substring(0, 500),
            },
            severity: 'warning' as const,
            message: 'Form control relies only on placeholder text',
            description: 'Placeholder text disappears when typing and is not reliable for labeling',
            suggestedFix: 'Add a proper label in addition to or instead of the placeholder',
          });
        } else if (hasLabel && labelText.length === 0) {
          results.push({
            element: {
              selector: controlId ? `#${controlId}` : `${controlType}`,
              tagName: formControl.tagName.toLowerCase(),
              attributes: {
                type: controlType,
              },
              outerHTML: formControl.outerHTML.substring(0, 500),
            },
            severity: 'error' as const,
            message: 'Form control has empty label',
            description: `Form control has ${labelMethod} but the label text is empty`,
            suggestedFix: 'Provide meaningful text in the label',
          });
        } else if (hasLabel && labelText.length < 2) {
          results.push({
            element: {
              selector: controlId ? `#${controlId}` : `${controlType}`,
              tagName: formControl.tagName.toLowerCase(),
              attributes: {
                type: controlType,
              },
              innerText: labelText,
              outerHTML: formControl.outerHTML.substring(0, 500),
            },
            severity: 'warning' as const,
            message: 'Form control has very short label',
            description: `Label text "${labelText}" may not be descriptive enough`,
            suggestedFix: 'Provide more descriptive label text',
          });
        }
      }

      // Check for required field indicators
      const requiredFields = document.querySelectorAll('input[required], textarea[required], select[required]');
      
      for (const field of Array.from(requiredFields)) {
        const fieldId = field.id;
        const hasRequiredIndicator = field.getAttribute('aria-required') === 'true' ||
                                   field.closest('label')?.textContent?.includes('*') ||
                                   field.parentElement?.textContent?.includes('required') ||
                                   field.parentElement?.textContent?.includes('Required');

        if (!hasRequiredIndicator) {
          results.push({
            element: {
              selector: fieldId ? `#${fieldId}` : field.tagName.toLowerCase(),
              tagName: field.tagName.toLowerCase(),
              attributes: {
                required: 'true',
              },
              outerHTML: field.outerHTML.substring(0, 500),
            },
            severity: 'warning' as const,
            message: 'Required field not properly indicated',
            description: 'Required fields should be clearly marked for all users',
            suggestedFix: 'Add aria-required="true" or visual indicator (* or "required" text)',
          });
        }
      }

      return results;
    });

    const accessibilityIssues = issues.map((issue: any) => 
      createAccessibilityIssue(
        CheckType.FORM_LABELS,
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