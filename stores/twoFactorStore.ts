/**
 * Two-Factor Authentication Store
 * Manages 2FA state during login flow
 */

import { create } from 'zustand';
import {
  initiateTwoFactorVerification,
  verifyCode,
  checkTwoFactorEnabled,
  toggleTwoFactor,
  formatTimeRemaining,
  isCodeExpired,
  type VerifyCodeResult,
} from '@/lib/twoFactorService';
import { logger } from '@/lib/logger';

interface PendingAuth {
  userId: string;
  email: string;
  userName?: string;
  expiresAt: Date;
}

interface TwoFactorState {
  // State
  isVerifying: boolean;
  isPending: boolean;
  isCheckingRequired: boolean; // True while checking if 2FA is required after login
  pendingAuth: PendingAuth | null;
  error: string | null;
  attemptsRemaining: number | null;
  timeRemaining: string;
  
  // 2FA Settings
  twoFactorEnabled: boolean;
  isLoadingSettings: boolean;
  
  // Actions
  setPending: (auth: PendingAuth | null) => void;
  setError: (error: string | null) => void;
  setCheckingRequired: (checking: boolean) => void;
  clearPending: () => void;
  
  // Async Actions
  initiateVerification: (userId: string, email: string, userName?: string) => Promise<boolean>;
  verifyCode: (code: string) => Promise<VerifyCodeResult>;
  resendCode: () => Promise<boolean>;
  
  // Settings Actions
  loadTwoFactorStatus: (userId: string) => Promise<void>;
  enableTwoFactor: (userId: string) => Promise<{ success: boolean; error?: string }>;
  disableTwoFactor: (userId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Timer
  updateTimeRemaining: () => void;
}

export const useTwoFactorStore = create<TwoFactorState>((set, get) => ({
  // Initial State
  isVerifying: false,
  isPending: false,
  isCheckingRequired: false,
  pendingAuth: null,
  error: null,
  attemptsRemaining: null,
  timeRemaining: '',
  twoFactorEnabled: false,
  isLoadingSettings: false,

  // Setters
  setPending: (auth) => set({ 
    pendingAuth: auth, 
    isPending: auth !== null,
    error: null,
    attemptsRemaining: null,
  }),
  
  setError: (error) => set({ error }),
  
  setCheckingRequired: (checking) => set({ isCheckingRequired: checking }),
  
  clearPending: () => set({ 
    pendingAuth: null, 
    isPending: false,
    isCheckingRequired: false,
    error: null,
    attemptsRemaining: null,
    timeRemaining: '',
  }),

  // Initiate 2FA verification
  initiateVerification: async (userId, email, userName) => {
    set({ isVerifying: true, error: null });
    
    try {
      const result = await initiateTwoFactorVerification(userId, email, userName);
      
      if (result.success && result.expiresAt) {
        set({
          pendingAuth: {
            userId,
            email,
            userName,
            expiresAt: result.expiresAt,
          },
          isPending: true,
          isCheckingRequired: false, // Clear checking flag, isPending is now true
          isVerifying: false,
          timeRemaining: formatTimeRemaining(result.expiresAt),
        });
        return true;
      } else {
        set({ 
          error: result.error || 'Failed to send verification code',
          isVerifying: false,
          isCheckingRequired: false, // Clear on failure too
        });
        return false;
      }
    } catch (error: any) {
      logger.error('[TwoFactorStore] Initiate verification error:', error);
      set({ 
        error: error.message || 'An error occurred',
        isVerifying: false,
        isCheckingRequired: false, // Clear on error
      });
      return false;
    }
  },

  // Verify submitted code
  verifyCode: async (code) => {
    const { pendingAuth } = get();
    
    if (!pendingAuth) {
      return { 
        success: false, 
        error: 'no_code_found', 
        message: 'No pending verification' 
      };
    }
    
    set({ isVerifying: true, error: null });
    
    try {
      const result = await verifyCode(pendingAuth.userId, code, 'two_factor');
      
      if (result.success) {
        set({ 
          isVerifying: false,
          isPending: false,
          pendingAuth: null,
        });
      } else {
        set({ 
          isVerifying: false,
          error: result.message || 'Invalid code',
          attemptsRemaining: result.attemptsRemaining ?? null,
        });
      }
      
      return result;
    } catch (error: any) {
      logger.error('[TwoFactorStore] Verify code error:', error);
      const errorResult: VerifyCodeResult = { 
        success: false, 
        error: 'unknown', 
        message: error.message 
      };
      set({ 
        isVerifying: false,
        error: error.message,
      });
      return errorResult;
    }
  },

  // Resend verification code
  resendCode: async () => {
    const { pendingAuth } = get();
    
    if (!pendingAuth) {
      set({ error: 'No pending verification' });
      return false;
    }
    
    return get().initiateVerification(
      pendingAuth.userId,
      pendingAuth.email,
      pendingAuth.userName
    );
  },

  // Load 2FA status for settings
  loadTwoFactorStatus: async (userId) => {
    set({ isLoadingSettings: true });
    
    try {
      const status = await checkTwoFactorEnabled(userId);
      set({ 
        twoFactorEnabled: status.enabled,
        isLoadingSettings: false,
      });
    } catch (error: any) {
      logger.error('[TwoFactorStore] Load status error:', error);
      set({ isLoadingSettings: false });
    }
  },

  // Enable 2FA
  enableTwoFactor: async (userId) => {
    set({ isLoadingSettings: true });
    
    try {
      const result = await toggleTwoFactor(userId, true);
      
      if (result.success) {
        set({ 
          twoFactorEnabled: true,
          isLoadingSettings: false,
        });
      } else {
        set({ isLoadingSettings: false });
      }
      
      return result;
    } catch (error: any) {
      logger.error('[TwoFactorStore] Enable 2FA error:', error);
      set({ isLoadingSettings: false });
      return { success: false, error: error.message };
    }
  },

  // Disable 2FA
  disableTwoFactor: async (userId) => {
    set({ isLoadingSettings: true });
    
    try {
      const result = await toggleTwoFactor(userId, false);
      
      if (result.success) {
        set({ 
          twoFactorEnabled: false,
          isLoadingSettings: false,
        });
      } else {
        set({ isLoadingSettings: false });
      }
      
      return result;
    } catch (error: any) {
      logger.error('[TwoFactorStore] Disable 2FA error:', error);
      set({ isLoadingSettings: false });
      return { success: false, error: error.message };
    }
  },

  // Update time remaining display
  updateTimeRemaining: () => {
    const { pendingAuth } = get();
    
    if (pendingAuth && pendingAuth.expiresAt) {
      if (isCodeExpired(pendingAuth.expiresAt)) {
        set({ 
          timeRemaining: '0:00',
          error: 'Code expired. Please request a new one.',
        });
      } else {
        set({ 
          timeRemaining: formatTimeRemaining(pendingAuth.expiresAt),
        });
      }
    }
  },
}));

// Selectors
export const selectIsPending = (state: TwoFactorState) => state.isPending;
export const selectPendingAuth = (state: TwoFactorState) => state.pendingAuth;
export const selectTwoFactorEnabled = (state: TwoFactorState) => state.twoFactorEnabled;
export const selectIsLoadingSettings = (state: TwoFactorState) => state.isLoadingSettings;
export const selectIsCheckingRequired = (state: TwoFactorState) => state.isCheckingRequired;
