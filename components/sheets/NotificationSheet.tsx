import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/Colors';
import { useAuthStore, useUIStore, useThemeStore } from '@/stores';
import {
  getUserNotifications,
  markNotificationAsRead,
  deleteUserNotification,
  NotificationData,
} from '@/lib/notificationService';

const { height, width } = Dimensions.get('window');

interface Notification {
  id: string;
  type: 'tour' | 'promo' | 'system' | 'reminder';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
}

interface NotificationSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Helper to format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dakika önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return date.toLocaleDateString('tr-TR');
};

// Convert NotificationData to local Notification format
const mapToLocalNotification = (data: NotificationData & { read?: boolean }): Notification => ({
  id: data.id,
  type: data.type as Notification['type'],
  title: data.title,
  message: data.message,
  time: formatRelativeTime(data.created_at),
  read: data.read || false,
  icon: data.icon,
});

// Swipeable notification item
function NotificationItem({
  notification,
  onDelete,
  onMarkRead,
  isDark,
  colors,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  onMarkRead: (id: string) => void;
  isDark: boolean;
  colors: typeof Colors.light;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const itemHeight = useRef(new Animated.Value(88)).current;
  const itemOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < 20;
    },
    onPanResponderGrant: () => {
      translateX.setOffset(0);
      translateX.setValue(0);
    },
    onPanResponderMove: Animated.event(
      [null, { dx: translateX }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gestureState) => {
      translateX.flattenOffset();
      const threshold = width * 0.2;

      if (gestureState.dx < -threshold || gestureState.vx < -0.5) {
        // Swipe left - Delete with haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.timing(translateX, {
          toValue: -width,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          Animated.parallel([
            Animated.timing(itemHeight, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
            Animated.timing(itemOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onDelete(notification.id);
          });
        });
      } else if (gestureState.dx > threshold || gestureState.vx > 0.5) {
        // Swipe right - Mark as read with haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: 80,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start(() => {
          onMarkRead(notification.id);
        });
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
          friction: 8,
        }).start();
      }
    },
  });

  return (
    <Animated.View
      style={[
        styles.notificationItemWrapper,
        {
          height: itemHeight,
          opacity: itemOpacity,
        },
      ]}
    >
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {/* Left action - Mark as read */}
        <View style={[styles.actionLeft, { backgroundColor: '#22C55E' }]}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.actionText}>Okundu</Text>
        </View>
        {/* Right action - Delete */}
        <View style={[styles.actionRight, { backgroundColor: '#EF4444' }]}>
          <Ionicons name="trash" size={24} color="#fff" />
          <Text style={styles.actionText}>Sil</Text>
        </View>
      </View>

      {/* Notification card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.notificationCard,
          {
            transform: [{ translateX }],
            backgroundColor: isDark ? '#2D2D2D' : '#fff',
          },
        ]}
      >
        <BlurView
          intensity={isDark ? 40 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.notificationBlur,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.7)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.5)',
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.notificationIcon,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
            ]}
          >
            <Ionicons
              name={notification.icon as any}
              size={22}
              color={isDark ? '#fff' : '#1F2937'}
            />
          </View>

          {/* Content */}
          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: colors.text,
                  fontWeight: notification.read ? '500' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text
              style={[
                styles.notificationMessage,
                {
                  color: colors.textSecondary,
                  opacity: notification.read ? 0.7 : 1,
                },
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {notification.time}
            </Text>
          </View>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

export default function NotificationSheet({ visible, onClose }: NotificationSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const { setUnreadNotificationCount } = useUIStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Update global unread count when notifications change
  useEffect(() => {
    setUnreadNotificationCount(unreadCount);
  }, [unreadCount, setUnreadNotificationCount]);

  // Load notifications from Supabase
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    const { data } = await getUserNotifications(user.id);
    setNotifications(data.map(mapToLocalNotification));
    setIsLoading(false);
  }, [user?.id]);

  // Load notifications when sheet opens
  useEffect(() => {
    if (visible && user?.id) {
      loadNotifications();
    }
  }, [visible, user?.id, loadNotifications]);

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [slideAnim, fadeAnim, onClose]);

  useEffect(() => {
    if (visible) {
      openSheet();
    }
  }, [visible, openSheet]);

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    
    // Persist to database
    await deleteUserNotification(user.id, id);
  };

  const handleMarkRead = async (id: string) => {
    if (!user?.id) return;
    
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    
    // Persist to database
    await markNotificationAsRead(user.id, id);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <TouchableWithoutFeedback onPress={closeSheet}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <BlurView
            intensity={isDark ? 30 : 20}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView
          intensity={isDark ? 60 : 90}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark
                ? 'rgba(30, 30, 30, 0.85)'
                : 'rgba(255, 255, 255, 0.95)',
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Bildirimler
            </Text>
          </View>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                ]}
              >
                <Ionicons name="notifications-off-outline" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Bildirim Yok
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                Yeni bildirimler burada görünecek
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={({ item }) => (
                <NotificationItem
                  notification={item}
                  onDelete={handleDelete}
                  onMarkRead={handleMarkRead}
                  isDark={isDark}
                  colors={colors}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.notificationsList}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              initialNumToRender={5}
              windowSize={7}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          )}
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.65,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
    textAlign: 'center',
  },
  notificationsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  notificationItemWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  actionsContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    gap: 8,
  },
  actionRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    color: '#fff',
  },
  notificationCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  notificationBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderRadius: 20,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
});
