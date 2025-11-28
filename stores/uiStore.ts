import { create } from 'zustand';
import { Tour } from '@/types';

interface UIState {
  // Modal states
  isSearchVisible: boolean;
  isProfileSheetVisible: boolean;
  isTourDetailVisible: boolean;

  // Selected items
  selectedTour: Tour | null;

  // Global UI states
  isGlobalLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;

  // Actions - Modals
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  openProfileSheet: () => void;
  closeProfileSheet: () => void;

  openTourDetail: (tour: Tour) => void;
  closeTourDetail: () => void;

  // Actions - Selected items
  setSelectedTour: (tour: Tour | null) => void;

  // Actions - Global UI
  setGlobalLoading: (loading: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Reset all modals
  resetModals: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  isSearchVisible: false,
  isProfileSheetVisible: false,
  isTourDetailVisible: false,
  selectedTour: null,
  isGlobalLoading: false,
  toastMessage: null,
  toastType: null,

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
  closeTourDetail: () => set({ 
    isTourDetailVisible: false,
    // Keep selectedTour briefly for closing animation
    // It will be cleared on next open
  }),

  // Selected tour
  setSelectedTour: (tour) => set({ selectedTour: tour }),

  // Global loading
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  // Toast notifications
  showToast: (message, type) => {
    set({ toastMessage: message, toastType: type });
    
    // Auto-hide based on type (errors stay longer)
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      // Only hide if the message is still the same
      if (get().toastMessage === message) {
        set({ toastMessage: null, toastType: null });
      }
    }, duration);
  },
  hideToast: () => set({ toastMessage: null, toastType: null }),

  // Reset all modals (useful for navigation)
  resetModals: () => set({
    isSearchVisible: false,
    isProfileSheetVisible: false,
    isTourDetailVisible: false,
  }),
}));

// Selectors for optimized re-renders
export const selectIsSearchVisible = (state: UIState) => state.isSearchVisible;
export const selectIsProfileSheetVisible = (state: UIState) => state.isProfileSheetVisible;
export const selectIsTourDetailVisible = (state: UIState) => state.isTourDetailVisible;
export const selectSelectedTour = (state: UIState) => state.selectedTour;
export const selectIsGlobalLoading = (state: UIState) => state.isGlobalLoading;
export const selectToast = (state: UIState) => ({
  message: state.toastMessage,
  type: state.toastType,
});
