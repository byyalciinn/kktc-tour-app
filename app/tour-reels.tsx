import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ViewToken,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Tour } from '@/types';
import { useTourStore, useUIStore } from '@/stores';
import TourReelCard from '@/components/cards/TourReelCard';
import ReelsProgressBar from '@/components/ui/ReelsProgressBar';
import { TourDetailSheet } from '@/components/sheets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Instagram Reels tarzı tam ekran tur görüntüleyici
 * - Horizontal swipe ile turlar arası geçiş
 * - Ekranın sağına dokunma → sonraki tur
 * - Ekranın soluna dokunma → önceki tur
 */
export default function TourReelsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList<Tour>>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  // Tüm turları al (kategori filtresi olmadan)
  const { allTours, fetchAllTours, isLoadingAllTours } = useTourStore();

  // İlk yüklemede tüm turları çek
  useEffect(() => {
    fetchAllTours();
  }, []);

  // Görünür item değiştiğinde index'i güncelle
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Sonraki tura geç
  const goToNext = useCallback(() => {
    if (currentIndex < allTours.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, allTours.length]);

  // Önceki tura geç
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  }, [currentIndex]);

  // Ekrana dokunma - sol/sağ yarı kontrolü
  const handleScreenTap = useCallback(
    (event: any) => {
      const touchX = event.nativeEvent.locationX;
      const screenHalf = SCREEN_WIDTH / 2;

      if (touchX > screenHalf) {
        // Sağ yarı - sonraki
        goToNext();
      } else {
        // Sol yarı - önceki
        goToPrevious();
      }
    },
    [goToNext, goToPrevious]
  );

  // Tur detayını aç
  const handleDetailPress = useCallback((tour: Tour) => {
    setSelectedTour(tour);
    setIsDetailVisible(true);
  }, []);

  // Detay sheet'i kapat
  const handleCloseDetail = useCallback(() => {
    setIsDetailVisible(false);
    setSelectedTour(null);
  }, []);

  // Geri dön
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Tur kartı render
  const renderItem = useCallback(
    ({ item }: { item: Tour }) => (
      <TourReelCard tour={item} onDetailPress={handleDetailPress} />
    ),
    [handleDetailPress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: Tour) => item.id, []);

  // getItemLayout for performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Loading State */}
      {isLoadingAllTours && allTours.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F89C28" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      )}

      {/* Empty State */}
      {!isLoadingAllTours && allTours.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyText}>{t('tours.noTours')}</Text>
        </View>
      )}

      {/* Dokunma alanı - FlatList üzerinde */}
      {allTours.length > 0 && (
        <TouchableOpacity
          style={styles.touchArea}
          activeOpacity={1}
          onPress={handleScreenTap}
        >
          {/* Turlar listesi - Horizontal scroll */}
          <FlatList
          ref={flatListRef}
          data={allTours}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
          scrollEnabled={true}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
        />
        </TouchableOpacity>
      )}

      {/* Progress bar - Üstte */}
      <View style={[styles.progressContainer, { top: insets.top + 16 }]}>
        <ReelsProgressBar totalCount={allTours.length} currentIndex={currentIndex} />
      </View>

      {/* Geri butonu */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 50 }]}
        onPress={handleBack}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Tur Detay Sheet */}
      <TourDetailSheet
        tour={selectedTour}
        visible={isDetailVisible}
        onClose={handleCloseDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  touchArea: {
    flex: 1,
  },
  progressContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
