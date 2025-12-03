import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
  backgroundColor?: string;
}

/**
 * Modern animated loading screen with pulsing dots
 */
export function LoadingScreen({ backgroundColor }: LoadingScreenProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const bgColor = backgroundColor || colors.background;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 15,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Dot bounce animations with stagger
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = createDotAnimation(dot1, 0);
    const animation2 = createDotAnimation(dot2, 150);
    const animation3 = createDotAnimation(dot3, 300);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3, scale, opacity]);

  const getDotStyle = (animValue: Animated.Value) => ({
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -12],
        }),
      },
      {
        scale: animValue.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.2, 1],
        }),
      },
    ],
    opacity: animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.5, 1, 0.5],
    }),
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Logo or App Icon */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <View style={styles.logoInner}>
              <View style={styles.logoIcon} />
            </View>
          </View>
        </View>

        {/* Animated Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, getDotStyle(dot1)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, getDotStyle(dot2)]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, getDotStyle(dot3)]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 40,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
  },
});
