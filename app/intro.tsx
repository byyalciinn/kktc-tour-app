import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  ViewToken,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useOnboardingStore } from '@/stores';

const { width, height } = Dimensions.get('window');

// Intro/App Onboarding data - Uygulama hakkında bilgi
const INTRO_DATA = [
  {
    id: '1',
    title: 'Kuzey Kıbrıs\'ı',
    titleBold: 'Keşfet',
    description: 'Tarihi kalelerden bozulmamış plajlara, antik şehirlerden doğal güzelliklere kadar Kuzey Kıbrıs\'ın tüm hazinelerini keşfedin.',
    image: require('@/public/auth-page-image-header-1.jpg'),
  },
  {
    id: '2',
    title: 'Rotanı',
    titleBold: 'Planla',
    description: 'Tematik rotalar ve özel turlarla seyahatinizi kolayca planlayın. Favorilerinizi kaydedin, kendi gezi listenizi oluşturun.',
    image: require('@/public/auth-page-image-header-2.jpg'),
  },
  {
    id: '3',
    title: 'Deneyimi',
    titleBold: 'Yaşa',
    description: 'Yerel rehberler, otantik lezzetler ve unutulmaz anılar. Kuzey Kıbrıs\'ı bir turist gibi değil, bir gezgin gibi deneyimleyin.',
    image: require('@/public/auth-page-image-header-3.png'),
  },
];

/**
 * Intro Screen - Uygulama ilk açılışında gösterilen tanıtım ekranı
 * Elegant, minimal, premium hissi veren tasarım
 */
export default function IntroScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { completeIntro: markIntroComplete } = useOnboardingStore();

  const completeIntro = async () => {
    await markIntroComplete();
    router.replace('/(auth)');
  };

  const viewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = useCallback(() => {
    if (currentIndex < INTRO_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeIntro();
    }
  }, [currentIndex]);

  const handleSkip = () => {
    completeIntro();
  };

  const renderItem = ({ item, index }: { item: typeof INTRO_DATA[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    const textTranslate = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, -50],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        {/* Image Section */}
        <Animated.View 
          style={[
            styles.imageContainer,
            {
              opacity: imageOpacity,
              transform: [{ scale: imageScale }],
            },
          ]}
        >
          <Image source={item.image} style={styles.image} resizeMode="cover" />
          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.1)', Colors.light.background]}
            style={styles.imageGradient}
            locations={[0, 0.5, 1]}
          />
        </Animated.View>

        {/* Content Section */}
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              transform: [{ translateX: textTranslate }],
            },
          ]}
        >
          {/* Page Indicator */}
          <Text style={styles.pageIndicator}>
            {String(index + 1).padStart(2, '0')}
          </Text>

          {/* Title */}
          <Text style={styles.title}>
            {item.title}{'\n'}
            <Text style={styles.titleBold}>{item.titleBold}</Text>
          </Text>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {INTRO_DATA.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 32, 6],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
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
                  opacity: dotOpacity,
                  backgroundColor: currentIndex === index 
                    ? Colors.light.primary 
                    : Colors.light.textSecondary,
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
        data={INTRO_DATA}
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
        scrollEventThrottle={16}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Dots */}
        {renderDots()}

        {/* Next/Start Button */}
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[Colors.light.primary, '#E02D45']}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === INTRO_DATA.length - 1 ? 'Başla' : 'Devam'}
            </Text>
          </LinearGradient>
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
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  slide: {
    width,
    flex: 1,
  },
  imageContainer: {
    height: height * 0.5,
    width: width,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  pageIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '300',
    color: Colors.light.text,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  titleBold: {
    fontWeight: '700',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.light.textSecondary,
    lineHeight: 26,
    marginTop: 20,
    letterSpacing: 0.3,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 50,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
