import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useTourStore, useUIStore, useThemeStore, useRouteStore, selectTours, selectCategories, selectHighlightedRoutes, selectRoutes } from '@/stores';
import { Tour, Category, ThematicRoute } from '@/types';
import { TourDetailSheet, RouteDetailSheet } from '@/components/sheets';
import { RouteCard } from '@/components/cards';
import { MapMarkers } from '@/components/map';
import { useLocation } from '@/hooks';
import { LocationPermissionModal } from '@/components/ui';
import CachedImage, { prefetchImages } from '@/components/ui/CachedImage';

// View All Modal Types
type ViewAllType = 'routes' | 'tours' | null;

// Memoized Tour Card Component for better performance
interface TourListItemProps {
  tour: Tour;
  onPress: (tour: Tour) => void;
  isDark: boolean;
  colors: typeof Colors.light | typeof Colors.dark;
}

const TourListItem = memo(function TourListItem({ 
  tour, 
  onPress, 
  isDark, 
  colors 
}: TourListItemProps) {
  return (
    <TouchableOpacity
      style={[
        styles.tourCard,
        {
          backgroundColor: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.85)',
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
        },
      ]}
      activeOpacity={0.9}
      onPress={() => onPress(tour)}
    >
      <CachedImage 
        uri={tour.image} 
        style={styles.tourImage} 
        fallbackIcon="map-outline" 
        priority="normal"
        skeletonColor={isDark ? '#374151' : '#E5E7EB'}
      />
      <View style={styles.tourContent}>
        <Text
          style={[styles.tourName, { color: colors.text }]}
          numberOfLines={1}
        >
          {tour.title}
        </Text>
        <View style={styles.tourInfo}>
          <Ionicons name="location" size={14} color={isDark ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tourLocation, { color: isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
            {tour.location}
          </Text>
        </View>
        <View style={styles.tourPriceRow}>
          <Text style={[styles.tourPrice, { color: colors.primary }]}>
            {tour.currency}{tour.price}
          </Text>
        </View>
      </View>
      <View style={[styles.tourArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}>
        <Ionicons name="chevron-forward" size={18} color={isDark ? '#FFF' : colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
});

const { width, height } = Dimensions.get('window');

// Bottom sheet snap points
const SHEET_MIN_HEIGHT = 320;
const SHEET_MAX_HEIGHT = height * 0.85;
const SHEET_MID_HEIGHT = height * 0.5;

// Default region (Girne, KKTC)
const DEFAULT_REGION = {
  latitude: 35.3387,
  longitude: 33.3183,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function ExploreScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  // Zustand stores with optimized selectors
  const tours = useTourStore(selectTours);
  const categories = useTourStore(selectCategories);
  const fetchTours = useTourStore((state) => state.fetchTours);
  const fetchCategories = useTourStore((state) => state.fetchCategories);
  
  const selectedTour = useUIStore((state) => state.selectedTour);
  const isTourDetailVisible = useUIStore((state) => state.isTourDetailVisible);
  const openTourDetail = useUIStore((state) => state.openTourDetail);
  const closeTourDetail = useUIStore((state) => state.closeTourDetail);

  // Route store for thematic routes
  const highlightedRoutes = useRouteStore(selectHighlightedRoutes);
  const allRoutes = useRouteStore(selectRoutes);
  const fetchHighlightedRoutes = useRouteStore((state) => state.fetchHighlightedRoutes);
  const fetchAllRoutes = useRouteStore((state) => state.fetchRoutes);
  const isLoadingRoutes = useRouteStore((state) => state.isLoadingHighlighted);

  // Route detail sheet state
  const [selectedRoute, setSelectedRoute] = useState<ThematicRoute | null>(null);
  const [isRouteDetailVisible, setIsRouteDetailVisible] = useState(false);

  // View All modal state
  const [viewAllType, setViewAllType] = useState<ViewAllType>(null);

  // Use the location hook for centralized location management
  const {
    location,
    address,
    isLoading: locationLoading,
    isPermissionDenied,
    requestLocation,
    openLocationSettings,
  } = useLocation({
    autoRequest: true,
    enableGeocoding: true,
    translations: {
      defaultLocation: t('home.defaultLocation'),
      fetchingAddress: t('explore.addressFetching'),
      currentLocation: t('explore.currentLocation'),
    },
  });

  const [activeCategory, setActiveCategory] = useState('all');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Bottom sheet animation - improved gesture handling
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const currentHeight = useRef(SHEET_MIN_HEIGHT);
  const isDragging = useRef(false);
  
  // Track if data is ready to prevent UI blocking
  const [isDataReady, setIsDataReady] = useState(false);

  // Snap to a specific height with animation
  const snapToHeight = useCallback((targetHeight: number) => {
    currentHeight.current = targetHeight;
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      damping: 25,
      stiffness: 250,
      mass: 0.8,
    }).start();
  }, [sheetHeight]);

  // Track if sheet is at max height to allow ScrollView to scroll
  const isSheetExpanded = useRef(false);

  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        sheetHeight.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        const clampedHeight = Math.max(SHEET_MIN_HEIGHT, Math.min(SHEET_MAX_HEIGHT, newHeight));
        sheetHeight.setValue(clampedHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false;
        const newHeight = currentHeight.current - gestureState.dy;
        let snapPoint = SHEET_MIN_HEIGHT;

        if (gestureState.vy < -0.5) {
          snapPoint = SHEET_MAX_HEIGHT;
        } else if (gestureState.vy > 0.5) {
          snapPoint = SHEET_MIN_HEIGHT;
        } else {
          const distances = [
            { point: SHEET_MIN_HEIGHT, distance: Math.abs(newHeight - SHEET_MIN_HEIGHT) },
            { point: SHEET_MID_HEIGHT, distance: Math.abs(newHeight - SHEET_MID_HEIGHT) },
            { point: SHEET_MAX_HEIGHT, distance: Math.abs(newHeight - SHEET_MAX_HEIGHT) },
          ];
          distances.sort((a, b) => a.distance - b.distance);
          snapPoint = distances[0].point;
        }

        isSheetExpanded.current = snapPoint === SHEET_MAX_HEIGHT;
        snapToHeight(snapPoint);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        snapToHeight(currentHeight.current);
      },
    })
  , [sheetHeight, snapToHeight]);

  // Filter tours by category - only show tours with coordinates (memoized)
  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const hasCoordinates = tour.latitude && tour.longitude;
      if (!hasCoordinates) return false;
      if (activeCategory === 'all') return true;
      return tour.category === activeCategory;
    });
  }, [tours, activeCategory]);

  // All categories with "Tümü" option - filter out any existing 'all' category to avoid duplicates (memoized)
  const allCategories = useMemo<Category[]>(() => [
    { id: 'all', name: t('home.allCategories'), icon: 'apps-outline', sort_order: 0 },
    ...categories.filter((c: Category) => c.id !== 'all'),
  ], [categories, t]);

  // Category icon map for fast lookup (memoized)
  const categoryIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c: Category) => {
      map[c.id] = c.icon;
    });
    return map;
  }, [categories]);

  // Load data on mount with delayed rendering
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCategories(),
        fetchTours(),
        fetchHighlightedRoutes(),
        fetchAllRoutes(),
      ]);
      // Small delay to let UI settle
      setTimeout(() => setIsDataReady(true), 100);
    };
    loadData();
  }, [fetchCategories, fetchTours, fetchHighlightedRoutes, fetchAllRoutes]);

  // Prefetch tour images for faster loading
  useEffect(() => {
    if (tours.length > 0) {
      // Prefetch first 10 tour images
      const imageUrls = tours.slice(0, 10).map(tour => tour.image).filter(Boolean);
      prefetchImages(imageUrls);
    }
  }, [tours]);

  // Prefetch route images
  useEffect(() => {
    if (highlightedRoutes.length > 0) {
      const imageUrls = highlightedRoutes.map(route => route.coverImage).filter(Boolean);
      prefetchImages(imageUrls);
    }
  }, [highlightedRoutes]);

  // Update region when location changes
  useEffect(() => {
    if (location) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);
    }
  }, [location]);

  // Show location modal when permission is denied and user tries to use location features
  const handleLocationPermissionRequest = useCallback(() => {
    if (isPermissionDenied) {
      setShowLocationModal(true);
    } else {
      requestLocation();
    }
  }, [isPermissionDenied, requestLocation]);

  const handleBackPress = () => {
    // Navigate back or handle back action
  };

  const handleMyLocation = useCallback(() => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [location]);

  const getCategoryTitle = useCallback(() => {
    if (activeCategory === 'all') return t('explore.nearbyTitleDefault');
    const category = categories.find((c: Category) => c.id === activeCategory);
    return category
      ? t('explore.categoryTitle', { category: category.name })
      : t('explore.nearbyTitleDefault');
  }, [activeCategory, categories, t]);

  // Handle tour marker press (memoized to prevent re-renders)
  const handleTourPress = useCallback((tour: Tour) => {
    setSelectedMapTour(tour);
    openTourDetail(tour);
  }, [openTourDetail]);

  // Handle route card press (memoized)
  const handleRoutePress = useCallback((route: ThematicRoute) => {
    setSelectedRoute(route);
    setIsRouteDetailVisible(true);
  }, []);

  // Close route detail sheet (memoized)
  const closeRouteDetail = useCallback(() => {
    setIsRouteDetailVisible(false);
    setSelectedRoute(null);
  }, []);

  // Toggle location tracking (memoized)
  const toggleLocationTracking = useCallback(() => {
    if (!location && !isLocationEnabled) {
      handleLocationPermissionRequest();
      return;
    }
    setIsLocationEnabled(prev => !prev);
  }, [location, isLocationEnabled, handleLocationPermissionRequest]);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const revalidateRoutes = useRouteStore((state) => state.revalidate);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchTours(),
        revalidateRoutes(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchCategories, fetchTours, revalidateRoutes]);

  // Memoized MapMarkers to prevent unnecessary re-renders
  const memoizedMapMarkers = useMemo(() => (
    <MapMarkers
      tours={filteredTours}
      categoryIconMap={categoryIconMap}
      primaryColor={colors.primary}
      onMarkerPress={handleTourPress}
    />
  ), [filteredTours, categoryIconMap, colors.primary, handleTourPress]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          showsUserLocation={isLocationEnabled}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Tour Markers - using memoized MapMarkers component */}
          {memoizedMapMarkers}
        </MapView>

        {/* Refresh Button - Left Side */}
        <View style={[styles.refreshButtonContainer, { top: insets.top + 10 }]}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={styles.liquidGlassBlur}
            />
          ) : (
            <View 
              style={[
                styles.liquidGlassBlur, 
                { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }
              ]} 
            />
          )}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            activeOpacity={0.8}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Liquid Glass Location Toggle Button */}
        <View style={[styles.locationToggleContainer, { top: insets.top + 10 }]}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={styles.liquidGlassBlur}
            />
          ) : (
            <View 
              style={[
                styles.liquidGlassBlur, 
                { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }
              ]} 
            />
          )}
          <TouchableOpacity
            style={styles.locationToggleButton}
            onPress={toggleLocationTracking}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isLocationEnabled ? "location" : "location-outline"} 
              size={22} 
              color={isLocationEnabled ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* My Location Button */}
        <View style={[styles.myLocationContainer, { bottom: SHEET_MIN_HEIGHT + 20 }]}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={styles.liquidGlassBlur}
            />
          ) : (
            <View 
              style={[
                styles.liquidGlassBlur, 
                { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }
              ]} 
            />
          )}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={handleMyLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { 
            height: sheetHeight,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Blur Background - increased opacity for better readability */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 70 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: isDark ? 'rgba(20,20,20,0.96)' : 'rgba(255,255,255,0.92)' }
            ]} 
          />
        )}
        
        {/* Drag Handle - captures pan gestures */}
        <View 
          style={styles.handleContainer}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)' },
            ]}
          />
        </View>

        {/* Sheet Content - Scrollable */}
        <ScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Location Permission Banner */}
          {isPermissionDenied && (
            <TouchableOpacity
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: isDark ? 'rgba(240,58,82,0.15)' : 'rgba(240,58,82,0.1)',
                  borderColor: isDark ? 'rgba(240,58,82,0.3)' : 'rgba(240,58,82,0.2)',
                },
              ]}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.8}
            >
              <View style={styles.permissionBannerContent}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={styles.permissionBannerText}>
                  <Text style={[styles.permissionTitle, { color: colors.text }]}>
                    {t('explore.locationPermissionTitle')}
                  </Text>
                  <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
                    {t('explore.locationPermissionSubtitle')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Search Bar */}
          <TouchableOpacity
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <Text
              style={[styles.searchText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {t('explore.searchPlaceholder')}
            </Text>
          </TouchableOpacity>

          {/* Suggested Routes Section */}
          {highlightedRoutes.length > 0 && (
            <View style={styles.routesSection}>
              <View style={styles.routesHeader}>
                <Text style={[styles.routesTitle, { color: colors.text }]}>
                  {t('explore.suggestedRoutes')}
                </Text>
                <TouchableOpacity onPress={() => setViewAllType('routes')}>
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>
                    {t('explore.seeAll')}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.routesScrollContent}
              >
                {highlightedRoutes.map((route: ThematicRoute) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    onPress={handleRoutePress}
                    variant="compact"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {allCategories.map((category: Category) => {
              const isActive = activeCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : isDark
                        ? 'rgba(40,40,40,0.9)'
                        : 'rgba(255,255,255,0.7)',
                      borderColor: isActive
                        ? colors.primary
                        : isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() => setActiveCategory(category.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={isActive ? '#FFF' : (isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary)}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: isActive ? '#FFF' : colors.text },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Nearby Places Section */}
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeader}>
              <Text style={[styles.nearbyTitle, { color: colors.text }]}>
                {getCategoryTitle()}
              </Text>
              <TouchableOpacity onPress={() => setViewAllType('tours')}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t('home.seeAll')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tours - Vertical List */}
            {locationLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : filteredTours.length > 0 ? (
              filteredTours.slice(0, 10).map((tour: Tour) => (
                <TourListItem
                  key={tour.id}
                  tour={tour}
                  onPress={handleTourPress}
                  isDark={isDark}
                  colors={colors}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {t('tours.noTours')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Tour Detail Sheet */}
      <TourDetailSheet
        tour={selectedTour}
        visible={isTourDetailVisible}
        onClose={closeTourDetail}
      />

      {/* Route Detail Sheet */}
      <RouteDetailSheet
        route={selectedRoute}
        visible={isRouteDetailVisible}
        onClose={closeRouteDetail}
      />

      {/* View All Modal */}
      <Modal
        visible={viewAllType !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewAllType(null)}
      >
        <View style={[styles.viewAllModal, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.viewAllHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Text style={[styles.viewAllTitle, { color: colors.text }]}>
              {viewAllType === 'routes' ? t('explore.allRoutes') : t('explore.nearbyTitleDefault')}
            </Text>
            <TouchableOpacity
              style={[styles.viewAllCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={() => setViewAllType(null)}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView
            style={styles.viewAllContent}
            contentContainerStyle={[styles.viewAllScrollContent, { paddingBottom: insets.bottom + 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {viewAllType === 'routes' ? (
              // All Routes - show all routes from Supabase
              allRoutes.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="compass-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {t('explore.noRoutes')}
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                    {t('explore.noRoutesSubtitle')}
                  </Text>
                </View>
              ) : allRoutes.map((route: ThematicRoute) => (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.viewAllRouteCard, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    setViewAllType(null);
                    setTimeout(() => handleRoutePress(route), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <CachedImage 
                    uri={route.coverImage} 
                    style={styles.viewAllRouteImage} 
                    fallbackIcon="compass-outline"
                    skeletonColor={isDark ? '#374151' : '#E5E7EB'}
                  />
                  <View style={styles.viewAllRouteContent}>
                    <Text style={[styles.viewAllRouteTitle, { color: colors.text }]} numberOfLines={2}>
                      {route.title}
                    </Text>
                    <View style={styles.viewAllRouteMeta}>
                      <Ionicons name="location" size={14} color={isDark ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.viewAllRouteLocation, { color: isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                        {route.baseLocation}
                      </Text>
                    </View>
                    <View style={styles.viewAllRouteBadges}>
                      <View style={[styles.viewAllRouteBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.viewAllRouteBadgeText, { color: colors.primary }]}>
                          {route.durationLabel || `${route.durationDays} ${t('explore.day')}`}
                        </Text>
                      </View>
                      <View style={[styles.viewAllRouteBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.viewAllRouteBadgeText, { color: isDark ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                          {route.totalStops || route.itinerary.reduce((acc, day) => acc + day.stops.length, 0)} {t('explore.stops')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFF' : colors.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              // All Tours
              filteredTours.map((tour: Tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={[styles.viewAllTourCard, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    setViewAllType(null);
                    setTimeout(() => handleTourPress(tour), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <CachedImage 
                    uri={tour.image} 
                    style={styles.viewAllTourImage} 
                    fallbackIcon="map-outline"
                    skeletonColor={isDark ? '#374151' : '#E5E7EB'}
                  />
                  <View style={styles.viewAllTourContent}>
                    <Text style={[styles.viewAllTourTitle, { color: colors.text }]} numberOfLines={2}>
                      {tour.title}
                    </Text>
                    <View style={styles.viewAllTourMeta}>
                      <Ionicons name="location" size={14} color={isDark ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.viewAllTourLocation, { color: isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                        {tour.location}
                      </Text>
                    </View>
                    <Text style={[styles.viewAllTourPrice, { color: colors.primary }]}>
                      {tour.currency}{tour.price}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFF' : colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onOpenSettings={async () => {
          setShowLocationModal(false);
          await openLocationSettings();
        }}
        onRetry={() => {
          setShowLocationModal(false);
          requestLocation();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Refresh Button - Left Side
  refreshButtonContainer: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Liquid Glass Location Toggle Button
  locationToggleContainer: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  liquidGlassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  locationToggleButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Liquid Glass My Location Button
  myLocationContainer: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  myLocationButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom Sheet - Liquid Glass Style
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    // Larger touch area for better gesture detection
    minHeight: 44,
    justifyContent: 'center',
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  categoriesContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  nearbySection: {
    marginTop: 8,
  },
  nearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nearbyTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tour Card - Liquid Glass Style
  tourCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    alignItems: 'center',
  },
  tourImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    margin: 8,
  },
  tourContent: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    gap: 4,
  },
  tourName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  tourInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tourPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tourPrice: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  tourRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourRatingText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  tourArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  // Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  permissionBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  permissionBannerText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  permissionSubtitle: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginTop: 2,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    marginTop: 4,
  },
  // Suggested Routes Section
  routesSection: {
    marginBottom: 16,
  },
  routesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routesTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  routesScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  // View All Modal Styles
  viewAllModal: {
    flex: 1,
  },
  viewAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  viewAllTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  viewAllCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllContent: {
    flex: 1,
  },
  viewAllScrollContent: {
    padding: 20,
    gap: 12,
  },
  viewAllRouteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  viewAllRouteImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  viewAllRouteContent: {
    flex: 1,
    gap: 4,
  },
  viewAllRouteTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  viewAllRouteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllRouteLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  viewAllRouteBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  viewAllRouteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  viewAllRouteBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  viewAllTourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  viewAllTourImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  viewAllTourContent: {
    flex: 1,
    gap: 4,
  },
  viewAllTourTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  viewAllTourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllTourLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  viewAllTourPrice: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginTop: 2,
  },
});
