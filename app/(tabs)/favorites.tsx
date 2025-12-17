import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

import { Colors } from '@/constants/Colors';
import { Tour } from '@/types';
import { useFavoritesStore, useAuthStore, useUIStore, useThemeStore } from '@/stores';
import { TourDetailSheet } from '@/components/sheets';
import { useTranslation } from 'react-i18next';
import { FavoriteCard } from '@/components/cards';

export default function FavoritesScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const translateLocationLabel = (value: string): string => {
    const raw = (value || '').trim();
    if (!raw) return value;

    const trToEn: Record<string, string> = {
      Girne: 'Kyrenia',
      Lefkoşa: 'Nicosia',
      Gazimağusa: 'Famagusta',
      İskele: 'Iskele',
      Karpaz: 'Karpas',
      'Kuzey Kıbrıs': 'Northern Cyprus',
      KKTC: 'Northern Cyprus',
    };

    const enToTr: Record<string, string> = {
      Kyrenia: 'Girne',
      Nicosia: 'Lefkoşa',
      Famagusta: 'Gazimağusa',
      Iskele: 'İskele',
      Karpas: 'Karpaz',
      'Northern Cyprus': 'Kuzey Kıbrıs',
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
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('favorites.title')}
            </Text>
            {favorites.length > 0 && (
              <Text style={[styles.headerCount, { color: colors.textSecondary }]}> 
                {t('favorites.countLabel', { count: favorites.length })}
              </Text>
            )}
          </View>
          
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !user ? (
          /* Guest Mode State - Apple Guideline 5.1.1(v) */
          <View style={styles.guestStateContainer}>
            <View style={[styles.guestIconContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons
                name="heart-outline"
                size={64}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('favorites.guestTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('favorites.guestSubtitle')}
            </Text>
            <TouchableOpacity
              style={[styles.guestLoginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(auth)')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFF" />
              <Text style={styles.guestLoginButtonText}>{t('auth.signIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.guestExploreButton}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={[styles.guestExploreButtonText, { color: colors.primary }]}>
                {t('favorites.exploreTours')}
              </Text>
            </TouchableOpacity>
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
                <Image source={{ uri: tour.imageThumb || tour.image }} style={styles.tourImage} />
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
                      {translateLocationLabel(tour.location)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Premium Empty State */
          <View style={styles.emptyStateContainer}>
            {/* Decorative Background Elements */}
            <View style={styles.emptyStateDecor}>
              <View style={[styles.decorCircle, styles.decorCircle1, { backgroundColor: `${colors.primary}10` }]} />
              <View style={[styles.decorCircle, styles.decorCircle2, { backgroundColor: `${colors.primary}08` }]} />
              <View style={[styles.decorCircle, styles.decorCircle3, { backgroundColor: `${colors.primary}05` }]} />
            </View>
            
            {/* Main Content */}
            <View style={styles.emptyStateContent}>
              {/* Animated Heart Icon */}
              <View style={styles.emptyIconWrapper}>
                <LinearGradient
                  colors={[`${colors.primary}20`, `${colors.primary}10`]}
                  style={styles.emptyIconGradient}
                >
                  <View style={[styles.emptyIconInner, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="heart" size={48} color={colors.primary} />
                  </View>
                </LinearGradient>
                {/* Floating hearts decoration */}
                <View style={[styles.floatingHeart, styles.floatingHeart1]}>
                  <Ionicons name="heart" size={16} color={`${colors.primary}40`} />
                </View>
                <View style={[styles.floatingHeart, styles.floatingHeart2]}>
                  <Ionicons name="heart" size={12} color={`${colors.primary}30`} />
                </View>
                <View style={[styles.floatingHeart, styles.floatingHeart3]}>
                  <Ionicons name="heart" size={14} color={`${colors.primary}35`} />
                </View>
              </View>
              
              {/* Text Content */}
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('favorites.empty')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t('favorites.emptySubtitle')}
              </Text>
              
              {/* CTA Button */}
              <TouchableOpacity
                style={styles.exploreCTAButton}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[colors.primary, '#E8354D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exploreCTAGradient}
                >
                  <Ionicons name="compass-outline" size={20} color="#FFF" />
                  <Text style={styles.exploreCTAText}>
                    {t('favorites.exploreTours')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Feature hints */}
              <View style={styles.featureHints}>
                <View style={styles.featureHint}>
                  <View style={[styles.featureHintIcon, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureHintText, { color: colors.textSecondary }]}>
                    {t('favorites.hint1')}
                  </Text>
                </View>
                <View style={styles.featureHint}>
                  <View style={[styles.featureHintIcon, { backgroundColor: `${colors.primary}10` }]}>
                    <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureHintText, { color: colors.textSecondary }]}>
                    {t('favorites.hint2')}
                  </Text>
                </View>
              </View>
            </View>
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
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerCount: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'right',
    flexShrink: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
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
  // Premium Empty State Styles
  emptyStateContainer: {
    flex: 1,
    paddingTop: 40,
    position: 'relative',
  },
  emptyStateDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -80,
  },
  decorCircle2: {
    width: 150,
    height: 150,
    top: 100,
    left: -60,
  },
  decorCircle3: {
    width: 120,
    height: 120,
    bottom: 50,
    right: -40,
  },
  emptyStateContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconWrapper: {
    position: 'relative',
    marginBottom: 32,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingHeart: {
    position: 'absolute',
  },
  floatingHeart1: {
    top: -5,
    right: 5,
  },
  floatingHeart2: {
    top: 20,
    left: -10,
  },
  floatingHeart3: {
    bottom: 10,
    right: -5,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  exploreCTAButton: {
    marginBottom: 40,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#F89C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  exploreCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 10,
  },
  exploreCTAText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  featureHints: {
    width: '100%',
    gap: 16,
  },
  featureHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
  },
  featureHintIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureHintText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
  },
  // Guest Mode Styles
  guestStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  guestIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  guestLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  guestLoginButtonText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guestExploreButton: {
    paddingVertical: 12,
  },
  guestExploreButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
});
