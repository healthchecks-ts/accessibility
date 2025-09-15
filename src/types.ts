export enum WcagLevel {
  A = 'A',
  AA = 'AA',
  AAA = 'AAA',
}

export enum Severity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum CheckType {
  ALT_TEXT = 'alt-text',
  COLOR_CONTRAST = 'color-contrast',
  HEADING_STRUCTURE = 'heading-structure',
  ARIA_ATTRIBUTES = 'aria-attributes',
  KEYBOARD_NAVIGATION = 'keyboard-navigation',
  FORM_LABELS = 'form-labels',
  FOCUS_INDICATORS = 'focus-indicators',
  LANDMARK_REGIONS = 'landmark-regions',
}

export interface AccessibilityIssue {
  id: string;
  type: CheckType;
  severity: Severity;
  wcagLevel: WcagLevel;
  wcagReference: string;
  message: string;
  description: string;
  element?: {
    selector: string;
    tagName: string;
    attributes: Record<string, string>;
    innerText?: string;
    outerHTML: string;
  };
  location: {
    line?: number;
    column?: number;
    xpath: string;
  };
  suggestedFix?: string;
  helpUrl?: string;
}

export interface PageHealthReport {
  url: string;
  timestamp: Date;
  duration: number;
  totalIssues: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByType: Record<CheckType, number>;
  wcagCompliance: {
    [WcagLevel.A]: boolean;
    [WcagLevel.AA]: boolean;
    [WcagLevel.AAA]: boolean;
  };
  issues: AccessibilityIssue[];
  score: number; // 0-100
}

export interface HealthCheckReport {
  summary: {
    totalPages: number;
    totalIssues: number;
    overallScore: number;
    timestamp: Date;
    duration: number;
  };
  pages: PageHealthReport[];
  configuration: HealthCheckConfig;
}

export interface HealthCheckConfig {
  wcagLevel: WcagLevel;
  checks: {
    enabled: CheckType[];
    disabled: CheckType[];
  };
  thresholds: {
    colorContrastRatio: number;
    maxHeadingJump: number;
  };
  output: {
    format: ('json' | 'html' | 'console')[];
    outputDir?: string;
    verbose: boolean;
  };
  browser: {
    headless: boolean;
    viewport: {
      width: number;
      height: number;
    };
    userAgent?: string;
  };
  timeout: number;
  concurrent: number;
}

export interface CheckerResult {
  type: CheckType;
  issues: AccessibilityIssue[];
  duration: number;
}

export interface AccessibilityChecker {
  readonly type: CheckType;
  check(page: any, config: HealthCheckConfig): Promise<CheckerResult>;
}

export interface Reporter {
  generate(report: HealthCheckReport): Promise<void>;
}

export interface HealthChecker {
  checkUrl(url: string): Promise<PageHealthReport>;
  checkUrls(urls: string[]): Promise<HealthCheckReport>;
  configure(config: Partial<HealthCheckConfig>): void;
}