/**
 * Route Store
 * Zustand store for managing thematic travel routes
 */

import { create } from 'zustand';
import { ThematicRoute } from '@/types';
import {
  getThematicRoutes,
  getHighlightedRoutes,
  getThematicRouteById,
  getRoutesByTheme,
  searchRoutes as searchRoutesService,
} from '@/lib/routeService';

// Cache duration: 10 minutes (routes don't change often)
const CACHE_DURATION = 10 * 60 * 1000;

interface RouteState {
  // State
  routes: ThematicRoute[];
  highlightedRoutes: ThematicRoute[];
  selectedRoute: ThematicRoute | null;
  isLoading: boolean;
  isLoadingHighlighted: boolean;
  error: string | null;
  lastFetched: number | null;
  lastHighlightedFetched: number | null;

  // Search state
  searchResults: ThematicRoute[];
  isSearching: boolean;
  searchQuery: string;

  // Actions
  setRoutes: (routes: ThematicRoute[]) => void;
  setHighlightedRoutes: (routes: ThematicRoute[]) => void;
  setSelectedRoute: (route: ThematicRoute | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  fetchRoutes: () => Promise<void>;
  fetchHighlightedRoutes: () => Promise<void>;
  fetchRouteById: (id: string) => Promise<ThematicRoute | null>;
  fetchRoutesByTheme: (theme: string) => Promise<void>;
  searchRoutes: (query: string) => Promise<void>;
  clearSearch: () => void;
  refreshRoutes: () => Promise<void>;

  // Computed / helpers
  getRouteById: (id: string) => ThematicRoute | undefined;
  getRoutesByThemeLocal: (theme: string) => ThematicRoute[];
}

export const useRouteStore = create<RouteState>((set, get) => ({
  // Initial state
  routes: [],
  highlightedRoutes: [],
  selectedRoute: null,
  isLoading: false,
  isLoadingHighlighted: false,
  error: null,
  lastFetched: null,
  lastHighlightedFetched: null,

  // Search state
  searchResults: [],
  isSearching: false,
  searchQuery: '',

  // Setters
  setRoutes: (routes) => set({ routes }),
  setHighlightedRoutes: (routes) => set({ highlightedRoutes: routes }),
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Fetch all routes
  fetchRoutes: async () => {
    const { lastFetched, isLoading } = get();

    // Skip if already loading
    if (isLoading) return;

    // Use cache if available and fresh
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getThematicRoutes();

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      set({
        routes: data,
        isLoading: false,
        lastFetched: Date.now(),
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message,
        isLoading: false,
      });
    }
  },

  // Fetch highlighted routes for Explore screen
  fetchHighlightedRoutes: async () => {
    const { lastHighlightedFetched, isLoadingHighlighted } = get();

    // Skip if already loading
    if (isLoadingHighlighted) return;

    // Use cache if available and fresh
    if (lastHighlightedFetched && Date.now() - lastHighlightedFetched < CACHE_DURATION) {
      return;
    }

    set({ isLoadingHighlighted: true, error: null });

    try {
      const { data, error } = await getHighlightedRoutes();

      if (error) {
        set({ error, isLoadingHighlighted: false });
        return;
      }

      set({
        highlightedRoutes: data,
        isLoadingHighlighted: false,
        lastHighlightedFetched: Date.now(),
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message,
        isLoadingHighlighted: false,
      });
    }
  },

  // Fetch single route by ID
  fetchRouteById: async (id: string) => {
    // First check local cache
    const cached = get().routes.find(r => r.id === id);
    if (cached) {
      set({ selectedRoute: cached });
      return cached;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getThematicRouteById(id);

      if (error || !data) {
        set({ error: error || 'Rota bulunamadı', isLoading: false });
        return null;
      }

      set({
        selectedRoute: data,
        isLoading: false,
        error: null,
      });

      return data;
    } catch (err: any) {
      set({
        error: err.message,
        isLoading: false,
      });
      return null;
    }
  },

  // Fetch routes by theme
  fetchRoutesByTheme: async (theme: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await getRoutesByTheme(theme);

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      set({
        routes: data,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message,
        isLoading: false,
      });
    }
  },

  // Search routes
  searchRoutes: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '', isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query });

    try {
      const { data, error } = await searchRoutesService(query);

      if (error) {
        set({ error, isSearching: false });
        return;
      }

      set({ searchResults: data, isSearching: false });
    } catch (err: any) {
      set({ error: err.message, isSearching: false });
    }
  },

  // Clear search results
  clearSearch: () => {
    set({ searchResults: [], searchQuery: '', isSearching: false });
  },

  // Force refresh routes (ignore cache)
  refreshRoutes: async () => {
    set({ lastFetched: null, lastHighlightedFetched: null });
    await Promise.all([
      get().fetchRoutes(),
      get().fetchHighlightedRoutes(),
    ]);
  },

  // Get single route by ID from local state
  getRouteById: (id: string) => {
    const { routes, highlightedRoutes } = get();
    return routes.find(r => r.id === id) || highlightedRoutes.find(r => r.id === id);
  },

  // Get routes by theme from local state
  getRoutesByThemeLocal: (theme: string) => {
    return get().routes.filter(r => r.theme === theme);
  },
}));

// Selectors for optimized re-renders
export const selectRoutes = (state: RouteState) => state.routes;
export const selectHighlightedRoutes = (state: RouteState) => state.highlightedRoutes;
export const selectSelectedRoute = (state: RouteState) => state.selectedRoute;
export const selectIsLoading = (state: RouteState) => state.isLoading;
export const selectIsLoadingHighlighted = (state: RouteState) => state.isLoadingHighlighted;
export const selectError = (state: RouteState) => state.error;
export const selectSearchResults = (state: RouteState) => state.searchResults;
export const selectIsSearching = (state: RouteState) => state.isSearching;
