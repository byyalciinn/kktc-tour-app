/**
 * Session Timeout Hook
 * Automatically logs out user after inactivity
 * 
 * SECURITY: Prevents unauthorized access to unattended devices
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore, useUIStore } from '@/stores';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

// Configuration
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in background
const LAST_ACTIVITY_KEY = '@session_last_activity';

export interface SessionTimeoutConfig {
  sessionTimeoutMs?: number;
  backgroundTimeoutMs?: number;
  enabled?: boolean;
}

export function useSessionTimeout(config?: SessionTimeoutConfig) {
  const {
    sessionTimeoutMs = SESSION_TIMEOUT_MS,
    backgroundTimeoutMs = BACKGROUND_TIMEOUT_MS,
    enabled = true,
  } = config || {};

  const { user, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Update last activity timestamp
  const updateActivity = useCallback(async () => {
    if (!enabled || !user) return;

    const now = Date.now().toString();
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now);
    
    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      handleSessionTimeout();
    }, sessionTimeoutMs);
  }, [user, enabled, sessionTimeoutMs]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async () => {
    logger.info('Session timeout - logging out user');
    showToast('Oturumunuz zaman aşımına uğradı', 'info');
    await signOut();
  }, [signOut, showToast]);

  // Check if session should expire on app focus
  const checkSessionValidity = useCallback(async () => {
    if (!enabled || !user) return;

    const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > sessionTimeoutMs) {
        logger.info('Session expired during inactivity');
        handleSessionTimeout();
      }
    }
  }, [user, enabled, sessionTimeoutMs, handleSessionTimeout]);

  // Handle app state changes
  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        const backgroundDuration = Date.now() - backgroundTimeRef.current;
        
        if (backgroundDuration > backgroundTimeoutMs) {
          // Been in background too long
          logger.info(`App was in background for ${Math.round(backgroundDuration / 1000)}s - session timeout`);
          handleSessionTimeout();
        } else {
          // Resume normal timeout
          checkSessionValidity();
          updateActivity();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        backgroundTimeRef.current = Date.now();
        
        // Clear foreground timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, backgroundTimeoutMs, checkSessionValidity, handleSessionTimeout, updateActivity]);

  // Initialize timeout on mount
  useEffect(() => {
    if (enabled && user) {
      updateActivity();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, enabled, updateActivity]);

  // Clear activity on sign out
  useEffect(() => {
    if (!user) {
      AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [user]);

  return { 
    updateActivity,
    resetTimeout: updateActivity,
  };
}
