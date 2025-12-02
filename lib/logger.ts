/**
 * Logger Utility
 * 
 * Centralized logging that:
 * - Disables logs in production
 * - Provides structured log levels
 * - Supports error reporting integration
 */

// Environment check - only log in development
const isDev = __DEV__ || process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  tag?: string;
}

/**
 * Log queue for potential remote logging
 */
const logQueue: LogEntry[] = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Add entry to log queue
 */
const queueLog = (entry: LogEntry): void => {
  logQueue.push(entry);
  if (logQueue.length > MAX_QUEUE_SIZE) {
    logQueue.shift();
  }
};

/**
 * Format log message with optional tag
 */
const formatMessage = (tag: string | undefined, message: string): string => {
  return tag ? `[${tag}] ${message}` : message;
};

/**
 * Main logger object
 */
export const logger = {
  /**
   * Debug level - development only, detailed debugging info
   */
  debug: (message: string, data?: unknown, tag?: string): void => {
    if (!isDev) return;
    
    const entry: LogEntry = {
      level: 'debug',
      message,
      data,
      timestamp: new Date().toISOString(),
      tag,
    };
    
    queueLog(entry);
    console.log(`🔍 ${formatMessage(tag, message)}`, data ?? '');
  },

  /**
   * Info level - general information
   */
  info: (message: string, data?: unknown, tag?: string): void => {
    if (!isDev) return;
    
    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
      tag,
    };
    
    queueLog(entry);
    console.info(`ℹ️ ${formatMessage(tag, message)}`, data ?? '');
  },

  /**
   * Warning level - potential issues
   */
  warn: (message: string, data?: unknown, tag?: string): void => {
    if (!isDev) return;
    
    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
      tag,
    };
    
    queueLog(entry);
    console.warn(`⚠️ ${formatMessage(tag, message)}`, data ?? '');
  },

  /**
   * Error level - always logs, reports to error tracking
   */
  error: (message: string, error?: unknown, tag?: string): void => {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      timestamp: new Date().toISOString(),
      tag,
    };
    
    queueLog(entry);
    
    // Always log errors
    console.error(`❌ ${formatMessage(tag, message)}`, error ?? '');
    
    // TODO: Send to error reporting service (Sentry, etc.)
    // if (!isDev) {
    //   sendToErrorReporting(entry);
    // }
  },

  /**
   * API request logging
   */
  api: (method: string, endpoint: string, data?: unknown): void => {
    if (!isDev) return;
    console.log(`🌐 API ${method.toUpperCase()} ${endpoint}`, data ?? '');
  },

  /**
   * Performance measurement
   */
  perf: (label: string, startTime: number): void => {
    if (!isDev) return;
    const duration = Date.now() - startTime;
    console.log(`⏱️ [PERF] ${label}: ${duration}ms`);
  },

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs: (): LogEntry[] => {
    return [...logQueue];
  },

  /**
   * Clear log queue
   */
  clearLogs: (): void => {
    logQueue.length = 0;
  },
};

/**
 * Create a tagged logger for specific modules
 */
export const createLogger = (tag: string) => ({
  debug: (message: string, data?: unknown) => logger.debug(message, data, tag),
  info: (message: string, data?: unknown) => logger.info(message, data, tag),
  warn: (message: string, data?: unknown) => logger.warn(message, data, tag),
  error: (message: string, error?: unknown) => logger.error(message, error, tag),
});

/**
 * Pre-configured loggers for common modules
 */
export const authLogger = createLogger('Auth');
export const tourLogger = createLogger('Tour');
export const communityLogger = createLogger('Community');
export const storageLogger = createLogger('Storage');
export const notificationLogger = createLogger('Notification');

export default logger;
