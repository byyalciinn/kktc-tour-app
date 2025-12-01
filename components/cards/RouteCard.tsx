/**
 * RouteCard Component
 * iOS 26 Liquid Glass design for thematic travel routes
 * 
 * Features:
 * - Frosted glass effect with BlurView
 * - Smooth animations
 * - Theme-based color accents
 * - No pricing (informational only)
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { ThematicRoute } from '@/types';
import { useThemeStore } from '@/stores';
import { getThemeIcon, getDifficultyInfo } from '@/constants/ThematicRoutes';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40; // Full width with padding
const COMPACT_CARD_WIDTH = 280;

interface RouteCardProps {
  route: ThematicRoute;
  onPress: (route: ThematicRoute) => void;
  variant?: 'default' | 'compact';
}

/**
 * Main RouteCard component with liquid glass design
 */
export function RouteCard({ route, onPress, variant = 'default' }: RouteCardProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const themeIcon = getThemeIcon(route.theme);
  const difficultyInfo = getDifficultyInfo(route.difficulty);
  const themeLabel = t(`explore.themes.${route.theme}`) || route.theme;

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        activeOpacity={0.9}
        onPress={() => onPress(route)}
        accessibilityRole="button"
        accessibilityLabel={`${route.title}, ${route.baseLocation}`}
      >
        <Image
          source={{ uri: route.coverImage }}
          style={styles.compactImage}
          accessibilityIgnoresInvertColors
        />
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.compactGradient}
        />

        {/* Theme badge - top left */}
        <View style={styles.compactThemeBadge}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          )}
          <View style={styles.compactThemeBadgeContent}>
            <Ionicons name={themeIcon as any} size={12} color="#FFF" />
            <Text style={styles.compactThemeText}>{themeLabel}</Text>
          </View>
        </View>

        {/* Duration badge - top right */}
        <View style={styles.compactDurationBadge}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
          )}
          <Text style={styles.compactDurationText}>
            {route.durationLabel || `${route.durationDays} ${t('explore.day')}`}
          </Text>
        </View>

        {/* Bottom content */}
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={2}>
            {route.title}
          </Text>
          <View style={styles.compactMeta}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.compactLocation}>{route.baseLocation}</Text>
            <View style={styles.compactDot} />
            <Text style={styles.compactStops}>
              {route.totalStops || route.itinerary.reduce((acc, day) => acc + day.stops.length, 0)} {t('explore.stops')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Default (large) variant
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.95}
      onPress={() => onPress(route)}
      accessibilityRole="button"
      accessibilityLabel={`${route.title}, ${route.durationDays} gün, ${route.baseLocation}`}
    >
      <Image
        source={{ uri: route.coverImage }}
        style={styles.image}
        accessibilityIgnoresInvertColors
      />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
        style={styles.gradient}
      />

      {/* Top row - Theme & Duration badges */}
      <View style={styles.topRow}>
        {/* Theme badge with glass effect */}
        <View style={styles.themeBadge}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          )}
          <View style={styles.themeBadgeContent}>
            <Ionicons name={themeIcon as any} size={16} color="#FFF" />
            <Text style={styles.themeText}>{themeLabel}</Text>
          </View>
        </View>

        {/* Duration badge with glass effect */}
        <View style={styles.durationBadge}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />
          )}
          <Text style={styles.durationText}>
            {route.durationLabel || `${route.durationDays} ${t('explore.day')}`}
          </Text>
        </View>
      </View>

      {/* Arrow button with glass effect */}
      <View style={styles.arrowContainer}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.95)' }]} />
        )}
        <Ionicons name="arrow-forward" size={20} color="#212529" />
      </View>

      {/* Bottom content with glass effect */}
      <View style={styles.bottomContent}>
        {Platform.OS === 'ios' ? (
          <BlurView 
            intensity={isDark ? 60 : 80} 
            tint={isDark ? 'dark' : 'light'} 
            style={StyleSheet.absoluteFill} 
          />
        ) : (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }
            ]} 
          />
        )}
        
        <View style={styles.contentInner}>
          {/* Title */}
          <Text style={[styles.title, { color: isDark ? '#FFF' : '#212529' }]} numberOfLines={2}>
            {route.title}
          </Text>

          {/* Subtitle */}
          {route.subtitle && (
            <Text 
              style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]} 
              numberOfLines={1}
            >
              {route.subtitle}
            </Text>
          )}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {/* Location */}
            <View style={styles.metaItem}>
              <Ionicons 
                name="location-outline" 
                size={14} 
                color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} 
              />
              <Text style={[styles.metaText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                {route.baseLocation}
              </Text>
            </View>

            {/* Stops count */}
            <View style={styles.metaItem}>
              <Ionicons 
                name="flag-outline" 
                size={14} 
                color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} 
              />
              <Text style={[styles.metaText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}>
                {route.totalStops || route.itinerary.reduce((acc, day) => acc + day.stops.length, 0)} {t('explore.stops')}
              </Text>
            </View>

            {/* Difficulty */}
            {route.difficulty && (
              <View style={[styles.difficultyBadge, { backgroundColor: `${difficultyInfo.color}20` }]}>
                <View style={[styles.difficultyDot, { backgroundColor: difficultyInfo.color }]} />
                <Text style={[styles.difficultyText, { color: difficultyInfo.color }]}>
                  {t(`explore.difficulties.${route.difficulty}`)}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {route.tags && route.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {route.tags.slice(0, 3).map((tag, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.tag, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}
                >
                  <Text style={[styles.tagText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Default (large) card styles
  container: {
    width: CARD_WIDTH,
    height: 320,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  themeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  themeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  durationBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  durationText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#212529',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  arrowContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  contentInner: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },

  // Compact card styles
  compactContainer: {
    width: COMPACT_CARD_WIDTH,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  compactGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  compactThemeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  compactThemeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  compactThemeText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  compactDurationBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  compactDurationText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#212529',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    color: '#FFF',
    marginBottom: 6,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLocation: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    color: 'rgba(255,255,255,0.8)',
  },
  compactDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  compactStops: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    color: 'rgba(255,255,255,0.8)',
  },
});
