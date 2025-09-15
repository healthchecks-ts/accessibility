import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, WCAG_REFERENCES } from '../constants.js';
import { WcagLevel, CheckType } from '../types.js';

describe('Constants', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_CONFIG.wcagLevel).toBe(WcagLevel.AA);
      expect(DEFAULT_CONFIG.checks.enabled).toContain(CheckType.ALT_TEXT);
      expect(DEFAULT_CONFIG.checks.enabled).toContain(CheckType.COLOR_CONTRAST);
      expect(DEFAULT_CONFIG.checks.disabled).toEqual([]);
      expect(DEFAULT_CONFIG.thresholds.colorContrastRatio).toBe(4.5);
      expect(DEFAULT_CONFIG.browser.headless).toBe(true);
      expect(DEFAULT_CONFIG.timeout).toBe(30000);
    });
  });

  describe('WCAG_REFERENCES', () => {
    it('should have references for all check types', () => {
      Object.values(CheckType).forEach(checkType => {
        expect(WCAG_REFERENCES[checkType]).toBeDefined();
        expect(WCAG_REFERENCES[checkType][WcagLevel.A]).toBeDefined();
        expect(WCAG_REFERENCES[checkType][WcagLevel.AA]).toBeDefined();
        expect(WCAG_REFERENCES[checkType][WcagLevel.AAA]).toBeDefined();
      });
    });

    it('should have valid WCAG reference format', () => {
      const altTextRef = WCAG_REFERENCES[CheckType.ALT_TEXT][WcagLevel.A];
      expect(altTextRef).toBe('1.1.1');
      
      const contrastRef = WCAG_REFERENCES[CheckType.COLOR_CONTRAST][WcagLevel.AA];
      expect(contrastRef).toBe('1.4.3');
    });
  });
});