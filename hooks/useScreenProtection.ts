/**
 * Screen Protection Hook
 * Prevents screen capture on sensitive screens
 * 
 * SECURITY: Protects sensitive information from being captured
 */

import { useEffect, useCallback, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

export interface ScreenProtectionOptions {
  enabled?: boolean;
  onScreenshotAttempt?: () => void;
}

/**
 * Hook to prevent screen capture
 * Use on sensitive screens (payment, personal info, etc.)
 */
export function useScreenProtection(options?: ScreenProtectionOptions) {
  const { 
    enabled = true, 
    onScreenshotAttempt 
  } = options || {};
  
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsProtected(false);
      return;
    }

    // Prevent screen capture
    ScreenCapture.preventScreenCaptureAsync()
      .then(() => {
        setIsProtected(true);
        logger.info('Screen capture protection enabled');
      })
      .catch((error) => {
        logger.error('Failed to enable screen capture protection:', error);
      });

    return () => {
      // Re-enable screen capture when leaving protected screen
      ScreenCapture.allowScreenCaptureAsync()
        .then(() => {
          setIsProtected(false);
          logger.info('Screen capture protection disabled');
        })
        .catch((error) => {
          logger.error('Failed to disable screen capture protection:', error);
        });
    };
  }, [enabled]);

  // Listen for screenshot attempts (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !enabled) return;

    const subscription = ScreenCapture.addScreenshotListener(() => {
      logger.warn('Screenshot attempt detected');
      onScreenshotAttempt?.();
    });

    return () => subscription.remove();
  }, [enabled, onScreenshotAttempt]);

  const enableProtection = useCallback(async () => {
    try {
      await ScreenCapture.preventScreenCaptureAsync();
      setIsProtected(true);
      logger.info('Screen capture protection manually enabled');
    } catch (error) {
      logger.error('Failed to enable screen capture protection:', error);
    }
  }, []);

  const disableProtection = useCallback(async () => {
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      setIsProtected(false);
      logger.info('Screen capture protection manually disabled');
    } catch (error) {
      logger.error('Failed to disable screen capture protection:', error);
    }
  }, []);

  return {
    isProtected,
    enableProtection,
    disableProtection,
  };
}

export default useScreenProtection;
