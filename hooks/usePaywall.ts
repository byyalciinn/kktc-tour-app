/**
 * usePaywall Hook
 * Manages Adapty paywall display and purchase flow
 * 
 * @see https://adapty.io/docs/react-native-quickstart-paywalls
 */

import { useState, useCallback } from 'react';
import {
  adapty,
  AdaptyPaywall,
  AdaptyPaywallProduct,
  AdaptyProfile,
  AdaptyError,
  AdaptyPurchaseResult,
} from 'react-native-adapty';
import { createPaywallView } from 'react-native-adapty/dist/ui';
import { useSubscriptionStore } from '@/stores';
import { createLogger } from '@/lib/logger';

const paywallLogger = createLogger('Paywall');
import { ADAPTY_PLACEMENTS, AdaptyPlacement } from '@/lib/adaptyService';

interface PaywallResult {
  success: boolean;
  error?: string;
  purchased?: boolean;
}

interface UsePaywallReturn {
  showPaywall: (placementId?: AdaptyPlacement) => Promise<PaywallResult>;
  getPaywall: (placementId?: AdaptyPlacement) => Promise<AdaptyPaywall | null>;
  isLoading: boolean;
}

/**
 * Hook for displaying and managing Adapty paywalls
 * 
 * @example
 * ```tsx
 * const { showPaywall, isLoading } = usePaywall();
 * 
 * const handleUpgrade = async () => {
 *   const result = await showPaywall('paywall_placement');
 *   if (result.purchased) {
 *     // User purchased successfully
 *   }
 * };
 * ```
 */
export function usePaywall(): UsePaywallReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { syncWithAdapty } = useSubscriptionStore();

  /**
   * Get paywall configuration without displaying it
   */
  const getPaywall = useCallback(async (
    placementId: AdaptyPlacement = ADAPTY_PLACEMENTS.PAYWALL
  ): Promise<AdaptyPaywall | null> => {
    try {
      const paywall = await adapty.getPaywall(placementId);
      return paywall;
    } catch (error) {
      paywallLogger.error('Failed to get paywall:', error);
      return null;
    }
  }, []);

  /**
   * Show paywall modal using Adapty's PaywallBuilder
   */
  const showPaywall = useCallback(async (
    placementId: AdaptyPlacement = ADAPTY_PLACEMENTS.PAYWALL
  ): Promise<PaywallResult> => {
    setIsLoading(true);
    let purchased = false;

    try {
      // Fetch paywall from Adapty
      const paywall = await adapty.getPaywall(placementId);

      // Check if paywall has visual configuration (from PaywallBuilder)
      if (!paywall.hasViewConfiguration) {
        paywallLogger.warn('Paywall has no view configuration');
        return {
          success: false,
          error: 'Paywall not configured in Adapty Dashboard'
        };
      }

      // Create paywall view
      const view = await createPaywallView(paywall);

      // Register event handlers
      view.registerEventHandlers({
        // Handle close button press
        onCloseButtonPress: () => {
          paywallLogger.info('User closed paywall');
          return true; // Return true to allow closing
        },

        // Handle successful purchase
        onPurchaseCompleted: (result: AdaptyPurchaseResult) => {
          paywallLogger.info('Purchase completed:', result);
          purchased = true;

          // Sync subscription state with Adapty
          syncWithAdapty();

          // Return true to dismiss paywall (false for user cancelled)
          return result.type !== 'user_cancelled';
        },

        // Handle restore purchases
        onRestoreCompleted: (profile: AdaptyProfile) => {
          paywallLogger.info('Restore completed:', profile);

          // Sync subscription state
          syncWithAdapty();
        },

        // Handle purchase error
        onPurchaseFailed: (error: AdaptyError) => {
          paywallLogger.error('Purchase failed:', error);
        },

        // Handle product selected (for analytics)
        onProductSelected: (productId: string) => {
          paywallLogger.info('Product selected:', productId);
        },
      });

      // Present the paywall
      await view.present();

      return { success: true, purchased };
    } catch (error: any) {
      paywallLogger.error('Error showing paywall:', error);
      return {
        success: false,
        error: error.message || 'Failed to show paywall'
      };
    } finally {
      setIsLoading(false);
    }
  }, [syncWithAdapty]);

  return {
    showPaywall,
    getPaywall,
    isLoading
  };
}
