import Constants from 'expo-constants';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import { createLogger } from '@/lib/logger';

const revenueCatLogger = createLogger('RevenueCat');

export type RevenueCatPlan = 'gold_monthly' | 'gold_yearly' | 'business_monthly';

export const REVENUECAT_ENTITLEMENTS = {
  gold: 'gold',
  business: 'business',
} as const;

export const REVENUECAT_PRODUCT_IDS: Record<RevenueCatPlan, string> = {
  gold_monthly: 'gold_monthly',
  gold_yearly: 'gold_yearly',
  business_monthly: 'business_monthly',
};

let isConfigured = false;

const getRevenueCatApiKey = (): string | undefined => {
  const envKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (envKey) return envKey;
  return Constants.expoConfig?.extra?.revenuecat?.iosApiKey;
};

export const getProductIdForPlan = (plan: RevenueCatPlan): string =>
  REVENUECAT_PRODUCT_IDS[plan];

export const configureRevenueCat = async (
  appUserId?: string | null
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const apiKey = getRevenueCatApiKey();
  if (!apiKey) {
    revenueCatLogger.warn('[RevenueCat] Missing iOS API key');
    return false;
  }

  if (!isConfigured) {
    try {
      Purchases.setLogLevel(LOG_LEVEL.INFO);
      Purchases.configure({
        apiKey,
        appUserId: appUserId || undefined,
      });
      isConfigured = true;
      return true;
    } catch (error) {
      revenueCatLogger.error('[RevenueCat] Failed to configure:', error);
      return false;
    }
  }

  if (appUserId) {
    await setRevenueCatUser(appUserId);
  }

  return true;
};

export const isRevenueCatConfigured = (): boolean => isConfigured;

export const setRevenueCatUser = async (
  appUserId?: string | null
): Promise<void> => {
  if (!isConfigured || Platform.OS !== 'ios') return;

  try {
    if (appUserId) {
      await Purchases.logIn(appUserId);
    } else {
      await Purchases.logOut();
    }
  } catch (error) {
    revenueCatLogger.warn('[RevenueCat] Failed to set user:', error);
  }
};

export const addCustomerInfoListener = (
  listener: (customerInfo: CustomerInfo) => void
): void => {
  if (!isConfigured || Platform.OS !== 'ios') return;
  try {
    Purchases.addCustomerInfoUpdateListener(listener);
  } catch (error) {
    revenueCatLogger.warn('[RevenueCat] Failed to add listener:', error);
  }
};

export const fetchOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (!isConfigured || Platform.OS !== 'ios') return null;

  try {
    return await Purchases.getOfferings();
  } catch (error) {
    revenueCatLogger.warn('[RevenueCat] Failed to fetch offerings:', error);
    return null;
  }
};

export const purchaseRevenueCatPackage = async (
  purchasePackage: PurchasesPackage
): Promise<CustomerInfo> => {
  const { customerInfo } = await Purchases.purchasePackage(purchasePackage);
  return customerInfo;
};

export const restoreRevenueCatPurchases = async (): Promise<CustomerInfo> => {
  return await Purchases.restorePurchases();
};
