import { create } from 'zustand';
import { Tour, TourData, tourDataToTour } from '@/types';
import {
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  isTourFavorited,
  toggleFavorite as toggleFavoriteService,
} from '@/lib/tourService';

interface FavoritesState {
  // State
  favorites: Tour[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setFavorites: (favorites: Tour[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Async actions
  fetchFavorites: (userId: string) => Promise<void>;
  addFavorite: (userId: string, tour: Tour) => Promise<{ success: boolean; error: string | null }>;
  removeFavorite: (userId: string, tourId: string) => Promise<{ success: boolean; error: string | null }>;
  toggleFavorite: (userId: string, tour: Tour) => Promise<{ isFavorited: boolean; error: string | null }>;
  checkIsFavorited: (userId: string, tourId: string) => Promise<boolean>;

  // Computed
  isFavorited: (tourId: string) => boolean;
  getFavoriteCount: () => number;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  // Initial state
  favorites: [],
  favoriteIds: new Set(),
  isLoading: false,
  error: null,

  // Setters
  setFavorites: (favorites) => {
    const favoriteIds = new Set(favorites.map(f => f.id));
    set({ favorites, favoriteIds });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Reset store (on logout)
  reset: () => set({
    favorites: [],
    favoriteIds: new Set(),
    isLoading: false,
    error: null,
  }),

  // Fetch user's favorites
  fetchFavorites: async (userId: string) => {
    if (!userId) {
      set({ favorites: [], favoriteIds: new Set() });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getUserFavorites(userId);

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      const favorites = data.map(tourDataToTour);
      const favoriteIds = new Set(favorites.map(f => f.id));
      
      set({ 
        favorites,
        favoriteIds,
        isLoading: false,
      });
    } catch (err: any) {
      set({ 
        error: err.message,
        isLoading: false,
      });
    }
  },

  // Add tour to favorites
  addFavorite: async (userId: string, tour: Tour) => {
    if (!userId) {
      return { success: false, error: 'Giriş yapmalısınız' };
    }

    // Optimistic update
    set((state) => ({
      favorites: [tour, ...state.favorites],
      favoriteIds: new Set([tour.id, ...state.favoriteIds]),
    }));

    const { success, error } = await addToFavorites(userId, tour.id);

    if (!success) {
      // Rollback on error
      set((state) => ({
        favorites: state.favorites.filter(f => f.id !== tour.id),
        favoriteIds: new Set([...state.favoriteIds].filter(id => id !== tour.id)),
      }));
      return { success: false, error };
    }

    return { success: true, error: null };
  },

  // Remove tour from favorites
  removeFavorite: async (userId: string, tourId: string) => {
    if (!userId) {
      return { success: false, error: 'Giriş yapmalısınız' };
    }

    // Store current state for rollback
    const previousFavorites = get().favorites;
    const previousIds = get().favoriteIds;

    // Optimistic update
    set((state) => ({
      favorites: state.favorites.filter(f => f.id !== tourId),
      favoriteIds: new Set([...state.favoriteIds].filter(id => id !== tourId)),
    }));

    const { success, error } = await removeFromFavorites(userId, tourId);

    if (!success) {
      // Rollback on error
      set({ favorites: previousFavorites, favoriteIds: previousIds });
      return { success: false, error };
    }

    return { success: true, error: null };
  },

  // Toggle favorite status
  toggleFavorite: async (userId: string, tour: Tour) => {
    if (!userId) {
      return { isFavorited: false, error: 'Giriş yapmalısınız' };
    }

    const currentlyFavorited = get().isFavorited(tour.id);

    if (currentlyFavorited) {
      const { success, error } = await get().removeFavorite(userId, tour.id);
      return { isFavorited: !success, error };
    } else {
      const { success, error } = await get().addFavorite(userId, tour);
      return { isFavorited: success, error };
    }
  },

  // Check if tour is favorited (async, from server)
  checkIsFavorited: async (userId: string, tourId: string) => {
    if (!userId) return false;
    return await isTourFavorited(userId, tourId);
  },

  // Check if tour is favorited (sync, from local state)
  isFavorited: (tourId: string) => {
    return get().favoriteIds.has(tourId);
  },

  // Get total favorite count
  getFavoriteCount: () => {
    return get().favorites.length;
  },
}));

// Selectors for optimized re-renders
export const selectFavorites = (state: FavoritesState) => state.favorites;
export const selectFavoriteIds = (state: FavoritesState) => state.favoriteIds;
export const selectIsLoading = (state: FavoritesState) => state.isLoading;
export const selectFavoriteCount = (state: FavoritesState) => state.favorites.length;
