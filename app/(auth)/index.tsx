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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores';
import { router } from 'expo-router';

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
const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: 'E-posta adresi gerekli' };
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { isValid: false, message: 'Geçerli bir e-posta adresi girin' };
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
const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, message: 'Şifre gerekli' };
  }
  if (password.length < 8) {
    return { isValid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Şifre en az bir büyük harf içermelidir' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Şifre en az bir küçük harf içermelidir' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Şifre en az bir rakam içermelidir' };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates full name
 */
const validateName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, message: 'Ad Soyad gerekli' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, message: 'Ad Soyad en az 2 karakter olmalıdır' };
  }
  return { isValid: true, message: '' };
};
const IMAGE_MARGIN = 16;
const IMAGE_BORDER_RADIUS = 32;

// Slider images for hero section
const SLIDER_IMAGES = [
  'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=1200&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=1200&fit=crop',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=1200&fit=crop',
];

// Custom Bottom Sheet Component with spring animation
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  sheetHeight: number;
  children: React.ReactNode;
}

function AuthBottomSheet({ visible, onClose, sheetHeight, children }: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    }
  }, [visible, openSheet]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View style={[sheetStyles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      
      <Animated.View
        style={[
          sheetStyles.sheetContainer,
          { maxHeight: sheetHeight, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={sheetStyles.sheet}>
          <View style={sheetStyles.handleContainer}>
            <View style={sheetStyles.handle} />
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={sheetStyles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
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
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
});

// Google Icon Component (Custom SVG-like design)
function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>
        <Text style={{ color: '#4285F4' }}>G</Text>
      </Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const [loginVisible, setLoginVisible] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
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
  
  const { signIn, signUp, resetPassword } = useAuthStore();

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
    // Validate email
    const emailValidation = validateEmail(loginEmail);
    if (!emailValidation.isValid) {
      Alert.alert('Hata', emailValidation.message);
      return;
    }

    // Basic password check for login (not full strength check)
    if (!loginPassword) {
      Alert.alert('Hata', 'Şifre gerekli');
      return;
    }

    setLoginLoading(true);
    const { error } = await signIn(loginEmail.trim(), loginPassword);
    setLoginLoading(false);
    if (error) {
      Alert.alert('Giriş Hatası', error.message);
    } else {
      setLoginVisible(false);
      router.replace('/(tabs)');
    }
  };

  const handleRegister = async () => {
    // Validate name
    const nameValidation = validateName(registerName);
    if (!nameValidation.isValid) {
      Alert.alert('Hata', nameValidation.message);
      return;
    }

    // Validate email
    const emailValidation = validateEmail(registerEmail);
    if (!emailValidation.isValid) {
      Alert.alert('Hata', emailValidation.message);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(registerPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Hata', passwordValidation.message);
      return;
    }

    setRegisterLoading(true);
    const { error } = await signUp(registerEmail.trim(), registerPassword, registerName.trim());
    setRegisterLoading(false);
    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
    } else {
      Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
        { text: 'Tamam', onPress: () => {
          setRegisterVisible(false);
          router.replace('/(tabs)');
        }}
      ]);
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
    const emailValidation = validateEmail(forgotEmail);
    if (!emailValidation.isValid) {
      Alert.alert('Hata', emailValidation.message);
      return;
    }

    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      setForgotEmailSent(true);
    }
  };

  const closeForgotPassword = () => {
    setForgotPasswordVisible(false);
    setForgotEmailSent(false);
    setForgotEmail('');
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background} />
      
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
          {SLIDER_IMAGES.map((uri, index) => (
            <View key={index} style={styles.slideContainer}>
              <Image
                source={{ uri }}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
          style={styles.gradientOverlay}
          pointerEvents="none"
        />
        
        {/* Hero Text */}
        <View style={styles.heroSection} pointerEvents="none">
          <Text style={styles.heroTitle}>
            KKTC'nin{'\n'}güzelliklerini{'\n'}keşfedin
          </Text>
          <Text style={styles.heroSubtitle}>
            Unutulmaz deneyimler sizi bekliyor
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

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Auth Buttons */}
        <View style={styles.authButtonsRow}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setLoginVisible(true)}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => setRegisterVisible(true)}
          >
            <Text style={styles.signUpButtonText}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Login Buttons - Liquid Glass Design */}
        <View style={styles.socialButtonsContainer}>
          <TouchableOpacity style={styles.socialButtonGlass}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
              <View style={styles.socialButtonInner}>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.socialButtonTextGlass}>Google ile devam et</Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButtonGlass}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
              <View style={styles.socialButtonInner}>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                </View>
                <Text style={styles.socialButtonTextGlass}>Facebook ile devam et</Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButtonGlass}>
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
              <View style={styles.socialButtonInner}>
                <View style={styles.socialIconContainer}>
                  <Ionicons name="logo-apple" size={20} color="#000" />
                </View>
                <Text style={styles.socialButtonTextGlass}>Apple ile devam et</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* Login Bottom Sheet */}
      <AuthBottomSheet
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        sheetHeight={height * 0.55}
      >
        <Text style={styles.sheetTitle}>Hoş Geldiniz</Text>
        <Text style={styles.sheetSubtitle}>Hesabınıza giriş yapın</Text>
        
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#999"
            value={loginEmail}
            onChangeText={setLoginEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#999"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry={!showLoginPassword}
          />
          <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
            <Ionicons
              name={showLoginPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.forgotPassword} onPress={openForgotPassword}>
          <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.sheetButton}
          onPress={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sheetButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.sheetFooter}>
          <Text style={styles.sheetFooterText}>Hesabınız yok mu? </Text>
          <TouchableOpacity onPress={switchToRegister}>
            <Text style={styles.sheetFooterLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </AuthBottomSheet>

      {/* Register Bottom Sheet */}
      <AuthBottomSheet
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
        sheetHeight={height * 0.60}
      >
        <Text style={styles.sheetTitle}>Hesap Oluştur</Text>
        <Text style={styles.sheetSubtitle}>KKTC'yi keşfetmeye başlayın</Text>
        
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ad Soyad"
            placeholderTextColor="#999"
            value={registerName}
            onChangeText={setRegisterName}
            autoCapitalize="words"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#999"
            value={registerEmail}
            onChangeText={setRegisterEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#999"
            value={registerPassword}
            onChangeText={setRegisterPassword}
            secureTextEntry={!showRegisterPassword}
          />
          <TouchableOpacity onPress={() => setShowRegisterPassword(!showRegisterPassword)}>
            <Ionicons
              name={showRegisterPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#999"
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
            <Text style={styles.sheetButtonText}>Kayıt Ol</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.sheetFooter}>
          <Text style={styles.sheetFooterText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={switchToLogin}>
            <Text style={styles.sheetFooterLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </AuthBottomSheet>

      {/* Forgot Password Bottom Sheet */}
      <AuthBottomSheet
        visible={forgotPasswordVisible}
        onClose={closeForgotPassword}
        sheetHeight={forgotEmailSent ? height * 0.45 : height * 0.42}
      >
        {forgotEmailSent ? (
          // Success State
          <View style={styles.forgotSuccessContainer}>
            <View style={styles.forgotSuccessIcon}>
              <Ionicons name="mail-open-outline" size={48} color="#4CAF50" />
            </View>
            <Text style={styles.sheetTitle}>E-posta Gönderildi!</Text>
            <Text style={[styles.sheetSubtitle, { textAlign: 'center', marginBottom: 24 }]}>
              Şifre sıfırlama bağlantısı {forgotEmail} adresine gönderildi.
            </Text>
            <TouchableOpacity
              style={styles.sheetButton}
              onPress={closeForgotPassword}
            >
              <Text style={styles.sheetButtonText}>Tamam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={switchToLogin}
            >
              <Text style={styles.backToLoginText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Form State
          <>
            <View style={styles.forgotIconContainer}>
              <Ionicons name="key-outline" size={36} color="#333" />
            </View>
            <Text style={styles.sheetTitle}>Şifremi Unuttum</Text>
            <Text style={styles.sheetSubtitle}>
              E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim
            </Text>
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#999"
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
                <Text style={styles.sheetButtonText}>Şifre Sıfırlama Linki Gönder</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={switchToLogin}
            >
              <Ionicons name="arrow-back" size={16} color="#666" />
              <Text style={styles.backToLoginText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </>
        )}
      </AuthBottomSheet>
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
    height: height * 0.55,
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
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
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
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
});
