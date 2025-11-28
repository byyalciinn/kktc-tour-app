import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton loading placeholder with shimmer animation
 */
export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for tour cards on home screen
 */
export function TourCardSkeleton() {
  return (
    <View style={styles.tourCard}>
      <Skeleton width="100%" height={280} borderRadius={24} />
      <View style={styles.tourCardOverlay}>
        <View style={styles.tourCardTop}>
          <Skeleton width={80} height={36} borderRadius={18} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <View style={styles.tourCardBottom}>
          <View style={styles.tourCardLeft}>
            <Skeleton width={180} height={28} borderRadius={6} />
            <Skeleton width={120} height={16} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.tourCardRight}>
            <Skeleton width={60} height={28} borderRadius={6} />
            <Skeleton width={50} height={14} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton for favorite cards
 */
export function FavoriteCardSkeleton() {
  return (
    <View style={styles.favoriteCard}>
      <Skeleton width="100%" height={220} borderRadius={24} />
      <View style={styles.favoriteOverlay}>
        <View style={styles.favoriteTop}>
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <View style={styles.favoriteBottom}>
          <Skeleton width={160} height={24} borderRadius={6} />
          <Skeleton width={100} height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton for category icons
 */
export function CategorySkeleton() {
  return (
    <View style={styles.categoryItem}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <Skeleton width={40} height={14} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * Home screen skeleton loader
 */
export function HomeScreenSkeleton() {
  return (
    <View style={styles.homeContainer}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.headerCenter}>
          <Skeleton width={50} height={12} borderRadius={4} />
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>

      {/* Search bar skeleton */}
      <Skeleton width="100%" height={52} borderRadius={28} style={{ marginVertical: 20 }} />

      {/* Categories skeleton */}
      <View style={styles.categoriesRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <CategorySkeleton key={i} />
        ))}
      </View>

      {/* Tour cards skeleton */}
      <View style={styles.cardsContainer}>
        <TourCardSkeleton />
        <TourCardSkeleton />
      </View>
    </View>
  );
}

/**
 * Favorites screen skeleton loader
 */
export function FavoritesScreenSkeleton() {
  return (
    <View style={styles.favoritesContainer}>
      {/* Header skeleton */}
      <View style={styles.favoritesHeader}>
        <Skeleton width={150} height={32} borderRadius={8} />
        <Skeleton width={50} height={16} borderRadius={4} />
      </View>

      {/* Favorite cards skeleton */}
      <View style={styles.cardsContainer}>
        <FavoriteCardSkeleton />
        <FavoriteCardSkeleton />
        <FavoriteCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E1E9EE',
  },
  // Tour card skeleton
  tourCard: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    marginBottom: 20,
    position: 'relative',
  },
  tourCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  tourCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tourCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  tourCardLeft: {},
  tourCardRight: {
    alignItems: 'flex-end',
  },
  // Favorite card skeleton
  favoriteCard: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    marginBottom: 20,
    position: 'relative',
  },
  favoriteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  favoriteTop: {
    alignItems: 'flex-end',
  },
  favoriteBottom: {
    paddingBottom: 4,
  },
  // Category skeleton
  categoryItem: {
    alignItems: 'center',
    marginRight: 24,
  },
  // Home screen skeleton
  homeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerCenter: {
    alignItems: 'center',
  },
  categoriesRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 20,
  },
  // Favorites screen skeleton
  favoritesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
});
