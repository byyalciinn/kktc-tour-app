import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
} from '@/lib/notificationService';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores/uiStore';

/**
 * Hook to manage push notification registration and handling
 */
export function usePushNotifications() {
  const { user } = useAuthStore();
  const { openNotificationSheet } = useUIStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (!user?.id) {
      setIsRegistered(false);
      return;
    }

    const register = async () => {
      const token = await registerForPushNotifications();
      
      if (token) {
        setExpoPushToken(token);
        
        // Save token to database
        const { success } = await savePushToken(user.id, token);
        setIsRegistered(success);
        
        if (success) {
          console.log('Push notification registered successfully');
        }
      }
    };

    register();
  }, [user?.id]);

  // Set up notification listeners
  useEffect(() => {
    try {
      // Listener for notifications received while app is foregrounded
      notificationListener.current = addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        // You can show an in-app toast or update badge here
      });

      // Listener for when user taps on a notification
      responseListener.current = addNotificationResponseListener((response) => {
        console.log('Notification response:', response);
        
        const data = response.notification.request.content.data;
        
        // Handle deep linking
        if (data?.deepLink) {
          router.push(data.deepLink as any);
        } else {
          // Default: open notification sheet
          openNotificationSheet();
        }
      });
    } catch (error) {
      console.warn('[usePushNotifications] Failed to set up listeners:', error);
    }

    return () => {
      try {
        if (notificationListener.current) {
          removeNotificationListener(notificationListener.current);
        }
        if (responseListener.current) {
          removeNotificationListener(responseListener.current);
        }
      } catch (error) {
        console.warn('[usePushNotifications] Failed to remove listeners:', error);
      }
    };
  }, [openNotificationSheet]);

  return {
    expoPushToken,
    isRegistered,
  };
}

export default usePushNotifications;
