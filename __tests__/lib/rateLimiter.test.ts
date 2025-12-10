/**
 * Rate Limiter Tests
 * Tests for token bucket rate limiting utility
 */

import {
  checkRateLimit,
  resetRateLimit,
  clearAllRateLimits,
  getRemainingTokens,
  RateLimitPresets,
  RateLimitError,
  withRateLimit,
} from '@/lib/rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const key = 'test-allow';
      
      // First request should be allowed
      const result1 = checkRateLimit(key, 'api');
      expect(result1.allowed).toBe(true);
      expect(result1.remainingTokens).toBe(99); // 100 - 1
    });

    it('should track remaining tokens', () => {
      const key = 'test-tokens';
      const config = { maxRequests: 5, windowMs: 60000 };
      
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      const result = checkRateLimit(key, config);
      
      expect(result.remainingTokens).toBe(2); // 5 - 3
    });

    it('should block when tokens exhausted', () => {
      const key = 'test-block';
      const config = { maxRequests: 2, windowMs: 60000, blockDurationMs: 5000 };
      
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      const result = checkRateLimit(key, config);
      
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
    });

    it('should use preset configurations', () => {
      const key = 'test-preset';
      
      // Auth preset has 5 max requests
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(key, 'auth');
        expect(result.allowed).toBe(true);
      }
      
      // 6th request should be blocked
      const blocked = checkRateLimit(key, 'auth');
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('getRemainingTokens', () => {
    it('should return max tokens for new key', () => {
      const remaining = getRemainingTokens('new-key', 'api');
      expect(remaining).toBe(100); // api preset maxRequests
    });

    it('should return correct remaining after consumption', () => {
      const key = 'test-remaining';
      const config = { maxRequests: 10, windowMs: 60000 };
      
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      
      const remaining = getRemainingTokens(key, config);
      expect(remaining).toBe(7);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for a key', () => {
      const key = 'test-reset';
      const config = { maxRequests: 3, windowMs: 60000 };
      
      // Exhaust tokens
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      checkRateLimit(key, config);
      
      expect(getRemainingTokens(key, config)).toBe(0);
      
      // Reset
      resetRateLimit(key);
      
      // Should have full tokens again
      expect(getRemainingTokens(key, config)).toBe(3);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      
      checkRateLimit('key1', config);
      checkRateLimit('key2', config);
      checkRateLimit('key3', config);
      
      clearAllRateLimits();
      
      expect(getRemainingTokens('key1', config)).toBe(5);
      expect(getRemainingTokens('key2', config)).toBe(5);
      expect(getRemainingTokens('key3', config)).toBe(5);
    });
  });

  describe('RateLimitPresets', () => {
    it('should have api preset', () => {
      expect(RateLimitPresets.api).toBeDefined();
      expect(RateLimitPresets.api.maxRequests).toBe(100);
    });

    it('should have auth preset', () => {
      expect(RateLimitPresets.auth).toBeDefined();
      expect(RateLimitPresets.auth.maxRequests).toBe(5);
    });

    it('should have search preset', () => {
      expect(RateLimitPresets.search).toBeDefined();
      expect(RateLimitPresets.search.maxRequests).toBe(20);
    });

    it('should have submit preset', () => {
      expect(RateLimitPresets.submit).toBeDefined();
      expect(RateLimitPresets.submit.maxRequests).toBe(5);
    });

    it('should have upload preset', () => {
      expect(RateLimitPresets.upload).toBeDefined();
      expect(RateLimitPresets.upload.maxRequests).toBe(10);
    });
  });

  describe('RateLimitError', () => {
    it('should create error with retryAfterMs', () => {
      const error = new RateLimitError('Test error', 5000);
      
      expect(error.message).toBe('Test error');
      expect(error.retryAfterMs).toBe(5000);
      expect(error.name).toBe('RateLimitError');
    });
  });

  describe('withRateLimit', () => {
    it('should allow function execution within limit', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const limitedFn = withRateLimit(mockFn, 'test-wrapper', {
        maxRequests: 5,
        windowMs: 60000,
      });
      
      const result = await limitedFn();
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const config = { maxRequests: 1, windowMs: 60000, blockDurationMs: 5000 };
      const limitedFn = withRateLimit(mockFn, 'test-throw', config);
      
      // First call should succeed
      await limitedFn();
      
      // Second call should throw
      await expect(limitedFn()).rejects.toThrow(RateLimitError);
    });
  });
});
