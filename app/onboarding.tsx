import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';

const { width, height } = Dimensions.get('window');

/**
 * Welcome Screen - Kayıt sonrası hoşgeldiniz ekranı
 * Elegant, minimal, premium hissi veren tek sayfalık tasarım
 */
export default function WelcomeScreen() {
  const { clearNewUserFlag, profile } = useAuthStore();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleContinue = () => {
    clearNewUserFlag();
    router.replace('/(tabs)');
  };

  // Kullanıcı adını al (varsa)
  const userName = profile?.full_name?.split(' ')[0] || 'Gezgin';

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FFFFFF', Colors.light.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <View style={[styles.decorativeCircle, styles.circle1]} />
        <View style={[styles.decorativeCircle, styles.circle2]} />
        <View style={[styles.decorativeCircle, styles.circle3]} />
      </View>

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Welcome Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>KKTC Tour</Text>
        </View>

        {/* Main Title */}
        <Text style={styles.greeting}>Hoş Geldin,</Text>
        <Text style={styles.userName}>{userName}</Text>

        {/* Divider Line */}
        <View style={styles.divider} />

        {/* Description */}
        <Text style={styles.description}>
          Kuzey Kıbrıs'ın eşsiz güzelliklerini{'\n'}
          keşfetmeye hazır mısın?
        </Text>

        {/* Features List - Minimal */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Benzersiz rotalar</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Yerel deneyimler</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Kişiselleştirilmiş öneriler</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom CTA */}
      <Animated.View 
        style={[
          styles.bottomContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.ctaButton} 
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[Colors.light.primary, '#E02D45']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.ctaText}>Keşfetmeye Başla</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Maceraya hazır ol
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.light.primary,
    opacity: 0.03,
  },
  circle1: {
    width: width * 1.2,
    height: width * 1.2,
    top: -width * 0.6,
    right: -width * 0.3,
  },
  circle2: {
    width: width * 0.8,
    height: width * 0.8,
    bottom: -width * 0.2,
    left: -width * 0.4,
  },
  circle3: {
    width: width * 0.5,
    height: width * 0.5,
    top: height * 0.4,
    right: -width * 0.2,
    opacity: 0.02,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.15,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(240, 58, 82, 0.08)',
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
    letterSpacing: -1,
  },
  divider: {
    width: 48,
    height: 3,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
    marginTop: 24,
    marginBottom: 24,
  },
  description: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  featuresContainer: {
    marginTop: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    letterSpacing: 0.3,
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: 50,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerText: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
  },
});
