import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { Tour } from '@/types';
import CachedImage from '@/components/ui/CachedImage';

interface TourCardProps {
  tour: Tour;
  onPress: (tour: Tour) => void;
  getCategoryName?: (categoryId: string) => string;
}

/**
 * Tour card component for home screen
 */
export const TourCard = memo(function TourCard({ tour, onPress, getCategoryName }: TourCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t, i18n } = useTranslation();

  const categoryLabel = getCategoryName ? getCategoryName(tour.category) : tour.category;

  const formatDurationLabel = (value: string): string => {
    const raw = (value || '').trim();
    if (!raw) return value;

    const lower = raw.toLowerCase();

    if (lower === 'tam gün' || lower === 'full day') return t('duration.fullDay');
    if (lower === 'yarım gün' || lower === 'half day') return t('duration.halfDay');

    const dayRangeMatch = raw.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*(gün|gun|day|days)\s*$/i);
    if (dayRangeMatch?.[1] && dayRangeMatch?.[2]) {
      const from = Number(dayRangeMatch[1]);
      const to = Number(dayRangeMatch[2]);
      const localizedSample = t('duration.day', { count: to });
      const unit = localizedSample.replace(String(to), '').trim();
      return `${from}-${to} ${unit}`;
    }

    const dayMatch = raw.match(/^(\d+)\s*(gün|gun|day|days)\s*$/i);
    if (dayMatch?.[1]) {
      const count = Number(dayMatch[1]);
      return t('duration.day', { count });
    }

    const hourRangeMatch = raw.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*(saat|hour|hours|h)\s*$/i);
    if (hourRangeMatch?.[1] && hourRangeMatch?.[2]) {
      const from = Number(hourRangeMatch[1]);
      const to = Number(hourRangeMatch[2]);
      const localizedSample = t('duration.hour', { count: to });
      const unit = localizedSample.replace(String(to), '').trim();
      return `${from}-${to} ${unit}`;
    }

    const hourMatch = raw.match(/^(\d+)\s*(saat|hour|hours|h)\s*$/i);
    if (hourMatch?.[1]) {
      const count = Number(hourMatch[1]);
      return t('duration.hour', { count });
    }

    return value;
  };

  const translateLocationLabel = (value: string): string => {
    const raw = (value || '').trim();
    if (!raw) return value;

    const trToEn: Record<string, string> = {
      Girne: 'Kyrenia',
      Lefkoşa: 'Nicosia',
      Gazimağusa: 'Famagusta',
      İskele: 'Iskele',
      Karpaz: 'Karpas',
      KKTC: 'Northern Cyprus',
    };

    const enToTr: Record<string, string> = {
      Kyrenia: 'Girne',
      Nicosia: 'Lefkoşa',
      Famagusta: 'Gazimağusa',
      Iskele: 'İskele',
      Karpas: 'Karpaz',
      'Northern Cyprus': 'KKTC',
      TRNC: 'KKTC',
    };

    const isEnglish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('en');
    const map = isEnglish ? trToEn : enToTr;
    return raw
      .split(',')
      .map(part => part.trim())
      .map(part => map[part] ?? part)
      .join(', ');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={() => onPress(tour)}
      accessibilityRole="button"
      accessibilityLabel={`${tour.title}, ${tour.location}`}
      accessibilityHint="Tur detaylarını görüntülemek için dokunun"
    >
      <CachedImage
        uri={tour.imageThumb || tour.image}
        style={styles.image}
        fallbackIcon="map-outline"
        priority="normal"
        fadeIn={true}
      />
      {/* Overlay gradient */}
      <View style={styles.gradient} />

      {/* Duration Tag */}
      <View style={styles.durationTag}>
        <Text style={styles.durationText}>{formatDurationLabel(tour.duration)}</Text>
      </View>

      {/* Arrow Button */}
      <TouchableOpacity
        style={styles.arrowButton}
        accessibilityLabel="Detayları gör"
      >
        <Ionicons name="arrow-forward" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Bottom Content */}
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Text style={styles.title} numberOfLines={1}>
            {tour.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {translateLocationLabel(tour.location)} • {categoryLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

/**
 * Compact tour card for related tours section
 */
export const CompactTourCard = memo(function CompactTourCard({ tour, onPress }: Omit<TourCardProps, 'getCategoryName'>) {
  const { i18n } = useTranslation();

  const translateLocationLabel = (value: string): string => {
    const raw = (value || '').trim();
    if (!raw) return value;

    const trToEn: Record<string, string> = {
      Girne: 'Kyrenia',
      Lefkoşa: 'Nicosia',
      Gazimağusa: 'Famagusta',
      İskele: 'Iskele',
      Karpaz: 'Karpas',
      KKTC: 'Northern Cyprus',
    };

    const enToTr: Record<string, string> = {
      Kyrenia: 'Girne',
      Nicosia: 'Lefkoşa',
      Famagusta: 'Gazimağusa',
      Iskele: 'İskele',
      Karpas: 'Karpaz',
      'Northern Cyprus': 'KKTC',
      TRNC: 'KKTC',
    };

    const isEnglish = (i18n.resolvedLanguage || i18n.language || '').toLowerCase().startsWith('en');
    const map = isEnglish ? trToEn : enToTr;
    return raw
      .split(',')
      .map(part => part.trim())
      .map(part => map[part] ?? part)
      .join(', ');
  };

  return (
    <TouchableOpacity
      style={styles.compactContainer}
      activeOpacity={0.9}
      onPress={() => onPress(tour)}
      accessibilityRole="button"
      accessibilityLabel={`${tour.title}, ${tour.location}`}
    >
      <CachedImage
        uri={tour.imageThumb || tour.image}
        style={styles.compactImage}
        fallbackIcon="image-outline"
        priority="low"
        fadeIn={true}
      />
      <View style={styles.compactGradient} />
      <TouchableOpacity style={styles.compactArrow}>
        <Ionicons name="arrow-forward" size={16} color="#000" />
      </TouchableOpacity>
      <View style={styles.compactContent}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {tour.title}
        </Text>
        <View style={styles.compactMeta}>
          <Text style={styles.compactLocation}>
            {translateLocationLabel(tour.location).split(',')[0]}
          </Text>
          <View style={styles.compactRating}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.compactRatingText}>{tour.rating}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // Main tour card
  container: {
    width: '100%',
    height: 280,
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
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  durationTag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  durationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#212529',
  },
  arrowButton: {
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
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  leftContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
  },

  // Compact tour card
  compactContainer: {
    width: 180,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  compactGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  compactArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  compactTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    color: 'rgba(255,255,255,0.85)',
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactRatingText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
