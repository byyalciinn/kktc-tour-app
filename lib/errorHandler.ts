/**
 * Error Handler Utility
 * Masks sensitive error details from users while preserving logs for debugging
 * 
 * SECURITY: Prevents information leakage through error messages
 */

import { logger } from './logger';

// Error codes for user-friendly messages
export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_SESSION_EXPIRED = 'AUTH_002',
  AUTH_2FA_FAILED = 'AUTH_003',
  AUTH_RATE_LIMITED = 'AUTH_004',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_005',
  AUTH_WEAK_PASSWORD = 'AUTH_006',
  AUTH_USER_EXISTS = 'AUTH_007',
  NETWORK_ERROR = 'NET_001',
  NETWORK_TIMEOUT = 'NET_002',
  SERVER_ERROR = 'SRV_001',
  VALIDATION_ERROR = 'VAL_001',
  PERMISSION_DENIED = 'PERM_001',
  NOT_FOUND = 'NF_001',
  STORAGE_ERROR = 'STR_001',
  UNKNOWN = 'UNK_001',
}

// User-friendly error messages (Turkish)
const ERROR_MESSAGES_TR: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'E-posta veya şifre hatalı.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  [ErrorCode.AUTH_2FA_FAILED]: 'Doğrulama kodu geçersiz.',
  [ErrorCode.AUTH_RATE_LIMITED]: 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'E-posta adresinizi doğrulamanız gerekiyor.',
  [ErrorCode.AUTH_WEAK_PASSWORD]: 'Şifreniz yeterince güçlü değil.',
  [ErrorCode.AUTH_USER_EXISTS]: 'Bu e-posta adresi zaten kayıtlı.',
  [ErrorCode.NETWORK_ERROR]: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
  [ErrorCode.NETWORK_TIMEOUT]: 'İstek zaman aşımına uğradı. Tekrar deneyin.',
  [ErrorCode.SERVER_ERROR]: 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
  [ErrorCode.VALIDATION_ERROR]: 'Girdiğiniz bilgileri kontrol edin.',
  [ErrorCode.PERMISSION_DENIED]: 'Bu işlem için yetkiniz yok.',
  [ErrorCode.NOT_FOUND]: 'Aradığınız kaynak bulunamadı.',
  [ErrorCode.STORAGE_ERROR]: 'Dosya yüklenirken bir hata oluştu.',
  [ErrorCode.UNKNOWN]: 'Beklenmeyen bir hata oluştu.',
};

// User-friendly error messages (English)
const ERROR_MESSAGES_EN: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCode.AUTH_2FA_FAILED]: 'Invalid verification code.',
  [ErrorCode.AUTH_RATE_LIMITED]: 'Too many attempts. Please wait a moment.',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address.',
  [ErrorCode.AUTH_WEAK_PASSWORD]: 'Your password is not strong enough.',
  [ErrorCode.AUTH_USER_EXISTS]: 'This email is already registered.',
  [ErrorCode.NETWORK_ERROR]: 'Connection error. Check your internet connection.',
  [ErrorCode.NETWORK_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCode.SERVER_ERROR]: 'Something went wrong. Please try again later.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check the information you entered.',
  [ErrorCode.PERMISSION_DENIED]: 'You do not have permission for this action.',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.STORAGE_ERROR]: 'An error occurred while uploading the file.',
  [ErrorCode.UNKNOWN]: 'An unexpected error occurred.',
};

export interface MaskedError {
  code: ErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Maps raw error to user-friendly error code
 */
function mapErrorToCode(error: Error | string): ErrorCode {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Auth errors
  if (lowerMessage.includes('invalid login credentials') ||
      lowerMessage.includes('invalid email or password') ||
      lowerMessage.includes('invalid credentials')) {
    return ErrorCode.AUTH_INVALID_CREDENTIALS;
  }
  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return ErrorCode.AUTH_SESSION_EXPIRED;
  }
  if (lowerMessage.includes('verification') || 
      lowerMessage.includes('2fa') ||
      lowerMessage.includes('otp') ||
      lowerMessage.includes('invalid code')) {
    return ErrorCode.AUTH_2FA_FAILED;
  }
  if (lowerMessage.includes('rate limit') || 
      lowerMessage.includes('too many') ||
      lowerMessage.includes('exceeded')) {
    return ErrorCode.AUTH_RATE_LIMITED;
  }
  if (lowerMessage.includes('email not confirmed') ||
      lowerMessage.includes('email not verified')) {
    return ErrorCode.AUTH_EMAIL_NOT_VERIFIED;
  }
  if (lowerMessage.includes('password') && 
      (lowerMessage.includes('weak') || lowerMessage.includes('short') || lowerMessage.includes('simple'))) {
    return ErrorCode.AUTH_WEAK_PASSWORD;
  }
  if (lowerMessage.includes('already registered') ||
      lowerMessage.includes('user already exists') ||
      lowerMessage.includes('email already')) {
    return ErrorCode.AUTH_USER_EXISTS;
  }

  // Network errors
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return ErrorCode.NETWORK_TIMEOUT;
  }

  // Permission errors
  if (lowerMessage.includes('permission') || 
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('access denied')) {
    return ErrorCode.PERMISSION_DENIED;
  }

  // Not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return ErrorCode.NOT_FOUND;
  }

  // Storage errors
  if (lowerMessage.includes('storage') || 
      lowerMessage.includes('upload') ||
      lowerMessage.includes('file')) {
    return ErrorCode.STORAGE_ERROR;
  }

  // Server errors
  if (lowerMessage.includes('500') || 
      lowerMessage.includes('internal server') ||
      lowerMessage.includes('server error')) {
    return ErrorCode.SERVER_ERROR;
  }

  // Validation errors
  if (lowerMessage.includes('validation') || 
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('required')) {
    return ErrorCode.VALIDATION_ERROR;
  }

  return ErrorCode.UNKNOWN;
}

/**
 * Get error messages based on language
 */
function getErrorMessages(language: 'tr' | 'en' = 'tr'): Record<ErrorCode, string> {
  return language === 'en' ? ERROR_MESSAGES_EN : ERROR_MESSAGES_TR;
}

/**
 * Masks error for user display while logging original
 * @param error - The original error
 * @param context - Context where the error occurred (for logging)
 * @param language - Language for user message ('tr' or 'en')
 */
export function maskError(
  error: Error | string, 
  context?: string,
  language: 'tr' | 'en' = 'tr'
): MaskedError {
  const originalError = typeof error === 'string' ? new Error(error) : error;
  const code = mapErrorToCode(originalError);
  const messages = getErrorMessages(language);
  
  // Log the original error for debugging (with full details)
  logger.error(`[${code}] ${context || 'Error'}:`, {
    message: originalError.message,
    stack: originalError.stack,
  });
  
  return {
    code,
    message: messages[code],
    // Only include original error in development for debugging
    originalError: __DEV__ ? originalError : undefined,
  };
}

/**
 * Get user-friendly message from error code
 */
export function getErrorMessage(code: ErrorCode, language: 'tr' | 'en' = 'tr'): string {
  const messages = getErrorMessages(language);
  return messages[code] || messages[ErrorCode.UNKNOWN];
}

/**
 * Wrapper for try-catch blocks with automatic error masking
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: string,
  language: 'tr' | 'en' = 'tr'
): Promise<{ data: T | null; error: MaskedError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: maskError(error as Error, context, language) 
    };
  }
}

/**
 * Check if an error is a specific type
 */
export function isErrorType(error: MaskedError, ...codes: ErrorCode[]): boolean {
  return codes.includes(error.code);
}

/**
 * Check if error is auth-related
 */
export function isAuthError(error: MaskedError): boolean {
  return error.code.startsWith('AUTH_');
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: MaskedError): boolean {
  return error.code.startsWith('NET_');
}
