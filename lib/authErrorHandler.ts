/**
 * Auth Error Handler
 * Converts Supabase auth errors to user-friendly i18n messages
 * 
 * Usage:
 * const { message, type } = getAuthErrorMessage(error, t);
 * showToast(message, type);
 */

import { AuthError } from '@supabase/supabase-js';
import { TFunction } from 'i18next';
import { logger } from './logger';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface AuthErrorResult {
  message: string;
  type: ToastType;
}

/**
 * Maps Supabase auth error to i18n key and toast type
 */
export function getAuthErrorMessage(
  error: AuthError | Error | string,
  t: TFunction
): AuthErrorResult {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error.message || '';
  const lowerMessage = errorMessage.toLowerCase();

  // Log the original error for debugging
  logger.error('[AuthError]', { message: errorMessage });

  // Invalid credentials / wrong password
  if (
    lowerMessage.includes('invalid login credentials') ||
    lowerMessage.includes('invalid credentials') ||
    lowerMessage.includes('invalid email or password')
  ) {
    return {
      message: t('auth.errors.invalidCredentials'),
      type: 'error',
    };
  }

  // User not found
  if (lowerMessage.includes('user not found')) {
    return {
      message: t('auth.errors.userNotFound'),
      type: 'error',
    };
  }

  // Rate limiting
  if (
    lowerMessage.includes('too many requests') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('exceeded')
  ) {
    return {
      message: t('auth.errors.tooManyRequests'),
      type: 'warning',
    };
  }

  // Email not confirmed
  if (
    lowerMessage.includes('email not confirmed') ||
    lowerMessage.includes('email_not_confirmed')
  ) {
    return {
      message: t('auth.errors.emailNotConfirmed'),
      type: 'info',
    };
  }

  // User already exists
  if (
    lowerMessage.includes('user already registered') ||
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('already registered')
  ) {
    return {
      message: t('auth.errors.userAlreadyExists'),
      type: 'error',
    };
  }

  // Invalid email
  if (
    lowerMessage.includes('invalid email') ||
    lowerMessage.includes('email invalid')
  ) {
    return {
      message: t('auth.errors.invalidEmail'),
      type: 'error',
    };
  }

  // Network error
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('offline')
  ) {
    return {
      message: t('auth.errors.networkError'),
      type: 'warning',
    };
  }

  // Database error
  if (
    lowerMessage.includes('database') ||
    lowerMessage.includes('db error')
  ) {
    return {
      message: t('auth.errors.databaseError'),
      type: 'error',
    };
  }

  // Default server error
  return {
    message: t('auth.errors.serverError'),
    type: 'error',
  };
}

/**
 * Get validation error message with appropriate toast type
 * For client-side validation errors (empty fields, format issues)
 */
export function getValidationErrorType(validationMessage: string): ToastType {
  // Validation errors are typically warnings since user can fix them
  return 'warning';
}

/**
 * Helper to show auth error toast
 */
export function showAuthError(
  error: AuthError | Error | string,
  t: TFunction,
  showToast: (message: string, type: ToastType) => void
): void {
  const { message, type } = getAuthErrorMessage(error, t);
  showToast(message, type);
}
