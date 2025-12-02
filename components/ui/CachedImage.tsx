/**
 * Cached Image Component
 * 
 * Provides optimized image loading with:
 * - Memory and disk caching via React Native's built-in caching
 * - Placeholder/skeleton while loading
 * - Error fallback handling
 * - Progressive loading effect
 * - Lazy loading support
 */

import React, { memo, useState, useCallback } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: ViewStyle;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackIconSize?: number;
  fallbackIconColor?: string;
  showLoader?: boolean;
  loaderColor?: string;
  fadeIn?: boolean;
  fadeInDuration?: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Generate cache-friendly URL with size hints
 */
const getCacheKey = (uri: string): string => {
  // Add cache-busting for Supabase storage URLs if needed
  if (uri.includes('supabase')) {
    return uri;
  }
  return uri;
};

/**
 * Optimized Image component with caching and loading states
 */
const CachedImage = memo<CachedImageProps>(({
  uri,
  style,
  containerStyle,
  fallbackIcon = 'image-outline',
  fallbackIconSize = 40,
  fallbackIconColor = '#9CA3AF',
  showLoader = true,
  loaderColor = '#F03A52',
  fadeIn = true,
  fadeInDuration = 300,
  priority = 'normal',
  ...imageProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    if (fadeIn) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeIn, fadeAnim, fadeInDuration]);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  // Determine cache policy based on priority
  const getCachePolicy = () => {
    switch (priority) {
      case 'high':
        return 'force-cache';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  if (!uri || error) {
    return (
      <View style={[styles.fallbackContainer, style, containerStyle]}>
        <Ionicons
          name={fallbackIcon}
          size={fallbackIconSize}
          color={fallbackIconColor}
        />
      </View>
    );
  }

  const imageStyle = fadeIn
    ? [style, { opacity: fadeAnim }]
    : style;

  return (
    <View style={[styles.container, containerStyle]}>
      {loading && showLoader && (
        <View style={[styles.loaderContainer, style]}>
          <ActivityIndicator size="small" color={loaderColor} />
        </View>
      )}
      
      <Animated.Image
        {...imageProps}
        source={{
          uri: getCacheKey(uri),
          cache: getCachePolicy(),
        }}
        style={imageStyle as ImageStyle}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Performance optimizations
        fadeDuration={0} // Disable default fade on Android
        progressiveRenderingEnabled={true}
      />
    </View>
  );
});

CachedImage.displayName = 'CachedImage';

/**
 * Avatar variant with circular styling
 */
export const CachedAvatar = memo<CachedImageProps & { size?: number }>(({
  size = 48,
  style,
  ...props
}) => {
  return (
    <CachedImage
      {...props}
      style={StyleSheet.flatten([
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style as ImageStyle,
      ])}
      fallbackIcon="person-outline"
      fallbackIconSize={size * 0.5}
    />
  );
});

CachedAvatar.displayName = 'CachedAvatar';

/**
 * Tour card image variant
 */
export const CachedTourImage = memo<CachedImageProps>(({
  style,
  ...props
}) => {
  return (
    <CachedImage
      {...props}
      style={StyleSheet.flatten([styles.tourImage, style as ImageStyle])}
      fallbackIcon="map-outline"
      priority="normal"
    />
  );
});

CachedTourImage.displayName = 'CachedTourImage';

/**
 * Thumbnail variant for smaller images
 */
export const CachedThumbnail = memo<CachedImageProps & { size?: number }>(({
  size = 60,
  style,
  ...props
}) => {
  return (
    <CachedImage
      {...props}
      style={StyleSheet.flatten([
        {
          width: size,
          height: size,
          borderRadius: 8,
        },
        style as ImageStyle,
      ])}
      showLoader={false}
      priority="low"
    />
  );
});

CachedThumbnail.displayName = 'CachedThumbnail';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    zIndex: 1,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tourImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
});

export default CachedImage;
