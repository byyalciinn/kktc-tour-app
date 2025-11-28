import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { getCategories, Category } from '@/lib/tourService';

const { width, height } = Dimensions.get('window');

// Bottom sheet snap points
const SHEET_MIN_HEIGHT = 320;
const SHEET_MAX_HEIGHT = height * 0.85;
const SHEET_MID_HEIGHT = height * 0.5;

// Default place categories (fallback)
const defaultPlaceCategories = [
  { id: 'all', name: 'Tümü', icon: 'apps-outline', sort_order: 0 },
  { id: 'coffee', name: 'Kafe', icon: 'cafe', sort_order: 1 },
  { id: 'restaurant', name: 'Restoran', icon: 'restaurant-outline', sort_order: 2 },
  { id: 'hotel', name: 'Otel', icon: 'bed-outline', sort_order: 3 },
  { id: 'transit', name: 'Ulaşım', icon: 'bus-outline', sort_order: 4 },
  { id: 'museum', name: 'Müze', icon: 'business-outline', sort_order: 5 },
];

// Sample nearby places (KKTC locations)
const nearbyPlaces = [
  {
    id: '1',
    name: 'The Soulist Coffee',
    category: 'coffee',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    coordinate: { latitude: 35.3387, longitude: 33.3183 },
  },
  {
    id: '2',
    name: 'Girne Liman Cafe',
    category: 'coffee',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
    coordinate: { latitude: 35.3420, longitude: 33.3220 },
  },
  {
    id: '3',
    name: 'Bellapais Garden Restaurant',
    category: 'restaurant',
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    coordinate: { latitude: 35.3050, longitude: 33.3550 },
  },
  {
    id: '4',
    name: 'Girne Kalesi Müzesi',
    category: 'museum',
    distance: '0.5 km',
    image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=400&h=300&fit=crop',
    coordinate: { latitude: 35.3410, longitude: 33.3190 },
  },
];

// Default region (Girne, KKTC)
const DEFAULT_REGION = {
  latitude: 35.3387,
  longitude: 33.3183,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Konum alınıyor...');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [placeCategories, setPlaceCategories] = useState<Category[]>(defaultPlaceCategories as Category[]);

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

  // Filter places by category
  const filteredPlaces = activeCategory === 'all' 
    ? nearbyPlaces 
    : nearbyPlaces.filter((place) => place.category === activeCategory);

  // Load categories from Supabase
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await getCategories();
      if (data && data.length > 0) {
        setPlaceCategories(data);
      }
    };
    loadCategories();
  }, []);

  // Request location permission and get current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert(
            'Konum İzni Gerekli',
            'Yakınındaki yerleri görebilmek için konum izni vermeniz gerekmektedir.',
            [{ text: 'Tamam' }]
          );
          setAddress('Girne, Kuzey Kıbrıs');
          setLoading(false);
          return;
        }

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
          setAddress(formattedAddress || 'Girne, Kuzey Kıbrıs');
        }
      } catch (error) {
        console.log('Location error:', error);
        setAddress('Girne, Kuzey Kıbrıs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBackPress = () => {
    // Navigate back or handle back action
  };

  const handleMyLocation = () => {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const getCategoryTitle = () => {
    if (activeCategory === 'all') return 'Yakındaki Yerler';
    const category = placeCategories.find((c) => c.id === activeCategory);
    return category ? `Yakındaki ${category.name}ler` : 'Yakındaki Yerler';
  };

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
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Place Markers */}
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              coordinate={place.coordinate}
              title={place.name}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.marker, { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name={
                      placeCategories.find((c) => c.id === place.category)
                        ?.icon as any || 'location'
                    }
                    size={16}
                    color="#FFF"
                  />
                </View>
                <View style={styles.markerArrow} />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 10 }]}
          onPress={handleBackPress}
          activeOpacity={0.9}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* My Location Button */}
        <TouchableOpacity
          style={[styles.myLocationButton, { bottom: 20 }]}
          onPress={handleMyLocation}
          activeOpacity={0.9}
        >
          <Ionicons name="navigate" size={22} color="#666" />
        </TouchableOpacity>
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
              {loading ? 'Konum alınıyor...' : address}
            </Text>
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {placeCategories.map((category) => {
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
                        : '#FFFFFF',
                      borderColor: isActive
                        ? colors.primary
                        : isDark
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.1)',
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
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  Tümünü Gör
                </Text>
              </TouchableOpacity>
            </View>

            {/* Places - Vertical List when expanded */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : filteredPlaces.length > 0 ? (
              filteredPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  style={[
                    styles.placeCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: place.image }} style={styles.placeImage} />
                  <View style={styles.placeContent}>
                    <Text
                      style={[styles.placeName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    <View style={styles.placeInfo}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                        {place.distance}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.placeArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noPlacesText, { color: colors.textSecondary }]}>
                Bu kategoride yakınında yer bulunamadı
              </Text>
            )}
          </View>
        </ScrollView>
      </Animated.View>
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
  backButton: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  myLocationButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -2,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 15,
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
  placeCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  placeImage: {
    width: 90,
    height: 90,
  },
  placeContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  placeName: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 4,
  },
  placeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
  placeArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noPlacesText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
