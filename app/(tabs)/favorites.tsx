import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useCallback, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Tour } from '@/types';
import { useFavoritesStore, useAuthStore, useUIStore, useThemeStore } from '@/stores';
import { TourDetailSheet } from '@/components/sheets';
import { FavoritesEmptyState, LoginRequiredEmptyState, FavoritesScreenSkeleton } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { FavoriteCard } from '@/components/cards';

export default function FavoritesScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Zustand stores
  const { user } = useAuthStore();
  const { 
    favorites, 
    isLoading, 
    fetchFavorites, 
    removeFavorite 
  } = useFavoritesStore();
  const { 
    selectedTour, 
    isTourDetailVisible, 
    openTourDetail, 
    closeTourDetail 
  } = useUIStore();

  const [refreshing, setRefreshing] = useState(false);

  // Load favorites when user changes
  useEffect(() => {
    if (user) {
      fetchFavorites(user.id);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchFavorites(user.id);
    setRefreshing(false);
  }, [user, fetchFavorites]);

  // Handle remove from favorites
  const handleRemoveFavorite = async (tourId: string) => {
    if (!user) return;

    Alert.alert(
      t('favorites.removeConfirmTitle'),
      t('favorites.removeConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('favorites.remove'),
          style: 'destructive',
          onPress: async () => {
            await removeFavorite(user.id, tourId);
          },
        },
      ]
    );
  };

  // Handle tour press
  const handleTourPress = (tour: Tour) => {
    openTourDetail(tour);
  };

  const handleCloseSheet = () => {
    closeTourDetail();
    // Note: No need to refetch here - favorites store uses optimistic updates
    // The toggleFavorite action in favoritesStore already updates local state
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('favorites.title')}
          </Text>
          {favorites.length > 0 && (
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}> 
              {t('favorites.countLabel', { count: favorites.length })}
            </Text>
          )}
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !user ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="person-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('favorites.loginTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('favorites.loginSubtitle')}
            </Text>
          </View>
        ) : favorites.length > 0 ? (
          <View style={styles.toursList}>
            {favorites.map((tour) => (
              <TouchableOpacity
                key={tour.id}
                style={styles.tourCard}
                activeOpacity={0.95}
                onPress={() => handleTourPress(tour)}
              >
                <Image source={{ uri: tour.image }} style={styles.tourImage} />
                {/* Overlay gradient */}
                <View style={styles.tourCardGradient} />
                
                {/* Favorite Button */}
                <TouchableOpacity
                  style={styles.favoriteButton}
                  activeOpacity={0.8}
                  onPress={() => handleRemoveFavorite(tour.id)}
                >
                  <Ionicons name="heart" size={22} color="#FF6B6B" />
                </TouchableOpacity>
                
                {/* Bottom Content - Only title and location */}
                <View style={styles.tourCardContent}>
                  <Text style={styles.tourTitle} numberOfLines={1}>
                    {tour.title}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.locationText}>
                      {tour.location}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('favorites.empty')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('favorites.emptySubtitle')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Tour Detail Sheet */}
      <TourDetailSheet
        tour={selectedTour}
        visible={isTourDetailVisible}
        onClose={handleCloseSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  toursList: {
    gap: 20,
  },
  tourCard: {
    width: '100%',
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  tourImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tourCardGradient: {
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
  tourCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  tourTitle: {
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
