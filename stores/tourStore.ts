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

interface TourState {
  // State
  tours: Tour[];
  categories: Category[];
  selectedCategoryId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  lastFetched: number | null;
  
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
  fetchToursByCategory: (categoryId: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  refreshTours: () => Promise<void>;
  loadMoreTours: () => Promise<void>;
  searchTours: (query: string) => Promise<void>;
  clearSearch: () => void;
  createTour: (tour: TourInput, imageUri?: string) => Promise<{ success: boolean; error: string | null }>;
  updateTour: (id: string, tour: Partial<TourInput>, newImageUri?: string, oldImageUrl?: string) => Promise<{ success: boolean; error: string | null }>;
  deleteTour: (id: string, imageUrl?: string) => Promise<{ success: boolean; error: string | null }>;

  // Computed / helpers
  getTourById: (id: string) => Tour | undefined;
  getToursBySelectedCategory: () => Tour[];
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useTourStore = create<TourState>((set, get) => ({
  // Initial state
  tours: [],
  categories: [{ id: 'all', name: 'Tümü', icon: 'apps-outline', sort_order: 0 }],
  selectedCategoryId: 'all',
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  error: null,
  lastFetched: null,
  
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

  // Fetch all tours
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
        console.log('Tour fetch error, using fallback:', error);
        set({ 
          tours: featuredTours, 
          error: null, // Don't show error if we have fallback
          isLoading: false,
          lastFetched: Date.now(),
        });
        return;
      }

      const tours = data.map(tourDataToTour);
      set({ 
        tours: tours.length > 0 ? tours : featuredTours,
        isLoading: false,
        lastFetched: Date.now(),
        error: null,
      });
    } catch (err: any) {
      console.log('Tour fetch exception:', err);
      set({ 
        tours: featuredTours,
        isLoading: false,
        error: null,
      });
    }
  },

  // Fetch tours by category
  fetchToursByCategory: async (categoryId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getToursByCategory(categoryId);

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
