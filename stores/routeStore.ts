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
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { RealtimeChannel } from '@supabase/supabase-js';

// Cache duration: 10 minutes (routes don't change often)
const CACHE_DURATION = 10 * 60 * 1000;

// Realtime subscription channel
let routesChannel: RealtimeChannel | null = null;

// SWR Configuration for routes
const SWR_CONFIG = {
  // Data is considered fresh for 5 minutes (routes change less often)
  staleTime: 5 * 60 * 1000,
  // Cache expires after 15 minutes
  cacheTime: 15 * 60 * 1000,
};

interface RouteState {
  // State
  routes: ThematicRoute[];
  highlightedRoutes: ThematicRoute[];
  selectedRoute: ThematicRoute | null;
  isLoading: boolean;
  isLoadingHighlighted: boolean;
  isRevalidating: boolean;
  error: string | null;
  lastFetched: number | null;
  lastHighlightedFetched: number | null;
  isStale: boolean;

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
  fetchRoutesWithSWR: () => Promise<void>;
  fetchHighlightedRoutes: () => Promise<void>;
  fetchHighlightedRoutesWithSWR: () => Promise<void>;
  revalidate: () => Promise<void>;
  fetchRouteById: (id: string) => Promise<ThematicRoute | null>;
  fetchRoutesByTheme: (theme: string) => Promise<void>;
  searchRoutes: (query: string) => Promise<void>;
  clearSearch: () => void;
  refreshRoutes: () => Promise<void>;
  
  // Realtime subscription
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;

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
  isRevalidating: false,
  error: null,
  lastFetched: null,
  lastHighlightedFetched: null,
  isStale: false,

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
        isStale: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message,
        isLoading: false,
      });
    }
  },

  /**
   * SWR-like fetch for routes: Return stale data immediately, revalidate in background
   */
  fetchRoutesWithSWR: async () => {
    const { lastFetched, isLoading, isRevalidating, routes } = get();
    
    if (isLoading || isRevalidating) return;

    const now = Date.now();
    const hasCache = routes.length > 0 && lastFetched;
    const isFresh = hasCache && (now - lastFetched) < SWR_CONFIG.staleTime;
    const isExpired = hasCache && (now - lastFetched) > SWR_CONFIG.cacheTime;

    if (isFresh) return;

    if (hasCache && !isExpired) {
      set({ isStale: true, isRevalidating: true });
      
      try {
        const { data, error } = await getThematicRoutes();
        
        if (!error && data.length > 0) {
          set({ 
            routes: data,
            lastFetched: Date.now(),
            isStale: false,
            isRevalidating: false,
          });
          logger.info('[SWR] Routes revalidated in background');
        } else {
          set({ isRevalidating: false, isStale: false });
        }
      } catch (err) {
        logger.warn('[SWR] Routes background revalidation failed:', err);
        set({ isRevalidating: false, isStale: false });
      }
      return;
    }

    await get().fetchRoutes();
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
        isStale: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err.message,
        isLoadingHighlighted: false,
      });
    }
  },

  /**
   * SWR-like fetch for highlighted routes
   */
  fetchHighlightedRoutesWithSWR: async () => {
    const { lastHighlightedFetched, isLoadingHighlighted, isRevalidating, highlightedRoutes } = get();
    
    if (isLoadingHighlighted || isRevalidating) return;

    const now = Date.now();
    const hasCache = highlightedRoutes.length > 0 && lastHighlightedFetched;
    const isFresh = hasCache && (now - lastHighlightedFetched) < SWR_CONFIG.staleTime;
    const isExpired = hasCache && (now - lastHighlightedFetched) > SWR_CONFIG.cacheTime;

    if (isFresh) return;

    if (hasCache && !isExpired) {
      set({ isStale: true, isRevalidating: true });
      
      try {
        const { data, error } = await getHighlightedRoutes();
        
        if (!error && data.length > 0) {
          set({ 
            highlightedRoutes: data,
            lastHighlightedFetched: Date.now(),
            isStale: false,
            isRevalidating: false,
          });
          logger.info('[SWR] Highlighted routes revalidated in background');
        } else {
          set({ isRevalidating: false, isStale: false });
        }
      } catch (err) {
        logger.warn('[SWR] Highlighted routes background revalidation failed:', err);
        set({ isRevalidating: false, isStale: false });
      }
      return;
    }

    await get().fetchHighlightedRoutes();
  },

  /**
   * Force revalidation
   */
  revalidate: async () => {
    set({ lastFetched: null, lastHighlightedFetched: null, isStale: true });
    await Promise.all([
      get().fetchRoutes(),
      get().fetchHighlightedRoutes(),
    ]);
  },

  /**
   * Subscribe to realtime updates from Supabase
   */
  subscribeToRealtime: () => {
    if (routesChannel) {
      supabase.removeChannel(routesChannel);
    }

    routesChannel = supabase
      .channel('routes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thematic_routes',
        },
        (payload) => {
          logger.info('[Realtime] Routes table changed:', payload.eventType);
          // For routes, we do a full refresh since the data structure is complex
          get().revalidate();
        }
      )
      .subscribe((status) => {
        logger.info('[Realtime] Routes subscription status:', status);
      });
  },

  /**
   * Unsubscribe from realtime updates
   */
  unsubscribeFromRealtime: () => {
    if (routesChannel) {
      supabase.removeChannel(routesChannel);
      routesChannel = null;
      logger.info('[Realtime] Unsubscribed from routes');
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

  // Force refresh routes (ignore cache) - kept for backward compatibility
  refreshRoutes: async () => {
    await get().revalidate();
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
