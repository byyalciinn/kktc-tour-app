import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { optimizeTourImage } from './imageOptimizer';

const BUCKET_NAME = 'image-bucket';
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;
const MAX_FILE_SIZE_MB = 10; // Maximum file size in MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Validates image file before upload
 */
interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

const validateImageFile = (fileSize?: number, mimeType?: string): ImageValidationResult => {
  if (fileSize && fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { isValid: false, error: `Dosya boyutu ${MAX_FILE_SIZE_MB}MB'dan küçük olmalıdır` };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { isValid: false, error: 'Sadece JPEG, PNG, WebP ve GIF formatları desteklenir' };
  }
  return { isValid: true };
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim() || 'tour';

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

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
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

// Pick image from gallery with validation
export const pickImage = async (): Promise<{ uri: string | null; error?: string }> => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      return { uri: null, error: 'Galeri erişim izni gerekli!' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { uri: null };
    }

    const asset = result.assets[0];
    
    // Validate file size and type
    const validation = validateImageFile(asset.fileSize, asset.mimeType);
    if (!validation.isValid) {
      return { uri: null, error: validation.error };
    }

    return { uri: asset.uri };
  } catch (error) {
    console.error('Pick image error:', error);
    return { uri: null, error: 'Görsel seçilirken bir hata oluştu' };
  }
};

// Take photo with camera with validation
export const takePhoto = async (): Promise<{ uri: string | null; error?: string }> => {
  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      return { uri: null, error: 'Kamera erişim izni gerekli!' };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { uri: null };
    }

    const asset = result.assets[0];
    
    // Validate file size and type
    const validation = validateImageFile(asset.fileSize, asset.mimeType);
    if (!validation.isValid) {
      return { uri: null, error: validation.error };
    }

    return { uri: asset.uri };
  } catch (error) {
    console.error('Take photo error:', error);
    return { uri: null, error: 'Fotoğraf çekilirken bir hata oluştu' };
  }
};

// Optimize and resize image - uses advanced compression from imageOptimizer
export const optimizeImage = async (
  uri: string, 
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<{ uri: string; base64: string } | null> => {
  try {
    // Use the advanced optimizer for tour images (target ~350KB)
    const optimized = await optimizeTourImage(uri);
    
    if (optimized) {
      console.log(`[Tour] Image optimized: ${optimized.compressionRatio}% reduction`);
      return {
        uri: optimized.uri,
        base64: optimized.base64,
      };
    }
    
    // Fallback to basic optimization if advanced fails
    const maxWidth = options?.maxWidth || IMAGE_WIDTH;
    const quality = options?.quality || 0.6;

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    return {
      uri: manipulatedImage.uri,
      base64: manipulatedImage.base64 || '',
    };
  } catch (error) {
    console.error('Image optimization error:', error);
    return null;
  }
};

// Upload image to Supabase Storage
export const uploadImage = async (base64: string, fileName: string): Promise<string | null> => {
  try {
    const filePath = `tours/${Date.now()}_${fileName}.jpg`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

// Delete image from Supabase Storage
export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
    if (urlParts.length < 2) return false;
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete image error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete image error:', error);
    return false;
  }
};

// Create new tour
export const createTour = async (tour: TourInput, imageUri?: string): Promise<{ data: TourData | null; error: string | null }> => {
  try {
    let imageUrl = tour.image || '';

    // Upload image if provided
    if (imageUri) {
      const optimized = await optimizeImage(imageUri);
      if (optimized) {
        const fileName = slugify(tour.title);
        const uploadedUrl = await uploadImage(optimized.base64, fileName);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
    }

    // Build insert data with optional coordinates
    const insertData: Record<string, any> = {
      title: tour.title,
      location: tour.location,
      description: tour.description,
      price: tour.price,
      currency: tour.currency,
      duration: tour.duration,
      category: tour.category,
      highlights: tour.highlights,
      image: imageUrl,
      rating: 0,
      review_count: 0,
    };
    
    // Add coordinates if provided
    if (tour.latitude !== undefined && tour.latitude !== null) {
      insertData.latitude = tour.latitude;
    }
    if (tour.longitude !== undefined && tour.longitude !== null) {
      insertData.longitude = tour.longitude;
    }

    const { data, error } = await supabase
      .from('tours')
      .insert(insertData)
      .select();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: 'Tur oluşturulamadı' };
    }

    return { data: data[0] as TourData, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Update tour
export const updateTour = async (
  id: string, 
  tour: Partial<TourInput>, 
  newImageUri?: string,
  oldImageUrl?: string
): Promise<{ data: TourData | null; error: string | null }> => {
  try {
    console.log('Updating tour with id:', id);
    console.log('Tour data:', tour);
    
    let imageUrl = tour.image;

    // Upload new image if provided
    if (newImageUri) {
      console.log('Uploading new image...');
      const optimized = await optimizeImage(newImageUri);
      if (optimized) {
        const fileName = slugify(tour.title || 'tour');
        const uploadedUrl = await uploadImage(optimized.base64, fileName);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log('New image uploaded:', uploadedUrl);
          
          // Delete old image
          if (oldImageUrl && oldImageUrl.includes(BUCKET_NAME)) {
            await deleteImage(oldImageUrl);
          }
        }
      }
    }

    // Build update data - only include fields that have values
    const updateData: Record<string, any> = {};
    
    if (tour.title !== undefined) updateData.title = tour.title;
    if (tour.location !== undefined) updateData.location = tour.location;
    if (tour.description !== undefined) updateData.description = tour.description;
    if (tour.price !== undefined) updateData.price = tour.price;
    if (tour.currency !== undefined) updateData.currency = tour.currency;
    if (tour.duration !== undefined) updateData.duration = tour.duration;
    if (tour.category !== undefined) updateData.category = tour.category;
    if (tour.highlights !== undefined) updateData.highlights = tour.highlights;
    if (imageUrl) updateData.image = imageUrl;
    if (tour.latitude !== undefined) updateData.latitude = tour.latitude;
    if (tour.longitude !== undefined) updateData.longitude = tour.longitude;
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    console.log('Update data:', updateData);

    const { data, error, count } = await supabase
      .from('tours')
      .update(updateData)
      .eq('id', id)
      .select();

    console.log('Supabase response - data:', data, 'error:', error, 'count:', count);

    if (error) {
      console.error('Supabase update error:', error);
      return { data: null, error: `Veritabanı hatası: ${error.message}` };
    }

    // If no rows were updated, the tour might not exist or RLS is blocking
    if (!data || data.length === 0) {
      // Try to check if the tour exists
      const { data: existingTour } = await supabase
        .from('tours')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (!existingTour) {
        return { data: null, error: 'Tur bulunamadı. Silinmiş olabilir.' };
      }
      
      return { data: null, error: 'Güncelleme yapılamadı. Yetki sorunu olabilir.' };
    }

    console.log('Tour updated successfully:', data[0]);
    return { data: data[0] as TourData, error: null };
  } catch (error: any) {
    console.error('Update tour exception:', error);
    return { data: null, error: `Beklenmeyen hata: ${error.message}` };
  }
};

// Delete tour
export const deleteTour = async (id: string, imageUrl?: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Delete image from storage
    if (imageUrl && imageUrl.includes(BUCKET_NAME)) {
      await deleteImage(imageUrl);
    }

    const { error } = await supabase
      .from('tours')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Pagination config
export const TOURS_PAGE_SIZE = 10;

export interface PaginatedResult<T> {
  data: T[];
  error: string | null;
  hasMore: boolean;
  totalCount: number;
}

// Get all tours (simple)
export const getTours = async (): Promise<{ data: TourData[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as TourData[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Get tours with pagination
export const getToursPaginated = async (
  page: number = 0,
  pageSize: number = TOURS_PAGE_SIZE,
  categoryId?: string
): Promise<PaginatedResult<TourData>> => {
  try {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Build query
    let query = supabase
      .from('tours')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    // Filter by category if not 'all'
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category', categoryId);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: [], error: error.message, hasMore: false, totalCount: 0 };
    }

    const totalCount = count || 0;
    const hasMore = from + (data?.length || 0) < totalCount;

    return {
      data: (data as TourData[]) || [],
      error: null,
      hasMore,
      totalCount,
    };
  } catch (error: any) {
    return { data: [], error: error.message, hasMore: false, totalCount: 0 };
  }
};

// Search tours with server-side filtering
export const searchTours = async (
  query: string,
  limit: number = 20
): Promise<{ data: TourData[]; error: string | null }> => {
  try {
    if (!query.trim()) {
      return { data: [], error: null };
    }

    // Use ilike for case-insensitive search on title and location
    const searchTerm = `%${query.trim()}%`;
    
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .or(`title.ilike.${searchTerm},location.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('Search error:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data as TourData[]) || [], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Get single tour
export const getTourById = async (id: string): Promise<{ data: TourData | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Tur bulunamadı' };
    }

    return { data: data as TourData, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// =============================================
// CATEGORY FUNCTIONS
// =============================================

// Default categories (fallback)
const defaultCategories: Category[] = [
  { id: 'all', name: 'Tümü', icon: 'apps-outline', sort_order: 0 },
  { id: 'trip', name: 'Gezi', icon: 'location-outline', sort_order: 1 },
  { id: 'hotel', name: 'Otel', icon: 'business-outline', sort_order: 2 },
  { id: 'bus', name: 'Otobüs', icon: 'bus-outline', sort_order: 3 },
  { id: 'flight', name: 'Uçuş', icon: 'airplane-outline', sort_order: 4 },
  { id: 'ship', name: 'Gemi', icon: 'boat-outline', sort_order: 5 },
];

// Get all categories
export const getCategories = async (): Promise<{ data: Category[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.log('Categories fetch error:', error.message);
      return { data: defaultCategories, error: null };
    }

    if (!data || data.length === 0) {
      return { data: defaultCategories, error: null };
    }

    return { data: data as Category[], error: null };
  } catch (error: any) {
    console.log('Categories exception:', error.message);
    return { data: defaultCategories, error: null };
  }
};

// Create category
export const createCategory = async (category: Omit<Category, 'id'>): Promise<{ data: Category | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        icon: category.icon,
        sort_order: category.sort_order,
      })
      .select();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: 'Kategori oluşturulamadı' };
    }

    return { data: data[0] as Category, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Update category
export const updateCategory = async (id: string, category: Partial<Category>): Promise<{ data: Category | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(category)
      .eq('id', id)
      .select();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: null, error: 'Kategori güncellenemedi' };
    }

    return { data: data[0] as Category, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

// Delete category
export const deleteCategory = async (id: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get tours by category
export const getToursByCategory = async (categoryId: string): Promise<{ data: TourData[]; error: string | null }> => {
  try {
    let query = supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false });

    // If not "all", filter by category
    if (categoryId !== 'all') {
      query = query.eq('category', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as TourData[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// =============================================
// FAVORITES FUNCTIONS
// =============================================

export interface Favorite {
  id: string;
  user_id: string;
  tour_id: string;
  created_at: string;
}

// Get user favorites
export const getUserFavorites = async (userId: string): Promise<{ data: TourData[]; error: string | null }> => {
  try {
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('tour_id')
      .eq('user_id', userId);

    if (favError) {
      console.log('Favorites fetch error:', favError.message);
      return { data: [], error: favError.message };
    }

    if (!favorites || favorites.length === 0) {
      return { data: [], error: null };
    }

    const tourIds = favorites.map(f => f.tour_id);
    
    const { data: tours, error: toursError } = await supabase
      .from('tours')
      .select('*')
      .in('id', tourIds);

    if (toursError) {
      return { data: [], error: toursError.message };
    }

    return { data: tours as TourData[], error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
};

// Check if tour is favorited
export const isTourFavorited = async (userId: string, tourId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('tour_id', tourId)
      .maybeSingle();

    if (error) {
      console.log('Check favorite error:', error.message);
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
};

// Add to favorites
export const addToFavorites = async (userId: string, tourId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        tour_id: tourId,
      });

    if (error) {
      // Check if already exists
      if (error.code === '23505') {
        return { success: true, error: null }; // Already favorited
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Remove from favorites
export const removeFromFavorites = async (userId: string, tourId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('tour_id', tourId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Toggle favorite
export const toggleFavorite = async (userId: string, tourId: string): Promise<{ isFavorited: boolean; error: string | null }> => {
  const isFav = await isTourFavorited(userId, tourId);
  
  if (isFav) {
    const { success, error } = await removeFromFavorites(userId, tourId);
    return { isFavorited: !success, error };
  } else {
    const { success, error } = await addToFavorites(userId, tourId);
    return { isFavorited: success, error };
  }
};
