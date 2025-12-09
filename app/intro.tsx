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
  ImageBackground,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useOnboardingStore } from '@/stores';

const { width, height } = Dimensions.get('window');

// Intro/App Onboarding data - Türkçe
const INTRO_DATA = [
  {
    id: '1',
    title: 'Maceran Burada',
    titleBold: 'Başlıyor',
    description: 'En güzel yerleri keşfet, ideal rotanı tasarla ve nereye gidersen git sorunsuz bir seyahat deneyiminin tadını çıkar.',
    image: require('../public/intro-page-image-1.jpg'),
    buttonText: 'Başlayalım',
  },
  {
    id: '2',
    title: 'Gizli Hazineleri',
    titleBold: 'Keşfet',
    description: 'Antik kaleler, bozulmamış plajlar ve nefes kesen manzaralar. Kuzey Kıbrıs\'ın hazinelerini keşfet.',
    image: require('../public/intro-page-image-2.jpg'),
    buttonText: 'Devam Et',
  },
  {
    id: '3',
    title: 'Mükemmel Seyahatini',
    titleBold: 'Planla',
    description: 'Kişiselleştirilmiş rotalar oluştur, favorilerini kaydet ve diğer gezginlerle unutulmaz anıları paylaş.',
    image: require('../public/intro-page-image-3.jpg'),
    buttonText: 'Keşfetmeye Başla',
  },
];

/**
 * Intro Screen - Premium onboarding with blur card design
 * SF Pro font, full-screen background, blur card overlay
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

  const renderItem = ({ item, index }: { item: typeof INTRO_DATA[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const contentOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const contentTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <ImageBackground 
          source={item.image} 
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Bottom Blur Card */}
          <Animated.View 
            style={[
              styles.bottomCard,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <BlurView 
              intensity={Platform.OS === 'ios' ? 50 : 80} 
              tint="light" 
              style={styles.blurContainer}
            >
              <View style={styles.cardContent}>
                {/* Title */}
                <Text style={styles.title}>
                  {item.title}{'\n'}
                  <Text style={styles.titleBold}>{item.titleBold}</Text>
                </Text>

                {/* Description */}
                <Text style={styles.description}>{item.description}</Text>

                {/* Button */}
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleNext}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>{item.buttonText}</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

        </ImageBackground>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width,
    height,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  blurContainer: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 28,
    backgroundColor: 'rgba(60,60,60,0.4)',
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 40,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'System',
    letterSpacing: -0.5,
  },
  titleBold: {
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: 0.2,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    letterSpacing: 0.3,
  },
});
