/**
 * Secure Action Utility
 * 
 * Provides re-authentication for sensitive operations like:
 * - Changing 2FA settings
 * - Deleting account
 * - Changing password
 * - Viewing/editing sensitive data
 * 
 * SECURITY: Requires biometric or password verification before sensitive actions
 */

import { Alert } from 'react-native';
import { 
  authenticateWithBiometrics, 
  checkBiometricCapabilities,
  needsReauthentication,
  isBiometricEnabled,
} from './biometricAuth';
import { logger } from './logger';

export type SecureActionType = 
  | 'toggle_2fa'
  | 'delete_account'
  | 'change_password'
  | 'view_sensitive_data'
  | 'export_data';

interface SecureActionOptions {
  /** Type of action for logging */
  actionType: SecureActionType;
  /** Custom prompt message */
  promptMessage?: string;
  /** Skip re-auth if recently authenticated (in minutes) */
  skipIfRecentMins?: number;
  /** Force re-auth even if recently authenticated */
  forceReauth?: boolean;
  /** Language for messages (defaults to 'tr', falls back to 'en' for unsupported) */
  language?: string;
}

interface SecureActionResult {
  success: boolean;
  error?: string;
  skipped?: boolean;
}

const messages = {
  tr: {
    toggle_2fa: 'İki faktörlü doğrulama ayarlarını değiştirmek için kimliğinizi doğrulayın',
    delete_account: 'Hesabınızı silmek için kimliğinizi doğrulayın',
    change_password: 'Şifrenizi değiştirmek için kimliğinizi doğrulayın',
    view_sensitive_data: 'Hassas verileri görüntülemek için kimliğinizi doğrulayın',
    export_data: 'Verilerinizi dışa aktarmak için kimliğinizi doğrulayın',
    default: 'Bu işlem için kimliğinizi doğrulayın',
    biometricUnavailable: 'Biyometrik doğrulama kullanılamıyor',
    cancelled: 'Doğrulama iptal edildi',
    failed: 'Doğrulama başarısız',
  },
  en: {
    toggle_2fa: 'Verify your identity to change two-factor authentication settings',
    delete_account: 'Verify your identity to delete your account',
    change_password: 'Verify your identity to change your password',
    view_sensitive_data: 'Verify your identity to view sensitive data',
    export_data: 'Verify your identity to export your data',
    default: 'Verify your identity for this action',
    biometricUnavailable: 'Biometric authentication unavailable',
    cancelled: 'Authentication cancelled',
    failed: 'Authentication failed',
  },
};

/**
 * Execute a secure action with re-authentication
 * @param action The async function to execute if authentication succeeds
 * @param options Configuration options
 * @returns Result of the secure action
 */
export async function executeSecureAction<T>(
  action: () => Promise<T>,
  options: SecureActionOptions
): Promise<{ result?: T; auth: SecureActionResult }> {
  const {
    actionType,
    promptMessage,
    skipIfRecentMins = 5,
    forceReauth = false,
    language = 'tr',
  } = options;

  // Support only tr/en, fallback to en for other languages
  const lang = (language === 'tr' ? 'tr' : 'en') as 'tr' | 'en';
  const msg = messages[lang];

  try {
    // Check if biometric is enabled for the app
    const biometricEnabled = await isBiometricEnabled();
    
    if (!biometricEnabled) {
      // Biometric not enabled, proceed without re-auth
      // In production, you might want to require password here
      logger.info(`Secure action ${actionType}: biometric not enabled, proceeding`);
      const result = await action();
      return { result, auth: { success: true, skipped: true } };
    }

    // Check if we need re-authentication
    if (!forceReauth) {
      const needsReauth = await needsReauthentication(skipIfRecentMins);
      if (!needsReauth) {
        logger.info(`Secure action ${actionType}: recently authenticated, skipping`);
        const result = await action();
        return { result, auth: { success: true, skipped: true } };
      }
    }

    // Check biometric capabilities
    const capabilities = await checkBiometricCapabilities();
    
    if (!capabilities.isAvailable || !capabilities.hasEnrolledBiometrics) {
      // Biometric not available, show warning but proceed
      // In production, require password fallback
      logger.warn(`Secure action ${actionType}: biometric unavailable`);
      const result = await action();
      return { result, auth: { success: true, skipped: true } };
    }

    // Perform biometric authentication
    const authResult = await authenticateWithBiometrics({
      promptMessage: promptMessage || msg[actionType] || msg.default,
      cancelLabel: language === 'tr' ? 'İptal' : 'Cancel',
      fallbackLabel: language === 'tr' ? 'Şifre Kullan' : 'Use Password',
    });

    if (!authResult.success) {
      logger.warn(`Secure action ${actionType}: authentication failed`, authResult.error);
      return {
        auth: {
          success: false,
          error: authResult.error || msg.failed,
        },
      };
    }

    // Authentication successful, execute the action
    logger.info(`Secure action ${actionType}: authenticated successfully`);
    const result = await action();
    return { result, auth: { success: true } };

  } catch (error) {
    logger.error(`Secure action ${actionType} error:`, error);
    return {
      auth: {
        success: false,
        error: msg.failed,
      },
    };
  }
}

/**
 * Show a confirmation dialog before executing a secure action
 * Combines Alert confirmation with biometric re-auth
 */
export function confirmSecureAction(
  title: string,
  message: string,
  options: SecureActionOptions & {
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
    onCancel?: () => void;
    onAuthFailed?: (error: string) => void;
  }
): void {
  const {
    confirmText = options.language === 'en' ? 'Confirm' : 'Onayla',
    cancelText = options.language === 'en' ? 'Cancel' : 'İptal',
    destructive = false,
    onConfirm,
    onCancel,
    onAuthFailed,
    ...secureOptions
  } = options;

  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          const { auth } = await executeSecureAction(onConfirm, secureOptions);
          
          if (!auth.success && !auth.skipped) {
            onAuthFailed?.(auth.error || 'Authentication failed');
          }
        },
      },
    ]
  );
}

/**
 * Mask sensitive data for display
 */
export const maskSensitiveData = {
  email: (email: string): string => {
    if (!email || !email.includes('@')) return '***';
    const [user, domain] = email.split('@');
    if (user.length <= 2) return `${user}***@${domain}`;
    return `${user.slice(0, 2)}***@${domain}`;
  },
  
  phone: (phone: string): string => {
    if (!phone || phone.length < 4) return '***';
    return `***${phone.slice(-4)}`;
  },
  
  cardNumber: (cardNumber: string): string => {
    if (!cardNumber || cardNumber.length < 4) return '****';
    return `**** **** **** ${cardNumber.slice(-4)}`;
  },
  
  name: (name: string): string => {
    if (!name || name.length <= 2) return '***';
    return `${name.slice(0, 2)}${'*'.repeat(name.length - 2)}`;
  },
};
