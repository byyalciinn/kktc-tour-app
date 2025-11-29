import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// =============================================
// TYPES
// =============================================

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'tour' | 'promo' | 'system' | 'reminder';
  icon: string;
  target: 'all' | 'user' | 'segment';
  target_user_id?: string;
  deep_link?: string;
  data?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  notification_id: string;
  read_at?: string;
  deleted_at?: string;
  created_at: string;
  notification?: NotificationData;
}

export interface UserDevice {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: 'tour' | 'promo' | 'system' | 'reminder';
  icon?: string;
  target?: 'all' | 'user' | 'segment';
  target_user_id?: string;
  deep_link?: string;
  data?: Record<string, any>;
}

// =============================================
// NOTIFICATION CONFIGURATION
// =============================================

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// =============================================
// PUSH TOKEN MANAGEMENT
// =============================================

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check if physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    
    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to database
 */
export async function savePushToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';
    const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

    const { error } = await supabase
      .from('user_devices')
      .upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform,
          device_name: deviceName,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,expo_push_token',
        }
      );

    if (error) {
      console.error('Error saving push token:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving push token:', error);
    return { success: false, error: 'Failed to save push token' };
  }
}

/**
 * Remove push token from database (on logout)
 */
export async function removePushToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('expo_push_token', token);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to remove push token' };
  }
}

// =============================================
// NOTIFICATION CRUD OPERATIONS
// =============================================

/**
 * Get all notifications for admin
 */
export async function getAllNotifications(): Promise<{ data: NotificationData[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [] };
  } catch (error) {
    return { data: [], error: 'Failed to fetch notifications' };
  }
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(userId: string): Promise<{ data: NotificationData[]; error?: string }> {
  try {
    // Get notifications targeted to all users or this specific user
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .or(`target.eq.all,and(target.eq.user,target_user_id.eq.${userId})`)
      .eq('status', 'sent')
      .order('created_at', { ascending: false });

    if (notifError) {
      return { data: [], error: notifError.message };
    }

    // Get user's read/deleted status
    const { data: userNotifs } = await supabase
      .from('user_notifications')
      .select('notification_id, read_at, deleted_at')
      .eq('user_id', userId);

    const userNotifMap = new Map(
      (userNotifs || []).map(un => [un.notification_id, un])
    );

    // Filter out deleted and add read status
    const result = (notifications || [])
      .filter(n => {
        const userNotif = userNotifMap.get(n.id);
        return !userNotif?.deleted_at;
      })
      .map(n => {
        const userNotif = userNotifMap.get(n.id);
        return {
          ...n,
          read: !!userNotif?.read_at,
        };
      });

    return { data: result };
  } catch (error) {
    return { data: [], error: 'Failed to fetch user notifications' };
  }
}

/**
 * Create a new notification (admin only)
 */
export async function createNotification(
  input: CreateNotificationInput,
  createdBy: string
): Promise<{ data: NotificationData | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: input.title,
        message: input.message,
        type: input.type || 'system',
        icon: input.icon || 'notifications-outline',
        target: input.target || 'all',
        target_user_id: input.target_user_id,
        deep_link: input.deep_link,
        data: input.data,
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data };
  } catch (error) {
    return { data: null, error: 'Failed to create notification' };
  }
}

/**
 * Send notification (trigger push to devices)
 */
export async function sendNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the notification
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      return { success: false, error: 'Notification not found' };
    }

    // Get target devices
    let deviceQuery = supabase
      .from('user_devices')
      .select('expo_push_token')
      .eq('is_active', true);

    if (notification.target === 'user' && notification.target_user_id) {
      deviceQuery = deviceQuery.eq('user_id', notification.target_user_id);
    }

    const { data: devices, error: devicesError } = await deviceQuery;

    if (devicesError) {
      return { success: false, error: 'Failed to fetch devices' };
    }

    if (!devices || devices.length === 0) {
      // No devices to send to, mark as sent anyway
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      return { success: true };
    }

    // Prepare push messages
    const messages = devices
      .filter(d => d.expo_push_token)
      .map(device => ({
        to: device.expo_push_token,
        sound: 'default' as const,
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          deepLink: notification.deep_link,
          ...notification.data,
        },
      }));

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notificationId);
      
      return { success: false, error: 'Failed to send push notifications' };
    }

    // Update notification status
    await supabase
      .from('notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', notificationId);

    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Delete a notification (admin only)
 */
export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete notification' };
  }
}

// =============================================
// USER NOTIFICATION STATUS
// =============================================

/**
 * Mark notification as read for user
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .upsert(
        {
          user_id: userId,
          notification_id: notificationId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,notification_id',
        }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark notification as deleted for user (soft delete)
 */
export async function deleteUserNotification(
  userId: string,
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .upsert(
        {
          user_id: userId,
          notification_id: notificationId,
          deleted_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,notification_id',
        }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete notification' };
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all unread notifications for user
    const { data: notifications } = await getUserNotifications(userId);
    
    const unreadNotifications = notifications.filter(n => !(n as any).read);
    
    if (unreadNotifications.length === 0) {
      return { success: true };
    }

    // Upsert read status for all
    const upsertData = unreadNotifications.map(n => ({
      user_id: userId,
      notification_id: n.id,
      read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_notifications')
      .upsert(upsertData, { onConflict: 'user_id,notification_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark all as read' };
  }
}

/**
 * Get unread notification count for user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const { data } = await getUserNotifications(userId);
    return data.filter(n => !(n as any).read).length;
  } catch {
    return 0;
  }
}

// =============================================
// NOTIFICATION LISTENERS
// =============================================

/**
 * Add listener for received notifications (foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification responses (user tapped notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Remove notification listener
 * Note: In newer expo-notifications versions, subscriptions have a .remove() method
 */
export function removeNotificationListener(subscription: Notifications.Subscription): void {
  // Use the subscription's remove method (new API)
  if (subscription && typeof subscription.remove === 'function') {
    subscription.remove();
  }
}

// =============================================
// REALTIME SUBSCRIPTIONS
// =============================================

/**
 * Subscribe to realtime notification updates for a user
 * This listens for new notifications and updates
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: NotificationData) => void,
  onNotificationUpdate?: () => void
) {
  // Subscribe to user_notifications table for this user
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        // Fetch the full notification data
        const { data: notification } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', payload.new.notification_id)
          .single();
        
        if (notification) {
          onNewNotification(notification as NotificationData);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `target=eq.all`,
      },
      async (payload) => {
        if (payload.eventType === 'INSERT') {
          onNewNotification(payload.new as NotificationData);
        } else if (onNotificationUpdate) {
          onNotificationUpdate();
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
