import { AccessibilityIssue, WcagLevel, CheckType, Severity } from './types.js';
import { WCAG_REFERENCES } from './constants.js';

export const generateIssueId = (): string => {
  return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getWcagReference = (type: CheckType, level: WcagLevel): string | null => {
  return WCAG_REFERENCES[type][level];
};

export const getWcagUrl = (reference: string): string => {
  return `https://www.w3.org/WAI/WCAG21/Understanding/${reference}.html`;
};

export const createAccessibilityIssue = (
  type: CheckType,
  severity: Severity,
  wcagLevel: WcagLevel,
  message: string,
  description: string,
  element?: AccessibilityIssue['element'],
  location?: Partial<AccessibilityIssue['location']>,
  suggestedFix?: string
): AccessibilityIssue => {
  const wcagReference = getWcagReference(type, wcagLevel);
  
  const issue: AccessibilityIssue = {
    id: generateIssueId(),
    type,
    severity,
    wcagLevel,
    wcagReference: wcagReference || 'N/A',
    message,
    description,
    location: {
      xpath: location?.xpath || '',
      ...(location?.line !== undefined && { line: location.line }),
      ...(location?.column !== undefined && { column: location.column }),
    },
  };

  if (element) {
    issue.element = element;
  }

  if (suggestedFix) {
    issue.suggestedFix = suggestedFix;
  }

  if (wcagReference) {
    issue.helpUrl = getWcagUrl(wcagReference);
  }

  return issue;
};

export const calculateScore = (issues: AccessibilityIssue[]): number => {
  if (issues.length === 0) return 100;
  
  const weights = {
    [Severity.ERROR]: 10,
    [Severity.WARNING]: 5,
    [Severity.INFO]: 1,
  };
  
  const totalPenalty = issues.reduce((total, issue) => {
    return total + weights[issue.severity];
  }, 0);
  
  // Base score starts at 100, subtract penalties
  const score = Math.max(0, 100 - totalPenalty);
  return Math.round(score);
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

export const getElementXPath = (element: Element): string => {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  let path = '';
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    if (current.className) {
      selector += `.${current.className.split(' ').join('.')}`;
    }
    
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (sibling): sibling is Element => sibling.nodeName === current!.nodeName
      );
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `[${index}]`;
      }
    }
    
    path = selector + (path ? '/' + path : '');
    current = parent;
  }
  
  return '/' + path;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // Simple RGB extraction - in real implementation would need more robust color parsing
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    const [red, green, blue] = sRGB;
    if (red === undefined || green === undefined || blue === undefined) {
      throw new Error('Invalid color values');
    }
    
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};