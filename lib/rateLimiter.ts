/**
 * Rate Limiter Utility
 * 
 * Client-side rate limiting for API calls to prevent abuse and improve UX.
 * Uses a token bucket algorithm with configurable limits.
 */

interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed in the window
  windowMs: number;         // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface RateLimitState {
  tokens: number;
  lastRefill: number;
  blockedUntil: number;
}

// Store rate limit states by key
const rateLimitStates = new Map<string, RateLimitState>();

// Default configurations for different actions
export const RateLimitPresets: Record<string, RateLimitConfig> = {
  // API calls - general
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    blockDurationMs: 30 * 1000,
  },
  // Search operations
  search: {
    maxRequests: 20,
    windowMs: 10 * 1000, // 20 searches per 10 seconds
    blockDurationMs: 5 * 1000,
  },
  // Form submissions
  submit: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 submissions per minute
    blockDurationMs: 60 * 1000,
  },
  // Auth operations (login, signup)
  auth: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 attempts per 5 minutes
    blockDurationMs: 5 * 60 * 1000,
  },
  // Image uploads
  upload: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 uploads per minute
    blockDurationMs: 60 * 1000,
  },
  // Like/Unlike actions
  interaction: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 interactions per minute
    blockDurationMs: 10 * 1000,
  },
  // Comments
  comment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 comments per minute
    blockDurationMs: 30 * 1000,
  },
};

/**
 * Get or create rate limit state for a key
 */
const getState = (key: string, config: RateLimitConfig): RateLimitState => {
  if (!rateLimitStates.has(key)) {
    rateLimitStates.set(key, {
      tokens: config.maxRequests,
      lastRefill: Date.now(),
      blockedUntil: 0,
    });
  }
  return rateLimitStates.get(key)!;
};

/**
 * Refill tokens based on time elapsed
 */
const refillTokens = (state: RateLimitState, config: RateLimitConfig): void => {
  const now = Date.now();
  const elapsed = now - state.lastRefill;
  
  if (elapsed >= config.windowMs) {
    // Full refill if window has passed
    state.tokens = config.maxRequests;
    state.lastRefill = now;
  } else {
    // Partial refill based on time elapsed
    const refillRate = config.maxRequests / config.windowMs;
    const tokensToAdd = Math.floor(elapsed * refillRate);
    
    if (tokensToAdd > 0) {
      state.tokens = Math.min(config.maxRequests, state.tokens + tokensToAdd);
      state.lastRefill = now;
    }
  }
};

/**
 * Check if action is allowed and consume a token
 */
export const checkRateLimit = (
  key: string,
  preset: keyof typeof RateLimitPresets | RateLimitConfig = 'api'
): { allowed: boolean; retryAfterMs?: number; remainingTokens: number } => {
  const config = typeof preset === 'string' ? RateLimitPresets[preset] : preset;
  const state = getState(key, config);
  const now = Date.now();
  
  // Check if currently blocked
  if (state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: state.blockedUntil - now,
      remainingTokens: 0,
    };
  }
  
  // Refill tokens
  refillTokens(state, config);
  
  // Check if we have tokens
  if (state.tokens > 0) {
    state.tokens--;
    return {
      allowed: true,
      remainingTokens: state.tokens,
    };
  }
  
  // No tokens - block the user
  if (config.blockDurationMs) {
    state.blockedUntil = now + config.blockDurationMs;
  }
  
  return {
    allowed: false,
    retryAfterMs: config.blockDurationMs || config.windowMs,
    remainingTokens: 0,
  };
};

/**
 * Create a rate-limited wrapper for async functions
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string,
  preset: keyof typeof RateLimitPresets | RateLimitConfig = 'api'
): T => {
  return (async (...args: Parameters<T>) => {
    const result = checkRateLimit(key, preset);
    
    if (!result.allowed) {
      throw new RateLimitError(
        'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
        result.retryAfterMs || 0
      );
    }
    
    return fn(...args);
  }) as T;
};

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  retryAfterMs: number;
  
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Reset rate limit for a specific key
 */
export const resetRateLimit = (key: string): void => {
  rateLimitStates.delete(key);
};

/**
 * Clear all rate limit states
 */
export const clearAllRateLimits = (): void => {
  rateLimitStates.clear();
};

/**
 * Get remaining tokens for a key without consuming
 */
export const getRemainingTokens = (
  key: string,
  preset: keyof typeof RateLimitPresets | RateLimitConfig = 'api'
): number => {
  const config = typeof preset === 'string' ? RateLimitPresets[preset] : preset;
  
  if (!rateLimitStates.has(key)) {
    return config.maxRequests;
  }
  
  const state = rateLimitStates.get(key)!;
  refillTokens(state, config);
  
  return Math.max(0, state.tokens);
};

/**
 * Debounced rate limiter for search inputs
 * Returns a function that checks rate limit with built-in debouncing
 */
export const createDebouncedRateLimiter = (
  key: string,
  preset: keyof typeof RateLimitPresets = 'search',
  debounceMs: number = 300
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return <T>(fn: () => Promise<T>): Promise<T | null> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(async () => {
        const result = checkRateLimit(key, preset);
        
        if (!result.allowed) {
          console.warn(`Rate limit exceeded for ${key}`);
          resolve(null);
          return;
        }
        
        try {
          const data = await fn();
          resolve(data);
        } catch (error) {
          console.error(`Error in rate-limited function: ${error}`);
          resolve(null);
        }
      }, debounceMs);
    });
  };
};

/**
 * Hook-friendly rate limit checker
 * Returns current state and a function to attempt an action
 */
export const useRateLimitState = (
  key: string,
  preset: keyof typeof RateLimitPresets | RateLimitConfig = 'api'
) => {
  const config = typeof preset === 'string' ? RateLimitPresets[preset] : preset;
  
  const attempt = (): boolean => {
    const result = checkRateLimit(key, preset);
    return result.allowed;
  };
  
  const canAttempt = (): boolean => {
    const remaining = getRemainingTokens(key, preset);
    return remaining > 0;
  };
  
  const getRetryAfter = (): number => {
    const state = rateLimitStates.get(key);
    if (!state) return 0;
    
    const now = Date.now();
    if (state.blockedUntil > now) {
      return state.blockedUntil - now;
    }
    
    if (state.tokens <= 0) {
      return config.windowMs;
    }
    
    return 0;
  };
  
  return {
    attempt,
    canAttempt,
    getRetryAfter,
    getRemainingTokens: () => getRemainingTokens(key, preset),
    reset: () => resetRateLimit(key),
  };
};
