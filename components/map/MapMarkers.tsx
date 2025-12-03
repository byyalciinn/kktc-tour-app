/**
 * MapMarkers Component
 * 
 * Memoized map markers for tour locations with:
 * - Performance optimization via React.memo
 * - tracksViewChanges=false for better performance
 * - Category-based icons
 * - Consistent styling
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Tour } from '@/types';

interface MapMarkersProps {
  tours: Tour[];
  categoryIconMap: Record<string, string>;
  primaryColor: string;
  onMarkerPress: (tour: Tour) => void;
}

/**
 * Single tour marker - memoized for performance
 */
const TourMarkerItem = memo<{
  tour: Tour;
  icon: string;
  primaryColor: string;
  onPress: () => void;
}>(({ tour, icon, primaryColor, onPress }) => {
  if (!tour.latitude || !tour.longitude) return null;

  return (
    <Marker
      coordinate={{
        latitude: tour.latitude,
        longitude: tour.longitude,
      }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        <View style={[styles.marker, { backgroundColor: primaryColor }]}>
          <Ionicons
            name={(icon || 'location') as any}
            size={16}
            color="#FFF"
          />
        </View>
        <View style={[styles.markerArrow, { borderTopColor: primaryColor }]} />
      </View>
    </Marker>
  );
});

TourMarkerItem.displayName = 'TourMarkerItem';

/**
 * Map markers container - renders all tour markers
 * Limited to first 20 markers for performance
 */
export const MapMarkers = memo<MapMarkersProps>(({
  tours,
  categoryIconMap,
  primaryColor,
  onMarkerPress,
}) => {
  // Limit markers for performance
  const visibleTours = useMemo(() => tours.slice(0, 20), [tours]);

  return (
    <>
      {visibleTours.map((tour) => (
        <TourMarkerItem
          key={tour.id}
          tour={tour}
          icon={categoryIconMap[tour.category] || 'location'}
          primaryColor={primaryColor}
          onPress={() => onMarkerPress(tour)}
        />
      ))}
    </>
  );
});

MapMarkers.displayName = 'MapMarkers';

const styles = StyleSheet.create({
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
});

export default MapMarkers;
