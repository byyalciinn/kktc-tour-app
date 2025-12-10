/**
 * Custom Hooks - Reusable React hooks
 */

export { useDebounce, useDebouncedCallback, useThrottledCallback } from './useDebounce';
export { usePushNotifications } from './usePushNotifications';
export { useLocation } from './useLocation';
export type { LocationState, LocationPermissionStatus, UseLocationOptions } from './useLocation';

// Security hooks
export { useSessionTimeout } from './useSessionTimeout';
export type { SessionTimeoutConfig } from './useSessionTimeout';
export { useBiometricAuth } from './useBiometricAuth';
export { useDeviceSecurity } from './useDeviceSecurity';
export { useScreenProtection } from './useScreenProtection';
export type { ScreenProtectionOptions } from './useScreenProtection';

// Accessibility hooks
export { useAccessibility, a11yLabels, getHitSlop, MIN_TOUCH_TARGET } from './useAccessibility';

// Performance hooks
export { useOptimizedList, LIST_PRESETS } from './useOptimizedList';
