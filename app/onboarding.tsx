import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores';

const { width, height } = Dimensions.get('window');

// Onboarding data with KKTC Tour App specific content
const ONBOARDING_DATA = [
  {
    id: '1',
    icon: 'compass-outline',
    title: 'Keşfet ve',
    titleBold: 'Planla',
    description: 'KKTC\'nin en güzel turistik noktalarını keşfedin. Plajlardan tarihi mekanlara, doğa yürüyüşlerinden kültürel deneyimlere kadar her şey bir tık uzağınızda.',
    backgroundColor: '#E8F5E9',
    iconColor: '#4CAF50',
  },
  {
    id: '2',
    icon: 'heart-outline',
    title: 'Favorilerine',
    titleBold: 'Ekle',
    description: 'Beğendiğiniz turları favorilerinize ekleyin ve istediğiniz zaman kolayca erişin. Kişiselleştirilmiş seyahat listenizi oluşturun.',
    backgroundColor: '#FCE4EC',
    iconColor: '#E91E63',
  },
  {
    id: '3',
    icon: 'ticket-outline',
    title: 'Rezervasyon',
    titleBold: 'Yap',
    description: 'Turlarınızı anında rezerve edin ve unutulmaz deneyimlere hazır olun. Özel indirimler ve kampanyalardan yararlanın.',
    backgroundColor: '#E3F2FD',
    iconColor: '#2196F3',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { clearNewUserFlag } = useAuthStore();

  // Onboarding tamamlandığında çağrılacak fonksiyon
  const completeOnboarding = () => {
    clearNewUserFlag(); // isNewUser flag'ini temizle
    router.replace('/(tabs)');
  };

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Onboarding complete, go to main app
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const renderItem = ({ item, index }: { item: typeof ONBOARDING_DATA[0]; index: number }) => {
    return (
      <View style={styles.slide}>
        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: item.backgroundColor }]}>
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon as any} size={80} color={item.iconColor} />
          </View>
          {/* Decorative elements */}
          <View style={[styles.floatingIcon, styles.floatingIcon1, { backgroundColor: item.backgroundColor }]}>
            <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
          </View>
          <View style={[styles.floatingIcon, styles.floatingIcon2, { backgroundColor: item.backgroundColor }]}>
            <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
          </View>
          <View style={[styles.floatingIcon, styles.floatingIcon3, { backgroundColor: item.backgroundColor }]}>
            <Ionicons name={item.icon as any} size={16} color={item.iconColor} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            {item.title}{' '}
            <Text style={styles.titleBold}>{item.titleBold}</Text>
          </Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {ONBOARDING_DATA.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: currentIndex === index ? Colors.light.primary : '#212529',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Atla</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Previous Button */}
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonHidden]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <View style={styles.navButtonCircle}>
            <Ionicons name="arrow-back" size={24} color="#212529" />
          </View>
        </TouchableOpacity>

        {/* Dots */}
        {renderDots()}

        {/* Next Button */}
        <TouchableOpacity style={styles.navButton} onPress={handleNext}>
          <View style={[styles.navButtonCircle, styles.navButtonCircleActive]}>
            <Ionicons 
              name={currentIndex === ONBOARDING_DATA.length - 1 ? "checkmark" : "arrow-forward"} 
              size={24} 
              color="#FFFFFF" 
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  iconContainer: {
    width: width - 48,
    height: height * 0.4,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingIcon: {
    position: 'absolute',
    borderRadius: 20,
    padding: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingIcon1: {
    top: 40,
    right: 40,
  },
  floatingIcon2: {
    bottom: 60,
    left: 30,
  },
  floatingIcon3: {
    top: 80,
    left: 50,
  },
  contentContainer: {
    marginTop: 40,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: Colors.light.text,
    lineHeight: 42,
    marginBottom: 16,
  },
  titleBold: {
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 26,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  navButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonHidden: {
    opacity: 0,
  },
  navButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navButtonCircleActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
});
