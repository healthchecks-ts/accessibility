import { describe, it, expect } from 'vitest';
import { calculateScore, createAccessibilityIssue, getContrastRatio, isValidUrl, normalizeUrl } from '../utils.js';
import { CheckType, Severity, WcagLevel } from '../types.js';

describe('Utils', () => {
  describe('calculateScore', () => {
    it('should return 100 for no issues', () => {
      expect(calculateScore([])).toBe(100);
    });

    it('should calculate score based on issue severity', () => {
      const issues = [
        createAccessibilityIssue(CheckType.ALT_TEXT, Severity.ERROR, WcagLevel.A, 'Error', 'Description'),
        createAccessibilityIssue(CheckType.ALT_TEXT, Severity.WARNING, WcagLevel.A, 'Warning', 'Description'),
        createAccessibilityIssue(CheckType.ALT_TEXT, Severity.INFO, WcagLevel.A, 'Info', 'Description'),
      ];

      const score = calculateScore(issues);
      expect(score).toBe(84); // 100 - (10 + 5 + 1) = 84
    });

    it('should not go below 0', () => {
      const issues = Array(20).fill(null).map(() =>
        createAccessibilityIssue(CheckType.ALT_TEXT, Severity.ERROR, WcagLevel.A, 'Error', 'Description')
      );

      const score = calculateScore(issues);
      expect(score).toBe(0);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://subdomain.example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('javascript:void(0)')).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    it('should add https to URLs without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('subdomain.example.com')).toBe('https://subdomain.example.com');
    });

    it('should leave complete URLs unchanged', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#ff0000', '#ff0000');
      expect(ratio).toBe(1);
    });
  });

  describe('createAccessibilityIssue', () => {
    it('should create a valid accessibility issue', () => {
      const issue = createAccessibilityIssue(
        CheckType.ALT_TEXT,
        Severity.ERROR,
        WcagLevel.A,
        'Test message',
        'Test description'
      );

      expect(issue.type).toBe(CheckType.ALT_TEXT);
      expect(issue.severity).toBe(Severity.ERROR);
      expect(issue.wcagLevel).toBe(WcagLevel.A);
      expect(issue.message).toBe('Test message');
      expect(issue.description).toBe('Test description');
      expect(issue.id).toBeDefined();
      expect(issue.wcagReference).toBeDefined();
    });
  });
});