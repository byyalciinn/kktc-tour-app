import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
  ViewToken,
  Platform,
  useColorScheme,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '@/stores';
import { Colors } from '@/constants/Colors';
import { SwipeButton } from '@arelstone/react-native-swipe-button';

const { width, height } = Dimensions.get('window');

// Intro slide images
const INTRO_IMAGES = [
  require('../public/onboarding-image-1.jpg'),
  require('../public/onboarding-image-2.jpg'),
  require('../public/onboarding-image-3.jpg'),
];

/**
 * Intro Screen - Modern onboarding design
 * Clean layout with image placeholder, title, description, skip and next buttons
 * Dark mode support with project colors
 */
export default function IntroScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { completeIntro: markIntroComplete } = useOnboardingStore();

  // Build intro data with translations
  const introData = useMemo(() => [
    {
      id: '1',
      title: t('intro.slides.1.title'),
      description: t('intro.slides.1.description'),
      image: INTRO_IMAGES[0],
    },
    {
      id: '2',
      title: t('intro.slides.2.title'),
      description: t('intro.slides.2.description'),
      image: INTRO_IMAGES[1],
    },
    {
      id: '3',
      title: t('intro.slides.3.title'),
      description: t('intro.slides.3.description'),
      image: INTRO_IMAGES[2],
    },
  ], [t]);

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
    if (currentIndex < introData.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeIntro();
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    completeIntro();
  }, []);

  // Pagination dots - positioned on image
  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {introData.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 28, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
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
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: typeof introData[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    // Modern parallax effect - image slides faster than content
    const imageTranslateX = scrollX.interpolate({
      inputRange,
      outputRange: [width * 0.3, 0, -width * 0.3],
      extrapolate: 'clamp',
    });

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    // Content fade and slide up effect
    const contentOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const contentTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [40, 0, -40],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { backgroundColor: colors.background }]}>
        {/* Image Container with dots overlay */}
        <View style={styles.imageSection}>
          <View style={[styles.imageWrapper, { backgroundColor: isDark ? colors.card : '#F5F5F0' }]}>
            {/* Dots positioned on top of image */}
            <View style={styles.dotsOverlay}>
              {renderDots()}
            </View>
            
            <Animated.View 
              style={[
                styles.imageContainer,
                { 
                  transform: [
                    { translateX: imageTranslateX },
                    { scale: imageScale },
                  ],
                  opacity: imageOpacity,
                }
              ]}
            >
              <Image 
                source={item.image} 
                style={styles.image}
                resizeMode="cover"
              />
            </Animated.View>
          </View>
        </View>

        {/* Content Section */}
        <Animated.View 
          style={[
            styles.contentSection,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={introData}
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

      {/* Bottom Section - Fixed */}
      <View style={[styles.bottomSection, { backgroundColor: colors.background }]}>
        {/* Navigation */}
        <View style={styles.navigationContainer}>
          {/* Skip Button - hidden on last slide */}
          {currentIndex !== introData.length - 1 && (
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                {t('intro.skip')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Last slide: Swipe button, Others: Next button */}
          {currentIndex === introData.length - 1 ? (
            <View style={styles.swipeButtonWrapper}>
              <SwipeButton
                Icon={
                  <Ionicons 
                    name="chevron-forward" 
                    size={28} 
                    color={isDark ? '#1A1A1A' : '#FFFFFF'} 
                  />
                }
                title={t('intro.startExploring')}
                onComplete={completeIntro}
                height={64}
                width={width - 48}
                borderRadius={32}
                completeThresholdPercentage={60}
                containerStyle={{ 
                  backgroundColor: isDark ? '#2D2D2D' : '#D4D4CC',
                  borderRadius: 32,
                }}
                underlayStyle={{ 
                  backgroundColor: colors.primary,
                  borderTopLeftRadius: 32,
                  borderBottomLeftRadius: 32,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                }}
                titleStyle={{ 
                  color: isDark ? '#9BA1A6' : '#6C757D', 
                  fontSize: 17, 
                  fontWeight: '600',
                  fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
                }}
                circleBackgroundColor={colors.primary}
                goBackToStart={false}
              />
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: colors.primary }]} 
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width,
    height: height - 160, // Leave space for bottom section
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  imageWrapper: {
    width: width - 48,
    height: height * 0.5,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  dotsOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    height: 140,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F89C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  swipeButtonWrapper: {
    flex: 1,
    alignItems: 'center',
  },
});
