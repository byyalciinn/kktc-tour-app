import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Keyboard,
  KeyboardEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore, useUIStore, useThemeStore, useTwoFactorStore, usePasswordResetStore } from '@/stores';
import { checkTwoFactorEnabled } from '@/lib/twoFactorService';
import { maskError } from '@/lib/errorHandler';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { languages, changeLanguage, getCurrentLanguage, LanguageCode } from '@/lib/i18n';

const { width, height } = Dimensions.get('window');

// =============================================
// VALIDATION UTILITIES
// =============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates email format
 */
const validateEmail = (email: string, t: (key: string) => string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: t('auth.emailRequired') };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { isValid: false, message: t('auth.invalidEmailFormat') };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates password strength
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const validatePassword = (password: string, t: (key: string) => string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: t('auth.passwordRequired') };
  }
  if (password.length < 8) {
    return { isValid: false, message: t('auth.passwordMinLength') };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: t('auth.passwordNeedsUppercase') };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: t('auth.passwordNeedsLowercase') };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: t('auth.passwordNeedsNumber') };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates full name
 */
const validateName = (name: string, t: (key: string) => string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, message: t('auth.nameRequired') };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: t('auth.nameTooShort') };
  }
  return { isValid: true, message: '' };
};
const IMAGE_MARGIN = 16;
const IMAGE_BORDER_RADIUS = 32;

// Slider images for hero section
// Use assets/ because Metro resolves local assets there
const SLIDER_IMAGES = [
  require('../../assets/auth-page-image-header-1.jpg'),
  require('../../assets/auth-page-image-header-2.jpg'),
  require('../../assets/auth-page-image-header-3.jpg'),
] as const;

// Custom Bottom Sheet Component with spring animation and keyboard handling
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sheetHeight: number;
  children: React.ReactNode;
  isDark: boolean;
}

function AuthBottomSheet({ visible, onClose, sheetHeight, children, isDark }: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Klavye event listener'ları - sheet'i yukarı kaydır
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        Animated.spring(keyboardAnim, {
          toValue: -e.endCoordinates.height,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }).start();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.spring(keyboardAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [keyboardAnim]);

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  useEffect(() => {
    if (visible) {
      openSheet();
    } else {
      // Reset keyboard animation when sheet closes
      keyboardAnim.setValue(0);
    }
  }, [visible, openSheet, keyboardAnim]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={sheetStyles.modalContainer}>
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View style={[sheetStyles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            sheetStyles.sheetContainer,
            { 
              maxHeight: sheetHeight,
              transform: [
                { translateY: slideAnim },
                { translateY: keyboardAnim }
              ] 
            },
          ]}
        >
          <View style={[sheetStyles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
            <View style={sheetStyles.handleContainer}>
              <View style={[sheetStyles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
            </View>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={sheetStyles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});

export default function WelcomeScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<ScrollView>(null);
  const autoSlideTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register states
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  
  // Password reset flow states
  const [resetCodeVisible, setResetCodeVisible] = useState(false);
  const [resetNewPasswordVisible, setResetNewPasswordVisible] = useState(false);
  const [resetCode, setResetCode] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetResendCooldown, setResetResendCooldown] = useState(0);
  const resetCodeInputRefs = useRef<(TextInput | null)[]>([]);
  const resetCodeSlideAnim = useRef(new Animated.Value(400)).current;
  const resetCodeFadeAnim = useRef(new Animated.Value(0)).current;
  const newPasswordSlideAnim = useRef(new Animated.Value(400)).current;
  const newPasswordFadeAnim = useRef(new Animated.Value(0)).current;
  
  // Language state
  const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // 2FA states
  const [twoFactorCode, setTwoFactorCode] = useState<string[]>(Array(6).fill(''));
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const twoFactorInputRefs = useRef<(TextInput | null)[]>([]);
  const twoFactorSlideAnim = useRef(new Animated.Value(400)).current;
  const twoFactorFadeAnim = useRef(new Animated.Value(0)).current;
  
  const { signIn, signUp } = useAuthStore();
  const { 
    pendingAuth, 
    isVerifying, 
    error: twoFactorError, 
    attemptsRemaining,
    timeRemaining,
    verifyCode: verify2FACode,
    resendCode: resend2FACode,
    updateTimeRemaining,
    clearPending,
  } = useTwoFactorStore();
  const {
    isPending: isResetPending,
    isVerified: isResetVerified,
    isLoading: isResetLoading,
    email: resetEmail,
    error: resetError,
    timeRemaining: resetTimeRemaining,
    attemptsRemaining: resetAttemptsRemaining,
    initiateReset,
    verifyCode: verifyResetCode,
    updatePassword,
    updateTimeRemaining: updateResetTimeRemaining,
    reset: resetPasswordStore,
  } = usePasswordResetStore();
  const { t } = useTranslation();
  
  // Debug: Log when twoFactorVisible changes
  useEffect(() => {
    console.log('[Auth] twoFactorVisible changed to:', twoFactorVisible);
  }, [twoFactorVisible]);
  
  // 2FA timer effect
  useEffect(() => {
    if (twoFactorVisible && pendingAuth) {
      const timer = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [twoFactorVisible, pendingAuth]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Password reset timer effect
  useEffect(() => {
    if (resetCodeVisible && isResetPending) {
      const timer = setInterval(() => {
        updateResetTimeRemaining();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resetCodeVisible, isResetPending]);

  // Password reset resend cooldown timer
  useEffect(() => {
    if (resetResendCooldown > 0) {
      const timer = setTimeout(() => {
        setResetResendCooldown(resetResendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resetResendCooldown]);

  // Language modal functions
  const openLanguageModal = () => {
    setLanguageModalVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLanguageModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setLanguageModalVisible(false);
    });
  };

  const handleLanguageChange = async (langCode: LanguageCode) => {
    if (languages[langCode].comingSoon) return;
    await changeLanguage(langCode);
    setCurrentLang(langCode);
    closeLanguageModal();
  };

  // Auto-slide effect
  useEffect(() => {
    autoSlideTimer.current = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % SLIDER_IMAGES.length;
        sliderRef.current?.scrollTo({ x: next * (width - IMAGE_MARGIN * 2), animated: true });
        return next;
      });
    }, 4000);

    return () => {
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
      }
    };
  }, []);

  const handleSliderScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (width - IMAGE_MARGIN * 2));
    if (slideIndex !== currentSlide) {
      setCurrentSlide(slideIndex);
      // Reset auto-slide timer on manual scroll
      if (autoSlideTimer.current) {
        clearInterval(autoSlideTimer.current);
        autoSlideTimer.current = setInterval(() => {
          setCurrentSlide((prev) => {
            const next = (prev + 1) % SLIDER_IMAGES.length;
            sliderRef.current?.scrollTo({ x: next * (width - IMAGE_MARGIN * 2), animated: true });
            return next;
          });
        }, 4000);
      }
    }
  };

  const handleLogin = async () => {
    console.log('[handleLogin] Starting login process...');
    
    // Validate email
    const emailValidation = validateEmail(loginEmail, t);
    if (!emailValidation.isValid) {
      Alert.alert(t('common.error'), emailValidation.message);
      return;
    }

    // Basic password check for login (not full strength check)
    if (!loginPassword) {
      Alert.alert(t('common.error'), t('auth.passwordRequired'));
      return;
    }

    setLoginLoading(true);
    
    // Set checking flag BEFORE signIn to prevent auto-navigation
    console.log('[handleLogin] Setting isCheckingRequired = true');
    useTwoFactorStore.getState().setCheckingRequired(true);
    
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    console.log('[handleLogin] signIn result:', { error: error?.message });
    
    if (error) {
      console.log('[handleLogin] Login failed, clearing 2FA state');
      useTwoFactorStore.getState().setCheckingRequired(false);
      setLoginLoading(false);
      const maskedError = maskError(error, 'Login');
      Alert.alert(t('auth.loginErrorTitle'), maskedError.message);
      return;
    }

    // Get the logged in user
    const { user, profile } = useAuthStore.getState();
    console.log('[handleLogin] User after signIn:', { userId: user?.id, hasProfile: !!profile });
    
    if (user) {
      // Check if 2FA is enabled for this user
      console.log('[handleLogin] Checking 2FA status for user:', user.id);
      const twoFactorStatus = await checkTwoFactorEnabled(user.id);
      console.log('[handleLogin] 2FA status:', twoFactorStatus);
      
      if (twoFactorStatus.enabled) {
        console.log('[handleLogin] 2FA is enabled, initiating verification...');
        // Initiate 2FA verification
        const { initiateVerification } = useTwoFactorStore.getState();
        const success = await initiateVerification(
          user.id,
          user.email || loginEmail.trim(),
          profile?.full_name || undefined
        );
        console.log('[handleLogin] 2FA initiation result:', success);
        
        setLoginLoading(false);
        setLoginVisible(false);
        
        if (success) {
          console.log('[handleLogin] 2FA initiated, _layout will redirect to verify-2fa screen');
          // Navigation will be handled by _layout.tsx when is2FAPending becomes true
        } else {
          console.log('[handleLogin] 2FA initiation failed, proceeding to tabs');
          // If 2FA initiation fails, show error but allow login
          useTwoFactorStore.getState().clearPending();
          useUIStore.getState().showToast(t('twoFactor.initFailed'), 'error');
          router.replace('/(tabs)');
        }
      } else {
        console.log('[handleLogin] 2FA not enabled, proceeding to tabs');
        // No 2FA, proceed normally
        useTwoFactorStore.getState().setCheckingRequired(false);
        setLoginLoading(false);
        setLoginVisible(false);
        router.replace('/(tabs)');
      }
    } else {
      console.log('[handleLogin] No user found after signIn, proceeding to tabs');
      useTwoFactorStore.getState().setCheckingRequired(false);
      setLoginLoading(false);
      setLoginVisible(false);
      router.replace('/(tabs)');
    }
  };

  const handleRegister = async () => {
    // Validate name
    const nameValidation = validateName(registerName, t);
    if (!nameValidation.isValid) {
      Alert.alert(t('common.error'), nameValidation.message);
      return;
    }

    // Validate email
    const emailValidation = validateEmail(registerEmail, t);
    if (!emailValidation.isValid) {
      Alert.alert(t('common.error'), emailValidation.message);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(registerPassword, t);
    if (!passwordValidation.isValid) {
      Alert.alert(t('common.error'), passwordValidation.message);
      return;
    }

    setRegisterLoading(true);
    const { error } = await signUp(registerEmail.trim(), registerPassword, registerName.trim());
    setRegisterLoading(false);
    if (error) {
      const maskedError = maskError(error, 'Register');
      Alert.alert(t('auth.registerErrorTitle'), maskedError.message);
    } else {
      setRegisterVisible(false);
      useUIStore.getState().showToast(t('auth.registerSuccess'), 'success');
      // Yeni kullanıcıyı onboarding'e yönlendir
      router.replace('/onboarding');
    }
  };

  const switchToRegister = () => {
    setLoginVisible(false);
    setTimeout(() => setRegisterVisible(true), 300);
  };

  const switchToLogin = () => {
    setRegisterVisible(false);
    setForgotPasswordVisible(false);
    setTimeout(() => setLoginVisible(true), 300);
  };

  const openForgotPassword = () => {
    setLoginVisible(false);
    setTimeout(() => setForgotPasswordVisible(true), 300);
  };

  const handleForgotPassword = async () => {
    // Validate email
    const emailValidation = validateEmail(forgotEmail, t);
    if (!emailValidation.isValid) {
      Alert.alert(t('common.error'), emailValidation.message);
      return;
    }

    setForgotLoading(true);
    const result = await initiateReset(forgotEmail.trim());
    setForgotLoading(false);
    
    if (result.success) {
      // Close forgot password sheet and open code verification
      setForgotPasswordVisible(false);
      setForgotEmailSent(false);
      setTimeout(() => {
        openResetCodeSheet();
      }, 300);
    } else if (result.error) {
      Alert.alert(t('common.error'), result.error);
    }
  };

  const closeForgotPassword = () => {
    setForgotPasswordVisible(false);
    setForgotEmailSent(false);
    setForgotEmail('');
  };

  // Password Reset Code Sheet Functions
  const openResetCodeSheet = () => {
    setResetCodeVisible(true);
    setResetCode(Array(6).fill(''));
    Animated.parallel([
      Animated.timing(resetCodeSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(resetCodeFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        resetCodeInputRefs.current[0]?.focus();
      }, 100);
    });
  };

  const closeResetCodeSheet = (shouldResetStore: boolean = true) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(resetCodeSlideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(resetCodeFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResetCodeVisible(false);
      setResetCode(Array(6).fill(''));
      if (shouldResetStore) {
        resetPasswordStore();
      }
    });
  };

  const handleResetCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...resetCode];
    newCode[index] = digit;
    setResetCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      resetCodeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerifyResetCode(fullCode);
      }
    }
  };

  const handleResetCodeKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !resetCode[index] && index > 0) {
      resetCodeInputRefs.current[index - 1]?.focus();
      const newCode = [...resetCode];
      newCode[index - 1] = '';
      setResetCode(newCode);
    }
  };

  const handleVerifyResetCode = async (codeString?: string) => {
    const fullCode = codeString || resetCode.join('');
    
    if (fullCode.length !== 6) {
      useUIStore.getState().showToast(t('twoFactor.enterFullCode'), 'error');
      return;
    }

    const result = await verifyResetCode(fullCode);

    if (result.success) {
      // Close code sheet and open new password sheet (don't reset store yet)
      closeResetCodeSheet(false);
      setTimeout(() => {
        openNewPasswordSheet();
      }, 350);
    } else {
      // Clear the code on error
      setResetCode(Array(6).fill(''));
      resetCodeInputRefs.current[0]?.focus();
      
      if (result.error === 'code_expired') {
        useUIStore.getState().showToast(t('passwordReset.codeExpired'), 'error');
      } else if (result.error === 'max_attempts_exceeded') {
        useUIStore.getState().showToast(t('twoFactor.maxAttemptsExceeded'), 'error');
        closeResetCodeSheet();
      } else {
        useUIStore.getState().showToast(t('passwordReset.invalidCode'), 'error');
      }
    }
  };

  const handleResendResetCode = async () => {
    if (resetResendCooldown > 0) return;

    const result = await initiateReset(forgotEmail.trim());
    
    if (result.success) {
      setResetResendCooldown(60);
      setResetCode(Array(6).fill(''));
      resetCodeInputRefs.current[0]?.focus();
      useUIStore.getState().showToast(t('twoFactor.codeSent'), 'success');
    } else {
      useUIStore.getState().showToast(t('twoFactor.resendFailed'), 'error');
    }
  };

  // New Password Sheet Functions
  const openNewPasswordSheet = () => {
    setResetNewPasswordVisible(true);
    setNewPassword('');
    setConfirmNewPassword('');
    Animated.parallel([
      Animated.timing(newPasswordSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(newPasswordFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeNewPasswordSheet = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(newPasswordSlideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(newPasswordFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResetNewPasswordVisible(false);
      setNewPassword('');
      setConfirmNewPassword('');
      resetPasswordStore();
    });
  };

  const handleUpdatePassword = async () => {
    // Validate password
    const passwordValidation = validatePassword(newPassword, t);
    if (!passwordValidation.isValid) {
      Alert.alert(t('common.error'), passwordValidation.message);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t('common.error'), t('passwordReset.passwordMismatch'));
      return;
    }

    const result = await updatePassword(newPassword);

    if (result.success) {
      useUIStore.getState().showToast(t('passwordReset.passwordUpdated'), 'success');
      closeNewPasswordSheet();
      // Reset forgot email state
      setForgotEmail('');
      // Open login sheet after a short delay
      setTimeout(() => {
        setLoginVisible(true);
      }, 400);
    } else {
      Alert.alert(t('common.error'), t('passwordReset.passwordUpdateFailed'));
    }
  };

  // 2FA Sheet Functions
  const openTwoFactorSheet = () => {
    console.log('[openTwoFactorSheet] Opening 2FA sheet, current twoFactorVisible:', twoFactorVisible);
    setTwoFactorVisible(true);
    setTwoFactorCode(Array(6).fill(''));
    console.log('[openTwoFactorSheet] setTwoFactorVisible(true) called');
    Animated.parallel([
      Animated.timing(twoFactorSlideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(twoFactorFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      console.log('[openTwoFactorSheet] Animation completed');
      // Focus first input after animation
      setTimeout(() => {
        twoFactorInputRefs.current[0]?.focus();
      }, 100);
    });
  };

  const closeTwoFactorSheet = () => {
    Animated.parallel([
      Animated.timing(twoFactorSlideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(twoFactorFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTwoFactorVisible(false);
      setTwoFactorCode(Array(6).fill(''));
      clearPending();
    });
  };

  const handleTwoFactorCodeChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...twoFactorCode];
    newCode[index] = digit;
    setTwoFactorCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      twoFactorInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify2FA(fullCode);
      }
    }
  };

  const handleTwoFactorKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !twoFactorCode[index] && index > 0) {
      twoFactorInputRefs.current[index - 1]?.focus();
      const newCode = [...twoFactorCode];
      newCode[index - 1] = '';
      setTwoFactorCode(newCode);
    }
  };

  const handleVerify2FA = async (codeString?: string) => {
    const fullCode = codeString || twoFactorCode.join('');
    
    if (fullCode.length !== 6) {
      useUIStore.getState().showToast(t('twoFactor.enterFullCode'), 'error');
      return;
    }

    setTwoFactorLoading(true);
    const result = await verify2FACode(fullCode);
    setTwoFactorLoading(false);

    if (result.success) {
      useUIStore.getState().showToast(t('twoFactor.verificationSuccess'), 'success');
      closeTwoFactorSheet();
      router.replace('/(tabs)');
    } else {
      // Clear the code on error
      setTwoFactorCode(Array(6).fill(''));
      twoFactorInputRefs.current[0]?.focus();
      
      if (result.error === 'code_expired') {
        useUIStore.getState().showToast(t('twoFactor.codeExpired'), 'error');
      } else if (result.error === 'max_attempts_exceeded') {
        useUIStore.getState().showToast(t('twoFactor.maxAttemptsExceeded'), 'error');
        closeTwoFactorSheet();
      }
    }
  };

  const handleResend2FA = async () => {
    if (resendCooldown > 0) return;

    setTwoFactorLoading(true);
    const success = await resend2FACode();
    setTwoFactorLoading(false);
    
    if (success) {
      setResendCooldown(60);
      setTwoFactorCode(Array(6).fill(''));
      twoFactorInputRefs.current[0]?.focus();
      useUIStore.getState().showToast(t('twoFactor.codeSent'), 'success');
    } else {
      useUIStore.getState().showToast(t('twoFactor.resendFailed'), 'error');
    }
  };

  const cancelTwoFactor = () => {
    // Sign out and close sheet
    useAuthStore.getState().signOut();
    closeTwoFactorSheet();
  };

  const maskedEmail = pendingAuth?.email 
    ? pendingAuth.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Background */}
      <View style={[styles.background, { backgroundColor: colors.background }]} />
      
      {/* Rounded Image Container with Slider */}
      <View style={styles.imageContainer}>
        <ScrollView
          ref={sliderRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleSliderScroll}
          scrollEventThrottle={16}
          style={styles.slider}
        >
          {SLIDER_IMAGES.map((imageSource, index) => (
            <View key={index} style={styles.slideContainer}>
              <Image
                source={imageSource}
                style={styles.backgroundImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            </View>
          ))}
        </ScrollView>
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
        
        {/* Language Button - Top Right */}
        <TouchableOpacity
          style={styles.languageButtonOverlay}
          onPress={openLanguageModal}
        >
          <BlurView intensity={60} tint="dark" style={styles.languageButtonBlur}>
            <Ionicons name="globe-outline" size={20} color="#fff" />
          </BlurView>
        </TouchableOpacity>
        
        {/* Hero Text */}
        <View style={styles.heroSection} pointerEvents="none">
          <Text style={styles.heroTitle}>
            {t('auth.heroTitle')}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('auth.heroSubtitle')}
          </Text>
          
          {/* Slider Dots */}
          <View style={styles.dotsContainer}>
            {SLIDER_IMAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentSlide === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Bottom Section - Minimalist Design */}
      <View style={styles.bottomSection}>
        {/* Auth Buttons - Stacked Full Width */}
        <View style={styles.authButtonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setLoginVisible(true)}
          >
            <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
            }]}
            onPress={() => setRegisterVisible(true)}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Links */}
        <View style={styles.legalContainer}>
          <Text style={[styles.legalText, { color: colors.textSecondary }]}>
            {t('auth.agreeToTerms')}{' '}
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => setPrivacyVisible(true)}>
              <Text style={[styles.legalLink, { color: colors.text }]}>{t('settings.privacyPolicy')}</Text>
            </TouchableOpacity>
            <Text style={[styles.legalText, { color: colors.textSecondary }]}> {t('common.and')} </Text>
            <TouchableOpacity onPress={() => setTermsVisible(true)}>
              <Text style={[styles.legalLink, { color: colors.text }]}>{t('settings.termsOfService')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Login Bottom Sheet */}
      <AuthBottomSheet
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        sheetHeight={height * 0.55}
        isDark={isDark}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('auth.loginSheetTitle')}</Text>
        <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>{t('auth.loginSheetSubtitle')}</Text>
        
        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="mail-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('auth.email')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
            value={loginEmail}
            onChangeText={setLoginEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="lock-closed-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('auth.password')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry={!showLoginPassword}
          />
          <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
            <Ionicons
              name={showLoginPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={isDark ? 'rgba(255,255,255,0.5)' : '#999'}
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.forgotPassword} onPress={openForgotPassword}>
          <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.sheetButton}
          onPress={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sheetButtonText}>{t('auth.login')}</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.sheetFooter}>
          <Text style={[styles.sheetFooterText, { color: colors.textSecondary }]}>{t('auth.noAccount')} </Text>
          <TouchableOpacity onPress={switchToRegister}>
            <Text style={styles.sheetFooterLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </AuthBottomSheet>

      {/* Register Bottom Sheet */}
      <AuthBottomSheet
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
        sheetHeight={height * 0.60}
        isDark={isDark}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('auth.registerSheetTitle')}</Text>
        <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>{t('auth.registerSheetSubtitle')}</Text>
        
        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="person-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('auth.fullName')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
            value={registerName}
            onChangeText={setRegisterName}
            autoCapitalize="words"
          />
        </View>
        
        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="mail-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('auth.email')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
            value={registerEmail}
            onChangeText={setRegisterEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
          <Ionicons name="lock-closed-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t('auth.password')}
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
            value={registerPassword}
            onChangeText={setRegisterPassword}
            secureTextEntry={!showRegisterPassword}
          />
          <TouchableOpacity onPress={() => setShowRegisterPassword(!showRegisterPassword)}>
            <Ionicons
              name={showRegisterPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={isDark ? 'rgba(255,255,255,0.5)' : '#999'}
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.sheetButton, { marginTop: 20 }]}
          onPress={handleRegister}
          disabled={registerLoading}
        >
          {registerLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sheetButtonText}>{t('auth.register')}</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.sheetFooter}>
          <Text style={[styles.sheetFooterText, { color: colors.textSecondary }]}>{t('auth.hasAccount')} </Text>
          <TouchableOpacity onPress={switchToLogin}>
            <Text style={styles.sheetFooterLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </AuthBottomSheet>

      {/* Forgot Password Bottom Sheet */}
      <AuthBottomSheet
        visible={forgotPasswordVisible}
        onClose={closeForgotPassword}
        sheetHeight={forgotEmailSent ? height * 0.45 : height * 0.42}
        isDark={isDark}
      >
        {forgotEmailSent ? (
          // Success State
          <View style={styles.forgotSuccessContainer}>
            <View style={[styles.forgotSuccessIcon, { backgroundColor: isDark ? 'rgba(76,175,80,0.15)' : 'rgba(76,175,80,0.1)' }]}>
              <Ionicons name="mail-open-outline" size={48} color="#4CAF50" />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('auth.emailSentTitle')}</Text>
            <Text style={[styles.sheetSubtitle, { textAlign: 'center', marginBottom: 24, color: colors.textSecondary }]}>
              {t('auth.emailSentMessage', { email: forgotEmail })}
            </Text>
            <TouchableOpacity
              style={styles.sheetButton}
              onPress={closeForgotPassword}
            >
              <Text style={styles.sheetButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={switchToLogin}
            >
              <Text style={[styles.backToLoginText, { color: colors.textSecondary }]}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Form State
          <>
            <View style={styles.forgotIconContainer}>
              <Ionicons name="key-outline" size={36} color={colors.text} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('auth.forgotPasswordTitle')}</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
              {t('auth.forgotPasswordSubtitle')}
            </Text>
            
            <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
              <Ionicons name="mail-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('auth.email')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={styles.sheetButton}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              {forgotLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetButtonText}>{t('auth.sendResetLink')}</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={switchToLogin}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={[styles.backToLoginText, { color: colors.textSecondary }]}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </>
        )}
      </AuthBottomSheet>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeLanguageModal}
      >
        <TouchableWithoutFeedback onPress={closeLanguageModal}>
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.languageModalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.languageModal,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              },
            ]}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandle}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                ]}
              />
            </View>

            {/* Modal Title */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('settings.language')}
            </Text>

            {/* Language Options */}
            <View style={styles.languageOptions}>
              {(Object.keys(languages) as LanguageCode[]).map((langCode, index) => {
                const lang = languages[langCode];
                const isSelected = currentLang === langCode;
                const isComingSoon = lang.comingSoon;
                const isLast = index === Object.keys(languages).length - 1;

                return (
                  <TouchableOpacity
                    key={langCode}
                    style={[
                      styles.languageOption,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                          : 'transparent',
                      },
                      !isLast && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                      },
                    ]}
                    onPress={() => handleLanguageChange(langCode)}
                    activeOpacity={isComingSoon ? 1 : 0.6}
                    disabled={isComingSoon}
                  >
                    <View style={styles.languageLeft}>
                      <Text style={[
                        styles.languageName,
                        { color: isComingSoon ? colors.textSecondary : colors.text },
                        isComingSoon && { opacity: 0.5 },
                      ]}>
                        {lang.nativeName}
                      </Text>
                    </View>

                    <View style={styles.languageRight}>
                      {isComingSoon ? (
                        <View style={[
                          styles.comingSoonBadge,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                        ]}>
                          <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                            {t('common.soon')}
                          </Text>
                        </View>
                      ) : isSelected ? (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cancel Button */}
            <View style={styles.cancelButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                ]}
                onPress={closeLanguageModal}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Modal>

      {/* Privacy Policy Sheet */}
      <AuthBottomSheet
        visible={privacyVisible}
        onClose={() => setPrivacyVisible(false)}
        sheetHeight={height * 0.85}
        isDark={isDark}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('settings.privacyPolicy')}</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.7 }}>
          <Text style={[styles.legalContentText, { color: colors.textSecondary }]}>
            {t('auth.privacyPolicyContent')}
          </Text>
        </ScrollView>
      </AuthBottomSheet>

      {/* Terms of Service Sheet */}
      <AuthBottomSheet
        visible={termsVisible}
        onClose={() => setTermsVisible(false)}
        sheetHeight={height * 0.85}
        isDark={isDark}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('settings.termsOfService')}</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.7 }}>
          <Text style={[styles.legalContentText, { color: colors.textSecondary }]}>
            {t('auth.termsOfServiceContent')}
          </Text>
        </ScrollView>
      </AuthBottomSheet>

      {/* Two-Factor Authentication Sheet */}
      <Modal
        visible={twoFactorVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={cancelTwoFactor}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View
              style={[
                styles.modalOverlay,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
                  opacity: twoFactorFadeAnim,
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.twoFactorContainer,
              {
                transform: [{ translateY: twoFactorSlideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.twoFactorSheet,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.modalHandle}>
                <View
                  style={[
                    styles.handleBar,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                  ]}
                />
              </View>

              {/* Icon */}
              <View style={[styles.twoFactorIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
              </View>

              {/* Title */}
              <Text style={[styles.twoFactorTitle, { color: colors.text }]}>
                {t('twoFactor.verifyTitle')}
              </Text>

              {/* Description */}
              <Text style={[styles.twoFactorDescription, { color: colors.textSecondary }]}>
                {t('twoFactor.verifyDescription', { email: maskedEmail })}
              </Text>

              {/* Code Input */}
              <View style={styles.twoFactorCodeContainer}>
                {Array(6).fill(0).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.twoFactorCodeInputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        borderColor: twoFactorCode[index] 
                          ? colors.primary 
                          : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                      },
                    ]}
                  >
                    <TextInput
                      ref={(ref) => { twoFactorInputRefs.current[index] = ref; }}
                      style={[styles.twoFactorCodeInput, { color: colors.text }]}
                      value={twoFactorCode[index]}
                      onChangeText={(value) => handleTwoFactorCodeChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleTwoFactorKeyPress(index, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  </View>
                ))}
              </View>

              {/* Timer */}
              {timeRemaining && (
                <Text style={[styles.twoFactorTimer, { color: colors.textSecondary }]}>
                  {t('twoFactor.codeExpiresIn', { time: timeRemaining })}
                </Text>
              )}

              {/* Error Message */}
              {twoFactorError && (
                <View style={styles.twoFactorErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.twoFactorErrorText}>{twoFactorError}</Text>
                </View>
              )}

              {/* Attempts Remaining */}
              {attemptsRemaining !== null && attemptsRemaining < 5 && (
                <Text style={[styles.twoFactorAttemptsText, { color: '#F59E0B' }]}>
                  {t('twoFactor.attemptsRemaining', { count: attemptsRemaining })}
                </Text>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.twoFactorVerifyButton,
                  { backgroundColor: colors.primary },
                  (twoFactorLoading || isVerifying) && { opacity: 0.6 },
                ]}
                onPress={() => handleVerify2FA()}
                disabled={twoFactorLoading || isVerifying || twoFactorCode.join('').length !== 6}
              >
                {(twoFactorLoading || isVerifying) ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.twoFactorVerifyButtonText}>{t('twoFactor.verify')}</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity
                style={styles.twoFactorResendButton}
                onPress={handleResend2FA}
                disabled={resendCooldown > 0 || twoFactorLoading}
              >
                <Text
                  style={[
                    styles.twoFactorResendText,
                    { color: resendCooldown > 0 ? colors.textSecondary : colors.primary },
                  ]}
                >
                  {resendCooldown > 0
                    ? t('twoFactor.resendIn', { seconds: resendCooldown })
                    : t('twoFactor.resendCode')}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.twoFactorCancelButton}
                onPress={cancelTwoFactor}
              >
                <Text style={[styles.twoFactorCancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Reset Code Verification Modal */}
      <Modal
        visible={resetCodeVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeResetCodeSheet()}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View
              style={[
                styles.modalOverlay,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
                  opacity: resetCodeFadeAnim,
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.twoFactorContainer,
              {
                transform: [{ translateY: resetCodeSlideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.twoFactorSheet,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.modalHandle}>
                <View
                  style={[
                    styles.handleBar,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                  ]}
                />
              </View>

              {/* Icon */}
              <View style={[styles.twoFactorIconContainer, { backgroundColor: '#F03A52' + '15' }]}>
                <Ionicons name="key" size={40} color="#F03A52" />
              </View>

              {/* Title */}
              <Text style={[styles.twoFactorTitle, { color: colors.text }]}>
                {t('passwordReset.enterCode')}
              </Text>

              {/* Description */}
              <Text style={[styles.twoFactorDescription, { color: colors.textSecondary }]}>
                {t('passwordReset.enterCodeDescription')}
              </Text>

              {/* Email indicator */}
              {resetEmail && (
                <Text style={[styles.twoFactorTimer, { color: colors.primary, marginBottom: 16 }]}>
                  {resetEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}
                </Text>
              )}

              {/* Code Input */}
              <View style={styles.twoFactorCodeContainer}>
                {Array(6).fill(0).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.twoFactorCodeInputWrapper,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        borderColor: resetCode[index] 
                          ? '#F03A52'
                          : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                      },
                    ]}
                  >
                    <TextInput
                      ref={(ref) => { resetCodeInputRefs.current[index] = ref; }}
                      style={[styles.twoFactorCodeInput, { color: colors.text }]}
                      value={resetCode[index]}
                      onChangeText={(value) => handleResetCodeChange(index, value)}
                      onKeyPress={({ nativeEvent }) => handleResetCodeKeyPress(index, nativeEvent.key)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  </View>
                ))}
              </View>

              {/* Timer */}
              {resetTimeRemaining && (
                <Text style={[styles.twoFactorTimer, { color: colors.textSecondary }]}>
                  {t('passwordReset.codeExpiresIn', { time: resetTimeRemaining })}
                </Text>
              )}

              {/* Error Message */}
              {resetError && (
                <View style={styles.twoFactorErrorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.twoFactorErrorText}>{resetError}</Text>
                </View>
              )}

              {/* Attempts Remaining */}
              {resetAttemptsRemaining !== null && resetAttemptsRemaining < 5 && (
                <Text style={[styles.twoFactorAttemptsText, { color: '#F59E0B' }]}>
                  {t('passwordReset.attemptsRemaining', { count: resetAttemptsRemaining })}
                </Text>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.twoFactorVerifyButton,
                  { backgroundColor: '#F03A52' },
                  isResetLoading && { opacity: 0.6 },
                ]}
                onPress={() => handleVerifyResetCode()}
                disabled={isResetLoading || resetCode.join('').length !== 6}
              >
                {isResetLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.twoFactorVerifyButtonText}>{t('passwordReset.verifyCode')}</Text>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <TouchableOpacity
                style={styles.twoFactorResendButton}
                onPress={handleResendResetCode}
                disabled={resetResendCooldown > 0 || isResetLoading}
              >
                <Text
                  style={[
                    styles.twoFactorResendText,
                    { color: resetResendCooldown > 0 ? colors.textSecondary : '#F03A52' },
                  ]}
                >
                  {resetResendCooldown > 0
                    ? t('passwordReset.resendIn', { seconds: resetResendCooldown })
                    : t('passwordReset.resendCode')}
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.twoFactorCancelButton}
                onPress={() => closeResetCodeSheet()}
              >
                <Text style={[styles.twoFactorCancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Password Modal */}
      <Modal
        visible={resetNewPasswordVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeNewPasswordSheet}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View
              style={[
                styles.modalOverlay,
                {
                  backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
                  opacity: newPasswordFadeAnim,
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.twoFactorContainer,
              {
                transform: [{ translateY: newPasswordSlideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.twoFactorSheet,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.modalHandle}>
                <View
                  style={[
                    styles.handleBar,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' },
                  ]}
                />
              </View>

              {/* Icon */}
              <View style={[styles.twoFactorIconContainer, { backgroundColor: '#4CAF50' + '15' }]}>
                <Ionicons name="lock-open" size={40} color="#4CAF50" />
              </View>

              {/* Title */}
              <Text style={[styles.twoFactorTitle, { color: colors.text }]}>
                {t('passwordReset.newPasswordTitle')}
              </Text>

              {/* Description */}
              <Text style={[styles.twoFactorDescription, { color: colors.textSecondary }]}>
                {t('passwordReset.newPasswordDescription')}
              </Text>

              {/* New Password Input */}
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5', marginBottom: 14 }]}>
                <Ionicons name="lock-closed-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('passwordReset.newPasswordPlaceholder')}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons
                    name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={isDark ? 'rgba(255,255,255,0.5)' : '#999'}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }]}>
                <Ionicons name="lock-closed-outline" size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#999'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('passwordReset.confirmNewPasswordPlaceholder')}
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirmNewPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}>
                  <Ionicons
                    name={showConfirmNewPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={isDark ? 'rgba(255,255,255,0.5)' : '#999'}
                  />
                </TouchableOpacity>
              </View>

              {/* Update Password Button */}
              <TouchableOpacity
                style={[
                  styles.twoFactorVerifyButton,
                  { backgroundColor: '#4CAF50', marginTop: 20 },
                  isResetLoading && { opacity: 0.6 },
                ]}
                onPress={handleUpdatePassword}
                disabled={isResetLoading || !newPassword || !confirmNewPassword}
              >
                {isResetLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.twoFactorVerifyButtonText}>{t('passwordReset.updatePassword')}</Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.twoFactorCancelButton}
                onPress={closeNewPasswordSheet}
              >
                <Text style={[styles.twoFactorCancelText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
  },
  imageContainer: {
    marginTop: IMAGE_MARGIN + (Platform.OS === 'ios' ? 44 : 24),
    marginHorizontal: IMAGE_MARGIN,
    height: height * 0.68,
    borderRadius: IMAGE_BORDER_RADIUS,
    overflow: 'hidden',
  },
  slider: {
    flex: 1,
  },
  slideContainer: {
    width: width - IMAGE_MARGIN * 2,
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSection: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 10,
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    justifyContent: 'space-between',
  },
  authButtonsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#F03A52',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  secondaryButton: {
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  legalContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  legalText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  legalContentText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  languageButtonOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  languageButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  // Legacy styles - keeping for reference
  authButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  loginButton: {
    flex: 1,
    backgroundColor: '#F03A52',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  signUpButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EBEBEB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  socialButtonsContainer: {
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  socialButtonGlass: {
    borderRadius: 28,
    height: 50,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  socialButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  socialButtonTextGlass: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 28,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    height: 54,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#EBEBEB',
  },
  socialIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  socialButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 28,
  },
  // Bottom Sheet Styles
  sheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetIndicator: {
    backgroundColor: '#DDD',
    width: 40,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  sheetButton: {
    backgroundColor: '#F03A52',
    borderRadius: 12,
    height: 54,
    minWidth: 160,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'center',
  },
  sheetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  sheetFooterText: {
    color: '#666',
    fontSize: 14,
  },
  sheetFooterLink: {
    color: '#F03A52',
    fontSize: 14,
    fontWeight: '600',
  },
  // Forgot Password Styles
  forgotIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotSuccessContainer: {
    alignItems: 'center',
  },
  forgotSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  backToLoginText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  // Language Button
  languageButton: {
    width: 54,
    height: 54,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  // Language Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  languageModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  languageModal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
  },
  languageOptions: {
    paddingHorizontal: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  languageLeft: {
    flex: 1,
  },
  languageName: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comingSoonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButtonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  // Two-Factor Authentication Styles
  twoFactorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  twoFactorSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  twoFactorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  twoFactorTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
  },
  twoFactorDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  twoFactorCodeInputWrapper: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  twoFactorCodeInput: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    fontFamily: Platform.OS === 'ios' ? 'SF Mono' : 'monospace',
  },
  twoFactorTimer: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    alignSelf: 'center',
  },
  twoFactorErrorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorAttemptsText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorVerifyButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  twoFactorVerifyButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorResendButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  twoFactorResendText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  twoFactorCancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  twoFactorCancelText: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
});
