import { WcagLevel, CheckType, HealthCheckConfig } from './types.js';

export const DEFAULT_CONFIG: HealthCheckConfig = {
  wcagLevel: WcagLevel.AA,
  checks: {
    enabled: Object.values(CheckType),
    disabled: [],
  },
  thresholds: {
    colorContrastRatio: 4.5,
    maxHeadingJump: 1,
  },
  output: {
    format: ['console'],
    verbose: false,
  },
  browser: {
    headless: true,
    viewport: {
      width: 1920,
      height: 1080,
    },
  },
  timeout: 30000,
  concurrent: 3,
};

export const WCAG_REFERENCES = {
  [CheckType.ALT_TEXT]: {
    [WcagLevel.A]: '1.1.1',
    [WcagLevel.AA]: '1.1.1',
    [WcagLevel.AAA]: '1.1.1',
  },
  [CheckType.COLOR_CONTRAST]: {
    [WcagLevel.A]: null,
    [WcagLevel.AA]: '1.4.3',
    [WcagLevel.AAA]: '1.4.6',
  },
  [CheckType.HEADING_STRUCTURE]: {
    [WcagLevel.A]: '1.3.1',
    [WcagLevel.AA]: '1.3.1',
    [WcagLevel.AAA]: '1.3.1',
  },
  [CheckType.ARIA_ATTRIBUTES]: {
    [WcagLevel.A]: '4.1.2',
    [WcagLevel.AA]: '4.1.2',
    [WcagLevel.AAA]: '4.1.2',
  },
  [CheckType.KEYBOARD_NAVIGATION]: {
    [WcagLevel.A]: '2.1.1',
    [WcagLevel.AA]: '2.1.1',
    [WcagLevel.AAA]: '2.1.3',
  },
  [CheckType.FORM_LABELS]: {
    [WcagLevel.A]: '1.3.1',
    [WcagLevel.AA]: '1.3.1',
    [WcagLevel.AAA]: '1.3.1',
  },
  [CheckType.FOCUS_INDICATORS]: {
    [WcagLevel.A]: '2.4.7',
    [WcagLevel.AA]: '2.4.7',
    [WcagLevel.AAA]: '2.4.7',
  },
  [CheckType.LANDMARK_REGIONS]: {
    [WcagLevel.A]: '1.3.1',
    [WcagLevel.AA]: '1.3.1',
    [WcagLevel.AAA]: '1.3.1',
  },
} as const;