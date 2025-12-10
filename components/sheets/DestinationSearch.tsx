import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { Tour, tourDataToTour } from '@/types';
import { searchTours, TourData } from '@/lib/tourService';
import { useDebounce } from '@/hooks';
import { useTranslation } from 'react-i18next';
import { sanitizeInput } from '@/lib/validation';

const { width, height } = Dimensions.get('window');
const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface DestinationSearchProps {
  onSelectTour?: (tour: Tour) => void;
  onSelectDestination?: (destination: string) => void;
  onClose?: () => void;
  autoOpen?: boolean;
}

// Fuzzy search scoring function
const calculateSearchScore = (query: string, tour: TourData): number => {
  const q = query.toLowerCase().trim();
  const title = tour.title.toLowerCase();
  const location = tour.location.toLowerCase();
  const description = (tour.description || '').toLowerCase();
  const category = tour.category.toLowerCase();
  
  let score = 0;
  
  // Exact match in title (highest priority)
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 80;
  else if (title.includes(q)) score += 60;
  
  // Word match in title
  const titleWords = title.split(/\s+/);
  titleWords.forEach(word => {
    if (word.startsWith(q)) score += 40;
  });
  
  // Location match
  if (location.includes(q)) score += 30;
  
  // Category match
  if (category.includes(q)) score += 25;
  
  // Description match (lower priority)
  if (description.includes(q)) score += 10;
  
  // Levenshtein-like partial match for typo tolerance
  const queryChars = q.split('');
  let matchedChars = 0;
  queryChars.forEach(char => {
    if (title.includes(char)) matchedChars++;
  });
  score += (matchedChars / queryChars.length) * 15;
  
  return score;
};

export default function DestinationSearch({
  onSelectTour,
  onSelectDestination,
  onClose,
  autoOpen = false,
}: DestinationSearchProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTours, setFilteredTours] = useState<TourData[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search query for server-side search
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Load recent searches from AsyncStorage
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        console.log('Error loading recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // Save recent search
  const saveRecentSearch = async (query: string) => {
    // Sanitize before saving to prevent XSS when displaying
    const sanitized = sanitizeInput(query, { maxLength: 100 });
    if (!sanitized) return;
    
    try {
      const updated = [
        sanitized,
        ...recentSearches.filter(s => s.toLowerCase() !== sanitized.toLowerCase())
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.log('Error saving recent search:', error);
    }
  };

  // Clear all recent searches
  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.log('Error clearing recent searches:', error);
    }
  };

  // Server-side search with debounced query
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.trim() === '') {
        setFilteredTours([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        const { data, error } = await searchTours(debouncedQuery);
        
        if (error) {
          console.log('Search error:', error);
          setFilteredTours([]);
        } else {
          setFilteredTours(data);
        }
      } catch (err) {
        console.log('Search exception:', err);
        setFilteredTours([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    setIsLoading(true);
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 28,
        stiffness: 350,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLoading(false);
      inputRef.current?.focus();
    });
  }, [slideAnim, fadeAnim]);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 28,
        stiffness: 350,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
      setSearchQuery('');
      setFilteredTours([]);
      onClose?.();
    });
  }, [slideAnim, fadeAnim, onClose]);

  const handleSelectTour = (tour: TourData) => {
    saveRecentSearch(tour.title);
    closeSearch();
    
    const tourForCallback: Tour = {
      id: tour.id,
      title: tour.title,
      location: tour.location,
      description: tour.description || '',
      price: tour.price,
      currency: tour.currency,
      duration: tour.duration,
      rating: tour.rating,
      reviewCount: tour.review_count,
      image: tour.image || '',
      highlights: tour.highlights || [],
      category: tour.category,
    };
    onSelectTour?.(tourForCallback);
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
  };

  const removeRecentSearch = async (query: string) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Auto open on mount
  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => {
        openSearch();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      {/* Search Trigger Button */}
      {!autoOpen && (
        <TouchableOpacity
          style={[styles.searchTrigger, { backgroundColor: colors.card }]}
          onPress={openSearch}
          activeOpacity={0.9}
        >
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.searchTriggerText, { color: colors.textSecondary }]}>
            {t('search.placeholder')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSearch}
      >
        {/* Transparent Blur Background */}
        <TouchableWithoutFeedback onPress={closeSearch}>
          <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={isDark ? 80 : 90}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View 
                style={[
                  StyleSheet.absoluteFill, 
                  { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.97)' }
                ]} 
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* Search Header */}
          <View style={styles.searchHeader}>
            <View style={[
              styles.searchInputContainer,
              { 
                backgroundColor: isDark 
                  ? 'rgba(255,255,255,0.12)' 
                  : 'rgba(0,0,0,0.06)',
              }
            ]}>
              <Ionicons 
                name="search" 
                size={20} 
                color={colors.textSecondary} 
              />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (searchQuery.trim()) {
                    saveRecentSearch(searchQuery);
                  }
                }}
              />
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {searchQuery.length > 0 && !isSearching && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={[
                    styles.clearButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                  ]}>
                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              onPress={closeSearch}
              style={styles.cancelButton}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>
                {t('search.cancel')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contentContainer}
          >
            {searchQuery.length === 0 ? (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        {t('search.recentSearches')}
                      </Text>
                      <TouchableOpacity onPress={clearRecentSearches}>
                        <Text style={[styles.clearAllText, { color: colors.primary }]}>
                          {t('search.clear')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.recentList}>
                      {recentSearches.map((search, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.recentChip,
                            { 
                              backgroundColor: isDark 
                                ? 'rgba(255,255,255,0.1)' 
                                : 'rgba(0,0,0,0.05)',
                            }
                          ]}
                          onPress={() => handleRecentSearch(search)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="time-outline" 
                            size={16} 
                            color={colors.textSecondary} 
                          />
                          <Text 
                            style={[styles.recentChipText, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {search}
                          </Text>
                          <TouchableOpacity
                            onPress={() => removeRecentSearch(search)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons 
                              name="close-circle" 
                              size={18} 
                              color={colors.textSecondary} 
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Empty State */}
                {recentSearches.length === 0 && (
                  <View style={styles.emptyState}>
                    <View style={[
                      styles.emptyIconContainer,
                      { backgroundColor: 'rgba(240, 58, 82, 0.1)' }
                    ]}>
                      <Ionicons 
                        name="search-outline" 
                        size={40} 
                        color={colors.primary} 
                      />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>
                      {t('search.emptyTitle')}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>
                      {t('search.emptySubtitle')}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* Search Results */
              <View style={styles.section}>
                {isSearching ? (
                  <View style={styles.searchingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : filteredTours.length > 0 ? (
                  <>
                    <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                      {t('search.resultsCount', { count: filteredTours.length })}
                    </Text>
                    
                    {filteredTours.map((tour) => (
                      <TouchableOpacity
                        key={tour.id}
                        style={[
                          styles.resultCard,
                          { 
                            backgroundColor: isDark 
                              ? 'rgba(255,255,255,0.08)' 
                              : 'rgba(255,255,255,0.9)',
                          }
                        ]}
                        onPress={() => handleSelectTour(tour)}
                        activeOpacity={0.8}
                      >
                        <Image 
                          source={{ uri: tour.image }} 
                          style={styles.resultImage} 
                        />
                        <View style={styles.resultContent}>
                          <Text 
                            style={[styles.resultTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {tour.title}
                          </Text>
                          <View style={styles.resultMeta}>
                            <Ionicons 
                              name="location-outline" 
                              size={13} 
                              color={colors.textSecondary} 
                            />
                            <Text style={[styles.resultLocation, { color: colors.textSecondary }]}>
                              {tour.location}
                            </Text>
                          </View>
                          <View style={styles.resultFooter}>
                            <Text style={[styles.resultPrice, { color: colors.primary }]}>
                              {tour.currency}{tour.price}
                            </Text>
                          </View>
                        </View>
                        <View style={[
                          styles.resultArrow,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                        ]}>
                          <Ionicons 
                            name="chevron-forward" 
                            size={18} 
                            color={colors.textSecondary} 
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.noResults}>
                    <View style={[
                      styles.noResultsIcon,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                    ]}>
                      <Ionicons 
                        name="search-outline" 
                        size={32} 
                        color={colors.textSecondary} 
                      />
                    </View>
                    <Text style={[styles.noResultsText, { color: colors.text }]}>
                      {t('search.noResults')}
                    </Text>
                    <Text style={[styles.noResultsHint, { color: colors.textSecondary }]}>
                      {t('search.noResultsHint', { query: searchQuery })}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger Button
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  searchTriggerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },

  // Modal
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Search Header
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '400',
  },

  // Recent Searches
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    maxWidth: '100%',
  },
  recentChipText: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    flexShrink: 1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },

  // Searching State
  searchingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  // Results
  resultCount: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '700',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultLocation: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
    fontWeight: '500',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  resultPrice: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '700',
  },
  resultArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // No Results
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  noResultsIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'sans-serif',
    fontWeight: '600',
  },
  noResultsHint: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'sans-serif',
  },
});
