/**
 * Route Service
 * Handles fetching and managing thematic travel routes
 * Uses Supabase with fallback to local data
 */

import { supabase } from './supabase';
import { ThematicRoute, ThematicRouteData, routeDataToRoute } from '@/types';
import { featuredRoutes } from '@/constants/ThematicRoutes';

/**
 * Get all thematic routes
 * Falls back to local data if Supabase fails or returns empty
 */
export const getThematicRoutes = async (): Promise<{ 
  data: ThematicRoute[]; 
  error: string | null 
}> => {
  try {
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Thematic routes fetch error, using fallback:', error.message);
      return { data: featuredRoutes, error: null };
    }

    if (!data || data.length === 0) {
      console.log('No thematic routes in database, using fallback');
      return { data: featuredRoutes, error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    console.log('Thematic routes exception, using fallback:', err.message);
    return { data: featuredRoutes, error: null };
  }
};

/**
 * Get highlighted/featured thematic routes for Explore screen
 */
export const getHighlightedRoutes = async (): Promise<{ 
  data: ThematicRoute[]; 
  error: string | null 
}> => {
  try {
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .eq('highlighted', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('Highlighted routes fetch error, using fallback:', error.message);
      const highlighted = featuredRoutes.filter(r => r.highlighted);
      return { data: highlighted, error: null };
    }

    if (!data || data.length === 0) {
      const highlighted = featuredRoutes.filter(r => r.highlighted);
      return { data: highlighted, error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    console.log('Highlighted routes exception, using fallback:', err.message);
    const highlighted = featuredRoutes.filter(r => r.highlighted);
    return { data: highlighted, error: null };
  }
};

/**
 * Get a single thematic route by ID
 */
export const getThematicRouteById = async (id: string): Promise<{ 
  data: ThematicRoute | null; 
  error: string | null 
}> => {
  try {
    // First try Supabase
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.log('Route fetch error, trying fallback:', error.message);
    }

    if (data) {
      return { data: routeDataToRoute(data as ThematicRouteData), error: null };
    }

    // Fallback to local data
    const localRoute = featuredRoutes.find(r => r.id === id);
    if (localRoute) {
      return { data: localRoute, error: null };
    }

    return { data: null, error: 'Rota bulunamadı' };
  } catch (err: any) {
    // Try fallback
    const localRoute = featuredRoutes.find(r => r.id === id);
    if (localRoute) {
      return { data: localRoute, error: null };
    }
    return { data: null, error: err.message };
  }
};

/**
 * Get a single thematic route by slug
 */
export const getThematicRouteBySlug = async (slug: string): Promise<{ 
  data: ThematicRoute | null; 
  error: string | null 
}> => {
  try {
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.log('Route fetch by slug error, trying fallback:', error.message);
    }

    if (data) {
      return { data: routeDataToRoute(data as ThematicRouteData), error: null };
    }

    // Fallback to local data
    const localRoute = featuredRoutes.find(r => r.slug === slug);
    if (localRoute) {
      return { data: localRoute, error: null };
    }

    return { data: null, error: 'Rota bulunamadı' };
  } catch (err: any) {
    const localRoute = featuredRoutes.find(r => r.slug === slug);
    if (localRoute) {
      return { data: localRoute, error: null };
    }
    return { data: null, error: err.message };
  }
};

/**
 * Get routes by theme
 */
export const getRoutesByTheme = async (theme: string): Promise<{ 
  data: ThematicRoute[]; 
  error: string | null 
}> => {
  try {
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .eq('theme', theme)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Routes by theme fetch error, using fallback:', error.message);
      const filtered = featuredRoutes.filter(r => r.theme === theme);
      return { data: filtered, error: null };
    }

    if (!data || data.length === 0) {
      const filtered = featuredRoutes.filter(r => r.theme === theme);
      return { data: filtered, error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    const filtered = featuredRoutes.filter(r => r.theme === theme);
    return { data: filtered, error: null };
  }
};

/**
 * Get routes by base location
 */
export const getRoutesByLocation = async (location: string): Promise<{ 
  data: ThematicRoute[]; 
  error: string | null 
}> => {
  try {
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .ilike('base_location', `%${location}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Routes by location fetch error, using fallback:', error.message);
      const filtered = featuredRoutes.filter(r => 
        r.baseLocation.toLowerCase().includes(location.toLowerCase())
      );
      return { data: filtered, error: null };
    }

    if (!data || data.length === 0) {
      const filtered = featuredRoutes.filter(r => 
        r.baseLocation.toLowerCase().includes(location.toLowerCase())
      );
      return { data: filtered, error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    const filtered = featuredRoutes.filter(r => 
      r.baseLocation.toLowerCase().includes(location.toLowerCase())
    );
    return { data: filtered, error: null };
  }
};

/**
 * Search routes by title or tags
 */
export const searchRoutes = async (query: string): Promise<{ 
  data: ThematicRoute[]; 
  error: string | null 
}> => {
  if (!query.trim()) {
    return { data: [], error: null };
  }

  try {
    const searchTerm = `%${query.trim()}%`;
    
    const { data, error } = await supabase
      .from('thematic_routes')
      .select('*')
      .or(`title.ilike.${searchTerm},base_location.ilike.${searchTerm}`)
      .order('highlighted', { ascending: false })
      .limit(10);

    if (error) {
      console.log('Routes search error, using fallback:', error.message);
    }

    if (data && data.length > 0) {
      const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
      return { data: routes, error: null };
    }

    // Fallback search in local data
    const lowerQuery = query.toLowerCase();
    const filtered = featuredRoutes.filter(r => 
      r.title.toLowerCase().includes(lowerQuery) ||
      r.baseLocation.toLowerCase().includes(lowerQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
    
    return { data: filtered, error: null };
  } catch (err: any) {
    const lowerQuery = query.toLowerCase();
    const filtered = featuredRoutes.filter(r => 
      r.title.toLowerCase().includes(lowerQuery) ||
      r.baseLocation.toLowerCase().includes(lowerQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
    return { data: filtered, error: null };
  }
};
