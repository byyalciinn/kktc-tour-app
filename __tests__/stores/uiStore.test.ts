import { useUIStore } from '@/stores/uiStore';
import { Tour } from '@/types';

// Mock tour for testing
const mockTour: Tour = {
  id: 'test-tour-1',
  title: 'Test Tour',
  location: 'Girne',
  description: 'A test tour',
  price: 100,
  currency: '€',
  duration: '2 saat',
  rating: 4.5,
  reviewCount: 10,
  image: 'https://example.com/image.jpg',
  highlights: ['Highlight 1', 'Highlight 2'],
  category: 'nature',
};

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      isSearchVisible: false,
      isProfileSheetVisible: false,
      isTourDetailVisible: false,
      isNotificationSheetVisible: false,
      selectedTour: null,
      isGlobalLoading: false,
      toastMessage: null,
      toastType: null,
    });
  });

  describe('Modal Actions', () => {
    it('should open and close search modal', () => {
      const { openSearch, closeSearch } = useUIStore.getState();
      
      expect(useUIStore.getState().isSearchVisible).toBe(false);
      
      openSearch();
      expect(useUIStore.getState().isSearchVisible).toBe(true);
      
      closeSearch();
      expect(useUIStore.getState().isSearchVisible).toBe(false);
    });

    it('should toggle search modal', () => {
      const { toggleSearch } = useUIStore.getState();
      
      expect(useUIStore.getState().isSearchVisible).toBe(false);
      
      toggleSearch();
      expect(useUIStore.getState().isSearchVisible).toBe(true);
      
      toggleSearch();
      expect(useUIStore.getState().isSearchVisible).toBe(false);
    });

    it('should open tour detail with tour data', () => {
      const { openTourDetail } = useUIStore.getState();
      
      openTourDetail(mockTour);
      
      const state = useUIStore.getState();
      expect(state.isTourDetailVisible).toBe(true);
      expect(state.selectedTour).toEqual(mockTour);
    });

    it('should close tour detail but keep selectedTour for animation', () => {
      const { openTourDetail, closeTourDetail } = useUIStore.getState();
      
      openTourDetail(mockTour);
      closeTourDetail();
      
      const state = useUIStore.getState();
      expect(state.isTourDetailVisible).toBe(false);
      // selectedTour is kept for closing animation
      expect(state.selectedTour).toEqual(mockTour);
    });

    it('should reset all modals', () => {
      const { openSearch, openProfileSheet, openNotificationSheet, resetModals } = useUIStore.getState();
      
      openSearch();
      openProfileSheet();
      openNotificationSheet();
      
      resetModals();
      
      const state = useUIStore.getState();
      expect(state.isSearchVisible).toBe(false);
      expect(state.isProfileSheetVisible).toBe(false);
      expect(state.isNotificationSheetVisible).toBe(false);
      expect(state.isTourDetailVisible).toBe(false);
    });
  });

  describe('Toast Actions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should show toast with message and type', () => {
      const { showToast } = useUIStore.getState();
      
      showToast('Test message', 'success');
      
      const state = useUIStore.getState();
      expect(state.toastMessage).toBe('Test message');
      expect(state.toastType).toBe('success');
    });

    it('should auto-hide success toast after 3 seconds', () => {
      const { showToast } = useUIStore.getState();
      
      showToast('Success message', 'success');
      expect(useUIStore.getState().toastMessage).toBe('Success message');
      
      jest.advanceTimersByTime(3000);
      
      expect(useUIStore.getState().toastMessage).toBeNull();
    });

    it('should auto-hide error toast after 5 seconds', () => {
      const { showToast } = useUIStore.getState();
      
      showToast('Error message', 'error');
      
      jest.advanceTimersByTime(3000);
      expect(useUIStore.getState().toastMessage).toBe('Error message');
      
      jest.advanceTimersByTime(2000);
      expect(useUIStore.getState().toastMessage).toBeNull();
    });

    it('should manually hide toast', () => {
      const { showToast, hideToast } = useUIStore.getState();
      
      showToast('Test message', 'info');
      hideToast();
      
      expect(useUIStore.getState().toastMessage).toBeNull();
    });

    it('should clear previous timeout when showing new toast', () => {
      const { showToast } = useUIStore.getState();
      
      showToast('First message', 'success');
      showToast('Second message', 'success');
      
      expect(useUIStore.getState().toastMessage).toBe('Second message');
      
      // First timeout should be cleared, so after 3s only second message timeout fires
      jest.advanceTimersByTime(3000);
      expect(useUIStore.getState().toastMessage).toBeNull();
    });
  });

  describe('Global Loading', () => {
    it('should set global loading state', () => {
      const { setGlobalLoading } = useUIStore.getState();
      
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
      
      setGlobalLoading(true);
      expect(useUIStore.getState().isGlobalLoading).toBe(true);
      
      setGlobalLoading(false);
      expect(useUIStore.getState().isGlobalLoading).toBe(false);
    });
  });
});
