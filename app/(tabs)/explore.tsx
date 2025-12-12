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
import { useTourStore, useUIStore, useThemeStore, useRouteStore, useShallow, selectTours, selectCategories, selectHighlightedRoutes, selectRoutes } from '@/stores';
import { Tour, Category, ThematicRoute } from '@/types';
import { TourDetailSheet, RouteDetailSheet, DestinationSearchSheet } from '@/components/sheets';
import { RouteCard } from '@/components/cards';
import { MapMarkers } from '@/components/map';
import { useLocation } from '@/hooks';
import { LocationPermissionModal } from '@/components/ui';
import CachedImage, { prefetchImages } from '@/components/ui/CachedImage';

// Map Control Button Component - Premium Design
interface MapControlButtonProps {
  icon: string;
  onPress: () => void;
  isActive?: boolean;
  isLoading?: boolean;
  size?: 'small' | 'medium';
  colors: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
}

const MapControlButton = memo(function MapControlButton({
  icon,
  onPress,
  isActive = false,
  isLoading = false,
  size = 'medium',
  colors,
  isDark,
}: MapControlButtonProps) {
  const buttonSize = size === 'small' ? 36 : 44;
  const iconSize = size === 'small' ? 18 : 20;
  
  return (
    <TouchableOpacity
      style={[
        styles.mapControlButton,
        { 
          width: buttonSize, 
          height: buttonSize,
          borderRadius: buttonSize / 2,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 60 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: buttonSize / 2 }]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { 
              backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)',
              borderRadius: buttonSize / 2,
            },
          ]}
        />
      )}
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={icon as any}
          size={iconSize}
          color={isActive ? colors.primary : isDark ? '#FFF' : colors.text}
        />
      )}
    </TouchableOpacity>
  );
});

// Tour Preview Card - Shows when pin is tapped
interface TourPreviewCardProps {
  tour: Tour;
  onPress: () => void;
  onClose: () => void;
  colors: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
}

const TourPreviewCard = memo(function TourPreviewCard({
  tour,
  onPress,
  onClose,
  colors,
  isDark,
}: TourPreviewCardProps) {
  return (
    <Animated.View
      style={[
        styles.tourPreviewCard,
        {
          backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.tourPreviewClose}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.tourPreviewContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CachedImage
          uri={tour.image}
          style={styles.tourPreviewImage}
          fallbackIcon="map-outline"
          skeletonColor={isDark ? '#374151' : '#E5E7EB'}
        />
        <View style={styles.tourPreviewInfo}>
          <Text style={[styles.tourPreviewTitle, { color: colors.text }]} numberOfLines={1}>
            {tour.title}
          </Text>
          <View style={styles.tourPreviewMeta}>
            <Ionicons name="location" size={12} color={colors.textSecondary} />
            <Text style={[styles.tourPreviewLocation, { color: colors.textSecondary }]} numberOfLines={1}>
              {tour.location}
            </Text>
          </View>
          <View style={styles.tourPreviewBottom}>
            <Text style={[styles.tourPreviewPrice, { color: colors.primary }]}>
              {tour.currency}{tour.price}
            </Text>
            <View style={[styles.tourPreviewButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

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

  // Zustand stores with optimized selectors using useShallow
  const tours = useTourStore(selectTours);
  const categories = useTourStore(selectCategories);
  const { fetchTours, fetchCategories } = useTourStore(
    useShallow((state) => ({
      fetchTours: state.fetchTours,
      fetchCategories: state.fetchCategories,
    }))
  );
  
  const { selectedTour, isTourDetailVisible, openTourDetail, closeTourDetail } = useUIStore(
    useShallow((state) => ({
      selectedTour: state.selectedTour,
      isTourDetailVisible: state.isTourDetailVisible,
      openTourDetail: state.openTourDetail,
      closeTourDetail: state.closeTourDetail,
    }))
  );

  // Route store for thematic routes - optimized with useShallow
  const highlightedRoutes = useRouteStore(selectHighlightedRoutes);
  const allRoutes = useRouteStore(selectRoutes);
  const { fetchHighlightedRoutes, fetchAllRoutes, isLoadingRoutes } = useRouteStore(
    useShallow((state) => ({
      fetchHighlightedRoutes: state.fetchHighlightedRoutes,
      fetchAllRoutes: state.fetchRoutes,
      isLoadingRoutes: state.isLoadingHighlighted,
    }))
  );

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
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [previewTour, setPreviewTour] = useState<Tour | null>(null);

  // Bottom sheet animation - improved gesture handling
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const currentHeight = useRef(SHEET_MIN_HEIGHT);
  const isDragging = useRef(false);
  
  // Animated position for my location button (moves up when sheet expands)
  const myLocationBottom = useRef(new Animated.Value(SHEET_MIN_HEIGHT + 20)).current;
  const myLocationOpacity = useRef(new Animated.Value(1)).current;
  
  // Animated position for tour preview card
  const previewCardBottom = useRef(new Animated.Value(SHEET_MIN_HEIGHT + 80)).current;
  const previewCardOpacity = useRef(new Animated.Value(1)).current;
  
  // Track if data is ready to prevent UI blocking
  const [isDataReady, setIsDataReady] = useState(false);

  // Snap to a specific height with animation
  const snapToHeight = useCallback((targetHeight: number) => {
    currentHeight.current = targetHeight;
    
    // Animate sheet height
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      damping: 25,
      stiffness: 250,
      mass: 0.8,
    }).start();
    
    // Animate my location button - hide when sheet is expanded
    const shouldHideButtons = targetHeight > SHEET_MID_HEIGHT;
    
    Animated.parallel([
      Animated.spring(myLocationBottom, {
        toValue: targetHeight + 20,
        useNativeDriver: false,
        damping: 25,
        stiffness: 250,
        mass: 0.8,
      }),
      Animated.timing(myLocationOpacity, {
        toValue: shouldHideButtons ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
    
    // Animate preview card - hide when sheet is expanded
    Animated.parallel([
      Animated.spring(previewCardBottom, {
        toValue: targetHeight + 80,
        useNativeDriver: false,
        damping: 25,
        stiffness: 250,
        mass: 0.8,
      }),
      Animated.timing(previewCardOpacity, {
        toValue: shouldHideButtons ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [sheetHeight, myLocationBottom, previewCardBottom]);

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
        // Also move the buttons during drag
        myLocationBottom.setValue(clampedHeight + 20);
        previewCardBottom.setValue(clampedHeight + 80);
        // Fade out buttons when dragging past mid height
        const opacity = clampedHeight > SHEET_MID_HEIGHT ? Math.max(0, 1 - (clampedHeight - SHEET_MID_HEIGHT) / (SHEET_MAX_HEIGHT - SHEET_MID_HEIGHT)) : 1;
        myLocationOpacity.setValue(opacity);
        previewCardOpacity.setValue(opacity);
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

  // Realtime subscriptions for tours
  const subscribeToRealtime = useTourStore((state) => state.subscribeToRealtime);
  const unsubscribeFromRealtime = useTourStore((state) => state.unsubscribeFromRealtime);
  const subscribeToRoutesRealtime = useRouteStore((state) => state.subscribeToRealtime);
  const unsubscribeFromRoutesRealtime = useRouteStore((state) => state.unsubscribeFromRealtime);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    
    // Subscribe to realtime updates for tours and routes
    subscribeToRealtime();
    subscribeToRoutesRealtime();
    
    return () => {
      unsubscribeFromRealtime();
      unsubscribeFromRoutesRealtime();
    };
  }, [fetchCategories, fetchTours, fetchHighlightedRoutes, fetchAllRoutes, subscribeToRealtime, unsubscribeFromRealtime, subscribeToRoutesRealtime, unsubscribeFromRoutesRealtime]);

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

  // Current zoom level ref for zoom controls
  const currentZoomRef = useRef(0.08); // latitudeDelta as zoom proxy

  // Handle tour marker press - show preview card and zoom to location
  const handleMarkerPress = useCallback((tour: Tour) => {
    setPreviewTour(tour);
    
    // Zoom to the marker location
    if (tour.latitude && tour.longitude) {
      mapRef.current?.animateToRegion({
        latitude: tour.latitude,
        longitude: tour.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 400);
      currentZoomRef.current = 0.015;
    }
  }, []);

  // Handle tour press from list - open detail sheet
  const handleTourPress = useCallback((tour: Tour) => {
    setSelectedMapTour(tour);
    setPreviewTour(null);
    openTourDetail(tour);
  }, [openTourDetail]);

  // Close preview card
  const closePreview = useCallback(() => {
    setPreviewTour(null);
  }, []);

  // Open tour detail from preview
  const openTourFromPreview = useCallback(() => {
    if (previewTour) {
      setSelectedMapTour(previewTour);
      openTourDetail(previewTour);
      setPreviewTour(null);
    }
  }, [previewTour, openTourDetail]);

  // Zoom controls - using region-based zoom (latitudeDelta)
  const handleZoomIn = useCallback(() => {
    mapRef.current?.getMapBoundaries().then(() => {
      // Decrease delta = zoom in
      const newDelta = Math.max(currentZoomRef.current * 0.5, 0.002);
      currentZoomRef.current = newDelta;
      
      mapRef.current?.animateToRegion({
        ...region,
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      }, 300);
    }).catch(() => {
      // Fallback if getMapBoundaries fails
      const newDelta = Math.max(currentZoomRef.current * 0.5, 0.002);
      currentZoomRef.current = newDelta;
      
      mapRef.current?.animateToRegion({
        ...region,
        latitudeDelta: newDelta,
        longitudeDelta: newDelta,
      }, 300);
    });
  }, [region]);

  const handleZoomOut = useCallback(() => {
    // Increase delta = zoom out
    const newDelta = Math.min(currentZoomRef.current * 2, 1);
    currentZoomRef.current = newDelta;
    
    mapRef.current?.animateToRegion({
      ...region,
      latitudeDelta: newDelta,
      longitudeDelta: newDelta,
    }, 300);
  }, [region]);

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
      onMarkerPress={handleMarkerPress}
    />
  ), [filteredTours, categoryIconMap, colors.primary, handleMarkerPress]);

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
          onRegionChangeComplete={(newRegion) => {
            setRegion(newRegion);
            currentZoomRef.current = newRegion.latitudeDelta;
          }}
        >
          {/* Tour Markers - using memoized MapMarkers component */}
          {memoizedMapMarkers}
        </MapView>

        {/* Premium Map Controls - Left Side */}
        <View style={[styles.mapControlsLeft, { top: insets.top + 12 }]}>
          <MapControlButton
            icon="refresh-outline"
            onPress={handleRefresh}
            isLoading={isRefreshing}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {/* Premium Map Controls - Right Side (Grouped) */}
        <View style={[styles.mapControlsRight, { top: insets.top + 12 }]}>
          <View style={[styles.mapControlGroup, { backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)' }]}>
            {Platform.OS === 'ios' && (
              <BlurView
                intensity={isDark ? 60 : 80}
                tint={isDark ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />
            )}
            <MapControlButton
              icon={isLocationEnabled ? "location" : "location-outline"}
              onPress={toggleLocationTracking}
              isActive={isLocationEnabled}
              size="small"
              colors={colors}
              isDark={isDark}
            />
            <View style={[styles.mapControlDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <MapControlButton
              icon="add"
              onPress={handleZoomIn}
              size="small"
              colors={colors}
              isDark={isDark}
            />
            <View style={[styles.mapControlDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
            <MapControlButton
              icon="remove"
              onPress={handleZoomOut}
              size="small"
              colors={colors}
              isDark={isDark}
            />
          </View>
        </View>

        {/* My Location Button - Bottom Right (Animated with fade) */}
        <Animated.View 
          style={[styles.myLocationFloating, { bottom: myLocationBottom, opacity: myLocationOpacity }]}
          pointerEvents={currentHeight.current > SHEET_MID_HEIGHT ? 'none' : 'auto'}
        >
          <MapControlButton
            icon="navigate"
            onPress={handleMyLocation}
            colors={colors}
            isDark={isDark}
          />
        </Animated.View>

        {/* Tour Preview Card - Shows when pin is tapped (Animated with fade) */}
        {previewTour && (
          <Animated.View 
            style={[styles.tourPreviewContainer, { bottom: previewCardBottom, opacity: previewCardOpacity }]}
            pointerEvents={currentHeight.current > SHEET_MID_HEIGHT ? 'none' : 'auto'}
          >
            <TourPreviewCard
              tour={previewTour}
              onPress={openTourFromPreview}
              onClose={closePreview}
              colors={colors}
              isDark={isDark}
            />
          </Animated.View>
        )}
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

          {/* Search Bar - Opens Search Sheet */}
          <TouchableOpacity
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => setShowSearchSheet(true)}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <Text
              style={[styles.searchText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {t('explore.searchPlaceholder')}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Suggested Routes Section - Only show active routes */}
          {highlightedRoutes.filter(r => r.isActive !== false).length > 0 && (
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
                {highlightedRoutes.filter(r => r.isActive !== false).map((route: ThematicRoute) => (
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
              // All Routes - show only active routes from Supabase
              allRoutes.filter(r => r.isActive !== false).length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="compass-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {t('explore.noRoutes')}
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                    {t('explore.noRoutesSubtitle')}
                  </Text>
                </View>
              ) : allRoutes.filter(r => r.isActive !== false).map((route: ThematicRoute) => (
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

      {/* Destination Search Sheet */}
      <DestinationSearchSheet
        visible={showSearchSheet}
        onClose={() => setShowSearchSheet(false)}
        onSelectTour={handleTourPress}
        onSelectRoute={handleRoutePress}
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
  // Premium Map Control Styles
  mapControlButton: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapControlsLeft: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  mapControlsRight: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  mapControlGroup: {
    borderRadius: 24,
    padding: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  mapControlDivider: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  myLocationFloating: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  // Tour Preview Card Styles
  tourPreviewContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  tourPreviewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  tourPreviewClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tourPreviewContent: {
    flexDirection: 'row',
    gap: 12,
  },
  tourPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  tourPreviewInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  tourPreviewTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    paddingRight: 24,
  },
  tourPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourPreviewLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tourPreviewBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tourPreviewPrice: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  tourPreviewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
