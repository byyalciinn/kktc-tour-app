/**
 * DestinationSearchSheet Component
 * 
 * A modal sheet for searching tours and routes
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore, useTourStore, useRouteStore } from '@/stores';
import { Tour, ThematicRoute } from '@/types';
import CachedImage from '@/components/ui/CachedImage';
import { useDebounce } from '@/hooks';

interface DestinationSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectTour: (tour: Tour) => void;
  onSelectRoute: (route: ThematicRoute) => void;
}

export const DestinationSearchSheet: React.FC<DestinationSearchSheetProps> = ({
  visible,
  onClose,
  onSelectTour,
  onSelectRoute,
}) => {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'tours' | 'routes'>('all');
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Store data
  const tours = useTourStore((state) => state.tours);
  const searchTours = useTourStore((state) => state.searchTours);
  const searchResults = useTourStore((state) => state.searchResults);
  const isSearching = useTourStore((state) => state.isSearching);
  const clearSearch = useTourStore((state) => state.clearSearch);

  const routes = useRouteStore((state) => state.routes);

  // Filter routes locally
  const filteredRoutes = routes.filter((route) => {
    if (!debouncedQuery.trim()) return true;
    const query = debouncedQuery.toLowerCase();
    return (
      route.title.toLowerCase().includes(query) ||
      route.baseLocation.toLowerCase().includes(query) ||
      route.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  // Get display data based on search
  const displayTours = debouncedQuery.trim() ? searchResults : tours.slice(0, 10);
  const displayRoutes = filteredRoutes.slice(0, 10);

  // Search effect
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchTours(debouncedQuery);
    } else {
      clearSearch();
    }
  }, [debouncedQuery, searchTours, clearSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setSearchQuery('');
      clearSearch();
    }
  }, [visible, clearSearch]);

  const handleSelectTour = useCallback((tour: Tour) => {
    Keyboard.dismiss();
    onClose();
    setTimeout(() => onSelectTour(tour), 300);
  }, [onClose, onSelectTour]);

  const handleSelectRoute = useCallback((route: ThematicRoute) => {
    Keyboard.dismiss();
    onClose();
    setTimeout(() => onSelectRoute(route), 300);
  }, [onClose, onSelectRoute]);

  const renderTourItem = (tour: Tour) => (
    <TouchableOpacity
      key={tour.id}
      style={[
        styles.resultItem,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
      ]}
      onPress={() => handleSelectTour(tour)}
      activeOpacity={0.7}
    >
      <CachedImage
        uri={tour.image}
        style={styles.resultImage}
        fallbackIcon="map-outline"
        skeletonColor={isDark ? '#374151' : '#E5E7EB'}
      />
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
          {tour.title}
        </Text>
        <View style={styles.resultMeta}>
          <Ionicons name="location" size={12} color={colors.textSecondary} />
          <Text style={[styles.resultLocation, { color: colors.textSecondary }]} numberOfLines={1}>
            {tour.location}
          </Text>
        </View>
        <Text style={[styles.resultPrice, { color: colors.primary }]}>
          {tour.currency}{tour.price}
        </Text>
      </View>
      <View style={[styles.resultBadge, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="compass-outline" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderRouteItem = (route: ThematicRoute) => (
    <TouchableOpacity
      key={route.id}
      style={[
        styles.resultItem,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        },
      ]}
      onPress={() => handleSelectRoute(route)}
      activeOpacity={0.7}
    >
      <CachedImage
        uri={route.coverImage}
        style={styles.resultImage}
        fallbackIcon="trail-sign-outline"
        skeletonColor={isDark ? '#374151' : '#E5E7EB'}
      />
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
          {route.title}
        </Text>
        <View style={styles.resultMeta}>
          <Ionicons name="location" size={12} color={colors.textSecondary} />
          <Text style={[styles.resultLocation, { color: colors.textSecondary }]} numberOfLines={1}>
            {route.baseLocation}
          </Text>
        </View>
        <Text style={[styles.resultDuration, { color: colors.textSecondary }]}>
          {route.durationLabel || `${route.durationDays} gün`}
        </Text>
      </View>
      <View style={[styles.resultBadge, { backgroundColor: '#10B981' + '20' }]}>
        <Ionicons name="trail-sign-outline" size={14} color="#10B981" />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('explore.searchDestination')}
            </Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchInputContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('explore.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {(['all', 'tours', 'routes'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeTab === tab ? colors.primary : 'transparent',
                    borderColor: activeTab === tab ? colors.primary : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? '#FFF' : colors.text },
                  ]}
                >
                  {tab === 'all' ? t('home.allCategories') : tab === 'tours' ? t('explore.tours') : t('explore.routes')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results */}
        <ScrollView
          style={styles.results}
          contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Tours Section */}
              {(activeTab === 'all' || activeTab === 'tours') && displayTours.length > 0 && (
                <View style={styles.section}>
                  {activeTab === 'all' && (
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('explore.tours')}
                    </Text>
                  )}
                  {displayTours.map(renderTourItem)}
                </View>
              )}

              {/* Routes Section */}
              {(activeTab === 'all' || activeTab === 'routes') && displayRoutes.length > 0 && (
                <View style={styles.section}>
                  {activeTab === 'all' && (
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('explore.routes')}
                    </Text>
                  )}
                  {displayRoutes.map(renderRouteItem)}
                </View>
              )}

              {/* Empty State */}
              {displayTours.length === 0 && displayRoutes.length === 0 && debouncedQuery.trim() && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                    {t('explore.noResults')}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  results: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  resultPrice: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  resultDuration: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    textAlign: 'center',
  },
});

export default DestinationSearchSheet;
