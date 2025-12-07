/**
 * Adapty SDK Service
 * In-app purchase and subscription management via Adapty
 * 
 * @see https://adapty.io/docs/react-native-sdk-overview
 */

import { adapty, AdaptyProfile } from 'react-native-adapty';
import { createLogger } from './logger';

const adaptyLogger = createLogger('Adapty');

// Adapty placement IDs (must match dashboard configuration)
export const ADAPTY_PLACEMENTS = {
  PAYWALL: 'paywall_placement',
  ONBOARDING: 'onboarding_paywall',
  UPGRADE: 'upgrade_paywall',
} as const;

export type AdaptyPlacement = typeof ADAPTY_PLACEMENTS[keyof typeof ADAPTY_PLACEMENTS];

/**
 * Initialize Adapty SDK
 * Should be called once at app startup
 */
export const initializeAdapty = async (publicKey: string): Promise<void> => {
  try {
    await adapty.activate(publicKey, {
      logLevel: __DEV__ ? 'verbose' : 'error',
      ipAddressCollectionDisabled: false,
      ios: {
        idfaCollectionDisabled: true, // Privacy compliance
      },
      android: {
        adIdCollectionDisabled: true, // Privacy compliance
      },
    });
    
    adaptyLogger.info('SDK initialized successfully');
  } catch (error) {
    adaptyLogger.error('Failed to initialize SDK:', error);
    throw error;
  }
};

/**
 * Identify user with Adapty
 * Links Adapty profile with your internal user ID
 * 
 * @param userId - Your internal user ID (Supabase user ID)
 */
export const identifyAdaptyUser = async (userId: string): Promise<void> => {
  try {
    await adapty.identify(userId);
    adaptyLogger.info('User identified:', userId);
  } catch (error) {
    adaptyLogger.error('Failed to identify user:', error);
    throw error;
  }
};

/**
 * Logout from Adapty
 * Creates a new anonymous profile
 */
export const logoutAdapty = async (): Promise<void> => {
  try {
    await adapty.logout();
    adaptyLogger.info('User logged out');
  } catch (error) {
    adaptyLogger.error('Failed to logout:', error);
    throw error;
  }
};

/**
 * Get current user profile with subscription info
 */
export const getAdaptyProfile = async (): Promise<AdaptyProfile | null> => {
  try {
    const profile = await adapty.getProfile();
    return profile;
  } catch (error) {
    adaptyLogger.error('Failed to get profile:', error);
    return null;
  }
};

/**
 * Check if user has active subscription
 * 
 * @param accessLevelId - Access level ID to check (default: 'premium')
 */
export const hasActiveSubscription = async (
  accessLevelId: string = 'premium'
): Promise<boolean> => {
  try {
    const profile = await adapty.getProfile();
    const accessLevel = profile.accessLevels?.[accessLevelId];
    
    return accessLevel?.isActive ?? false;
  } catch (error) {
    adaptyLogger.error('Failed to check subscription:', error);
    return false;
  }
};

/**
 * Restore purchases
 * Useful for users who reinstalled the app or changed devices
 */
export const restoreAdaptyPurchases = async (): Promise<AdaptyProfile | null> => {
  try {
    const profile = await adapty.restorePurchases();
    adaptyLogger.info('Purchases restored successfully');
    return profile;
  } catch (error) {
    adaptyLogger.error('Failed to restore purchases:', error);
    throw error;
  }
};

// Re-export adapty instance for advanced usage
export { adapty };
