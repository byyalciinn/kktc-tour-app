/**
 * Cached Image Component
 * 
 * Provides optimized image loading with:
 * - Memory and disk caching via React Native's built-in caching
 * - Skeleton placeholder while loading (no spinner delay)
 * - Error fallback handling
 * - Progressive loading effect
 * - Prefetch support for faster loading
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

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
  /** Show skeleton placeholder instead of spinner */
  skeleton?: boolean;
  /** Skeleton background color */
  skeletonColor?: string;
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

const FS_CACHE_DIR: string = ((FileSystem as any).cacheDirectory ?? '') as string;
const IMAGE_DISK_CACHE_DIR = `${FS_CACHE_DIR}cached-images/`;

const stableHash = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // convert to unsigned base36
  return (hash >>> 0).toString(36);
};

const isRemoteHttpUrl = (value: string): boolean => {
  const lower = (value || '').toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
};

const getDiskCachePathForUrl = (url: string): string => {
  const key = stableHash(url);
  return `${IMAGE_DISK_CACHE_DIR}${key}.img`;
};

const ensureDiskCacheDir = async (): Promise<void> => {
  if (!FS_CACHE_DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DISK_CACHE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DISK_CACHE_DIR, { intermediates: true });
    }
  } catch {
    // ignore
  }
};

/**
 * Optimized Image component with caching and loading states
 */
// Prefetch cache to avoid duplicate prefetch calls
const prefetchedUrls = new Set<string>();

/**
 * Prefetch images for faster loading
 */
export const prefetchImages = (urls: string[]) => {
  urls.forEach(url => {
    if (url && !prefetchedUrls.has(url)) {
      prefetchedUrls.add(url);
      Image.prefetch(url).catch(() => {
        // Silently fail - image will load normally
        prefetchedUrls.delete(url);
      });
    }
  });
};

const CachedImage = memo<CachedImageProps>(({ 
  uri,
  style,
  containerStyle,
  fallbackIcon = 'image-outline',
  fallbackIconSize = 40,
  fallbackIconColor = '#9CA3AF',
  showLoader = true,
  loaderColor = '#F89C28',
  fadeIn = false, // Disabled by default to prevent flickering
  fadeInDuration = 150, // Faster fade
  priority = 'normal',
  skeleton = true, // Default to skeleton
  skeletonColor,
  ...imageProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string>(uri);
  const fadeAnim = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  // Reset state when URI changes
  useEffect(() => {
    if (uri) {
      setLoading(true);
      setError(false);
      setResolvedUri(uri);
      if (fadeIn) {
        fadeAnim.setValue(0);
      }
    }
  }, [uri, fadeIn, fadeAnim]);

  // Resolve to disk-cached file:// URI when possible
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!uri || !isRemoteHttpUrl(uri) || !FS_CACHE_DIR) {
        return;
      }

      await ensureDiskCacheDir();
      const path = getDiskCachePathForUrl(uri);

      try {
        const info = await FileSystem.getInfoAsync(path);
        if (cancelled) return;

        if (info.exists) {
          setResolvedUri(info.uri);
          return;
        }

        const download = await FileSystem.downloadAsync(uri, path);
        if (cancelled) return;
        setResolvedUri(download.uri);
      } catch {
        // ignore and fall back to remote
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  // Prefetch high priority images
  useEffect(() => {
    if (uri && priority === 'high' && !prefetchedUrls.has(uri)) {
      prefetchedUrls.add(uri);
      Image.prefetch(uri).catch(() => prefetchedUrls.delete(uri));
    }
  }, [uri, priority]);

  const handleLoadStart = useCallback(() => {
    // Only set loading if not already loaded to prevent flicker
    if (!hasLoaded) {
      setLoading(true);
    }
    setError(false);
  }, [hasLoaded]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setHasLoaded(true);
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
    if (__DEV__) {
      console.warn(`[CachedImage] Failed to load image: ${uri?.substring(0, 100)}...`);
    }
  }, [uri]);

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

  // Check if URI is valid (not empty, null, undefined, or just whitespace)
  const isValidUri = uri && uri.trim().length > 0;

  if (!isValidUri || error) {
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

  // Get skeleton color based on theme
  const getSkeletonBg = () => skeletonColor || '#E5E7EB';

  return (
    <View style={[styles.container, style, containerStyle]}>
      <Animated.Image
        {...imageProps}
        source={{
          uri: getCacheKey(resolvedUri),
          cache: getCachePolicy(),
        }}
        style={[styles.absoluteFill, imageStyle] as ImageStyle}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
        // Performance optimizations
        fadeDuration={0} // Disable default fade on Android
        progressiveRenderingEnabled={true}
      />
      {loading && showLoader && !hasLoaded && (
        <View 
          style={[
            styles.loaderContainer, 
            skeleton && { backgroundColor: getSkeletonBg() }
          ]} 
          pointerEvents="none"
        />
      )}
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
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  tourImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
});

export default CachedImage;
