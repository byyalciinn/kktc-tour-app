import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { createLogger } from '@/lib/logger';
import {
  addCustomerInfoListener,
  configureRevenueCat,
  fetchOfferings,
  getProductIdForPlan,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
  setRevenueCatUser,
  REVENUECAT_ENTITLEMENTS,
  REVENUECAT_PRODUCT_IDS,
  type RevenueCatPlan,
} from '@/lib/revenuecat';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

const subscriptionLogger = createLogger('Subscription');

/**
 * Subscription plan types
 */
export type SubscriptionPlan = 'free' | RevenueCatPlan;

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
  isInitialized: boolean;
  offerings: PurchasesOfferings | null;

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
  initializeRevenueCat: (appUserId?: string | null) => Promise<void>;
  setAppUserId: (appUserId?: string | null) => Promise<void>;
  loadOfferings: () => Promise<PurchasesOfferings | null>;
  syncFromCustomerInfo: (customerInfo: CustomerInfo | null) => void;
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
  gold_monthly: {
    id: 'gold_monthly',
    price: 149.99,
    currency: 'TRY',
    period: 'month',
    features: [
      'membership.unlimitedFavorites',
      'membership.adFree',
      'membership.prioritySupport',
    ],
  },
  gold_yearly: {
    id: 'gold_yearly',
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
  business_monthly: {
    id: 'business_monthly',
    price: 0,
    currency: 'TRY',
    period: 'month',
    features: [
      'membership.unlimitedFavorites',
      'membership.adFree',
      'membership.prioritySupport',
      'membership.specialDiscounts',
      'membership.businessSupport',
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
      isInitialized: false,
      offerings: null,

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
          currentPlan: 'gold_yearly',
          status: 'trial',
          trialEndsAt: trialEnd.toISOString(),
          expiresAt: trialEnd.toISOString(),
        });
      },

      // Subscribe to a plan
      subscribe: async (plan) => {
        set({ isLoading: true });
        
        try {
          subscriptionLogger.info('Subscription requested for plan:', plan);

          if (plan === 'free') {
            set({
              currentPlan: 'free',
              status: 'active',
              expiresAt: null,
              trialEndsAt: null,
              isLoading: false,
            });
            return { success: true, error: null };
          }

          const offerings = get().offerings ?? await get().loadOfferings();
          const productId = getProductIdForPlan(plan);
          const availablePackages = offerings?.current?.availablePackages ?? [];
          const selectedPackage = availablePackages.find(
            (pkg: PurchasesPackage) => pkg.product.identifier === productId
          );

          if (!selectedPackage) {
            set({ isLoading: false });
            return {
              success: false,
              error: 'RevenueCat offering not found for selected plan.',
            };
          }

          const customerInfo = await purchaseRevenueCatPackage(selectedPackage);
          get().syncFromCustomerInfo(customerInfo);

          set({ isLoading: false });
          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Subscription error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Cancel subscription
      // Note: User must cancel through App Store/Play Store
      cancelSubscription: async () => {
        set({ isLoading: true });
        
        try {
          subscriptionLogger.info('Subscription cancellation requested');
          
          set({ 
            status: 'cancelled',
            isLoading: false 
          });
          
          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Cancel subscription error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Restore purchases
      restorePurchases: async () => {
        set({ isLoading: true });
        
        try {
          subscriptionLogger.info('Restore purchases requested');

          const customerInfo = await restoreRevenueCatPurchases();
          get().syncFromCustomerInfo(customerInfo);
          set({ isLoading: false });
          return { success: true, error: null };
        } catch (error: any) {
          subscriptionLogger.error('Restore purchases error:', error);
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      initializeRevenueCat: async (appUserId?: string | null) => {
        if (get().isInitialized) return;

        const configured = await configureRevenueCat(appUserId);
        if (!configured) return;

        addCustomerInfoListener((customerInfo) => {
          get().syncFromCustomerInfo(customerInfo);
        });

        const offerings = await get().loadOfferings();
        set({ isInitialized: true, offerings });
      },

      setAppUserId: async (appUserId?: string | null) => {
        if (!get().isInitialized) {
          await get().initializeRevenueCat(appUserId);
          return;
        }

        await setRevenueCatUser(appUserId);
      },

      loadOfferings: async () => {
        const offerings = await fetchOfferings();
        set({ offerings });
        return offerings;
      },

      syncFromCustomerInfo: (customerInfo) => {
        if (!customerInfo) return;

        const entitlements = customerInfo.entitlements?.active ?? {};
        const hasBusiness = Boolean(entitlements[REVENUECAT_ENTITLEMENTS.business]);
        const hasGold = Boolean(entitlements[REVENUECAT_ENTITLEMENTS.gold]);
        const activeSubscriptions = customerInfo.activeSubscriptions ?? [];

        let nextPlan: SubscriptionPlan = 'free';
        let expiresAt: string | null = null;
        let status: SubscriptionStatus = 'active';
        let trialEndsAt: string | null = null;

        if (hasBusiness) {
          nextPlan = 'business_monthly';
          expiresAt = entitlements[REVENUECAT_ENTITLEMENTS.business]?.expirationDate ?? null;
        } else if (hasGold) {
          if (activeSubscriptions.includes(REVENUECAT_PRODUCT_IDS.gold_yearly)) {
            nextPlan = 'gold_yearly';
          } else if (activeSubscriptions.includes(REVENUECAT_PRODUCT_IDS.gold_monthly)) {
            nextPlan = 'gold_monthly';
          } else {
            nextPlan = 'gold_monthly';
          }
          const goldEntitlement = entitlements[REVENUECAT_ENTITLEMENTS.gold];
          expiresAt = goldEntitlement?.expirationDate ?? null;
          if (goldEntitlement?.periodType === 'trial') {
            status = 'trial';
            trialEndsAt = goldEntitlement?.expirationDate ?? null;
          }
        } else {
          status = 'expired';
        }

        set({
          currentPlan: nextPlan,
          status,
          expiresAt,
          trialEndsAt,
        });
      },

      // Reset store (on logout)
      reset: () => set({
        currentPlan: 'free',
        status: 'active',
        expiresAt: null,
        trialEndsAt: null,
        isLoading: false,
        offerings: null,
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
