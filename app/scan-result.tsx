/**
 * Scan Result Screen - Premium, elegant, minimal design
 * Clean typography, subtle shadows, refined spacing
 */

import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/Colors';
import { useThemeStore } from '@/stores';
import { useScanStore, selectAnalysisResult, selectImageUri } from '@/stores/scanStore';

const { width } = Dimensions.get('window');

export default function ScanResultScreen() {
  const { colorScheme } = useThemeStore();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { t } = useTranslation();

  const analysisResult = useScanStore(selectAnalysisResult);
  const imageUri = useScanStore(selectImageUri);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!analysisResult) {
      router.back();
    }
  }, [analysisResult]);

  if (!analysisResult || !imageUri) {
    return null;
  }

  const confidencePercent = Math.round((analysisResult.confidence || 0) * 100);

  const handleShare = async () => {
    try {
      await Share.share({
        title: analysisResult.placeName,
        message: `${analysisResult.placeName}\n\n${analysisResult.description}\n\n${t('scan.discoveredWith')}`,
      });
    } catch {}
  };

  const bgColor = isDark ? '#0D0D0D' : '#FAFAFA';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = isDark ? '#FFFFFF' : '#111111';
  const textSecondary = isDark ? '#888888' : '#666666';
  const textMuted = isDark ? '#555555' : '#999999';
  const borderColor = isDark ? '#252525' : '#F0F0F0';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Minimal Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <Animated.View
            style={[
              styles.imageContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Image source={{ uri: imageUri }} style={styles.heroImage} />
            
            {/* Confidence pill */}
            <View style={[styles.confidencePill, { backgroundColor: cardBg }]}>
              <Text style={[styles.confidenceValue, { color: colors.primary }]}>
                {confidencePercent}%
              </Text>
              <Text style={[styles.confidenceLabel, { color: textMuted }]}>
                {t('scan.confidence')}
              </Text>
            </View>
          </Animated.View>

          {/* Title Block */}
          <Animated.View
            style={[
              styles.titleBlock,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.category, { color: textMuted }]}>
              {t(`scan.categories.${analysisResult.category}`)}
            </Text>
            <Text style={[styles.placeName, { color: textPrimary }]}>
              {analysisResult.placeName}
            </Text>
            {analysisResult.placeNameLocal && (
              <Text style={[styles.placeNameLocal, { color: textSecondary }]}>
                {analysisResult.placeNameLocal}
              </Text>
            )}
            {analysisResult.location?.city && (
              <Text style={[styles.location, { color: textMuted }]}>
                {[analysisResult.location.city, analysisResult.location.region].filter(Boolean).join(' · ')}
              </Text>
            )}
          </Animated.View>

          {/* Info Pills */}
          {(analysisResult.historicalPeriod || analysisResult.yearBuilt) && (
            <Animated.View
              style={[
                styles.pillsRow,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {analysisResult.historicalPeriod && (
                <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.pillText, { color: textPrimary }]}>
                    {analysisResult.historicalPeriod}
                  </Text>
                </View>
              )}
              {analysisResult.yearBuilt && (
                <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.pillText, { color: textPrimary }]}>
                    {analysisResult.yearBuilt}
                  </Text>
                </View>
              )}
              {analysisResult.estimatedDuration && (
                <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor }]}>
                  <Text style={[styles.pillText, { color: textPrimary }]}>
                    {analysisResult.estimatedDuration}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Description */}
          <Animated.View
            style={[
              styles.section,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: textMuted }]}>
              {t('scan.description')}
            </Text>
            <Text style={[styles.bodyText, { color: textSecondary }]}>
              {analysisResult.description}
            </Text>
          </Animated.View>

          {/* Significance */}
          {analysisResult.significance && (
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: textMuted }]}>
                {t('scan.significance')}
              </Text>
              <Text style={[styles.bodyText, { color: textSecondary }]}>
                {analysisResult.significance}
              </Text>
            </Animated.View>
          )}

          {/* Fun Facts */}
          {analysisResult.funFacts && analysisResult.funFacts.length > 0 && (
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: textMuted }]}>
                {t('scan.funFacts')}
              </Text>
              {analysisResult.funFacts.map((fact, i) => (
                <View key={i} style={styles.factRow}>
                  <View style={[styles.factDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.factText, { color: textSecondary }]}>{fact}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Visit Tips */}
          {analysisResult.visitTips && analysisResult.visitTips.length > 0 && (
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: textMuted }]}>
                {t('scan.visitTips')}
              </Text>
              {analysisResult.visitTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={[styles.tipNum, { color: colors.primary }]}>{i + 1}</Text>
                  <Text style={[styles.tipText, { color: textSecondary }]}>{tip}</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* Nearby */}
          {analysisResult.nearbyAttractions && analysisResult.nearbyAttractions.length > 0 && (
            <Animated.View
              style={[
                styles.section,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={[styles.sectionLabel, { color: textMuted }]}>
                {t('scan.nearbyAttractions')}
              </Text>
              <View style={styles.tagsWrap}>
                {analysisResult.nearbyAttractions.map((place, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.tagText, { color: textPrimary }]}>{place}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: bgColor,
              paddingBottom: insets.bottom + 20,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              useScanStore.getState().clearAnalysis();
              router.back();
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaText}>{t('scan.scanAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  imageContainer: {
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
  },
  confidencePill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  confidenceValue: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  confidenceLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  titleBlock: {
    marginBottom: 24,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  placeName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 38,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  placeNameLocal: {
    fontSize: 18,
    fontWeight: '400',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  location: {
    fontSize: 14,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  infoPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  factRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  factDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: 14,
  },
  factText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipNum: {
    fontSize: 14,
    fontWeight: '700',
    width: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
});
