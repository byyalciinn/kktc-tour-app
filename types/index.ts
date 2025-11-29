/**
 * Shared type definitions for the tour app
 */

// =============================================
// TOUR TYPES
// =============================================

export interface Tour {
  id: string;
  title: string;
  location: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  rating: number;
  reviewCount: number;
  image: string;
  highlights: string[];
  category: string;
  latitude?: number;
  longitude?: number;
}

export interface TourInput {
  title: string;
  location: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  category: string;
  highlights: string[];
  image?: string;
  latitude?: number;
  longitude?: number;
}

export interface TourData extends TourInput {
  id: string;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
}

// Helper to convert TourData (from Supabase) to Tour (for UI)
export const tourDataToTour = (data: TourData): Tour => ({
  id: data.id,
  title: data.title,
  location: data.location,
  description: data.description || '',
  price: data.price,
  currency: data.currency,
  duration: data.duration,
  rating: data.rating || 0,
  reviewCount: data.review_count || 0,
  image: data.image || '',
  highlights: data.highlights || [],
  category: data.category,
  latitude: data.latitude,
  longitude: data.longitude,
});

// =============================================
// CATEGORY TYPES
// =============================================

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

// =============================================
// FAVORITE TYPES
// =============================================

export interface Favorite {
  id: string;
  user_id: string;
  tour_id: string;
  created_at: string;
}

// =============================================
// USER / PROFILE TYPES
// =============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  member_number: string | null;
  member_class: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at?: string;
}

// =============================================
// PROMOTION TYPES
// =============================================

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  buttonText: string;
  backgroundColor: string;
  image: string;
}
