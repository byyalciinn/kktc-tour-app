import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { 
  getTours, 
  deleteTour, 
  TourData,
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  Category 
} from '@/lib/tourService';
import { featuredTours } from '@/constants/Tours';
import { useAuthStore, useCommunityStore, useThemeStore } from '@/stores';
import {
  getAllNotifications,
  createNotification,
  deleteNotification,
  sendNotification,
  NotificationData,
  CreateNotificationInput,
} from '@/lib/notificationService';
import { CommunityPost } from '@/types';
import { getAvatarUrl } from '@/lib/avatarService';
import { UsersTab, PostsTab, RoutesTab, ReportsTab, TicketsTab, BlockReportsTab } from '@/components/admin';

type TabType = 'tours' | 'categories' | 'notifications' | 'routes' | 'posts' | 'users' | 'reports' | 'tickets' | 'blocks';

const AVAILABLE_ICONS = [
  'apps-outline',
  'location-outline',
  'business-outline',
  'bus-outline',
  'airplane-outline',
  'boat-outline',
  'car-outline',
  'bicycle-outline',
  'walk-outline',
  'restaurant-outline',
  'cafe-outline',
  'bed-outline',
  'camera-outline',
  'sunny-outline',
  'water-outline',
  'leaf-outline',
  'trail-sign-outline',
  'library-outline',
  'musical-notes-outline',
  'ticket-outline',
];

export default function AdminMenuScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('tours');

  // Tours state
  const [tours, setTours] = useState<TourData[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);
  const [refreshingTours, setRefreshingTours] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Category form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('location-outline');
  const [sortOrder, setSortOrder] = useState('0');

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);

  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'tour' | 'promo' | 'system' | 'reminder'>('system');
  const [notifIcon, setNotifIcon] = useState('notifications-outline');

  const { user } = useAuthStore();

  // Load tours
  const loadTours = async () => {
    const { data, error } = await getTours();
    if (error) {
      console.log('Error loading tours:', error);
      setTours(featuredTours.map(t => ({
        ...t,
        review_count: t.reviewCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as TourData[]);
    } else {
      setTours(data);
    }
  };

  // Load categories
  const loadCategories = async () => {
    const { data } = await getCategories();
    setCategories(data.filter(c => c.id !== 'all'));
  };

  // Load notifications
  const loadNotifications = async () => {
    const { data } = await getAllNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoadingTours(true);
      setIsLoadingCategories(true);
      setIsLoadingNotifications(true);
      await Promise.all([loadTours(), loadCategories(), loadNotifications()]);
      setIsLoadingTours(false);
      setIsLoadingCategories(false);
      setIsLoadingNotifications(false);
    };
    init();
  }, []);

  const onRefreshTours = useCallback(async () => {
    setRefreshingTours(true);
    await loadTours();
    setRefreshingTours(false);
  }, []);

  const onRefreshCategories = useCallback(async () => {
    setRefreshingCategories(true);
    await loadCategories();
    setRefreshingCategories(false);
  }, []);

  const onRefreshNotifications = useCallback(async () => {
    setRefreshingNotifications(true);
    await loadNotifications();
    setRefreshingNotifications(false);
  }, []);

  // Tour handlers
  const handleDeleteTour = (tour: TourData) => {
    Alert.alert(
      'Turu Sil',
      `"${tour.title}" turunu silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(tour.id);
            const { success, error } = await deleteTour(tour.id, tour.image);
            setDeletingId(null);
            
            if (success) {
              setTours(prev => prev.filter(t => t.id !== tour.id));
              Alert.alert('Başarılı', 'Tur silindi');
            } else {
              Alert.alert('Hata', error || 'Tur silinemedi');
            }
          },
        },
      ]
    );
  };

  const handleEditTour = (tour: TourData) => {
    router.push({
      pathname: '/admin/edit',
      params: { id: tour.id },
    });
  };

  const handleAddTour = () => {
    router.push('/admin/add');
  };

  // Category handlers
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setName('');
    setIcon('location-outline');
    setSortOrder(String(categories.length + 1));
    setIsModalVisible(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setSortOrder(String(category.sort_order));
    setIsModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Kategori adı gerekli');
      return;
    }

    setIsSaving(true);

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, {
        name: name.trim(),
        icon,
        sort_order: parseInt(sortOrder) || 0,
      });

      if (error) {
        Alert.alert('Hata', error);
      } else {
        await loadCategories();
        setIsModalVisible(false);
      }
    } else {
      const { error } = await createCategory({
        name: name.trim(),
        icon,
        sort_order: parseInt(sortOrder) || 0,
      });

      if (error) {
        Alert.alert('Hata', error);
      } else {
        await loadCategories();
        setIsModalVisible(false);
      }
    }

    setIsSaving(false);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Kategoriyi Sil',
      `"${category.name}" kategorisini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteCategory(category.id);
            if (success) {
              setCategories(prev => prev.filter(c => c.id !== category.id));
            } else {
              Alert.alert('Hata', error || 'Kategori silinemedi');
            }
          },
        },
      ]
    );
  };

  // Notification handlers
  const openAddNotificationModal = () => {
    setNotifTitle('');
    setNotifMessage('');
    setNotifType('system');
    setNotifIcon('notifications-outline');
    setIsNotificationModalVisible(true);
  };

  const handleSaveNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      Alert.alert('Hata', 'Başlık ve mesaj gerekli');
      return;
    }

    if (!user?.id) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setIsSendingNotification(true);

    const input: CreateNotificationInput = {
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: notifType,
      icon: notifIcon,
      target: 'all',
    };

    const { data, error } = await createNotification(input, user.id);

    if (error) {
      Alert.alert('Hata', error);
    } else {
      // Otomatik olarak gönder - realtime sync için gerekli
      if (data?.id) {
        const sendResult = await sendNotification(data.id);
        if (!sendResult.success) {
          console.warn('Bildirim gönderme hatası:', sendResult.error);
        }
      }
      await loadNotifications();
      setIsNotificationModalVisible(false);
      Alert.alert('Başarılı', 'Bildirim oluşturuldu ve gönderildi');
    }

    setIsSendingNotification(false);
  };

  const handleSendNotification = async (notification: NotificationData) => {
    Alert.alert(
      'Bildirimi Gönder',
      `"${notification.title}" bildirimini tüm kullanıcılara göndermek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setSendingNotificationId(notification.id);
            const { success, error } = await sendNotification(notification.id);
            setSendingNotificationId(null);

            if (success) {
              await loadNotifications();
              Alert.alert('Başarılı', 'Bildirim gönderildi');
            } else {
              Alert.alert('Hata', error || 'Bildirim gönderilemedi');
            }
          },
        },
      ]
    );
  };

  const handleDeleteNotification = (notification: NotificationData) => {
    Alert.alert(
      'Bildirimi Sil',
      `"${notification.title}" bildirimini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteNotification(notification.id);
            if (success) {
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            } else {
              Alert.alert('Hata', error || 'Bildirim silinemedi');
            }
          },
        },
      ]
    );
  };

  const getNotificationStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#22C55E';
      case 'failed': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getNotificationStatusText = (status: string) => {
    switch (status) {
      case 'sent': return 'Gönderildi';
      case 'failed': return 'Başarısız';
      default: return 'Bekliyor';
    }
  };

  const isLoading = activeTab === 'tours' 
    ? isLoadingTours 
    : activeTab === 'categories' 
      ? isLoadingCategories 
      : activeTab === 'notifications'
        ? isLoadingNotifications
        : false; // moderation has its own loading state

  const handleAddButton = () => {
    if (activeTab === 'tours') {
      handleAddTour();
    } else if (activeTab === 'categories') {
      openAddCategoryModal();
    } else if (activeTab === 'notifications') {
      openAddNotificationModal();
    }
    // moderation tab doesn't have an add button
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Yönetim Menüsü</Text>
        {(activeTab === 'tours' || activeTab === 'categories' || activeTab === 'notifications') ? (
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddButton}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Tab Switcher */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' }]}
        contentContainerStyle={styles.tabScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'tours' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('tours')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="map-outline" 
            size={18} 
            color={activeTab === 'tours' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'tours' ? colors.primary : colors.textSecondary },
              activeTab === 'tours' && styles.activeTabText,
            ]}
          >
            Turlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'categories' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('categories')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="grid-outline" 
            size={18} 
            color={activeTab === 'categories' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'categories' ? colors.primary : colors.textSecondary },
              activeTab === 'categories' && styles.activeTabText,
            ]}
          >
            Kategoriler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('notifications')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="notifications-outline" 
            size={18} 
            color={activeTab === 'notifications' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'notifications' ? colors.primary : colors.textSecondary },
              activeTab === 'notifications' && styles.activeTabText,
            ]}
          >
            Bildirimler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'routes' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('routes')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="navigate-outline" 
            size={18} 
            color={activeTab === 'routes' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'routes' ? colors.primary : colors.textSecondary },
              activeTab === 'routes' && styles.activeTabText,
            ]}
          >
            Rotalar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'posts' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('posts')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="chatbubbles-outline" 
            size={18} 
            color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'posts' ? colors.primary : colors.textSecondary },
              activeTab === 'posts' && styles.activeTabText,
            ]}
          >
            Paylaşımlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="people-outline" 
            size={18} 
            color={activeTab === 'users' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'users' ? colors.primary : colors.textSecondary },
              activeTab === 'users' && styles.activeTabText,
            ]}
          >
            Kullanıcılar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'reports' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('reports')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'reports' ? colors.primary : colors.textSecondary },
              activeTab === 'reports' && styles.activeTabText,
            ]}
          >
            Şikayetler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'tickets' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('tickets')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'tickets' ? colors.primary : colors.textSecondary },
              activeTab === 'tickets' && styles.activeTabText,
            ]}
          >
            Biletler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'blocks' && [styles.activeTab, { backgroundColor: colors.card }],
          ]}
          onPress={() => setActiveTab('blocks')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="ban-outline" 
            size={18} 
            color={activeTab === 'blocks' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'blocks' ? colors.primary : colors.textSecondary },
              activeTab === 'blocks' && styles.activeTabText,
            ]}
          >
            Engellemeler
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tours Tab Content */}
      {activeTab === 'tours' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingTours}
              onRefresh={onRefreshTours}
              tintColor={colors.primary}
            />
          }
        >
          {tours.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz tur yok</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Yeni tur eklemek için + butonuna tıklayın
              </Text>
            </View>
          ) : (
            tours.map((tour) => (
              <View
                key={tour.id}
                style={[
                  styles.tourCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Image source={{ uri: tour.image }} style={styles.tourImage} />
                
                <View style={styles.tourInfo}>
                  <Text style={[styles.tourTitle, { color: colors.text }]} numberOfLines={1}>
                    {tour.title}
                  </Text>
                  <Text style={[styles.tourLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                    {tour.location}
                  </Text>
                  <View style={styles.tourMeta}>
                    <Text style={[styles.tourDuration, { color: colors.textSecondary }]}>
                      {tour.duration}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}
                    onPress={() => handleEditTour(tour)}
                  >
                    <Ionicons name="pencil" size={18} color="#007AFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                    onPress={() => handleDeleteTour(tour)}
                    disabled={deletingId === tour.id}
                  >
                    {deletingId === tour.id ? (
                      <ActivityIndicator size="small" color="#FF3B30" />
                    ) : (
                      <Ionicons name="trash" size={18} color="#FF3B30" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingCategories}
              onRefresh={onRefreshCategories}
              tintColor={colors.primary}
            />
          }
        >
          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz kategori yok</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Yeni kategori eklemek için + butonuna tıklayın
              </Text>
            </View>
          ) : (
            categories.map((category) => (
              <View
                key={category.id}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={category.icon as any} size={24} color={colors.primary} />
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.name}
                  </Text>
                  <Text style={[styles.categorySortOrder, { color: colors.textSecondary }]}>
                    Sıra: {category.sort_order}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}
                    onPress={() => openEditCategoryModal(category)}
                  >
                    <Ionicons name="pencil" size={18} color="#007AFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                    onPress={() => handleDeleteCategory(category)}
                  >
                    <Ionicons name="trash" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Notifications Tab Content */}
      {activeTab === 'notifications' && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingNotifications}
              onRefresh={onRefreshNotifications}
              tintColor={colors.primary}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz bildirim yok</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Yeni bildirim oluşturmak için + butonuna tıklayın
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <View style={[styles.notificationIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={notification.icon as any} size={24} color={colors.primary} />
                </View>
                
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <View style={styles.notificationMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: getNotificationStatusColor(notification.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getNotificationStatusColor(notification.status) }]}>
                        {getNotificationStatusText(notification.status)}
                      </Text>
                    </View>
                    <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
                      {new Date(notification.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {notification.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}
                      onPress={() => handleSendNotification(notification)}
                      disabled={sendingNotificationId === notification.id}
                    >
                      {sendingNotificationId === notification.id ? (
                        <ActivityIndicator size="small" color="#22C55E" />
                      ) : (
                        <Ionicons name="send" size={18} color="#22C55E" />
                      )}
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}
                    onPress={() => handleDeleteNotification(notification)}
                  >
                    <Ionicons name="trash" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Routes Tab Content */}
      {activeTab === 'routes' && (
        <RoutesTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Posts Tab Content */}
      {activeTab === 'posts' && (
        <PostsTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <UsersTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <ReportsTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Tickets Tab Content */}
      {activeTab === 'tickets' && (
        <TicketsTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Block Reports Tab Content */}
      {activeTab === 'blocks' && (
        <BlockReportsTab colors={colors} isDark={isDark} insets={insets} />
      )}

      {/* Category Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
            </Text>
            <TouchableOpacity onPress={handleSaveCategory} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.primary }]}>Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Kategori Adı</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Kategori adı"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Sıra Numarası</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>İkon Seç</Text>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: icon === iconName 
                          ? colors.primary 
                          : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      },
                    ]}
                    onPress={() => setIcon(iconName)}
                  >
                    <Ionicons 
                      name={iconName as any} 
                      size={24} 
                      color={icon === iconName ? '#fff' : colors.text} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Notification Add Modal */}
      <Modal
        visible={isNotificationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsNotificationModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsNotificationModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Yeni Bildirim
            </Text>
            <TouchableOpacity onPress={handleSaveNotification} disabled={isSendingNotification}>
              {isSendingNotification ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.primary }]}>Oluştur</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Başlık</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Bildirim başlığı"
                placeholderTextColor={colors.textSecondary}
                value={notifTitle}
                onChangeText={setNotifTitle}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Mesaj</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                    color: colors.text,
                  },
                ]}
                placeholder="Bildirim mesajı"
                placeholderTextColor={colors.textSecondary}
                value={notifMessage}
                onChangeText={setNotifMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>Bildirim Türü</Text>
              <View style={styles.typeGrid}>
                {(['system', 'promo', 'tour', 'reminder'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      {
                        backgroundColor: notifType === type 
                          ? colors.primary 
                          : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      },
                    ]}
                    onPress={() => setNotifType(type)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: notifType === type ? '#fff' : colors.text },
                      ]}
                    >
                      {type === 'system' ? 'Sistem' : type === 'promo' ? 'Promosyon' : type === 'tour' ? 'Tur' : 'Hatırlatma'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.label, { color: colors.text }]}>İkon Seç</Text>
              <View style={styles.iconGrid}>
                {['notifications-outline', 'gift-outline', 'calendar-outline', 'megaphone-outline', 'heart-outline', 'star-outline', 'flash-outline', 'information-circle-outline'].map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: notifIcon === iconName 
                          ? colors.primary 
                          : isDark ? 'rgba(255,255,255,0.08)' : '#F5F5F5',
                      },
                    ]}
                    onPress={() => setNotifIcon(iconName)}
                  >
                    <Ionicons 
                      name={iconName as any} 
                      size={24} 
                      color={notifIcon === iconName ? '#fff' : colors.text} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    maxHeight: 50,
  },
  tabScrollContent: {
    padding: 4,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 8,
    textAlign: 'center',
  },
  // Tour card styles
  tourCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  tourImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  tourInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tourTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  tourLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 6,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tourDuration: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  // Category card styles
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 2,
  },
  categorySortOrder: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  // Shared action styles
  cardActions: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Notification card styles
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  notificationDate: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  // Text area style
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  // Type selector styles
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  });
