/**
 * useLocation Hook
 * 
 * Centralized location management with:
 * - Permission handling with settings redirect
 * - Current location tracking
 * - Address reverse geocoding
 * - Permission denied modal support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform, Linking, Alert } from 'react-native';
import { logger } from '@/lib/logger';

export type LocationPermissionStatus = 
  | 'granted' 
  | 'denied' 
  | 'undetermined' 
  | 'checking';

export interface LocationState {
  location: Location.LocationObject | null;
  address: string;
  isLoading: boolean;
  permissionStatus: LocationPermissionStatus;
  error: string | null;
}

export interface UseLocationOptions {
  /** Auto-request permission on mount */
  autoRequest?: boolean;
  /** Enable address reverse geocoding */
  enableGeocoding?: boolean;
  /** Default address when location unavailable */
  defaultAddress?: string;
  /** Translations for alerts */
  translations?: {
    permissionDeniedTitle?: string;
    permissionDeniedMessage?: string;
    openSettings?: string;
    cancel?: string;
    retry?: string;
    defaultLocation?: string;
    fetchingAddress?: string;
    currentLocation?: string;
  };
}

const DEFAULT_TRANSLATIONS = {
  permissionDeniedTitle: 'Konum İzni Gerekli',
  permissionDeniedMessage: 'Yakınındaki yerleri görebilmek için konum izni vermeniz gerekiyor.',
  openSettings: 'Ayarları Aç',
  cancel: 'İptal',
  retry: 'Tekrar Dene',
  defaultLocation: 'Kuzey Kıbrıs',
  fetchingAddress: 'Konum alınıyor...',
  currentLocation: 'Mevcut Konum',
};

// Global location cache to prevent repeated requests across component mounts
interface LocationCache {
  location: Location.LocationObject | null;
  address: string | null;
  timestamp: number;
  permissionStatus: LocationPermissionStatus;
}

let globalLocationCache: LocationCache | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

const isLocationCacheValid = (): boolean => {
  if (!globalLocationCache) return false;
  return Date.now() - globalLocationCache.timestamp < CACHE_DURATION;
};

export function useLocation(options: UseLocationOptions = {}) {
  const {
    autoRequest = true,
    enableGeocoding = true,
    defaultAddress,
    translations: customTranslations,
  } = options;

  const t = { ...DEFAULT_TRANSLATIONS, ...customTranslations };
  const defaultAddr = defaultAddress || t.defaultLocation;

  // Initialize state from cache if available
  const [state, setState] = useState<LocationState>(() => {
    if (isLocationCacheValid() && globalLocationCache) {
      return {
        location: globalLocationCache.location,
        address: globalLocationCache.address || t.currentLocation,
        isLoading: false,
        permissionStatus: globalLocationCache.permissionStatus,
        error: null,
      };
    }
    return {
      location: null,
      address: t.fetchingAddress,
      isLoading: true,
      permissionStatus: 'checking',
      error: null,
    };
  });

  const isMounted = useRef(true);
  const isRequesting = useRef(false);
  const hasInitialized = useRef(false);

  /**
   * Open device settings for location permissions
   */
  const openLocationSettings = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
        return true;
      } else if (Platform.OS === 'android') {
        await Linking.openSettings();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('[Location] Failed to open settings:', error);
      return false;
    }
  }, []);

  /**
   * Show permission denied alert with settings redirect
   */
  const showPermissionDeniedAlert = useCallback((onRetry?: () => void) => {
    Alert.alert(
      t.permissionDeniedTitle,
      t.permissionDeniedMessage,
      [
        {
          text: t.cancel,
          style: 'cancel',
        },
        {
          text: t.openSettings,
          onPress: openLocationSettings,
        },
        ...(onRetry ? [{
          text: t.retry,
          onPress: onRetry,
        }] : []),
      ]
    );
  }, [t, openLocationSettings]);

  /**
   * Request location permission and get current location
   */
  const requestLocation = useCallback(async (showAlertOnDenied = false) => {
    // Prevent multiple simultaneous requests
    if (!isMounted.current || isRequesting.current) return;
    isRequesting.current = true;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check existing permission
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      let finalStatus = existingStatus;

      // Request if not determined
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (!isMounted.current) return;

      if (finalStatus !== 'granted') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          permissionStatus: 'denied',
          address: defaultAddr,
        }));

        if (showAlertOnDenied) {
          showPermissionDeniedAlert(() => requestLocation(false));
        }
        return;
      }

      // Permission granted - get location
      setState(prev => ({ ...prev, permissionStatus: 'granted' }));

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!isMounted.current) return;

      setState(prev => ({
        ...prev,
        location: currentLocation,
        isLoading: false,
      }));

      // Update global cache
      globalLocationCache = {
        location: currentLocation,
        address: null,
        timestamp: Date.now(),
        permissionStatus: 'granted',
      };

      // Reverse geocode if enabled
      if (enableGeocoding) {
        try {
          const [addressResult] = await Location.reverseGeocodeAsync({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });

          if (!isMounted.current) return;

          if (addressResult) {
            const formattedAddress = [
              addressResult.street,
              addressResult.district,
              addressResult.city,
            ]
              .filter(Boolean)
              .join(', ');

            const finalAddress = formattedAddress || t.currentLocation;
            
            setState(prev => ({
              ...prev,
              address: finalAddress,
            }));

            // Update cache with address
            if (globalLocationCache) {
              globalLocationCache.address = finalAddress;
            }
          }
        } catch (geocodeError) {
          logger.warn('[Location] Geocoding failed:', geocodeError);
          setState(prev => ({
            ...prev,
            address: t.currentLocation,
          }));
          // Still update cache
          if (globalLocationCache) {
            globalLocationCache.address = t.currentLocation;
          }
        }
      }
    } catch (error: any) {
      logger.error('[Location] Error:', error);
      
      if (!isMounted.current) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        address: defaultAddr,
      }));
    } finally {
      isRequesting.current = false;
    }
  }, [defaultAddr, enableGeocoding, showPermissionDeniedAlert, t.currentLocation]);

  /**
   * Refresh location (re-request)
   */
  const refreshLocation = useCallback(() => {
    requestLocation(true);
  }, [requestLocation]);

  /**
   * Check permission status without requesting
   */
  const checkPermission = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const permissionStatus: LocationPermissionStatus = 
        status === 'granted' ? 'granted' : 
        status === 'denied' ? 'denied' : 'undetermined';
      
      setState(prev => ({ ...prev, permissionStatus }));
      return permissionStatus;
    } catch {
      return 'undetermined';
    }
  }, []);

  // Auto-request on mount - only once
  useEffect(() => {
    isMounted.current = true;

    // Skip if already initialized or cache is valid
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // Use cache if valid
    if (isLocationCacheValid() && globalLocationCache) {
      setState({
        location: globalLocationCache.location,
        address: globalLocationCache.address || t.currentLocation,
        isLoading: false,
        permissionStatus: globalLocationCache.permissionStatus,
        error: null,
      });
      return;
    }

    if (autoRequest) {
      requestLocation(false);
    } else {
      checkPermission();
      setState(prev => ({ ...prev, isLoading: false }));
    }

    return () => {
      isMounted.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  return {
    ...state,
    requestLocation,
    refreshLocation,
    checkPermission,
    openLocationSettings,
    showPermissionDeniedAlert,
    isPermissionDenied: state.permissionStatus === 'denied',
    isPermissionGranted: state.permissionStatus === 'granted',
    hasLocation: state.location !== null,
  };
}

export default useLocation;
