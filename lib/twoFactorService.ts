/**
 * Two-Factor Authentication Service
 * Handles email-based 2FA verification codes
 */

import { supabase } from './supabase';
import { logger } from './logger';
import { getCurrentLanguage } from './i18n';

export type VerificationPurpose = 'two_factor' | 'email_change' | 'password_reset';

export interface GenerateCodeResult {
  success: boolean;
  code?: string;
  expiresAt?: Date;
  error?: string;
}

export interface VerifyCodeResult {
  success: boolean;
  error?: 'no_code_found' | 'code_expired' | 'max_attempts_exceeded' | 'invalid_code' | 'unknown';
  message?: string;
  attemptsRemaining?: number;
}

export interface TwoFactorStatus {
  enabled: boolean;
  error?: string;
}

/**
 * Generate a 6-digit verification code and store it in the database
 * The code will be sent via email using Supabase Edge Function or external service
 */
export async function generateVerificationCode(
  userId: string,
  email: string,
  purpose: VerificationPurpose = 'two_factor',
  expiresMinutes: number = 10
): Promise<GenerateCodeResult> {
  try {
    const { data, error } = await supabase.rpc('generate_verification_code', {
      p_user_id: userId,
      p_email: email,
      p_purpose: purpose,
      p_expires_minutes: expiresMinutes,
    });

    if (error) {
      logger.error('[TwoFactorService] Generate code error:', error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      const result = data[0];
      return {
        success: true,
        code: result.code,
        expiresAt: new Date(result.expires_at),
      };
    }

    return { success: false, error: 'Failed to generate code' };
  } catch (error: any) {
    logger.error('[TwoFactorService] Generate code exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify a submitted code
 */
export async function verifyCode(
  userId: string,
  code: string,
  purpose: VerificationPurpose = 'two_factor'
): Promise<VerifyCodeResult> {
  try {
    const { data, error } = await supabase.rpc('verify_email_code', {
      p_user_id: userId,
      p_code: code,
      p_purpose: purpose,
    });

    if (error) {
      logger.error('[TwoFactorService] Verify code error:', error);
      return { success: false, error: 'unknown', message: error.message };
    }

    if (data) {
      return {
        success: data.success,
        error: data.error,
        message: data.message,
        attemptsRemaining: data.attempts_remaining,
      };
    }

    return { success: false, error: 'unknown', message: 'Unknown error' };
  } catch (error: any) {
    logger.error('[TwoFactorService] Verify code exception:', error);
    return { success: false, error: 'unknown', message: error.message };
  }
}

/**
 * Check if a user has 2FA enabled
 */
export async function checkTwoFactorEnabled(userId: string): Promise<TwoFactorStatus> {
  try {
    const { data, error } = await supabase.rpc('check_two_factor_enabled', {
      p_user_id: userId,
    });

    if (error) {
      logger.error('[TwoFactorService] Check 2FA status error:', error);
      return { enabled: false, error: error.message };
    }

    return { enabled: data === true };
  } catch (error: any) {
    logger.error('[TwoFactorService] Check 2FA status exception:', error);
    return { enabled: false, error: error.message };
  }
}

/**
 * Toggle 2FA for a user
 */
export async function toggleTwoFactor(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('toggle_two_factor', {
      p_user_id: userId,
      p_enabled: enabled,
    });

    if (error) {
      logger.error('[TwoFactorService] Toggle 2FA error:', error);
      return { success: false, error: error.message };
    }

    if (data) {
      return { success: data.success, error: data.error };
    }

    return { success: false, error: 'Unknown error' };
  } catch (error: any) {
    logger.error('[TwoFactorService] Toggle 2FA exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send verification code via email
 * Uses Supabase Edge Function to send emails via Resend API
 */
export async function sendVerificationEmail(
  email: string,
  code: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current app language for localized email
    const language = getCurrentLanguage();
    
    logger.info(`[TwoFactorService] Sending verification email to ${email}`);

    // Use Supabase Edge Function to send email
    const { data, error } = await supabase.functions.invoke('send-verification-email', {
      body: { 
        email, 
        code, 
        userName,
        language: language === 'en' ? 'en' : 'tr', // Support tr/en for now
      },
    });

    if (error) {
      logger.error('[TwoFactorService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    // Check if the response indicates success
    if (data && data.success) {
      logger.info(`[TwoFactorService] Verification email sent successfully to ${email}`);
      return { success: true };
    }

    // Handle error response from Edge Function
    if (data && data.error) {
      logger.error('[TwoFactorService] Edge function returned error:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error: any) {
    logger.error('[TwoFactorService] Send email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete 2FA flow: generate code and send email
 */
export async function initiateTwoFactorVerification(
  userId: string,
  email: string,
  userName?: string
): Promise<GenerateCodeResult> {
  // Generate the code
  const result = await generateVerificationCode(userId, email, 'two_factor');

  if (!result.success || !result.code) {
    return result;
  }

  // Send the email via Edge Function
  const emailResult = await sendVerificationEmail(email, result.code, userName);

  if (!emailResult.success) {
    logger.error('[TwoFactorService] Failed to send verification email:', emailResult.error);
    return { success: false, error: emailResult.error };
  }

  // Never return the code to client for security
  return {
    success: true,
    expiresAt: result.expiresAt,
  };
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  
  if (diff <= 0) return '0:00';
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if code is expired
 */
export function isCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
