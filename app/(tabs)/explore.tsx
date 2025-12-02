import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useTourStore, useUIStore, useThemeStore, useRouteStore, selectTours, selectCategories, selectHighlightedRoutes } from '@/stores';
import { Tour, Category, ThematicRoute } from '@/types';
import { TourDetailSheet, RouteDetailSheet } from '@/components/sheets';
import { RouteCard } from '@/components/cards';

// View All Modal Types
type ViewAllType = 'routes' | 'tours' | null;

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
  const fetchHighlightedRoutes = useRouteStore((state) => state.fetchHighlightedRoutes);
  const isLoadingRoutes = useRouteStore((state) => state.isLoadingHighlighted);

  // Route detail sheet state
  const [selectedRoute, setSelectedRoute] = useState<ThematicRoute | null>(null);
  const [isRouteDetailVisible, setIsRouteDetailVisible] = useState(false);

  // View All modal state
  const [viewAllType, setViewAllType] = useState<ViewAllType>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>(t('explore.addressFetching'));
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [selectedMapTour, setSelectedMapTour] = useState<Tour | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Bottom sheet animation
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const lastGestureDy = useRef(0);
  const currentHeight = useRef(SHEET_MIN_HEIGHT);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        lastGestureDy.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const newHeight = currentHeight.current - gestureState.dy;
        let snapPoint = SHEET_MIN_HEIGHT;

        // Determine snap point based on velocity and position
        if (gestureState.vy < -0.5) {
          // Fast swipe up
          snapPoint = SHEET_MAX_HEIGHT;
        } else if (gestureState.vy > 0.5) {
          // Fast swipe down
          snapPoint = SHEET_MIN_HEIGHT;
        } else {
          // Snap to nearest point
          const distances = [
            { point: SHEET_MIN_HEIGHT, distance: Math.abs(newHeight - SHEET_MIN_HEIGHT) },
            { point: SHEET_MID_HEIGHT, distance: Math.abs(newHeight - SHEET_MID_HEIGHT) },
            { point: SHEET_MAX_HEIGHT, distance: Math.abs(newHeight - SHEET_MAX_HEIGHT) },
          ];
          distances.sort((a, b) => a.distance - b.distance);
          snapPoint = distances[0].point;
        }

        currentHeight.current = snapPoint;
        Animated.spring(sheetHeight, {
          toValue: snapPoint,
          useNativeDriver: false,
          damping: 20,
          stiffness: 200,
        }).start();
      },
    })
  ).current;

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

  // Load data on mount
  useEffect(() => {
    fetchCategories();
    fetchTours();
    fetchHighlightedRoutes();
  }, [fetchCategories, fetchTours, fetchHighlightedRoutes]);

  // Request location permission and get current location
  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        setAddress(t('home.defaultLocation'));
        setLoading(false);
        return;
      }

      setLocationPermissionDenied(false);
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(currentLocation);
      
      // Update region to user's location
      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(newRegion);

      // Get address from coordinates
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (addressResult) {
        const formattedAddress = [
          addressResult.street,
          addressResult.district,
          addressResult.city,
        ]
          .filter(Boolean)
          .join(', ');
        setAddress(formattedAddress || t('explore.currentLocation'));
      }
    } catch (error) {
      console.log('Location error:', error);
      setAddress(t('home.defaultLocation'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

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
      Alert.alert(
        t('explore.locationPermissionTitle'),
        t('explore.locationPermissionSubtitle'),
        [{ text: t('common.done') }]
      );
      return;
    }
    setIsLocationEnabled(prev => !prev);
  }, [location, isLocationEnabled, t]);

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
          {/* Tour Markers - optimized with tracksViewChanges=false and memoized icon lookup */}
          {filteredTours.map((tour) => (
            <Marker
              key={tour.id}
              coordinate={{
                latitude: tour.latitude!,
                longitude: tour.longitude!,
              }}
              onPress={() => handleTourPress(tour)}
              tracksViewChanges={false}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name={(categoryIconMap[tour.category] || 'location') as any}
                    size={16}
                    color="#FFF"
                  />
                </View>
                <View style={[styles.markerArrow, { borderTopColor: colors.primary }]} />
              </View>
            </Marker>
          ))}
        </MapView>

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
        {/* Blur Background */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 50 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: isDark ? 'rgba(26,26,26,0.92)' : 'rgba(255,255,255,0.92)' }
            ]} 
          />
        )}
        
        {/* Drag Handle */}
        <View 
          style={styles.handleContainer}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' },
            ]}
          />
        </View>

        {/* Sheet Content - Scrollable */}
        <ScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Location Permission Banner */}
          {locationPermissionDenied && (
            <TouchableOpacity
              style={[
                styles.permissionBanner,
                {
                  backgroundColor: isDark ? 'rgba(240,58,82,0.15)' : 'rgba(240,58,82,0.1)',
                  borderColor: isDark ? 'rgba(240,58,82,0.3)' : 'rgba(240,58,82,0.2)',
                },
              ]}
              onPress={requestLocationPermission}
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
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <Text
              style={[styles.searchText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {loading ? t('explore.addressFetching') : (address || t('explore.searchPlaceholder'))}
            </Text>
          </View>

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
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.7)',
                      borderColor: isActive
                        ? colors.primary
                        : isDark
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() => setActiveCategory(category.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={isActive ? '#FFF' : colors.textSecondary}
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
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : filteredTours.length > 0 ? (
              filteredTours.map((tour: Tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={[
                    styles.tourCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => handleTourPress(tour)}
                >
                  <Image source={{ uri: tour.image }} style={styles.tourImage} />
                  <View style={styles.tourContent}>
                    <Text
                      style={[styles.tourName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {tour.title}
                    </Text>
                    <View style={styles.tourInfo}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.tourLocation, { color: colors.textSecondary }]}>
                        {tour.location}
                      </Text>
                    </View>
                    <View style={styles.tourPriceRow}>
                      <Text style={[styles.tourPrice, { color: colors.primary }]}>
                        {tour.currency}{tour.price}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.tourArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
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
              // All Routes
              highlightedRoutes.map((route: ThematicRoute) => (
                <TouchableOpacity
                  key={route.id}
                  style={[styles.viewAllRouteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    setViewAllType(null);
                    setTimeout(() => handleRoutePress(route), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: route.coverImage }} style={styles.viewAllRouteImage} />
                  <View style={styles.viewAllRouteContent}>
                    <Text style={[styles.viewAllRouteTitle, { color: colors.text }]} numberOfLines={2}>
                      {route.title}
                    </Text>
                    <View style={styles.viewAllRouteMeta}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.viewAllRouteLocation, { color: colors.textSecondary }]}>
                        {route.baseLocation}
                      </Text>
                    </View>
                    <View style={styles.viewAllRouteBadges}>
                      <View style={[styles.viewAllRouteBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.viewAllRouteBadgeText, { color: colors.primary }]}>
                          {route.durationLabel || `${route.durationDays} ${t('explore.day')}`}
                        </Text>
                      </View>
                      <View style={[styles.viewAllRouteBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={[styles.viewAllRouteBadgeText, { color: colors.textSecondary }]}>
                          {route.totalStops || route.itinerary.reduce((acc, day) => acc + day.stops.length, 0)} {t('explore.stops')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            ) : (
              // All Tours
              filteredTours.map((tour: Tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={[styles.viewAllTourCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                  onPress={() => {
                    setViewAllType(null);
                    setTimeout(() => handleTourPress(tour), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: tour.image }} style={styles.viewAllTourImage} />
                  <View style={styles.viewAllTourContent}>
                    <Text style={[styles.viewAllTourTitle, { color: colors.text }]} numberOfLines={2}>
                      {tour.title}
                    </Text>
                    <View style={styles.viewAllTourMeta}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.viewAllTourLocation, { color: colors.textSecondary }]}>
                        {tour.location}
                      </Text>
                    </View>
                    <Text style={[styles.viewAllTourPrice, { color: colors.primary }]}>
                      {tour.currency}{tour.price}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
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
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  // Marker styles
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -3,
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
    paddingVertical: 14,
  },
  handle: {
    width: 40,
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
