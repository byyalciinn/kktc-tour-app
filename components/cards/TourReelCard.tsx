import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Tour } from '@/types';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useAuthStore } from '@/stores';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TourReelCardProps {
  tour: Tour;
  onDetailPress: (tour: Tour) => void;
}

/**
 * Tam ekran tur kartı - Reels deneyimi için
 * Gradient overlay ile tur bilgileri gösterir
 */
const TourReelCard: React.FC<TourReelCardProps> = ({ tour, onDetailPress }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { isFavorited, toggleFavorite } = useFavoritesStore();
  
  const isFav = isFavorited(tour.id);

  const handleFavoritePress = useCallback(async () => {
    if (!user?.id) return;
    await toggleFavorite(user.id, tour);
  }, [user?.id, tour, toggleFavorite]);

  const handleDetailPress = useCallback(() => {
    onDetailPress(tour);
  }, [tour, onDetailPress]);

  return (
    <View style={styles.container}>
      {/* Tam ekran fotoğraf - Yüksek kalite */}
      <Image
        source={{ uri: tour.image || tour.imageThumb || '' }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Gradient overlay - alt kısım için daha güçlü */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.4, 1]}
        style={styles.gradient}
      />

      {/* Sağ taraf - Aksiyon butonları (daha yukarıda) */}
      <View style={styles.actionButtons}>
        {/* Favori butonu */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleFavoritePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={26}
            color={isFav ? '#F89C28' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Detay butonu */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDetailPress}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Alt kısım - Tur bilgileri (daha aşağıda) */}
      <View style={styles.bottomSection}>
        {/* Başlık */}
        <Text style={styles.title} numberOfLines={2}>
          {tour.title}
        </Text>

        {/* Konum */}
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.locationText}>{tour.location}</Text>
        </View>

        {/* Fiyat ve Rating */}
        <View style={styles.infoRow}>
          {tour.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{tour.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({tour.reviewCount})</Text>
            </View>
          )}
        </View>

        {/* Detay butonu */}
        <TouchableOpacity
          style={styles.detailButton}
          onPress={handleDetailPress}
          activeOpacity={0.9}
        >
          <Text style={styles.detailButtonText}>{t('tours.viewDetails')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionButtons: {
    position: 'absolute',
    right: 20,
    bottom: 220,
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  price: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewCount: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F89C28',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  detailButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default memo(TourReelCard);
