import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore, useTwoFactorStore, useUIStore, useAuthStore } from '@/stores';

const { width } = Dimensions.get('window');

export default function Verify2FAScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // 2FA Store
  const {
    pendingAuth,
    isVerifying,
    error: storeError,
    attemptsRemaining,
    timeRemaining,
    verifyCode,
    resendCode,
    updateTimeRemaining,
    clearPending,
  } = useTwoFactorStore();

  // Local state
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Timer effect
  useEffect(() => {
    if (pendingAuth) {
      const timer = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pendingAuth]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 500);
  }, []);

  // Redirect if no pending auth
  useEffect(() => {
    if (!pendingAuth) {
      console.log('[Verify2FA] No pending auth, redirecting to auth');
      router.replace('/(auth)');
    }
  }, [pendingAuth]);

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async (codeString?: string) => {
    const fullCode = codeString || code.join('');

    if (fullCode.length !== 6) {
      setError(t('twoFactor.enterFullCode'));
      return;
    }

    setLoading(true);
    setError(null);

    const result = await verifyCode(fullCode);

    setLoading(false);

    if (result.success) {
      useUIStore.getState().showToast(t('twoFactor.verificationSuccess'), 'success');
      router.replace('/(tabs)');
    } else {
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();

      if (result.error === 'code_expired') {
        setError(t('twoFactor.codeExpired'));
      } else if (result.error === 'max_attempts_exceeded') {
        setError(t('twoFactor.maxAttemptsExceeded'));
        // Sign out and go back to auth
        setTimeout(() => {
          useAuthStore.getState().signOut();
          clearPending();
          router.replace('/(auth)');
        }, 2000);
      } else {
        setError(t('twoFactor.invalidCode'));
      }
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    const success = await resendCode();
    setLoading(false);

    if (success) {
      setResendCooldown(60);
      setCode(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      useUIStore.getState().showToast(t('twoFactor.codeSent'), 'success');
    } else {
      setError(t('twoFactor.resendFailed'));
    }
  };

  const handleCancel = () => {
    useAuthStore.getState().signOut();
    clearPending();
    router.replace('/(auth)');
  };

  const maskedEmail = pendingAuth?.email
    ? pendingAuth.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '';

  if (!pendingAuth) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('twoFactor.verifyTitle')}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t('twoFactor.verifyDescription', { email: maskedEmail })}
          </Text>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {Array(6).fill(0).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.codeInputWrapper,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderColor: code[index]
                      ? colors.primary
                      : error
                        ? '#EF4444'
                        : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                  },
                ]}
              >
                <TextInput
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.codeInput, { color: colors.text }]}
                  value={code[index]}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>

          {/* Timer */}
          {timeRemaining && (
            <Text style={[styles.timer, { color: colors.textSecondary }]}>
              {t('twoFactor.codeExpiresIn', { time: timeRemaining })}
            </Text>
          )}

          {/* Error */}
          {(error || storeError) && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error || storeError}</Text>
            </View>
          )}

          {/* Attempts */}
          {attemptsRemaining !== null && attemptsRemaining < 5 && (
            <Text style={[styles.attemptsText, { color: '#F59E0B' }]}>
              {t('twoFactor.attemptsRemaining', { count: attemptsRemaining })}
            </Text>
          )}

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, (loading || isVerifying) && { opacity: 0.6 }]}
            onPress={() => handleVerify()}
            disabled={loading || isVerifying || code.join('').length !== 6}
          >
            <LinearGradient
              colors={[colors.primary, '#E02D45']}
              style={styles.verifyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {(loading || isVerifying) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>{t('twoFactor.verify')}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resendCooldown > 0 || loading}
          >
            <Text
              style={[
                styles.resendText,
                { color: resendCooldown > 0 ? colors.textSecondary : colors.primary },
              ]}
            >
              {resendCooldown > 0
                ? t('twoFactor.resendIn', { seconds: resendCooldown })
                : t('twoFactor.resendCode')}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  codeInputWrapper: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
  },
  timer: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  attemptsText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  verifyButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#F89C28',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  verifyButtonGradient: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  resendButton: {
    marginTop: 20,
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
});
