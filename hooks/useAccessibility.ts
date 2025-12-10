/**
 * Accessibility Hook
 * 
 * Provides accessibility utilities and state management for:
 * - Screen reader detection
 * - Reduce motion preference
 * - Bold text preference
 * - Accessibility announcements
 * 
 * WCAG 2.1 AA Compliance helpers
 */

import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

interface AccessibilityState {
  /** Whether a screen reader (VoiceOver/TalkBack) is enabled */
  isScreenReaderEnabled: boolean;
  /** Whether reduce motion is enabled */
  isReduceMotionEnabled: boolean;
  /** Whether bold text is enabled (iOS only) */
  isBoldTextEnabled: boolean;
  /** Whether grayscale is enabled */
  isGrayscaleEnabled: boolean;
  /** Whether invert colors is enabled */
  isInvertColorsEnabled: boolean;
}

interface UseAccessibilityReturn extends AccessibilityState {
  /** Announce a message to screen readers */
  announce: (message: string) => void;
  /** Announce a message for screen changes */
  announceForAccessibility: (message: string) => void;
  /** Get animation duration based on reduce motion preference */
  getAnimationDuration: (normalDuration: number) => number;
  /** Check if animations should be disabled */
  shouldDisableAnimations: boolean;
}

/**
 * Hook for managing accessibility state and utilities
 */
export function useAccessibility(): UseAccessibilityReturn {
  const [state, setState] = useState<AccessibilityState>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
  });

  useEffect(() => {
    // Initial fetch of accessibility states
    const fetchInitialState = async () => {
      const [
        screenReader,
        reduceMotion,
        boldText,
        grayscale,
        invertColors,
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
        Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isGrayscaleEnabled() : Promise.resolve(false),
        Platform.OS === 'ios' ? AccessibilityInfo.isInvertColorsEnabled() : Promise.resolve(false),
      ]);

      setState({
        isScreenReaderEnabled: screenReader,
        isReduceMotionEnabled: reduceMotion,
        isBoldTextEnabled: boldText,
        isGrayscaleEnabled: grayscale,
        isInvertColorsEnabled: invertColors,
      });
    };

    fetchInitialState();

    // Set up listeners for changes
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => setState((prev) => ({ ...prev, isScreenReaderEnabled: isEnabled }))
    );

    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => setState((prev) => ({ ...prev, isReduceMotionEnabled: isEnabled }))
    );

    // iOS-only listeners
    let boldTextListener: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
    let grayscaleListener: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
    let invertColorsListener: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;

    if (Platform.OS === 'ios') {
      boldTextListener = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        (isEnabled) => setState((prev) => ({ ...prev, isBoldTextEnabled: isEnabled }))
      );
      grayscaleListener = AccessibilityInfo.addEventListener(
        'grayscaleChanged',
        (isEnabled) => setState((prev) => ({ ...prev, isGrayscaleEnabled: isEnabled }))
      );
      invertColorsListener = AccessibilityInfo.addEventListener(
        'invertColorsChanged',
        (isEnabled) => setState((prev) => ({ ...prev, isInvertColorsEnabled: isEnabled }))
      );
    }

    return () => {
      screenReaderListener.remove();
      reduceMotionListener.remove();
      boldTextListener?.remove();
      grayscaleListener?.remove();
      invertColorsListener?.remove();
    };
  }, []);

  /**
   * Announce a message to screen readers
   */
  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  /**
   * Announce a message for screen changes (with slight delay for context)
   */
  const announceForAccessibility = useCallback((message: string) => {
    // Small delay to ensure the screen has updated
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, 100);
  }, []);

  /**
   * Get animation duration based on reduce motion preference
   * Returns 0 if reduce motion is enabled, otherwise returns the normal duration
   */
  const getAnimationDuration = useCallback(
    (normalDuration: number): number => {
      return state.isReduceMotionEnabled ? 0 : normalDuration;
    },
    [state.isReduceMotionEnabled]
  );

  return {
    ...state,
    announce,
    announceForAccessibility,
    getAnimationDuration,
    shouldDisableAnimations: state.isReduceMotionEnabled,
  };
}

/**
 * Accessibility label helpers
 */
export const a11yLabels = {
  /** Create a label for a button with action description */
  button: (action: string, hint?: string) => ({
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: action,
    ...(hint && { accessibilityHint: hint }),
  }),

  /** Create a label for an image */
  image: (description: string) => ({
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: description,
  }),

  /** Create a label for a link */
  link: (text: string, destination?: string) => ({
    accessible: true,
    accessibilityRole: 'link' as const,
    accessibilityLabel: text,
    ...(destination && { accessibilityHint: `Opens ${destination}` }),
  }),

  /** Create a label for a header */
  header: (text: string) => ({
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLabel: text,
  }),

  /** Create a label for a text input */
  input: (label: string, hint?: string, required?: boolean) => ({
    accessible: true,
    accessibilityLabel: required ? `${label}, required` : label,
    ...(hint && { accessibilityHint: hint }),
  }),

  /** Create a label for a switch/toggle */
  toggle: (label: string, isOn: boolean) => ({
    accessible: true,
    accessibilityRole: 'switch' as const,
    accessibilityLabel: label,
    accessibilityState: { checked: isOn },
  }),

  /** Create a label for a tab */
  tab: (label: string, isSelected: boolean, index: number, total: number) => ({
    accessible: true,
    accessibilityRole: 'tab' as const,
    accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
    accessibilityState: { selected: isSelected },
  }),

  /** Create a label for a list item */
  listItem: (text: string, index: number, total: number) => ({
    accessible: true,
    accessibilityLabel: `${text}, item ${index + 1} of ${total}`,
  }),

  /** Create a label for a loading state */
  loading: (context?: string) => ({
    accessible: true,
    accessibilityLabel: context ? `Loading ${context}` : 'Loading',
    accessibilityState: { busy: true },
  }),

  /** Create a label for an error message */
  error: (message: string) => ({
    accessible: true,
    accessibilityRole: 'alert' as const,
    accessibilityLabel: `Error: ${message}`,
    accessibilityLiveRegion: 'assertive' as const,
  }),

  /** Create a label for a success message */
  success: (message: string) => ({
    accessible: true,
    accessibilityRole: 'alert' as const,
    accessibilityLabel: message,
    accessibilityLiveRegion: 'polite' as const,
  }),
};

/**
 * Minimum touch target size (WCAG 2.1 AA requires 44x44)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * HitSlop helper to ensure minimum touch target
 */
export const getHitSlop = (currentSize: number): { top: number; bottom: number; left: number; right: number } => {
  const padding = Math.max(0, (MIN_TOUCH_TARGET - currentSize) / 2);
  return {
    top: padding,
    bottom: padding,
    left: padding,
    right: padding,
  };
};

export default useAccessibility;
