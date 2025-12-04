/**
 * Protected Screen Component
 * Wrapper component that prevents screen capture
 * 
 * SECURITY: Use this to wrap sensitive screens
 */

import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useScreenProtection, ScreenProtectionOptions } from '@/hooks/useScreenProtection';

interface ProtectedScreenProps extends ViewProps {
  children: React.ReactNode;
  enabled?: boolean;
  onScreenshotAttempt?: () => void;
}

export function ProtectedScreen({ 
  children, 
  enabled = true,
  onScreenshotAttempt,
  style,
  ...props 
}: ProtectedScreenProps) {
  useScreenProtection({ enabled, onScreenshotAttempt });
  
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ProtectedScreen;
