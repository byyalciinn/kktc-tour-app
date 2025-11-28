import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tour } from '@/types';

interface FavoriteCardProps {
  tour: Tour;
  onPress: (tour: Tour) => void;
  onRemove: (tourId: string) => void;
}

/**
 * Favorite tour card component
 */
export function FavoriteCard({ tour, onPress, onRemove }: FavoriteCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={() => onPress(tour)}
      accessibilityRole="button"
      accessibilityLabel={`Favori tur: ${tour.title}, ${tour.location}`}
      accessibilityHint="Tur detaylarını görüntülemek için dokunun"
    >
      <Image
        source={{ uri: tour.image }}
        style={styles.image}
        accessibilityIgnoresInvertColors
      />
      {/* Overlay gradient */}
      <View style={styles.gradient} />

      {/* Favorite Button */}
      <TouchableOpacity
        style={styles.favoriteButton}
        activeOpacity={0.8}
        onPress={() => onRemove(tour.id)}
        accessibilityRole="button"
        accessibilityLabel="Favorilerden kaldır"
        accessibilityHint="Bu turu favorilerden kaldırmak için dokunun"
      >
        <Ionicons name="heart" size={22} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Bottom Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {tour.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.locationText}>{tour.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
});
