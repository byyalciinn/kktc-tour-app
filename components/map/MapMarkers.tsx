/**
 * MapMarkers Component
 * 
 * Premium, minimal map markers for tour locations with:
 * - Performance optimization via React.memo
 * - tracksViewChanges=false for better performance
 * - Clean white aesthetic design
 * - Small footprint to avoid overlap
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
 * Single tour marker - Premium minimal white design
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
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.markerContainer}>
        <View style={styles.marker}>
          <View style={[styles.markerDot, { backgroundColor: primaryColor }]} />
        </View>
        <View style={styles.markerStem} />
        <View style={[styles.markerShadow, { backgroundColor: primaryColor }]} />
      </View>
    </Marker>
  );
});

TourMarkerItem.displayName = 'TourMarkerItem';

/**
 * Map markers container - renders all tour markers
 * Limited to first 30 markers for performance
 */
export const MapMarkers = memo<MapMarkersProps>(({
  tours,
  categoryIconMap,
  primaryColor,
  onMarkerPress,
}) => {
  // Limit markers for performance
  const visibleTours = useMemo(() => tours.slice(0, 30), [tours]);

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
    width: 24,
    height: 32,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  markerStem: {
    width: 2,
    height: 6,
    backgroundColor: '#FFFFFF',
    marginTop: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  markerShadow: {
    width: 6,
    height: 3,
    borderRadius: 3,
    opacity: 0.3,
    marginTop: 1,
  },
});

export default MapMarkers;
