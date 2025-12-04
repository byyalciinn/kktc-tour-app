/**
 * Activity Tracker Component
 * Wraps app content and tracks user interactions for session timeout
 * 
 * SECURITY: Enables automatic session timeout after inactivity
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSessionTimeout, SessionTimeoutConfig } from '@/hooks/useSessionTimeout';

interface ActivityTrackerProps extends ViewProps {
  children: React.ReactNode;
  config?: SessionTimeoutConfig;
}

export function ActivityTracker({ 
  children, 
  config,
  style,
  ...props 
}: ActivityTrackerProps) {
  const { updateActivity } = useSessionTimeout(config);

  const handleTouchStart = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  return (
    <View 
      style={[styles.container, style]} 
      onTouchStart={handleTouchStart}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ActivityTracker;
