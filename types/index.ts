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

// =============================================
// THEMATIC ROUTE TYPES
// =============================================

/**
 * Theme types for thematic routes
 * Aligned with existing category IDs
 */
export type RouteTheme = 
  | 'history'    // Tarihi yerler
  | 'food'       // Yeme-içme
  | 'nature'     // Doğa
  | 'beach'      // Plaj
  | 'culture'    // Kültür
  | 'adventure'; // Macera

/**
 * Time of day for route stops
 */
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening';

/**
 * Stop type in a route
 */
export type RouteStopType = 'tour' | 'poi' | 'restaurant' | 'cafe' | 'activity' | 'viewpoint' | 'beach';

/**
 * A single stop/destination in a route day
 */
export interface RouteStop {
  id: string;
  order: number;
  type: RouteStopType;
  name: string;
  description?: string;
  timeOfDay?: TimeOfDay;
  duration?: string;           // e.g., "1-2 saat"
  tourId?: string;             // Reference to existing Tour if applicable
  latitude?: number;
  longitude?: number;
  image?: string;
  tips?: string;               // Helpful tips for visitors
}

/**
 * A single day in a thematic route
 */
export interface RouteDay {
  dayIndex: number;            // 1, 2, 3...
  title: string;               // e.g., "Girne Kalesi ve Çevresi"
  description?: string;
  stops: RouteStop[];
}

/**
 * A complete thematic travel route
 * Represents multi-day curated travel experiences
 */
export interface ThematicRoute {
  id: string;
  slug: string;                // URL-friendly identifier
  title: string;               // e.g., "3 Günlük Girne Tarihi Turu"
  subtitle?: string;           // Short description
  theme: RouteTheme;
  baseLocation: string;        // e.g., "Girne"
  region?: string;             // e.g., "Kuzey Kıbrıs"
  durationDays: number;
  durationLabel?: string;      // e.g., "3 Gün 2 Gece" or "Hafta Sonu"
  coverImage: string;
  tags: string[];              // e.g., ["Tarihi", "Girne", "Aile"]
  highlighted?: boolean;       // Featured on Explore screen
  difficulty?: 'easy' | 'moderate' | 'challenging';
  bestSeason?: string;         // e.g., "İlkbahar - Sonbahar"
  itinerary: RouteDay[];
  totalStops?: number;         // Computed or stored
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Supabase row type for thematic_routes table
 */
export interface ThematicRouteData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  theme: RouteTheme;
  base_location: string;
  region: string | null;
  duration_days: number;
  duration_label: string | null;
  cover_image: string;
  tags: string[];
  highlighted: boolean;
  difficulty: 'easy' | 'moderate' | 'challenging' | null;
  best_season: string | null;
  itinerary: RouteDay[];       // JSONB column
  created_at: string;
  updated_at: string;
}

/**
 * Helper to convert ThematicRouteData (from Supabase) to ThematicRoute (for UI)
 */
export const routeDataToRoute = (data: ThematicRouteData): ThematicRoute => ({
  id: data.id,
  slug: data.slug,
  title: data.title,
  subtitle: data.subtitle || undefined,
  theme: data.theme,
  baseLocation: data.base_location,
  region: data.region || undefined,
  durationDays: data.duration_days,
  durationLabel: data.duration_label || undefined,
  coverImage: data.cover_image,
  tags: data.tags || [],
  highlighted: data.highlighted,
  difficulty: data.difficulty || undefined,
  bestSeason: data.best_season || undefined,
  itinerary: data.itinerary || [],
  totalStops: data.itinerary?.reduce((acc, day) => acc + (day.stops?.length || 0), 0) || 0,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

// =============================================
// COMMUNITY TYPES
// =============================================

/**
 * Community post types
 */
export type CommunityPostType = 'photo' | 'review' | 'suggestion';

/**
 * Moderation status for community posts
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Community post - user generated content
 */
export interface CommunityPost {
  id: string;
  userId: string;
  tourId?: string;
  type: CommunityPostType;
  title?: string;
  content?: string;
  images: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  status: ModerationStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined data
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  tour?: {
    id: string;
    title: string;
    image: string;
  };
  isLiked?: boolean;
}

/**
 * Supabase row type for community_posts table
 */
export interface CommunityPostData {
  id: string;
  user_id: string;
  tour_id: string | null;
  type: CommunityPostType;
  title: string | null;
  content: string | null;
  images: string[];
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ModerationStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  tours?: {
    id: string;
    title: string;
    image: string | null;
  };
}

/**
 * Helper to convert CommunityPostData to CommunityPost
 */
export const postDataToPost = (data: CommunityPostData, isLiked?: boolean): CommunityPost => ({
  id: data.id,
  userId: data.user_id,
  tourId: data.tour_id || undefined,
  type: data.type,
  title: data.title || undefined,
  content: data.content || undefined,
  images: data.images || [],
  location: data.location || undefined,
  latitude: data.latitude || undefined,
  longitude: data.longitude || undefined,
  status: data.status,
  rejectionReason: data.rejection_reason || undefined,
  reviewedAt: data.reviewed_at || undefined,
  reviewedBy: data.reviewed_by || undefined,
  likesCount: data.likes_count || 0,
  commentsCount: data.comments_count || 0,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  user: data.profiles ? {
    id: data.profiles.id,
    fullName: data.profiles.full_name || 'Kullanıcı',
    avatarUrl: data.profiles.avatar_url || undefined,
  } : undefined,
  tour: data.tours ? {
    id: data.tours.id,
    title: data.tours.title,
    image: data.tours.image || '',
  } : undefined,
  isLiked,
});

/**
 * Community comment
 */
export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
}

/**
 * Supabase row type for community_comments table
 */
export interface CommunityCommentData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Helper to convert CommunityCommentData to CommunityComment
 */
export const commentDataToComment = (data: CommunityCommentData): CommunityComment => ({
  id: data.id,
  postId: data.post_id,
  userId: data.user_id,
  content: data.content,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  user: data.profiles ? {
    id: data.profiles.id,
    fullName: data.profiles.full_name || 'Kullanıcı',
    avatarUrl: data.profiles.avatar_url || undefined,
  } : undefined,
});

/**
 * Input type for creating a community post
 */
export interface CreatePostInput {
  type: CommunityPostType;
  title?: string;
  content?: string;
  images?: string[];
  tourId?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Moderation action log
 */
export interface ModerationLog {
  id: string;
  postId: string;
  adminId: string;
  action: 'approved' | 'rejected' | 'deleted';
  reason?: string;
  createdAt: string;
}
