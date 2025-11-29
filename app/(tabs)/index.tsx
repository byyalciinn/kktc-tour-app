import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DestinationSearch, ProfileSheet, TourDetailSheet, NotificationSheet } from '@/components/sheets';
import { useTranslation } from 'react-i18next';
import { HomeScreenSkeleton, NoToursEmptyState, TourCardSkeleton } from '@/components/ui';
import { Colors } from '@/constants/Colors';
import { Tour } from '@/types';
import { useTourStore, useUIStore, useAuthStore, useThemeStore } from '@/stores';
import { getAvatarUrl } from '@/lib/avatarService';
import { getUnreadCount, subscribeToNotifications } from '@/lib/notificationService';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pullAnim = useRef(new Animated.Value(0)).current;
  const [pullDistance, setPullDistance] = useState(0);
  const { t } = useTranslation();

  // Zustand stores
  const { 
    tours, 
    categories, 
    selectedCategoryId, 
    isLoading, 
    isRefreshing,
    fetchTours, 
    fetchCategories, 
    setSelectedCategory,
  } = useTourStore();

  const {
    isSearchVisible,
    isProfileSheetVisible,
    isTourDetailVisible,
    isNotificationSheetVisible,
    selectedTour,
    unreadNotificationCount,
    setUnreadNotificationCount,
    incrementUnreadNotificationCount,
    openSearch,
    closeSearch,
    openProfileSheet,
    closeProfileSheet,
    openTourDetail,
    closeTourDetail,
    openNotificationSheet,
    closeNotificationSheet,
  } = useUIStore();

  const { profile, user } = useAuthStore();

  // Spin animation for refresh icon
  useEffect(() => {
    if (isRefreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRefreshing]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Initial load with cleanup guard
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // Only update state if component is still mounted
      if (isMounted) {
        await fetchCategories();
        await fetchTours();
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Load notification count on mount and subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    // Initial load
    const loadNotificationCount = async () => {
      const count = await getUnreadCount(user.id);
      setUnreadNotificationCount(count);
    };
    
    loadNotificationCount();

    // Subscribe to realtime notification updates
    const unsubscribe = subscribeToNotifications(
      user.id,
      // On new notification - increment count
      () => {
        incrementUnreadNotificationCount();
      },
      // On notification update - reload count
      async () => {
        const count = await getUnreadCount(user.id);
        setUnreadNotificationCount(count);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [user?.id, setUnreadNotificationCount, incrementUnreadNotificationCount]);

  // Handle category change
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Get active category index
  const activeCategoryIndex = categories.findIndex(c => c.id === selectedCategoryId);

  // Get category name by id
  const getCategoryName = (categoryId: string): string => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const onRefresh = useCallback(async () => {
    const { refreshTours } = useTourStore.getState();
    await refreshTours();
  }, []);

  const handleTourPress = (tour: Tour) => {
    openTourDetail(tour);
  };

  const handleCloseSheet = () => {
    closeTourDetail();
  };

  // Tours are already filtered by store based on selected category
  const filteredTours = tours;

  // Render tour card item for FlatList
  const renderTourCard = useCallback(({ item: tour }: { item: Tour }) => (
    <TouchableOpacity
      style={styles.tripCard}
      activeOpacity={0.95}
      onPress={() => handleTourPress(tour)}
    >
      <Image
        source={{ uri: tour.image }}
        style={styles.tripCardImage}
      />
      {/* Overlay gradient */}
      <View style={styles.tripCardGradient} />
      
      {/* Duration Tag */}
      <View style={styles.tripDurationTag}>
        <Text style={styles.tripDurationText}>{tour.duration}</Text>
      </View>
      
      {/* Arrow Button */}
      <TouchableOpacity style={styles.tripArrowButton}>
        <Ionicons name="arrow-forward" size={20} color={colors.text} />
      </TouchableOpacity>
      
      {/* Bottom Content */}
      <View style={styles.tripCardContent}>
        <View style={styles.tripCardLeft}>
          <Text style={styles.tripCardTitle}>{tour.title}</Text>
          <Text style={styles.tripCardSubtitle}>
            {tour.location} • {getCategoryName(tour.category)}
          </Text>
        </View>
        <View style={styles.tripCardRight}>
          <Text style={styles.tripCardPrice}>
            {tour.currency}{tour.price}
          </Text>
          <Text style={styles.tripCardPriceLabel}>{t('home.perPerson')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [colors.text, getCategoryName, handleTourPress, t]);

  // Header component for FlatList
  const ListHeader = useCallback(() => (
    <View style={styles.heroSection}>
      {/* Custom Refresh Indicator - Above Location */}
      {isRefreshing && (
        <View style={styles.refreshContainer}>
          <Animated.View style={[styles.refreshIconWrapper, { transform: [{ rotate: spin }] }]}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.refreshText, { color: colors.textSecondary }]}>
            {t('home.refreshing')}
          </Text>
        </View>
      )}

      {/* Header Row: Avatar - Location - Notification */}
      <View style={styles.header}>
        {/* Profile Avatar */}
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={openProfileSheet}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getAvatarUrl(profile?.avatar_url, user?.id) }}
            style={styles.avatar}
          />
        </TouchableOpacity>
        
        {/* Location Center */}
        <View style={styles.locationCenter}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>
            {t('home.locationLabel')}
          </Text>
          <TouchableOpacity style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.text }]}>
              {t('home.defaultLocation')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* Notification Button */}
        <TouchableOpacity 
          style={[styles.notificationButton, { backgroundColor: colors.card }]}
          onPress={openNotificationSheet}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {/* Notification badge - only show if there are unread notifications */}
          {unreadNotificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <TouchableOpacity 
          style={[styles.searchBar, { backgroundColor: colors.card }]}
          onPress={openSearch}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
          <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
            {t('home.searchPlaceholder')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Category Icons Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryIconsContainer}
      >
        {categories.map((category, index) => {
          const isActive = activeCategoryIndex === index;
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryIconItem}
              activeOpacity={0.7}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={[
                styles.categoryIconCircle,
                {
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                }
              ]}>
                <Ionicons 
                  name={category.icon as any} 
                  size={24} 
                  color={isActive ? '#fff' : colors.text} 
                />
              </View>
              <Text style={[
                styles.categoryIconLabel,
                { 
                  color: isActive ? colors.primary : colors.text,
                  fontWeight: isActive ? '600' : '400',
                }
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Show skeleton or empty state before tour list */}
      {isLoading && tours.length === 0 && (
        <View style={styles.tripCardsContainer}>
          <TourCardSkeleton />
          <TourCardSkeleton />
        </View>
      )}
      {!isLoading && filteredTours.length === 0 && <NoToursEmptyState />}
    </View>
  ), [
    isRefreshing,
    spin,
    colors,
    profile,
    user,
    openProfileSheet,
    openNotificationSheet,
    openSearch,
    categories,
    activeCategoryIndex,
    handleCategoryPress,
    isLoading,
    tours.length,
    filteredTours.length,
    unreadNotificationCount,
    t,
  ]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Tour) => item.id, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <FlatList
        data={filteredTours}
        renderItem={renderTourCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            style={{ backgroundColor: 'transparent' }}
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={3}
        getItemLayout={(_, index) => ({
          length: 300, // tripCard height (280) + gap (20)
          offset: 300 * index,
          index,
        })}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
      />

      {/* Tour Detail Sheet */}
      <TourDetailSheet
        tour={selectedTour}
        visible={isTourDetailVisible}
        onClose={handleCloseSheet}
      />

      {/* Destination Search Modal */}
      {isSearchVisible && (
        <DestinationSearch
          autoOpen={true}
          onSelectTour={(tour) => {
            closeSearch();
            handleTourPress(tour);
          }}
          onSelectDestination={(dest) => {
            console.log('Selected destination:', dest);
          }}
          onClose={closeSearch}
        />
      )}

      {/* Profile Sheet */}
      <ProfileSheet
        visible={isProfileSheetVisible}
        onClose={closeProfileSheet}
      />

      {/* Notification Sheet */}
      <NotificationSheet
        visible={isNotificationSheetVisible}
        onClose={closeNotificationSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  // Custom Refresh Indicator - Positioned above location
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  refreshIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  heroSection: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  locationCenter: {
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F03A52',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchWrapper: {
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
  },
  // Category Icons
  categoryIconsContainer: {
    gap: 24,
    paddingVertical: 8,
  },
  categoryIconItem: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryIconLabel: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  
  // Trip Cards
  tripCardsContainer: {
    gap: 20,
    paddingBottom: 20,
  },
  tripCard: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  tripCardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tripCardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  tripDurationTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  tripDurationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#212529',
  },
  tripArrowButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  tripCardLeft: {
    flex: 1,
  },
  tripCardTitle: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tripCardSubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
  tripCardRight: {
    alignItems: 'flex-end',
  },
  tripCardPrice: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tripCardPriceLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
});
