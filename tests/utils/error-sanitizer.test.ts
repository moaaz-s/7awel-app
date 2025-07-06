import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage } from '@/utils/error-sanitizer';

describe('error-sanitizer', () => {
  describe('sanitizeErrorMessage', () => {
    it('should return default message for null/undefined input', () => {
      expect(sanitizeErrorMessage(null)).toBe('An error occurred');
      expect(sanitizeErrorMessage(undefined)).toBe('An error occurred');
      expect(sanitizeErrorMessage('')).toBe('An error occurred');
    });

    it('should remove script tags', () => {
      const malicious = 'Error: <script>alert("XSS")</script>Something went wrong';
      const sanitized = sanitizeErrorMessage(malicious);
      expect(sanitized).toBe('Error: Something went wrong');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove dangerous HTML tags', () => {
      const malicious = 'Error: <iframe src="evil.com"></iframe><object data="evil"></object>Failed';
      const sanitized = sanitizeErrorMessage(malicious);
      expect(sanitized).toBe('Error: Failed');
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('<object>');
    });

    it('should preserve safe error messages', () => {
      const safeMessage = 'Network connection failed. Please try again.';
      const sanitized = sanitizeErrorMessage(safeMessage);
      expect(sanitized).toBe(safeMessage);
    });
  });
}); 