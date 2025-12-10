/**
 * Validation Utility Tests
 * Tests for input sanitization and validation functions
 */

import {
  sanitizeInput,
  isValidEmail,
  validatePassword,
  validatePostInput,
  isValidUrl,
  isValidUUID,
  escapeHtml,
  stripHtml,
  isValidCoordinates,
  isValidLatitude,
  isValidLongitude,
} from '@/lib/validation';

describe('validation utilities', () => {
  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
    });

    it('should remove HTML tags', () => {
      // stripHtml removes tags but keeps content between them
      expect(stripHtml('<div>Content</div>')).toBe('Content');
      expect(stripHtml('<b>Bold</b> text')).toBe('Bold text');
      expect(stripHtml('<p>Paragraph</p>')).toBe('Paragraph');
    });

    it('should escape special characters', () => {
      const result = escapeHtml('Test & "quotes"');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should truncate to maxLength', () => {
      const input = 'This is a very long string that should be truncated';
      const result = sanitizeInput(input, { maxLength: 10 });
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle newlines based on option', () => {
      const input = 'Line 1\nLine 2';
      
      const withNewlines = sanitizeInput(input, { allowNewlines: true });
      expect(withNewlines).toContain('\n');
      
      const withoutNewlines = sanitizeInput(input, { allowNewlines: false });
      expect(withoutNewlines).not.toContain('\n');
    });

    it('should return empty string for null/undefined', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong passwords', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for short passwords', () => {
      const result = validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for passwords without uppercase', () => {
      const result = validatePassword('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return error for passwords without numbers', () => {
      const result = validatePassword('NoNumbersHere!!');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should calculate password strength', () => {
      const weak = validatePassword('weak');
      expect(weak.strength).toBe('weak');
      
      const strong = validatePassword('StrongPass123!@#');
      expect(strong.strength).toBe('strong');
    });
  });

  describe('validatePostInput', () => {
    it('should validate valid post input', () => {
      const result = validatePostInput({
        title: 'Test Title',
        content: 'This is valid content for a post.',
        type: 'review',
      });
      expect(result.isValid).toBe(true);
    });

    it('should require content', () => {
      const result = validatePostInput({
        title: 'Test',
        content: '',
        type: 'review',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBeDefined();
    });

    it('should reject too long content', () => {
      const result = validatePostInput({
        title: 'Test',
        content: 'A'.repeat(2001),
        type: 'review',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.content).toBeDefined();
    });

    it('should require valid type', () => {
      const result = validatePostInput({
        title: 'Test',
        content: 'Valid content here',
        type: 'invalid_type',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.type).toBeDefined();
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://test.org/path')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('Coordinate Validation', () => {
    it('should validate latitude', () => {
      expect(isValidLatitude(35.3387)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
    });

    it('should validate longitude', () => {
      expect(isValidLongitude(33.3183)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });

    it('should validate coordinate pairs', () => {
      expect(isValidCoordinates(35.3387, 33.3183)).toBe(true);
      expect(isValidCoordinates(91, 33.3183)).toBe(false);
      expect(isValidCoordinates(35.3387, 181)).toBe(false);
    });
  });
});
