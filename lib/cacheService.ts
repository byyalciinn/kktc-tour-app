/**
 * Cache Service - Handles clearing app cache and stored data
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - expo-file-system types may not be up to date
import { cacheDirectory, documentDirectory, getInfoAsync, deleteAsync, makeDirectoryAsync, readDirectoryAsync } from 'expo-file-system';
import { Image } from 'react-native';

// Keys that should NOT be cleared (user preferences, etc.)
const PROTECTED_KEYS = [
  'theme-storage', // Theme preference
  'onboarding-storage', // Onboarding completion status
  'language', // Language preference
];

/**
 * Clear all AsyncStorage data except protected keys
 */
export async function clearAsyncStorage(): Promise<{ cleared: number; error?: string }> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => !PROTECTED_KEYS.includes(key));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    
    return { cleared: keysToRemove.length };
  } catch (error: any) {
    console.error('[CacheService] Clear AsyncStorage error:', error);
    return { cleared: 0, error: error.message };
  }
}

/**
 * Clear image cache directory
 */
export async function clearImageCache(): Promise<{ cleared: boolean; error?: string }> {
  try {
    const cacheDir = cacheDirectory;
    if (!cacheDir) {
      return { cleared: false, error: 'Cache directory not available' };
    }

    // Get all files in cache directory
    const cacheInfo = await getInfoAsync(cacheDir);
    if (!cacheInfo.exists) {
      return { cleared: true };
    }

    // Read cache directory contents
    const files = await readDirectoryAsync(cacheDir);
    
    // Delete image-related cache files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    let deletedCount = 0;
    
    for (const file of files) {
      const isImage = imageExtensions.some(ext => file.toLowerCase().endsWith(ext));
      if (isImage) {
        try {
          await deleteAsync(`${cacheDir}${file}`, { idempotent: true });
          deletedCount++;
        } catch {
          // Ignore individual file deletion errors
        }
      }
    }

    // Also try to clear React Native's image cache
    if (Image.queryCache) {
      try {
        await Image.queryCache([]);
      } catch {
        // queryCache might not be available on all platforms
      }
    }

    console.log(`[CacheService] Cleared ${deletedCount} cached images`);
    return { cleared: true };
  } catch (error: any) {
    console.error('[CacheService] Clear image cache error:', error);
    return { cleared: false, error: error.message };
  }
}

/**
 * Clear temporary files
 */
export async function clearTempFiles(): Promise<{ cleared: boolean; error?: string }> {
  try {
    const tempDir = documentDirectory + 'temp/';
    const tempInfo = await getInfoAsync(tempDir);
    
    if (tempInfo.exists) {
      await deleteAsync(tempDir, { idempotent: true });
      await makeDirectoryAsync(tempDir, { intermediates: true });
    }
    
    return { cleared: true };
  } catch (error: any) {
    console.error('[CacheService] Clear temp files error:', error);
    return { cleared: false, error: error.message };
  }
}

/**
 * Get cache size estimate
 */
export async function getCacheSize(): Promise<{ sizeInMB: number; error?: string }> {
  try {
    const cacheDirPath = cacheDirectory;
    if (!cacheDirPath) {
      return { sizeInMB: 0 };
    }

    const cacheInfo = await getInfoAsync(cacheDirPath);
    // Note: size property may not be available on all platforms
    const sizeInMB = cacheInfo.exists ? 0 : 0; // Size estimation not reliable
    
    return { sizeInMB };
  } catch (error: any) {
    console.error('[CacheService] Get cache size error:', error);
    return { sizeInMB: 0, error: error.message };
  }
}

/**
 * Clear all app cache (AsyncStorage + Image cache + Temp files)
 */
export async function clearAllCache(): Promise<{
  success: boolean;
  asyncStorageCleared: number;
  imageCacheCleared: boolean;
  tempFilesCleared: boolean;
  error?: string;
}> {
  const results = {
    success: true,
    asyncStorageCleared: 0,
    imageCacheCleared: false,
    tempFilesCleared: false,
    error: undefined as string | undefined,
  };

  try {
    // Clear AsyncStorage
    const asyncResult = await clearAsyncStorage();
    results.asyncStorageCleared = asyncResult.cleared;
    if (asyncResult.error) {
      results.error = asyncResult.error;
    }

    // Clear image cache
    const imageResult = await clearImageCache();
    results.imageCacheCleared = imageResult.cleared;
    if (imageResult.error && !results.error) {
      results.error = imageResult.error;
    }

    // Clear temp files
    const tempResult = await clearTempFiles();
    results.tempFilesCleared = tempResult.cleared;
    if (tempResult.error && !results.error) {
      results.error = tempResult.error;
    }

    // Success if at least one operation succeeded
    results.success = results.asyncStorageCleared > 0 || 
                      results.imageCacheCleared || 
                      results.tempFilesCleared;

    console.log('[CacheService] Cache cleared:', results);
    return results;
  } catch (error: any) {
    console.error('[CacheService] Clear all cache error:', error);
    return {
      ...results,
      success: false,
      error: error.message,
    };
  }
}
