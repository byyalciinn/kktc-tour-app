/**
 * Route Service
 * Handles fetching and managing thematic travel routes
 * Uses Supabase with fallback to local data
 */

import { supabase } from './supabase';
import { ThematicRoute, ThematicRouteData, routeDataToRoute, RouteDay, RouteStop } from '@/types';
import { featuredRoutes } from '@/constants/ThematicRoutes';
import { optimizeRouteCoverImage, optimizeRouteStopImage } from './imageOptimizer';
import { decode } from 'base64-arraybuffer';

// Bucket name for route images
const ROUTE_BUCKET = 'routes';

/**
 * Get all thematic routes from Supabase
 * Returns empty array if no routes in database (no fallback to local data)
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
      console.log('Thematic routes fetch error:', error.message);
      return { data: [], error: error.message };
    }

    if (!data || data.length === 0) {
      console.log('No thematic routes in database');
      return { data: [], error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    console.log('Thematic routes exception:', err.message);
    return { data: [], error: err.message };
  }
};

/**
 * Get highlighted/featured thematic routes for Explore screen
 * Returns only routes from Supabase (no fallback to local data)
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
      console.log('Highlighted routes fetch error:', error.message);
      return { data: [], error: error.message };
    }

    if (!data || data.length === 0) {
      console.log('No highlighted routes in database');
      return { data: [], error: null };
    }

    const routes = (data as ThematicRouteData[]).map(routeDataToRoute);
    return { data: routes, error: null };
  } catch (err: any) {
    console.log('Highlighted routes exception:', err.message);
    return { data: [], error: err.message };
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

// ============================================
// CRUD Operations for Admin Panel
// ============================================

/**
 * Input type for creating/updating routes
 */
export interface RouteInput {
  title: string;
  subtitle?: string;
  theme: string;
  baseLocation: string;
  region?: string;
  durationDays: number;
  durationLabel?: string;
  coverImage: string;
  tags: string[];
  highlighted: boolean;
  difficulty?: 'easy' | 'moderate' | 'challenging';
  bestSeason?: string;
  itinerary: RouteDay[];
}

/**
 * Generate slug from title
 */
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Create a new thematic route
 */
export const createRoute = async (
  input: RouteInput
): Promise<{ data: ThematicRoute | null; error: string | null }> => {
  try {
    const slug = generateSlug(input.title);
    
    const insertData = {
      slug,
      title: input.title,
      subtitle: input.subtitle || null,
      theme: input.theme,
      base_location: input.baseLocation,
      region: input.region || null,
      duration_days: input.durationDays,
      duration_label: input.durationLabel || null,
      cover_image: input.coverImage,
      tags: input.tags,
      highlighted: input.highlighted,
      difficulty: input.difficulty || null,
      best_season: input.bestSeason || null,
      itinerary: input.itinerary,
    };

    const { data, error } = await supabase
      .from('thematic_routes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Create route error:', error);
      return { data: null, error: error.message };
    }

    return { data: routeDataToRoute(data as ThematicRouteData), error: null };
  } catch (err: any) {
    console.error('Create route exception:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Update an existing thematic route
 */
export const updateRoute = async (
  id: string,
  input: Partial<RouteInput>
): Promise<{ data: ThematicRoute | null; error: string | null }> => {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
      updateData.slug = generateSlug(input.title);
    }
    if (input.subtitle !== undefined) updateData.subtitle = input.subtitle || null;
    if (input.theme !== undefined) updateData.theme = input.theme;
    if (input.baseLocation !== undefined) updateData.base_location = input.baseLocation;
    if (input.region !== undefined) updateData.region = input.region || null;
    if (input.durationDays !== undefined) updateData.duration_days = input.durationDays;
    if (input.durationLabel !== undefined) updateData.duration_label = input.durationLabel || null;
    if (input.coverImage !== undefined) updateData.cover_image = input.coverImage;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.highlighted !== undefined) updateData.highlighted = input.highlighted;
    if (input.difficulty !== undefined) updateData.difficulty = input.difficulty || null;
    if (input.bestSeason !== undefined) updateData.best_season = input.bestSeason || null;
    if (input.itinerary !== undefined) updateData.itinerary = input.itinerary;

    const { data, error } = await supabase
      .from('thematic_routes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update route error:', error);
      return { data: null, error: error.message };
    }

    return { data: routeDataToRoute(data as ThematicRouteData), error: null };
  } catch (err: any) {
    console.error('Update route exception:', err);
    return { data: null, error: err.message };
  }
};

/**
 * Delete a thematic route
 */
export const deleteRoute = async (
  id: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('thematic_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete route error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Delete route exception:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Toggle route highlighted status
 */
export const toggleRouteHighlighted = async (
  id: string,
  highlighted: boolean
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('thematic_routes')
      .update({ 
        highlighted, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Toggle highlighted error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Toggle highlighted exception:', err);
    return { success: false, error: err.message };
  }
};

// ============================================
// Image Upload Functions
// ============================================

/**
 * Upload route cover image to Supabase storage
 */
export const uploadRouteCoverImage = async (
  imageUri: string,
  routeSlug: string
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Optimize image
    const optimized = await optimizeRouteCoverImage(imageUri);
    if (!optimized) {
      return { url: null, error: 'Resim optimize edilemedi' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `covers/${routeSlug}_${timestamp}.jpg`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(ROUTE_BUCKET)
      .upload(fileName, decode(optimized.base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Cover upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ROUTE_BUCKET)
      .getPublicUrl(data.path);

    console.log(`[RouteService] Cover uploaded: ${(optimized.optimizedSize || 0) / 1024}KB`);
    
    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Cover upload exception:', err);
    return { url: null, error: err.message };
  }
};

/**
 * Upload route stop image to Supabase storage
 */
export const uploadRouteStopImage = async (
  imageUri: string,
  routeSlug: string,
  dayIndex: number,
  stopIndex: number
): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Optimize image
    const optimized = await optimizeRouteStopImage(imageUri);
    if (!optimized) {
      return { url: null, error: 'Resim optimize edilemedi' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `stops/${routeSlug}/day${dayIndex}_stop${stopIndex}_${timestamp}.jpg`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(ROUTE_BUCKET)
      .upload(fileName, decode(optimized.base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Stop image upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(ROUTE_BUCKET)
      .getPublicUrl(data.path);

    console.log(`[RouteService] Stop image uploaded: ${(optimized.optimizedSize || 0) / 1024}KB`);
    
    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Stop image upload exception:', err);
    return { url: null, error: err.message };
  }
};

/**
 * Delete route image from Supabase storage
 */
export const deleteRouteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!imageUrl || !imageUrl.includes(ROUTE_BUCKET)) {
      return false;
    }

    // Extract path from URL
    const urlParts = imageUrl.split(`${ROUTE_BUCKET}/`);
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from(ROUTE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Delete image error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Delete image exception:', err);
    return false;
  }
};

// ============================================
// Season Options
// ============================================

export const SEASON_OPTIONS = [
  { value: 'all-year', label: 'Tüm Yıl' },
  { value: 'spring', label: 'İlkbahar' },
  { value: 'summer', label: 'Yaz' },
  { value: 'autumn', label: 'Sonbahar' },
  { value: 'winter', label: 'Kış' },
  { value: 'spring-summer', label: 'İlkbahar - Yaz' },
  { value: 'spring-autumn', label: 'İlkbahar - Sonbahar' },
  { value: 'summer-autumn', label: 'Yaz - Sonbahar' },
  { value: 'autumn-winter', label: 'Sonbahar - Kış' },
] as const;

export type SeasonOption = typeof SEASON_OPTIONS[number]['value'];
