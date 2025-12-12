import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { useAuthStore, useThemeStore } from '@/stores';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

/**
 * Welcome Screen - Kayıt sonrası hoşgeldiniz ekranı
 * Premium, elegant, minimal tasarım - Reanimated ile özel animasyonlar
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  
  const { clearNewUserFlag } = useAuthStore();
  
  // Reanimated shared values
  const buttonScale = useSharedValue(1);
  const buttonWidth = useSharedValue(width - 64);
  const buttonOpacity = useSharedValue(1);
  const iconRotation = useSharedValue(0);
  const iconTranslateX = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0.3);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  useEffect(() => {
    // Entrance animation
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 800 }));
    contentTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));
  }, []);

  const handleContinue = () => {
    clearNewUserFlag();
    router.replace('/(tabs)');
  };

  // Button press animation with Reanimated
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      // Press down effect
      buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      rippleScale.value = 0;
      rippleOpacity.value = 0.4;
      rippleScale.value = withTiming(2.5, { duration: 600, easing: Easing.out(Easing.cubic) });
      rippleOpacity.value = withTiming(0, { duration: 600 });
    })
    .onEnd(() => {
      // Success animation sequence
      buttonScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      
      // Shrink button to circle
      buttonWidth.value = withTiming(64, { duration: 300, easing: Easing.inOut(Easing.cubic) });
      
      // Rotate and hide arrow
      iconRotation.value = withTiming(90, { duration: 200 });
      iconTranslateX.value = withSequence(
        withTiming(30, { duration: 150 }),
        withTiming(0, { duration: 0 })
      );
      
      // Show checkmark
      checkScale.value = withDelay(250, withSpring(1, { damping: 10, stiffness: 200 }));
      
      // Fade out and navigate
      buttonOpacity.value = withDelay(600, withTiming(0, { duration: 200 }));
      
      // Navigate after animation
      setTimeout(() => {
        runOnJS(handleContinue)();
      }, 900);
    });

  // Animated styles
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    width: buttonWidth.value,
    opacity: buttonOpacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${iconRotation.value}deg` },
      { translateX: iconTranslateX.value },
    ],
    opacity: interpolate(iconRotation.value, [0, 45], [1, 0]),
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        
        {/* Elegant Background Pattern */}
        <View style={styles.backgroundPattern}>
          {/* Subtle gradient orbs */}
          <View style={[styles.orb, styles.orb1, { backgroundColor: colors.primary }]} />
          <View style={[styles.orb, styles.orb2, { backgroundColor: colors.primary }]} />
          <View style={[styles.orb, styles.orb3, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]} />
          
          {/* Decorative lines */}
          <View style={[styles.decorLine, styles.line1, { backgroundColor: colors.primary }]} />
          <View style={[styles.decorLine, styles.line2, { backgroundColor: colors.primary }]} />
        </View>

        {/* Main Content */}
        <Animated.View style={[styles.content, contentAnimatedStyle]}>
          {/* Premium Hero Section */}
          <Animated.View 
            entering={FadeInUp.delay(300).duration(600).springify()}
            style={styles.heroContainer}
          >
            {/* Tagline with decorative elements */}
            <View style={styles.taglineContainer}>
              <View style={[styles.taglineLine, { backgroundColor: colors.primary }]} />
              <Text style={[styles.tagline, { color: colors.primary }]}>
                {t('welcome.tagline')}
              </Text>
              <View style={[styles.taglineLine, { backgroundColor: colors.primary }]} />
            </View>

            {/* Main Title */}
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {t('welcome.title')}
            </Text>

            {/* Subtitle */}
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {t('welcome.subtitle')}
            </Text>
          </Animated.View>

          {/* Elegant Divider */}
          <Animated.View 
            entering={FadeIn.delay(500).duration(400)}
            style={styles.dividerContainer}
          >
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#E5E5E5' }]} />
            <View style={[styles.dividerDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#E5E5E5' }]} />
          </Animated.View>

          {/* Features with elegant styling */}
          <Animated.View 
            entering={FadeInUp.delay(700).duration(600).springify()}
            style={styles.featuresContainer}
          >
            {[
              { icon: 'compass-outline', textKey: 'welcome.features.routes' },
              { icon: 'heart-outline', textKey: 'welcome.features.experiences' },
              { icon: 'sparkles-outline', textKey: 'welcome.features.recommendations' },
            ].map((feature, index) => (
              <Animated.View 
                key={index}
                entering={FadeInUp.delay(800 + index * 100).duration(500).springify()}
                style={styles.featureItem}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: isDark ? 'rgba(240, 58, 82, 0.15)' : 'rgba(240, 58, 82, 0.08)' }]}>
                  <Ionicons name={feature.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{t(feature.textKey)}</Text>
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>

        {/* Bottom CTA - Premium Button with Reanimated */}
        <Animated.View 
          entering={FadeInDown.delay(1100).duration(600).springify()}
          style={styles.bottomContainer}
        >
          <GestureDetector gesture={tapGesture}>
            <Animated.View style={[styles.ctaButton, buttonAnimatedStyle, { backgroundColor: colors.primary }]}>
              {/* Ripple Effect */}
              <Animated.View style={[styles.ripple, rippleAnimatedStyle, { backgroundColor: '#FFFFFF' }]} />
              
              {/* Button Content */}
              <View style={styles.buttonContent}>
                <Animated.Text style={[styles.ctaText, iconAnimatedStyle]}>
                  {t('welcome.cta')}
                </Animated.Text>
                <Animated.View style={[styles.arrowContainer, iconAnimatedStyle]}>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </Animated.View>
                <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
                  <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                </Animated.View>
              </View>
            </Animated.View>
          </GestureDetector>

          <Animated.Text 
            entering={FadeIn.delay(1300).duration(400)}
            style={[styles.footerText, { color: colors.textSecondary }]}
          >
            {t('welcome.footer')}
          </Animated.Text>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.3,
    right: -width * 0.2,
    opacity: 0.04,
  },
  orb2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: height * 0.15,
    left: -width * 0.3,
    opacity: 0.03,
  },
  orb3: {
    width: width * 0.4,
    height: width * 0.4,
    top: height * 0.35,
    right: -width * 0.15,
    opacity: 0.5,
  },
  decorLine: {
    position: 'absolute',
    opacity: 0.06,
  },
  line1: {
    width: 1,
    height: height * 0.3,
    left: width * 0.15,
    top: height * 0.1,
  },
  line2: {
    width: 1,
    height: height * 0.2,
    right: width * 0.2,
    bottom: height * 0.25,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.12,
    justifyContent: 'center',
  },
  heroContainer: {
    marginBottom: 40,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  taglineLine: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featuresContainer: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
    alignItems: 'center',
  },
  ctaButton: {
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  ripple: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  arrowContainer: {
    marginLeft: 4,
  },
  checkContainer: {
    position: 'absolute',
  },
  footerText: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
});
