import { create } from 'zustand';
import { AccessibilityInfo } from 'react-native';
import { Tour } from '@/types';

// Store timeout ID for cleanup
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface UIState {
  // Modal states
  isSearchVisible: boolean;
  isProfileSheetVisible: boolean;
  isTourDetailVisible: boolean;
  isNotificationSheetVisible: boolean;

  // Selected items
  selectedTour: Tour | null;

  // Notification count
  unreadNotificationCount: number;

  // Global UI states
  isGlobalLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'warning' | 'info' | null;

  // Accessibility states
  isReduceMotionEnabled: boolean;
  isScreenReaderEnabled: boolean;

  // Actions - Modals
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  openProfileSheet: () => void;
  closeProfileSheet: () => void;

  openTourDetail: (tour: Tour) => void;
  closeTourDetail: () => void;

  openNotificationSheet: () => void;
  closeNotificationSheet: () => void;

  // Actions - Selected items
  setSelectedTour: (tour: Tour | null) => void;

  // Actions - Notification count
  setUnreadNotificationCount: (count: number) => void;
  incrementUnreadNotificationCount: () => void;

  // Actions - Global UI
  setGlobalLoading: (loading: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;

  // Actions - Accessibility
  initAccessibility: () => void;
  setReduceMotionEnabled: (enabled: boolean) => void;
  setScreenReaderEnabled: (enabled: boolean) => void;
  getAnimationDuration: (normalDuration: number) => number;

  // Reset all modals
  resetModals: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isSearchVisible: false,
  isProfileSheetVisible: false,
  isTourDetailVisible: false,
  isNotificationSheetVisible: false,
  selectedTour: null,
  unreadNotificationCount: 0,
  isGlobalLoading: false,
  toastMessage: null,
  toastType: null,

  // Accessibility initial state
  isReduceMotionEnabled: false,
  isScreenReaderEnabled: false,

  // Search modal
  openSearch: () => set({ isSearchVisible: true }),
  closeSearch: () => set({ isSearchVisible: false }),
  toggleSearch: () => set((state) => ({ isSearchVisible: !state.isSearchVisible })),

  // Profile sheet
  openProfileSheet: () => set({ isProfileSheetVisible: true }),
  closeProfileSheet: () => set({ isProfileSheetVisible: false }),

  // Tour detail sheet
  openTourDetail: (tour: Tour) => set({ 
    selectedTour: tour, 
    isTourDetailVisible: true,
  }),
  closeTourDetail: () => {
    set({ isTourDetailVisible: false });
    // Clear selectedTour after a brief delay to allow closing animation
    setTimeout(() => {
      const state = get();
      // Only clear if still closed (not reopened)
      if (!state.isTourDetailVisible) {
        set({ selectedTour: null });
      }
    }, 300);
  },

  // Notification sheet
  openNotificationSheet: () => set({ isNotificationSheetVisible: true }),
  closeNotificationSheet: () => set({ isNotificationSheetVisible: false }),

  // Selected tour
  setSelectedTour: (tour) => set({ selectedTour: tour }),

  // Notification count
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  incrementUnreadNotificationCount: () => set((state) => ({ 
    unreadNotificationCount: state.unreadNotificationCount + 1 
  })),

  // Global loading
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Toast notifications
  showToast: (message, type) => {
    // Clear any existing timeout to prevent memory leaks
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    
    set({ toastMessage: message, toastType: type });
    
    // Auto-hide based on type (errors stay longer, warnings medium)
    const duration = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000;
    toastTimeoutId = setTimeout(() => {
      // Only hide if the message is still the same
      if (get().toastMessage === message) {
        set({ toastMessage: null, toastType: null });
      }
      toastTimeoutId = null;
    }, duration);
  },
  hideToast: () => {
    // Clear timeout when manually hiding
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
    set({ toastMessage: null, toastType: null });
  },

  // Accessibility actions
  initAccessibility: () => {
    // Fetch initial accessibility states
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      set({ isReduceMotionEnabled: enabled });
    });
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      set({ isScreenReaderEnabled: enabled });
    });

    // Set up listeners for changes
    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => set({ isReduceMotionEnabled: enabled })
    );
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => set({ isScreenReaderEnabled: enabled })
    );

    // Store cleanup functions (in real app, would be called on unmount)
    // For now, these listeners persist for app lifetime
  },
  setReduceMotionEnabled: (enabled) => set({ isReduceMotionEnabled: enabled }),
  setScreenReaderEnabled: (enabled) => set({ isScreenReaderEnabled: enabled }),
  getAnimationDuration: (normalDuration) => {
    return get().isReduceMotionEnabled ? 0 : normalDuration;
  },

  // Reset all modals (useful for navigation)
  resetModals: () => set({
    isSearchVisible: false,
    isProfileSheetVisible: false,
    isTourDetailVisible: false,
    isNotificationSheetVisible: false,
  }),
}));

// Selectors for optimized re-renders
export const selectIsSearchVisible = (state: UIState) => state.isSearchVisible;
export const selectIsProfileSheetVisible = (state: UIState) => state.isProfileSheetVisible;
export const selectIsTourDetailVisible = (state: UIState) => state.isTourDetailVisible;
export const selectSelectedTour = (state: UIState) => state.selectedTour;
export const selectIsGlobalLoading = (state: UIState) => state.isGlobalLoading;
export const selectUnreadNotificationCount = (state: UIState) => state.unreadNotificationCount;
export const selectToast = (state: UIState) => ({
  message: state.toastMessage,
  type: state.toastType,
});

// Accessibility selectors
export const selectIsReduceMotionEnabled = (state: UIState) => state.isReduceMotionEnabled;
export const selectIsScreenReaderEnabled = (state: UIState) => state.isScreenReaderEnabled;
