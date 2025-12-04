/**
 * Biometric Authentication Service
 * Provides fingerprint and face recognition authentication
 * 
 * SECURITY: Adds an extra layer of security for sensitive operations
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from './logger';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_LAST_SUCCESS_KEY = '@biometric_last_success';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  hasEnrolledBiometrics: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Check device biometric capabilities
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      isAvailable,
      biometricTypes: supportedTypes,
      hasEnrolledBiometrics: isEnrolled,
      securityLevel,
    };
  } catch (error) {
    logger.error('Biometric capability check failed:', error);
    return {
      isAvailable: false,
      biometricTypes: [],
      hasEnrolledBiometrics: false,
      securityLevel: LocalAuthentication.SecurityLevel.NONE,
    };
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(
  types: LocalAuthentication.AuthenticationType[],
  language: 'tr' | 'en' = 'tr'
): string {
  const names = {
    tr: {
      faceId: 'Face ID',
      touchId: 'Touch ID',
      face: 'Yüz Tanıma',
      fingerprint: 'Parmak İzi',
      iris: 'İris Tarama',
      default: 'Biyometrik Doğrulama',
    },
    en: {
      faceId: 'Face ID',
      touchId: 'Touch ID',
      face: 'Face Recognition',
      fingerprint: 'Fingerprint',
      iris: 'Iris Scan',
      default: 'Biometric Authentication',
    },
  };

  const n = names[language];

  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? n.faceId : n.face;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? n.touchId : n.fingerprint;
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return n.iris;
  }
  return n.default;
}

/**
 * Check if biometric auth is enabled for the app
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

/**
 * Enable/disable biometric auth for the app
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  logger.info(`Biometric authentication ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  }
): Promise<BiometricAuthResult> {
  try {
    const capabilities = await checkBiometricCapabilities();
    
    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biyometrik donanım bulunamadı',
      };
    }

    if (!capabilities.hasEnrolledBiometrics) {
      return {
        success: false,
        error: 'Cihazınızda kayıtlı biyometrik veri yok',
      };
    }

    const biometricName = getBiometricTypeName(capabilities.biometricTypes);

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || `${biometricName} ile doğrulayın`,
      cancelLabel: options?.cancelLabel || 'İptal',
      fallbackLabel: options?.fallbackLabel || 'Şifre Kullan',
      disableDeviceFallback: options?.disableDeviceFallback ?? false,
    });

    if (result.success) {
      // Store last successful biometric auth time
      await AsyncStorage.setItem(
        BIOMETRIC_LAST_SUCCESS_KEY,
        Date.now().toString()
      );
      
      logger.info('Biometric authentication successful');
      return { success: true };
    }

    // Handle different error types
    const errorType = result.error as string;
    if (errorType === 'user_cancel') {
      return { success: false, error: 'Doğrulama iptal edildi' };
    }
    if (errorType === 'user_fallback') {
      return { success: false, warning: 'Kullanıcı şifre kullanmayı tercih etti' };
    }
    if (errorType === 'lockout') {
      return { 
        success: false, 
        error: 'Çok fazla başarısız deneme. Lütfen bekleyin.' 
      };
    }
    if (errorType === 'lockout_permanent') {
      return { 
        success: false, 
        error: 'Biyometrik doğrulama kilitlendi. Cihaz şifrenizi kullanın.' 
      };
    }
    if (errorType === 'not_enrolled') {
      return { 
        success: false, 
        error: 'Biyometrik veri kaydedilmemiş' 
      };
    }
    if (errorType === 'system_cancel') {
      return { 
        success: false, 
        error: 'Sistem tarafından iptal edildi' 
      };
    }
    return { 
      success: false, 
      error: 'Biyometrik doğrulama başarısız' 
    };
  } catch (error) {
    logger.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Biyometrik doğrulama hatası',
    };
  }
}

/**
 * Check if re-authentication is needed (e.g., for sensitive operations)
 * @param maxAgeMins - Maximum age in minutes since last successful biometric auth
 */
export async function needsReauthentication(
  maxAgeMins: number = 5
): Promise<boolean> {
  const lastSuccess = await AsyncStorage.getItem(BIOMETRIC_LAST_SUCCESS_KEY);
  if (!lastSuccess) return true;

  const elapsed = Date.now() - parseInt(lastSuccess, 10);
  const maxAgeMs = maxAgeMins * 60 * 1000;

  return elapsed > maxAgeMs;
}

/**
 * Clear biometric auth data
 */
export async function clearBiometricData(): Promise<void> {
  await AsyncStorage.multiRemove([BIOMETRIC_ENABLED_KEY, BIOMETRIC_LAST_SUCCESS_KEY]);
  logger.info('Biometric data cleared');
}
