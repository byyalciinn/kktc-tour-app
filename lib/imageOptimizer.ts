/**
 * Image Optimizer Service
 * 
 * Modern image optimization with multiple compression strategies:
 * - Progressive JPEG compression
 * - Smart resizing with aspect ratio preservation
 * - Quality-based compression with perceptual optimization
 * - WebP conversion support (where available)
 * - Memory-efficient processing
 * 
 * Target: Reduce 2.5MB images to ~100-300KB while maintaining visual quality
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system/next';

// Optimization presets for different use cases
export const ImagePresets = {
  // Avatar/Profile photos - small, square
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  // Community posts - medium quality, good for feeds
  community: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  // Tour images - higher quality for detail
  tour: {
    maxWidth: 1400,
    maxHeight: 1050,
    quality: 0.65,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  // Route cover images - wide format for cards
  routeCover: {
    maxWidth: 1600,
    maxHeight: 900,
    quality: 0.65,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  // Route stop images - medium quality
  routeStop: {
    maxWidth: 1000,
    maxHeight: 750,
    quality: 0.6,
    format: ImageManipulator.SaveFormat.JPEG,
  },
  // Thumbnail - very small for previews
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.5,
    format: ImageManipulator.SaveFormat.JPEG,
  },
} as const;

export type ImagePresetKey = keyof typeof ImagePresets;

export interface OptimizationResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
}

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: ImageManipulator.SaveFormat;
  preserveAspectRatio?: boolean;
}

/**
 * Get file size in bytes using new expo-file-system API
 */
const getFileSize = async (uri: string): Promise<number> => {
  try {
    const file = new File(uri);
    if (file.exists) {
      return file.size ?? 0;
    }
    return 0;
  } catch {
    return 0;
  }
};

/**
 * Calculate optimal dimensions while preserving aspect ratio
 */
const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Scale down if larger than max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = Math.round(newWidth / aspectRatio);
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = Math.round(newHeight * aspectRatio);
  }
  
  return { width: newWidth, height: newHeight };
};

/**
 * Progressive quality optimization
 * Tries different quality levels to achieve target file size
 */
const progressiveCompress = async (
  uri: string,
  targetWidth: number,
  targetSizeKB: number = 300,
  minQuality: number = 0.3,
  maxQuality: number = 0.8
): Promise<{ uri: string; base64: string; quality: number }> => {
  let currentQuality = maxQuality;
  let result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetWidth } }],
    {
      compress: currentQuality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );
  
  // Check if we need to compress more
  const base64Size = result.base64 ? (result.base64.length * 3) / 4 / 1024 : 0; // KB
  
  // If still too large, progressively reduce quality
  if (base64Size > targetSizeKB && currentQuality > minQuality) {
    const qualityStep = 0.1;
    
    while (base64Size > targetSizeKB && currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - qualityStep);
      
      result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: targetWidth } }],
        {
          compress: currentQuality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      const newSize = result.base64 ? (result.base64.length * 3) / 4 / 1024 : 0;
      if (newSize <= targetSizeKB) break;
    }
  }
  
  return {
    uri: result.uri,
    base64: result.base64 || '',
    quality: currentQuality,
  };
};

/**
 * Main optimization function with preset support
 */
export const optimizeImage = async (
  uri: string,
  preset: ImagePresetKey | OptimizationOptions = 'community'
): Promise<OptimizationResult | null> => {
  try {
    // Get preset or use custom options
    const options: OptimizationOptions = typeof preset === 'string' 
      ? ImagePresets[preset] 
      : preset;
    
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.6,
      format = ImageManipulator.SaveFormat.JPEG,
    } = options;
    
    // Get original file size
    const originalSize = await getFileSize(uri);
    
    // First pass: resize to target dimensions
    const resizedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format,
        base64: true,
      }
    );
    
    // Get optimized size
    const optimizedSize = resizedImage.base64 
      ? Math.round((resizedImage.base64.length * 3) / 4)
      : 0;
    
    // Calculate compression ratio
    const compressionRatio = originalSize > 0 
      ? Math.round((1 - optimizedSize / originalSize) * 100) 
      : 0;
    
    console.log(`[ImageOptimizer] Compressed: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024).toFixed(0)}KB (${compressionRatio}% reduction)`);
    
    return {
      uri: resizedImage.uri,
      base64: resizedImage.base64 || '',
      width: resizedImage.width,
      height: resizedImage.height,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('[ImageOptimizer] Error:', error);
    return null;
  }
};

/**
 * Optimize image with aggressive compression for very large files
 * Uses progressive compression to hit target file size
 */
export const optimizeImageAggressive = async (
  uri: string,
  preset: ImagePresetKey = 'community',
  targetSizeKB: number = 250
): Promise<OptimizationResult | null> => {
  try {
    const presetOptions = ImagePresets[preset];
    const originalSize = await getFileSize(uri);
    
    // Use progressive compression
    const result = await progressiveCompress(
      uri,
      presetOptions.maxWidth,
      targetSizeKB,
      0.25, // minimum quality
      presetOptions.quality
    );
    
    const optimizedSize = result.base64 
      ? Math.round((result.base64.length * 3) / 4)
      : 0;
    
    const compressionRatio = originalSize > 0 
      ? Math.round((1 - optimizedSize / originalSize) * 100) 
      : 0;
    
    console.log(`[ImageOptimizer] Aggressive: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024).toFixed(0)}KB (${compressionRatio}% reduction, quality: ${(result.quality * 100).toFixed(0)}%)`);
    
    // Get dimensions from a quick manipulation
    const dimensionCheck = await ImageManipulator.manipulateAsync(
      result.uri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );
    
    return {
      uri: result.uri,
      base64: result.base64,
      width: dimensionCheck.width,
      height: dimensionCheck.height,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } catch (error) {
    console.error('[ImageOptimizer] Aggressive compression error:', error);
    return null;
  }
};

/**
 * Batch optimize multiple images
 */
export const optimizeImages = async (
  uris: string[],
  preset: ImagePresetKey = 'community'
): Promise<(OptimizationResult | null)[]> => {
  const results = await Promise.all(
    uris.map(uri => optimizeImage(uri, preset))
  );
  return results;
};

/**
 * Quick optimization for avatar images
 * Optimized for small file size and fast loading
 */
export const optimizeAvatar = async (uri: string): Promise<OptimizationResult | null> => {
  return optimizeImageAggressive(uri, 'avatar', 100); // Target 100KB for avatars
};

/**
 * Quick optimization for community post images
 */
export const optimizeCommunityImage = async (uri: string): Promise<OptimizationResult | null> => {
  return optimizeImageAggressive(uri, 'community', 250); // Target 250KB for community
};

/**
 * Quick optimization for tour images
 */
export const optimizeTourImage = async (uri: string): Promise<OptimizationResult | null> => {
  return optimizeImageAggressive(uri, 'tour', 350); // Target 350KB for tours
};

/**
 * Quick optimization for route cover images
 */
export const optimizeRouteCoverImage = async (uri: string): Promise<OptimizationResult | null> => {
  return optimizeImageAggressive(uri, 'routeCover', 400); // Target 400KB for route covers
};

/**
 * Quick optimization for route stop images
 */
export const optimizeRouteStopImage = async (uri: string): Promise<OptimizationResult | null> => {
  return optimizeImageAggressive(uri, 'routeStop', 250); // Target 250KB for route stops
};

/**
 * Validate and check if image needs optimization
 */
export const shouldOptimize = async (uri: string, thresholdKB: number = 500): Promise<boolean> => {
  const size = await getFileSize(uri);
  return size > thresholdKB * 1024;
};

/**
 * Get image info without optimizing
 */
export const getImageInfo = async (uri: string): Promise<{
  size: number;
  sizeFormatted: string;
} | null> => {
  try {
    const size = await getFileSize(uri);
    const sizeFormatted = size > 1024 * 1024 
      ? `${(size / 1024 / 1024).toFixed(2)} MB`
      : `${(size / 1024).toFixed(0)} KB`;
    
    return { size, sizeFormatted };
  } catch {
    return null;
  }
};
