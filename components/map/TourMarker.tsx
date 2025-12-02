/**
 * Tour Marker Component
 * 
 * Optimized map marker for tour locations.
 * Uses React.memo to prevent unnecessary re-renders.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Tour } from '@/types';
import { Colors } from '@/constants/Colors';

interface TourMarkerProps {
  tour: Tour;
  categoryIcon: string;
  colorScheme: 'light' | 'dark';
  onPress: (tour: Tour) => void;
}

/**
 * Memoized Tour Marker to prevent re-renders on map pan/zoom
 */
const TourMarker = memo<TourMarkerProps>(({
  tour,
  categoryIcon,
  colorScheme,
  onPress,
}) => {
  const colors = Colors[colorScheme];
  
  const handlePress = useCallback(() => {
    onPress(tour);
  }, [onPress, tour]);

  if (!tour.latitude || !tour.longitude) {
    return null;
  }

  return (
    <Marker
      coordinate={{
        latitude: tour.latitude,
        longitude: tour.longitude,
      }}
      onPress={handlePress}
      tracksViewChanges={false} // Critical for performance
    >
      <View style={styles.markerContainer}>
        <View style={[styles.marker, { backgroundColor: colors.primary }]}>
          <Ionicons
            name={(categoryIcon || 'location') as any}
            size={16}
            color="#FFF"
          />
        </View>
        <View style={[styles.markerArrow, { borderTopColor: colors.primary }]} />
      </View>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.tour.id === nextProps.tour.id &&
    prevProps.tour.latitude === nextProps.tour.latitude &&
    prevProps.tour.longitude === nextProps.tour.longitude &&
    prevProps.categoryIcon === nextProps.categoryIcon &&
    prevProps.colorScheme === nextProps.colorScheme
  );
});

TourMarker.displayName = 'TourMarker';

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

export default TourMarker;
