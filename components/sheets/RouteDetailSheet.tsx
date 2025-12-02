/**
 * RouteDetailSheet Component
 * iOS 26 Liquid Glass design for thematic route details
 * 
 * Features:
 * - Full-screen modal with smooth animations
 * - Day-by-day itinerary timeline
 * - Stop cards with glass effect
 * - No pricing (informational only)
 */

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { ThematicRoute, RouteDay, RouteStop } from '@/types';
import { useThemeStore, useTourStore, useUIStore } from '@/stores';
import { 
  getThemeIcon, 
  getDifficultyInfo, 
  getStopTypeIcon,
  getTimeOfDayLabel,
} from '@/constants/ThematicRoutes';

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.32;

interface RouteDetailSheetProps {
  route: ThematicRoute | null;
  visible: boolean;
  onClose: () => void;
}

export default function RouteDetailSheet({
  route,
  visible,
  onClose,
}: RouteDetailSheetProps) {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  // Tour store for linking to tour details
  const { getTourById } = useTourStore();
  const { openTourDetail } = useUIStore();

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  // Reset expanded day when route changes
  useEffect(() => {
    if (route) {
      setExpandedDay(1);
    }
  }, [route?.id]);

  // Animation on open/close
  useEffect(() => {
    if (visible && route) {
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
  }, [visible, route]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
        damping: 25,
        stiffness: 300,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, slideAnim, fadeAnim]);

  // Handle stop press - if it's a tour, open tour detail
  const handleStopPress = (stop: RouteStop) => {
    if (stop.tourId) {
      const tour = getTourById(stop.tourId);
      if (tour) {
        handleClose();
        setTimeout(() => {
          openTourDetail(tour);
        }, 300);
      }
    }
  };

  // Toggle day expansion
  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  if (!route) return null;

  const themeIcon = getThemeIcon(route.theme);
  const difficultyInfo = getDifficultyInfo(route.difficulty);
  const themeLabel = t(`explore.themes.${route.theme}`) || route.theme;
  const totalStops = route.totalStops || route.itinerary.reduce((acc, day) => acc + day.stops.length, 0);

  // Parallax effect for header image
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [50, 0, -30],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
              backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Image with Parallax */}
          <Animated.View
            style={[
              styles.imageContainer,
              {
                transform: [
                  { translateY: imageTranslateY },
                  { scale: imageScale },
                ],
              },
            ]}
          >
            <Image
              source={{ uri: route.coverImage }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            {/* Gradient overlay */}
            <View style={styles.imageGradient} />
          </Animated.View>

          {/* Close button */}
          <View style={[styles.closeButtonContainer, { top: insets.top + 10 }]}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Badges on image */}
          <View style={[styles.imageBadges, { top: insets.top + 10 }]}>
            {/* Theme badge */}
            <View style={styles.themeBadge}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
              )}
              <View style={styles.themeBadgeContent}>
                <Ionicons name={themeIcon as any} size={14} color="#FFF" />
                <Text style={styles.themeBadgeText}>{themeLabel}</Text>
              </View>
            </View>

            {/* Duration badge */}
            <View style={styles.durationBadge}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
              )}
              <Text style={styles.durationBadgeText}>
                {route.durationLabel || `${route.durationDays} ${t('explore.day')}`}
              </Text>
            </View>
          </View>

          {/* Scrollable Content */}
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 30 },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
            {/* Spacer for image */}
            <View style={{ height: IMAGE_HEIGHT - 40 }} />

            {/* Content Card with Glass Effect */}
            <View style={styles.contentCard}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  intensity={isDark ? 40 : 80}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)' },
                  ]}
                />
              )}

              {/* Title & Subtitle */}
              <View style={styles.titleSection}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {route.title}
                </Text>
                {route.subtitle && (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {route.subtitle}
                  </Text>
                )}
              </View>

              {/* Info Pills */}
              <View style={styles.infoPills}>
                {/* Location */}
                <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoPillText, { color: colors.text }]}>
                    {route.baseLocation}
                  </Text>
                </View>

                {/* Stops */}
                <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                  <Ionicons name="flag-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoPillText, { color: colors.text }]}>
                    {totalStops} {t('explore.stops')}
                  </Text>
                </View>

                {/* Difficulty */}
                {route.difficulty && (
                  <View style={[styles.infoPill, { backgroundColor: `${difficultyInfo.color}15` }]}>
                    <View style={[styles.difficultyDot, { backgroundColor: difficultyInfo.color }]} />
                    <Text style={[styles.infoPillText, { color: difficultyInfo.color }]}>
                      {t(`explore.difficulties.${route.difficulty}`)}
                    </Text>
                  </View>
                )}

                {/* Best Season */}
                {route.bestSeason && (
                  <View style={[styles.infoPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="sunny-outline" size={16} color={colors.primary} />
                    <Text style={[styles.infoPillText, { color: colors.text }]}>
                      {route.bestSeason}
                    </Text>
                  </View>
                )}
              </View>

              {/* Tags */}
              {route.tags && route.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {route.tags.map((tag, index) => (
                    <View
                      key={index}
                      style={[
                        styles.tag,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />

              {/* Itinerary Section */}
              <View style={styles.itinerarySection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('explore.dayProgram')}
                </Text>

                {route.itinerary.map((day) => (
                  <DayCard
                    key={day.dayIndex}
                    day={day}
                    isExpanded={expandedDay === day.dayIndex}
                    onToggle={() => toggleDay(day.dayIndex)}
                    onStopPress={handleStopPress}
                    colors={colors}
                    isDark={isDark}
                    t={t}
                  />
                ))}
              </View>
            </View>
          </Animated.ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Day Card Component
interface DayCardProps {
  day: RouteDay;
  isExpanded: boolean;
  onToggle: () => void;
  onStopPress: (stop: RouteStop) => void;
  colors: typeof Colors.light;
  isDark: boolean;
  t: any;
}

function DayCard({ day, isExpanded, onToggle, onStopPress, colors, isDark, t }: DayCardProps) {
  return (
    <View style={styles.dayCard}>
      {/* Day Header */}
      <TouchableOpacity
        style={[
          styles.dayHeader,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeaderLeft}>
          <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.dayBadgeText}>{day.dayIndex}</Text>
          </View>
          <View style={styles.dayHeaderText}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>
              {t('explore.day')} {day.dayIndex}
            </Text>
            <Text style={[styles.daySubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {day.title}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Stops List (Expanded) */}
      {isExpanded && (
        <View style={styles.stopsContainer}>
          {day.description && (
            <Text style={[styles.dayDescription, { color: colors.textSecondary }]}>
              {day.description}
            </Text>
          )}

          {day.stops.map((stop, index) => (
            <StopCard
              key={stop.id}
              stop={stop}
              isLast={index === day.stops.length - 1}
              onPress={() => onStopPress(stop)}
              colors={colors}
              isDark={isDark}
              t={t}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Stop Card Component
interface StopCardProps {
  stop: RouteStop;
  isLast: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
  isDark: boolean;
  t: any;
}

function StopCard({ stop, isLast, onPress, colors, isDark, t }: StopCardProps) {
  const stopIcon = getStopTypeIcon(stop.type);
  const timeLabel = stop.timeOfDay ? getTimeOfDayLabel(stop.timeOfDay) : null;
  const hasLink = !!stop.tourId;

  return (
    <TouchableOpacity
      style={styles.stopCard}
      onPress={onPress}
      activeOpacity={hasLink ? 0.7 : 1}
      disabled={!hasLink}
    >
      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, { backgroundColor: colors.primary }]}>
          <Ionicons name={stopIcon as any} size={12} color="#FFF" />
        </View>
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
        )}
      </View>

      {/* Stop Content */}
      <View
        style={[
          styles.stopContent,
          {
            backgroundColor: isDark ? 'rgba(40,40,40,0.98)' : 'rgba(255,255,255,0.98)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          },
        ]}
      >
        {/* Stop Image (if available) */}
        {stop.image && (
          <Image source={{ uri: stop.image }} style={styles.stopImage} />
        )}

        <View style={styles.stopInfo}>
          {/* Time badge */}
          {timeLabel && (
            <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.primary + '15' }]}>
              <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.timeBadgeText, { color: colors.primary }]}>
                {timeLabel}
              </Text>
            </View>
          )}

          {/* Stop name */}
          <Text style={[styles.stopName, { color: colors.text }]}>
            {stop.name}
          </Text>

          {/* Description */}
          {stop.description && (
            <Text style={[styles.stopDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {stop.description}
            </Text>
          )}

          {/* Duration & Tips */}
          <View style={styles.stopMeta}>
            {stop.duration && (
              <View style={styles.stopMetaItem}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.stopMetaText, { color: colors.textSecondary }]}>
                  {stop.duration}
                </Text>
              </View>
            )}
            {hasLink && (
              <View style={styles.stopMetaItem}>
                <Ionicons name="information-circle-outline" size={12} color={colors.primary} />
                <Text style={[styles.stopMetaText, { color: colors.primary }]}>
                  {t('explore.moreInfo')}
                </Text>
              </View>
            )}
          </View>

          {/* Tips */}
          {stop.tips && (
            <View style={[styles.tipContainer, { backgroundColor: isDark ? 'rgba(240,58,82,0.1)' : 'rgba(240,58,82,0.08)' }]}>
              <Ionicons name="bulb-outline" size={14} color={colors.primary} />
              <Text style={[styles.tipText, { color: colors.text }]}>
                {stop.tips}
              </Text>
            </View>
          )}
        </View>

        {/* Arrow for linked stops */}
        {hasLink && (
          <View style={styles.stopArrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: IMAGE_HEIGHT,
    zIndex: 0,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButtonContainer: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageBadges: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  themeBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  themeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  themeBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#FFF',
  },
  durationBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  durationBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
    color: '#212529',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentCard: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: height - IMAGE_HEIGHT + 100,
  },
  titleSection: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 22,
  },
  infoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  infoPillText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
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
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  itinerarySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 16,
  },
  dayCard: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayBadgeText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    color: '#FFF',
  },
  dayHeaderText: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 3,
  },
  daySubtitle: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 18,
  },
  stopsContainer: {
    paddingTop: 12,
    paddingLeft: 8,
  },
  dayDescription: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
    marginBottom: 16,
    marginLeft: 40,
  },
  stopCard: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeline: {
    width: 32,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineLine: {
    width: 3,
    flex: 1,
    marginTop: 6,
    borderRadius: 1.5,
  },
  stopContent: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stopImage: {
    width: '100%',
    height: 120,
  },
  stopInfo: {
    padding: 14,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 10,
  },
  timeBadgeText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '600',
  },
  stopName: {
    fontSize: 17,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  stopDescription: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 20,
    marginBottom: 10,
  },
  stopMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stopMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopMetaText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    lineHeight: 16,
  },
  stopArrow: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -9,
  },
});
