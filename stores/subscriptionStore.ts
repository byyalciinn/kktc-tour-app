import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { 
  adapty, 
  getAdaptyProfile, 
  hasActiveSubscription, 
  restoreAdaptyPurchases 
} from '@/lib/adaptyService';
import { createLogger } from '@/lib/logger';

const subscriptionLogger = createLogger('Subscription');

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

/**
 * Plan pricing info
 */
export interface PlanInfo {
  id: SubscriptionPlan;
  price: number;
  currency: string;
  period: 'month' | 'year';
  monthlyEquivalent?: number;
  maxUsers?: number;
  features: string[];
}

/**
 * Subscription state interface
 */
interface SubscriptionState {
  // State
  currentPlan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  isLoading: boolean;

  // Computed
  isPremium: () => boolean;
  canAddFavorite: (currentCount: number) => boolean;
  getFavoriteLimit: () => number;
  getRemainingFavorites: (currentCount: number) => number;

  // Actions
  setPlan: (plan: SubscriptionPlan) => void;
  setStatus: (status: SubscriptionStatus) => void;
  startTrial: () => void;
  subscribe: (plan: SubscriptionPlan) => Promise<{ success: boolean; error: string | null }>;
  cancelSubscription: () => Promise<{ success: boolean; error: string | null }>;
  restorePurchases: () => Promise<{ success: boolean; error: string | null }>;
  syncWithAdapty: () => Promise<void>;
  reset: () => void;
}

/**
 * Plan configurations
 */
export const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    id: 'free',
    price: 0,
    currency: 'TRY',
    period: 'month',
    features: [
      'favorites.limitedFavorites',
      'membership.basicAccess',
    ],
  },
  monthly: {
    id: 'monthly',
    price: 149.99,
    currency: 'TRY',
    period: 'month',
    features: [
      'membership.unlimitedFavorites',
      'membership.adFree',
      'membership.prioritySupport',
    ],
  },
  yearly: {
    id: 'yearly',
    price: 999.99,
    currency: 'TRY',
    period: 'year',
    monthlyEquivalent: 83.33,
    features: [
      'membership.unlimitedFavorites',
      'membership.adFree',
      'membership.prioritySupport',
      'membership.specialDiscounts',
    ],
  },
};

/**
 * Free tier limits
 */
export const FREE_TIER_LIMITS = {
  maxFavorites: 3,
};

/**
 * Subscription store with persistence
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentPlan: 'free',
      status: 'active',
      expiresAt: null,
      trialEndsAt: null,
      isLoading: false,

      // Check if user has premium access (Gold or Business member_class)
      isPremium: () => {
        const { currentPlan, status } = get();
        // Check member_class from authStore
        const profile = useAuthStore.getState().profile;
        const memberClass = profile?.member_class;
        
        // Gold or Business members have premium access
        if (memberClass === 'Gold' || memberClass === 'Business') {
          return true;
        }
        
        // Fallback to subscription plan
        return currentPlan !== 'free' && (status === 'active' || status === 'trial');
      },

      // Check if user can add more favorites
      canAddFavorite: (currentCount: number) => {
        // Check member_class from authStore
        const profile = useAuthStore.getState().profile;
        const memberClass = profile?.member_class;
        
        // Gold or Business members have unlimited favorites
        if (memberClass === 'Gold' || memberClass === 'Business') {
          return true;
        }
        
        const { isPremium } = get();
        if (isPremium()) return true;
        return currentCount < FREE_TIER_LIMITS.maxFavorites;
      },

      // Get favorite limit based on plan
      getFavoriteLimit: () => {
        // Check member_class from authStore
        const profile = useAuthStore.getState().profile;
        const memberClass = profile?.member_class;
        
        // Gold or Business members have unlimited favorites
        if (memberClass === 'Gold' || memberClass === 'Business') {
          return Infinity;
        }
        
        const { isPremium } = get();
        return isPremium() ? Infinity : FREE_TIER_LIMITS.maxFavorites;
      },

      // Get remaining favorites count
      getRemainingFavorites: (currentCount: number) => {
        // Check member_class from authStore
        const profile = useAuthStore.getState().profile;
        const memberClass = profile?.member_class;
        
        // Gold or Business members have unlimited favorites
        if (memberClass === 'Gold' || memberClass === 'Business') {
          return Infinity;
        }
        
        const { isPremium } = get();
        if (isPremium()) return Infinity;
        return Math.max(0, FREE_TIER_LIMITS.maxFavorites - currentCount);
      },

      // Set current plan
      setPlan: (plan) => set({ currentPlan: plan }),

      // Set subscription status
      setStatus: (status) => set({ status }),

      // Start 7-day trial
      startTrial: () => {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        
        set({
          currentPlan: 'yearly',
          status: 'trial',
          trialEndsAt: trialEnd.toISOString(),
          expiresAt: trialEnd.toISOString(),
        });
      },

      // Subscribe to a plan
      // Note: Actual subscription is handled by Adapty paywall UI
      // This method is kept for programmatic subscription if needed
      subscribe: async (plan) => {
        set({ isLoading: true });
        
        try {
          // Adapty handles the actual purchase via paywall UI
          // This method just syncs state after purchase
          subscriptionLogger.info('Subscription requested for plan:', plan);
          
          // After purchase, sync with Adapty to get actual subscription status
          await get().syncWithAdapty();

          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Subscription error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Cancel subscription
      // Note: Cancellation is handled by App Store/Play Store
      // This method updates local state
      cancelSubscription: async () => {
        set({ isLoading: true });
        
        try {
          // User must cancel through App Store/Play Store
          // We just update local state and sync with Adapty
          subscriptionLogger.info('Subscription cancellation requested');
          
          await get().syncWithAdapty();
          
          set({ isLoading: false });
          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Cancel subscription error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Restore purchases via Adapty
      restorePurchases: async () => {
        set({ isLoading: true });
        
        try {
          const profile = await restoreAdaptyPurchases();
          
          if (profile) {
            // Check premium access level
            const premiumAccess = profile.accessLevels?.['premium'];
            
            if (premiumAccess?.isActive) {
              // Determine plan type from subscription
              const vendorProductId = premiumAccess.vendorProductId;
              const plan: SubscriptionPlan = 
                vendorProductId?.includes('yearly') ? 'yearly' : 
                vendorProductId?.includes('monthly') ? 'monthly' : 'yearly';
              
              set({
                currentPlan: plan,
                status: 'active',
                expiresAt: premiumAccess.expiresAt ?? null,
                trialEndsAt: null,
                isLoading: false,
              });
              
              subscriptionLogger.info('Purchases restored:', { plan, expiresAt: premiumAccess.expiresAt });
              return { success: true, error: null };
            }
          }
          
          // No active subscription found
          set({ isLoading: false });
          subscriptionLogger.info('No active purchases to restore');
          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Restore purchases error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Sync subscription state with Adapty
      syncWithAdapty: async () => {
        try {
          const profile = await getAdaptyProfile();
          
          if (!profile) {
            subscriptionLogger.warn('Could not get Adapty profile');
            return;
          }
          
          const premiumAccess = profile.accessLevels?.['premium'];
          
          if (premiumAccess?.isActive) {
            const vendorProductId = premiumAccess.vendorProductId;
            const plan: SubscriptionPlan = 
              vendorProductId?.includes('yearly') ? 'yearly' : 
              vendorProductId?.includes('monthly') ? 'monthly' : 'yearly';
            
            set({
              currentPlan: plan,
              status: 'active',
              expiresAt: premiumAccess.expiresAt ?? null,
              trialEndsAt: premiumAccess.activatedAt && !premiumAccess.isLifetime 
                ? premiumAccess.activatedAt 
                : null,
            });
            
            subscriptionLogger.info('Synced with Adapty:', { plan, isActive: true });
          } else {
            // No active subscription
            set({
              currentPlan: 'free',
              status: 'active',
              expiresAt: null,
              trialEndsAt: null,
            });
            
            subscriptionLogger.info('Synced with Adapty: free plan');
          }
        } catch (error) {
          subscriptionLogger.error('Failed to sync with Adapty:', error);
        }
      },

      // Reset store (on logout)
      reset: () => set({
        currentPlan: 'free',
        status: 'active',
        expiresAt: null,
        trialEndsAt: null,
        isLoading: false,
      }),
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentPlan: state.currentPlan,
        status: state.status,
        expiresAt: state.expiresAt,
        trialEndsAt: state.trialEndsAt,
      }),
    }
  )
);

// Selectors
export const selectIsPremium = (state: SubscriptionState) => state.isPremium();
export const selectCurrentPlan = (state: SubscriptionState) => state.currentPlan;
export const selectSubscriptionStatus = (state: SubscriptionState) => state.status;
export const selectIsLoading = (state: SubscriptionState) => state.isLoading;
