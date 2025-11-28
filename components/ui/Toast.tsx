import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '@/stores';

type ToastType = 'success' | 'error' | 'info';

interface ToastConfig {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
}

const toastConfig: Record<ToastType, ToastConfig> = {
  success: {
    icon: 'checkmark-circle',
    backgroundColor: '#10B981',
    iconColor: '#FFFFFF',
  },
  error: {
    icon: 'alert-circle',
    backgroundColor: '#EF4444',
    iconColor: '#FFFFFF',
  },
  info: {
    icon: 'information-circle',
    backgroundColor: '#3B82F6',
    iconColor: '#FFFFFF',
  },
};

/**
 * Global toast notification component
 * Reads from useUIStore and displays toast messages
 */
export function Toast() {
  const insets = useSafeAreaInsets();
  const { toastMessage, toastType, hideToast } = useUIStore();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toastMessage && toastType) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toastMessage, toastType, translateY, opacity]);

  if (!toastMessage || !toastType) return null;

  const config = toastConfig[toastType];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
        onPress={hideToast}
        activeOpacity={0.9}
        accessibilityLabel="Bildirimi kapat"
        accessibilityHint="Dokunarak bildirimi kapatabilirsiniz"
      >
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <Text style={styles.message}>{toastMessage}</Text>
        <TouchableOpacity
          onPress={hideToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Kapat"
        >
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Hook to show toast messages easily
 */
export function useToast() {
  const { showToast, hideToast } = useUIStore();

  return {
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    info: (message: string) => showToast(message, 'info'),
    hide: hideToast,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
