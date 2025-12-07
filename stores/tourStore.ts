import { create } from 'zustand';
import { Tour, TourData, Category, tourDataToTour } from '@/types';
import { 
  getTours, 
  getToursByCategory, 
  getToursPaginated,
  searchTours as searchToursService,
  getCategories,
  createTour as createTourService,
  updateTour as updateTourService,
  deleteTour as deleteTourService,
  TourInput,
  TOURS_PAGE_SIZE,
} from '@/lib/tourService';
import { featuredTours } from '@/constants/Tours';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { RealtimeChannel } from '@supabase/supabase-js';

// Track the latest category fetch request to prevent race conditions
let latestCategoryFetchId = 0;

// Realtime subscription channel
let toursChannel: RealtimeChannel | null = null;

// SWR Configuration
const SWR_CONFIG = {
  // Data is considered fresh for 2 minutes
  staleTime: 2 * 60 * 1000,
  // Cache expires after 10 minutes
  cacheTime: 10 * 60 * 1000,
  // Revalidate in background when stale
  revalidateOnMount: true,
  // Revalidate when window regains focus
  revalidateOnFocus: true,
};

interface TourState {
  // State
  tours: Tour[];
  allTours: Tour[];  // Tüm turlar (kategori filtresi olmadan) - Reels için
  isLoadingAllTours: boolean;  // Reels için ayrı loading state
  categories: Category[];
  selectedCategoryId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isRevalidating: boolean;
  error: string | null;
  lastFetched: number | null;
  isStale: boolean;
  
  // Pagination state
  currentPage: number;
  hasMore: boolean;
  totalCount: number;

  // Search state
  searchResults: Tour[];
  isSearching: boolean;
  searchQuery: string;

  // Actions
  setTours: (tours: Tour[]) => void;
  setCategories: (categories: Category[]) => void;
  setSelectedCategory: (categoryId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  fetchTours: () => Promise<void>;
  fetchAllTours: (forceRefresh?: boolean) => Promise<void>;  // Tüm turları çek (Reels için)
  fetchToursWithSWR: () => Promise<void>;
  revalidate: () => Promise<void>;
  fetchToursByCategory: (categoryId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  refreshTours: () => Promise<void>;
  loadMoreTours: () => Promise<void>;
  searchTours: (query: string) => Promise<void>;
  clearSearch: () => void;
  createTour: (tour: TourInput, imageUri?: string) => Promise<{ success: boolean; error: string | null }>;
  updateTour: (id: string, tour: Partial<TourInput>, newImageUri?: string, oldImageUrl?: string) => Promise<{ success: boolean; error: string | null }>;
  deleteTour: (id: string, imageUrl?: string) => Promise<{ success: boolean; error: string | null }>;
  
  // Realtime subscription
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;

  // Computed / helpers
  getTourById: (id: string) => Tour | undefined;
  getToursBySelectedCategory: () => Tour[];
}

// Cache duration: 5 minutes (kept for backward compatibility)
const CACHE_DURATION = 5 * 60 * 1000;

export const useTourStore = create<TourState>((set, get) => ({
  // Initial state
  tours: [],
  allTours: [],  // Tüm turlar (kategori filtresi olmadan)
  isLoadingAllTours: false,
  categories: [{ id: 'all', name: 'Tümü', icon: 'apps-outline', sort_order: 0 }],
  selectedCategoryId: 'all',
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  isRevalidating: false,
  error: null,
  lastFetched: null,
  isStale: false,
  
  // Pagination state
  currentPage: 0,
  hasMore: true,
  totalCount: 0,

  // Search state
  searchResults: [],
  isSearching: false,
  searchQuery: '',

  // Setters
  setTours: (tours) => set({ tours }),
  setCategories: (categories) => set({ categories }),
  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
    // Fetch tours for the new category
    get().fetchToursByCategory(categoryId);
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Fetch all tours (basic fetch)
  fetchTours: async () => {
    const { lastFetched, isLoading } = get();
    
    // Skip if already loading
    if (isLoading) return;

    // Use cache if available and fresh
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getTours();

      if (error) {
        logger.warn('Tour fetch error, using fallback:', error);
        set({ 
          tours: featuredTours, 
          error: null, // Don't show error if we have fallback
          isLoading: false,
          lastFetched: Date.now(),
          isStale: false,
        });
        return;
      }

      const tours = data.map(tourDataToTour);
      set({ 
        tours: tours.length > 0 ? tours : featuredTours,
        isLoading: false,
        lastFetched: Date.now(),
        isStale: false,
        error: null,
      });
    } catch (err: any) {
      logger.error('Tour fetch exception:', err);
      set({ 
        tours: featuredTours,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Fetch all tours without category filter (for Reels)
   */
  fetchAllTours: async (forceRefresh = false) => {
    const { allTours, isLoadingAllTours } = get();
    
    // Skip if already loading
    if (isLoadingAllTours) return;
    
    // Skip if have cached data and not forcing refresh
    if (!forceRefresh && allTours.length > 0) return;

    set({ isLoadingAllTours: true, error: null });

    try {
      const { data, error } = await getTours();

      if (error) {
        logger.warn('All tours fetch error, using fallback:', error);
        set({ 
          allTours: featuredTours, 
          error: null,
          isLoadingAllTours: false,
        });
        return;
      }

      const tours = data.map(tourDataToTour);
      set({ 
        allTours: tours.length > 0 ? tours : featuredTours,
        isLoadingAllTours: false,
        error: null,
      });
    } catch (err: any) {
      logger.error('All tours fetch exception:', err);
      set({ 
        allTours: featuredTours,
        isLoadingAllTours: false,
        error: null,
      });
    }
  },

  /**
   * SWR-like fetch: Return stale data immediately, revalidate in background
   */
  fetchToursWithSWR: async () => {
    const { lastFetched, isLoading, isRevalidating, tours } = get();
    
    // Skip if already loading or revalidating
    if (isLoading || isRevalidating) return;

    const now = Date.now();
    const hasCache = tours.length > 0 && lastFetched;
    const isFresh = hasCache && (now - lastFetched) < SWR_CONFIG.staleTime;
    const isExpired = hasCache && (now - lastFetched) > SWR_CONFIG.cacheTime;

    // If data is fresh, no need to fetch
    if (isFresh) {
      return;
    }

    // If we have stale cache, mark as stale and revalidate in background
    if (hasCache && !isExpired) {
      set({ isStale: true, isRevalidating: true });
      
      // Background revalidation
      try {
        const { data, error } = await getTours();
        
        if (!error && data.length > 0) {
          const newTours = data.map(tourDataToTour);
          set({ 
            tours: newTours,
            lastFetched: Date.now(),
            isStale: false,
            isRevalidating: false,
          });
          logger.info('[SWR] Tours revalidated in background');
        } else {
          set({ isRevalidating: false, isStale: false });
        }
      } catch (err) {
        logger.warn('[SWR] Background revalidation failed:', err);
        set({ isRevalidating: false, isStale: false });
      }
      return;
    }

    // No cache or expired - do a full fetch
    await get().fetchTours();
  },

  /**
   * Force revalidation (useful for pull-to-refresh)
   */
  revalidate: async () => {
    set({ lastFetched: null, isStale: true });
    await get().fetchTours();
  },

  /**
   * Subscribe to realtime updates from Supabase
   */
  subscribeToRealtime: () => {
    // Unsubscribe from existing channel if any
    if (toursChannel) {
      supabase.removeChannel(toursChannel);
    }

    toursChannel = supabase
      .channel('tours-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tours',
        },
        (payload) => {
          logger.info('[Realtime] Tours table changed:', payload.eventType);
          
          const { tours } = get();
          
          switch (payload.eventType) {
            case 'INSERT':
              const newTour = tourDataToTour(payload.new as TourData);
              set({ tours: [newTour, ...tours] });
              break;
              
            case 'UPDATE':
              const updatedTour = tourDataToTour(payload.new as TourData);
              set({ 
                tours: tours.map(t => t.id === updatedTour.id ? updatedTour : t) 
              });
              break;
              
            case 'DELETE':
              const deletedId = (payload.old as any).id;
              set({ tours: tours.filter(t => t.id !== deletedId) });
              break;
          }
        }
      )
      .subscribe((status) => {
        logger.info('[Realtime] Tours subscription status:', status);
      });
  },

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromRealtime: () => {
    if (toursChannel) {
      supabase.removeChannel(toursChannel);
      toursChannel = null;
      logger.info('[Realtime] Unsubscribed from tours');
    }
  },

  // Fetch tours by category with race condition protection
  fetchToursByCategory: async (categoryId: string) => {
    // Increment request ID to track latest request
    const requestId = ++latestCategoryFetchId;
    
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getToursByCategory(categoryId);

      // Only update state if this is still the latest request
      if (requestId !== latestCategoryFetchId) {
        return; // Stale request, ignore results
      }

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      const tours = data.map(tourDataToTour);
      set({ 
        tours,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (err: any) {
      // Only update state if this is still the latest request
      if (requestId !== latestCategoryFetchId) {
        return;
      }
      set({ 
        error: err.message,
        isLoading: false,
      });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const { data } = await getCategories();
      
      // Ensure "all" category is at the beginning
      const filteredData = data.filter(c => c.id !== 'all');
      const categories = [
        { id: 'all', name: 'Tümü', icon: 'apps-outline', sort_order: 0 },
        ...filteredData,
      ];
      
      set({ categories });
    } catch (err) {
      console.log('Categories fetch error:', err);
    }
  },

  // Force refresh tours (ignore cache)
  refreshTours: async () => {
    set({ isRefreshing: true, lastFetched: null, currentPage: 0 });
    
    const { selectedCategoryId } = get();
    
    try {
      const result = await getToursPaginated(0, TOURS_PAGE_SIZE, selectedCategoryId);
      
      if (result.error) {
        set({ error: result.error, isRefreshing: false });
        return;
      }

      const tours = result.data.map(tourDataToTour);
      set({ 
        tours,
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        currentPage: 0,
        isRefreshing: false,
        lastFetched: Date.now(),
      });
    } catch (err: any) {
      set({ error: err.message, isRefreshing: false });
    }
  },

  // Load more tours (pagination)
  loadMoreTours: async () => {
    const { isLoadingMore, hasMore, currentPage, selectedCategoryId, tours } = get();
    
    // Skip if already loading or no more data
    if (isLoadingMore || !hasMore) return;

    set({ isLoadingMore: true });

    try {
      const nextPage = currentPage + 1;
      const result = await getToursPaginated(nextPage, TOURS_PAGE_SIZE, selectedCategoryId);

      if (result.error) {
        set({ error: result.error, isLoadingMore: false });
        return;
      }

      const newTours = result.data.map(tourDataToTour);
      set({
        tours: [...tours, ...newTours],
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        currentPage: nextPage,
        isLoadingMore: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoadingMore: false });
    }
  },

  // Search tours with server-side filtering
  searchTours: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '', isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query });

    try {
      const { data, error } = await searchToursService(query);

      if (error) {
        set({ error, isSearching: false });
        return;
      }

      const results = data.map(tourDataToTour);
      set({ searchResults: results, isSearching: false });
    } catch (err: any) {
      set({ error: err.message, isSearching: false });
    }
  },

  // Clear search results
  clearSearch: () => {
    set({ searchResults: [], searchQuery: '', isSearching: false });
  },

  // Create new tour
  createTour: async (tour: TourInput, imageUri?: string) => {
    set({ isLoading: true });

    const { data, error } = await createTourService(tour, imageUri);

    if (error) {
      set({ isLoading: false });
      return { success: false, error };
    }

    // Add new tour to the list
    if (data) {
      const newTour = tourDataToTour(data);
      set((state) => ({
        tours: [newTour, ...state.tours],
        isLoading: false,
      }));
    }

    return { success: true, error: null };
  },

  // Update existing tour
  updateTour: async (id: string, tour: Partial<TourInput>, newImageUri?: string, oldImageUrl?: string) => {
    set({ isLoading: true });

    const { data, error } = await updateTourService(id, tour, newImageUri, oldImageUrl);

    if (error) {
      set({ isLoading: false });
      return { success: false, error };
    }

    // Update tour in the list
    if (data) {
      const updatedTour = tourDataToTour(data);
      set((state) => ({
        tours: state.tours.map(t => t.id === id ? updatedTour : t),
        isLoading: false,
      }));
    }

    return { success: true, error: null };
  },

  // Delete tour
  deleteTour: async (id: string, imageUrl?: string) => {
    set({ isLoading: true });

    const { success, error } = await deleteTourService(id, imageUrl);

    if (!success) {
      set({ isLoading: false });
      return { success: false, error };
    }

    // Remove tour from the list
    set((state) => ({
      tours: state.tours.filter(t => t.id !== id),
      isLoading: false,
    }));

    return { success: true, error: null };
  },

  // Get single tour by ID
  getTourById: (id: string) => {
    return get().tours.find(t => t.id === id);
  },

  // Get tours filtered by selected category (client-side filter for "all")
  getToursBySelectedCategory: () => {
    const { tours, selectedCategoryId } = get();
    if (selectedCategoryId === 'all') {
      return tours;
    }
    return tours.filter(t => t.category === selectedCategoryId);
  },
}));

// Selectors for optimized re-renders
export const selectTours = (state: TourState) => state.tours;
export const selectCategories = (state: TourState) => state.categories;
export const selectSelectedCategoryId = (state: TourState) => state.selectedCategoryId;
export const selectIsLoading = (state: TourState) => state.isLoading;
export const selectIsRefreshing = (state: TourState) => state.isRefreshing;
export const selectIsLoadingMore = (state: TourState) => state.isLoadingMore;
export const selectHasMore = (state: TourState) => state.hasMore;
export const selectSearchResults = (state: TourState) => state.searchResults;
export const selectIsSearching = (state: TourState) => state.isSearching;
export const selectError = (state: TourState) => state.error;
