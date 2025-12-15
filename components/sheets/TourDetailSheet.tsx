import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { Tour } from '@/types';
import { useFavoritesStore, useAuthStore, useTourStore, useThemeStore } from '@/stores';
import { PaywallSheet } from '@/components/ui';
import { prefetchImages } from '@/components/ui/CachedImage';

const { width, height } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = height * 0.92;
const SHEET_MIN_HEIGHT = height * 0.6;
const IMAGE_HEIGHT = height * 0.35;

interface TourDetailSheetProps {
  tour: Tour | null;
  visible: boolean;
  onClose: () => void;
}

export default function TourDetailSheet({
  tour,
  visible,
  onClose,
}: TourDetailSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();
  
  // Zustand stores
  const { user } = useAuthStore();
  const { isFavorited: checkIsFavorited, toggleFavorite } = useFavoritesStore();
  const { tours } = useTourStore();

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Update current tour when tour prop changes
  useEffect(() => {
    if (tour) {
      setCurrentTour(tour);
    }
  }, [tour]);

  // Reset currentTour after sheet is fully closed (after animation delay)
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => {
        setCurrentTour(null);
      }, 350); // Slightly longer than close animation
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Related tours (same category, excluding current)
  const relatedTours = currentTour
    ? tours.filter((t) => t.category === currentTour.category && t.id !== currentTour.id).slice(0, 4)
    : [];

  // Prefetch related tour images for faster loading
  useEffect(() => {
    if (visible && relatedTours.length > 0) {
      const imageUrls = relatedTours.map(t => t.image).filter(Boolean);
      prefetchImages(imageUrls);
    }
  }, [visible, relatedTours]);

  // Handle related tour press
  const handleRelatedTourPress = (relatedTour: Tour) => {
    setCurrentTour(relatedTour);
    // Check if new tour is favorited
    const favorited = checkIsFavorited(relatedTour.id);
    setIsFavorited(favorited);
  };

  // Check if tour is favorited when modal opens
  useEffect(() => {
    if (visible && tour) {
      const favorited = checkIsFavorited(tour.id);
      setIsFavorited(favorited);
    }
  }, [visible, tour, checkIsFavorited]);

  useEffect(() => {
    if (visible && tour) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 300,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, tour]);

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired'), t('auth.loginRequiredMessage'));
      return;
    }
    if (!currentTour) return;

    setIsTogglingFavorite(true);
    const { isFavorited: newState, error, requiresUpgrade } = await toggleFavorite(user.id, currentTour);
    setIsTogglingFavorite(false);

    if (requiresUpgrade) {
      // Show paywall when user hits favorite limit
      setShowPaywall(true);
    } else if (error) {
      Alert.alert(t('common.error'), error);
    } else {
      setIsFavorited(newState);
    }
  };

  // Handle directions
  const handleGetDirections = () => {
    if (!currentTour) return;
    
    // Open Google Maps with location search
    const query = encodeURIComponent(currentTour.location);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const handleClose = useCallback(() => {
    // Stop any ongoing animations first
    slideAnim.stopAnimation();
    fadeAnim.stopAnimation();
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      // Only call onClose if animation completed or was interrupted
      if (finished.finished || !visible) {
        onClose();
      }
    });
  }, [slideAnim, fadeAnim, onClose, visible]);

  // Ref to track if close is in progress to prevent double-close
  const isClosingRef = useRef(false);

  // Pan responder for drag to close - using useMemo to recreate when handleClose changes
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to downward gestures and not during close
          return gestureState.dy > 10 && !isClosingRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0 && !isClosingRef.current) {
            slideAnim.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isClosingRef.current) return;
          
          if (gestureState.dy > 100 || gestureState.vy > 0.5) {
            // Haptic feedback on sheet dismiss
            isClosingRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleClose();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 25,
              stiffness: 300,
            }).start();
          }
        },
      }),
    [handleClose, slideAnim]
  );

  // Reset closing ref when visibility changes
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
    }
  }, [visible]);

  // Reset animations when sheet is closed
  useEffect(() => {
    if (!visible) {
      // Reset animation values for next open
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  // Don't render if no tour and not visible
  if (!currentTour && !visible) return null;

  // If closing (visible but no currentTour), still render Modal but let it close
  if (!currentTour) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.backdrop} />
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={() => {
            if (!isClosingRef.current) {
              isClosingRef.current = true;
              handleClose();
            }
          }} 
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Animated.Image
            source={{ uri: currentTour.image }}
            style={[
              styles.heroImage,
              { transform: [{ scale: imageScale }] },
            ]}
            resizeMode="cover"
          />
          
          {/* Top Buttons */}
          <View style={[styles.topButtons, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={[
                styles.topButton,
                { backgroundColor: isDark ? 'rgba(40,40,40,0.95)' : 'rgba(255, 255, 255, 0.95)' }
              ]}
              onPress={() => {
                if (!isClosingRef.current) {
                  isClosingRef.current = true;
                  handleClose();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color={isDark ? '#FFF' : '#000'} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.topButton, 
                { backgroundColor: isDark ? 'rgba(40,40,40,0.95)' : 'rgba(255, 255, 255, 0.95)' },
                isFavorited && { backgroundColor: 'rgba(255, 107, 107, 0.2)' }
              ]} 
              activeOpacity={0.8}
              onPress={handleToggleFavorite}
              disabled={isTogglingFavorite}
            >
              <Ionicons 
                name={isFavorited ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorited ? "#FF6B6B" : (isDark ? '#FFF' : '#000')} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            {/* Title & Location */}
            <View style={styles.headerRow}>
              <View style={styles.titleSection}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {currentTour.title}
                </Text>
                <Text style={[styles.location, { color: colors.textSecondary }]}>
                  {currentTour.location}
                </Text>
              </View>
            </View>

            {/* Highlights - Inline chips */}
            <View style={styles.highlightsContainer}>
              {currentTour.highlights.map((highlight, index) => (
                <View
                  key={index}
                  style={[
                    styles.highlightChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)',
                      borderColor: isDark
                        ? 'rgba(255,255,255,0.15)'
                        : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                >
                  <Text style={[styles.highlightText, { color: colors.text }]}>
                    {highlight}
                  </Text>
                </View>
              ))}
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={[styles.description, { color: colors.text }]}>
                {currentTour.description}
              </Text>
              <TouchableOpacity style={styles.readMoreButton}>
                <Text style={[styles.readMoreText, { color: colors.text }]}>
                  {t('tour.readMore')}
                </Text>
                <View style={[styles.readMoreLine, { backgroundColor: colors.text }]} />
              </TouchableOpacity>
            </View>

            {/* Upcoming Tours */}
            {relatedTours.length > 0 && (
              <View style={styles.upcomingSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('tour.relatedTours')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.upcomingContainer}
                >
                  {relatedTours.map((relatedTour) => (
                    <TouchableOpacity 
                      key={relatedTour.id} 
                      style={styles.upcomingCard}
                      activeOpacity={0.9}
                      onPress={() => handleRelatedTourPress(relatedTour)}
                    >
                      <Image
                        source={{ uri: relatedTour.image }}
                        style={styles.upcomingImage}
                      />
                      {/* Gradient Overlay */}
                      <View style={styles.upcomingGradient} />
                      {/* Arrow Button */}
                      <TouchableOpacity 
                        style={[
                          styles.upcomingArrow,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(255, 255, 255, 0.95)' }
                        ]}
                        onPress={() => handleRelatedTourPress(relatedTour)}
                      >
                        <Ionicons name="arrow-forward" size={16} color="#000" />
                      </TouchableOpacity>
                      {/* Content on Image */}
                      <View style={styles.upcomingContent}>
                        <Text
                          style={styles.upcomingTitle}
                          numberOfLines={1}
                        >
                          {relatedTour.title}
                        </Text>
                        <View style={styles.upcomingMeta}>
                          <Text style={styles.upcomingLocation}>
                            {relatedTour.location.split(',')[0]}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Bottom CTA */}
          <View
            style={[
              styles.bottomCTA,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                paddingBottom: insets.bottom + 16,
                borderTopColor: isDark
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(0,0,0,0.08)',
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.bookButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.9}
              onPress={handleGetDirections}
            >
              <Ionicons name="navigate" size={18} color="#FFF" />
              <Text style={styles.bookButtonText}>{t('tour.getDirections')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Paywall Sheet */}
      <PaywallSheet
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="favorites"
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  imageContainer: {
    height: IMAGE_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  contentContainer: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  location: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  ratingSection: {
    alignItems: 'flex-end',
  },
  ratingScore: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 24,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  readMoreLine: {
    height: 1.5,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  highlightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  highlightChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  highlightText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  upcomingSection: {
    marginBottom: 24,
  },
  upcomingContainer: {
    gap: 12,
  },
  upcomingCard: {
    width: width * 0.48,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  upcomingImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  upcomingGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  upcomingArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  upcomingTitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingLocation: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    color: 'rgba(255,255,255,0.85)',
  },
  upcomingRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingRatingText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceInfoButton: {
    padding: 2,
  },
  ctaPrice: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
  },
  ctaPriceLabel: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    marginLeft: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
