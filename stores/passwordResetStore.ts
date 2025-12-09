/**
 * Password Reset Store
 * Handles the custom password reset flow with 6-digit verification code
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { 
  generateVerificationCode, 
  verifyCode, 
  formatTimeRemaining, 
  isCodeExpired 
} from '@/lib/twoFactorService';
import { logger } from '@/lib/logger';
import { getCurrentLanguage } from '@/lib/i18n';

interface PasswordResetState {
  // State
  email: string;
  userId: string | null;
  isPending: boolean;
  isVerified: boolean;
  isLoading: boolean;
  expiresAt: Date | null;
  timeRemaining: string;
  error: string | null;
  attemptsRemaining: number | null;

  // Actions
  initiateReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateTimeRemaining: () => void;
  reset: () => void;
}

const initialState = {
  email: '',
  userId: null,
  isPending: false,
  isVerified: false,
  isLoading: false,
  expiresAt: null,
  timeRemaining: '',
  error: null,
  attemptsRemaining: null,
};

export const usePasswordResetStore = create<PasswordResetState>((set, get) => ({
  ...initialState,

  /**
   * Step 1: Initiate password reset
   * - Look up user by email
   * - Generate 6-digit code
   * - Send email via Edge Function
   */
  initiateReset: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      // Look up user by email from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (profileError || !profile) {
        logger.warn('[PasswordReset] User not found for email:', email);
        // Don't reveal if email exists - show generic message
        set({ isLoading: false });
        return { 
          success: true, // Return success anyway to prevent email enumeration
        };
      }

      // Generate verification code with password_reset purpose
      const result = await generateVerificationCode(
        profile.id,
        email.toLowerCase().trim(),
        'password_reset',
        10 // 10 minutes expiry
      );

      if (!result.success || !result.code) {
        set({ isLoading: false, error: result.error });
        return { success: false, error: result.error };
      }

      // Send email via Edge Function with password_reset purpose
      const language = getCurrentLanguage();
      const { data, error: emailError } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.toLowerCase().trim(),
          code: result.code,
          userName: profile.full_name,
          language: language === 'en' ? 'en' : 'tr',
          purpose: 'password_reset',
        },
      });

      if (emailError || (data && !data.success)) {
        logger.error('[PasswordReset] Failed to send email:', emailError || data?.error);
        set({ isLoading: false, error: 'Failed to send email' });
        return { success: false, error: 'Failed to send email' };
      }

      set({
        email: email.toLowerCase().trim(),
        userId: profile.id,
        isPending: true,
        isLoading: false,
        expiresAt: result.expiresAt || null,
        timeRemaining: result.expiresAt ? formatTimeRemaining(result.expiresAt) : '',
      });

      logger.info('[PasswordReset] Reset initiated for user:', profile.id);
      return { success: true };
    } catch (error: any) {
      logger.error('[PasswordReset] Initiate error:', error);
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  /**
   * Step 2: Verify the 6-digit code
   */
  verifyCode: async (code: string) => {
    const { userId, expiresAt } = get();

    if (!userId) {
      return { success: false, error: 'no_user' };
    }

    // Check if code is expired locally first
    if (expiresAt && isCodeExpired(expiresAt)) {
      set({ error: 'code_expired' });
      return { success: false, error: 'code_expired' };
    }

    set({ isLoading: true, error: null });

    try {
      const result = await verifyCode(userId, code, 'password_reset');

      if (result.success) {
        set({
          isVerified: true,
          isLoading: false,
          error: null,
        });
        logger.info('[PasswordReset] Code verified successfully');
        return { success: true };
      }

      set({
        isLoading: false,
        error: result.error || null,
        attemptsRemaining: result.attemptsRemaining ?? null,
      });

      return { success: false, error: result.error };
    } catch (error: any) {
      logger.error('[PasswordReset] Verify error:', error);
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  /**
   * Step 3: Update password via Edge Function
   */
  updatePassword: async (newPassword: string) => {
    const { userId, isVerified } = get();

    if (!userId || !isVerified) {
      return { success: false, error: 'not_verified' };
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: {
          userId,
          newPassword,
        },
      });

      if (error) {
        logger.error('[PasswordReset] Update password error:', error);
        set({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data && !data.success) {
        logger.error('[PasswordReset] Update password failed:', data.error);
        set({ isLoading: false, error: data.error });
        return { success: false, error: data.error };
      }

      logger.info('[PasswordReset] Password updated successfully');
      
      // Reset store after successful update
      set(initialState);
      
      return { success: true };
    } catch (error: any) {
      logger.error('[PasswordReset] Update password exception:', error);
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  /**
   * Update time remaining display
   */
  updateTimeRemaining: () => {
    const { expiresAt } = get();
    if (expiresAt) {
      if (isCodeExpired(expiresAt)) {
        set({ timeRemaining: '0:00', error: 'code_expired' });
      } else {
        set({ timeRemaining: formatTimeRemaining(expiresAt) });
      }
    }
  },

  /**
   * Reset the store to initial state
   */
  reset: () => {
    set(initialState);
  },
}));

// Selectors
export const selectIsPasswordResetPending = (state: PasswordResetState) => state.isPending;
export const selectIsPasswordResetVerified = (state: PasswordResetState) => state.isVerified;
export const selectPasswordResetEmail = (state: PasswordResetState) => state.email;
