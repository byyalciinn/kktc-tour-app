import { supabase } from './supabase';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Default avatar for new users
export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/png?seed=default&backgroundColor=F03A52';

// Generate a unique avatar URL based on user ID
export const generateDefaultAvatarUrl = (userId: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${userId}&backgroundColor=F03A52`;
};

interface UploadAvatarResult {
  url: string | null;
  error: Error | null;
}

interface DeleteAvatarResult {
  success: boolean;
  error: Error | null;
}

/**
 * Upload avatar image to Supabase Storage
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string
): Promise<UploadAvatarResult> => {
  try {
    // Create File instance from URI and read as base64 using new API
    const file = new File(imageUri);
    const base64 = await file.base64();

    // Determine file extension from URI
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${userId}/avatar_${timestamp}.${fileExt}`;
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: new Error(error.message) };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    try {
      const { data: files } = await supabase.storage.from('avatars').list(userId);
      const filesToDelete = (files || [])
        .filter((f) => f.name && f.name !== `avatar_${timestamp}.${fileExt}`)
        .map((f) => `${userId}/${f.name}`);

      if (filesToDelete.length > 0) {
        await supabase.storage.from('avatars').remove(filesToDelete);
      }
    } catch (_cleanupError) {
      // ignore
    }

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Avatar upload error:', error);
    return { url: null, error: error as Error };
  }
};

/**
 * Delete avatar from Supabase Storage
 */
export const deleteAvatar = async (userId: string): Promise<DeleteAvatarResult> => {
  try {
    // List all files in user's avatar folder
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (listError) {
      return { success: false, error: new Error(listError.message) };
    }

    if (!files || files.length === 0) {
      return { success: true, error: null };
    }

    // Delete all files in the folder
    const filesToDelete = files.map(file => `${userId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filesToDelete);

    if (deleteError) {
      return { success: false, error: new Error(deleteError.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Avatar delete error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * Update user profile with new avatar URL
 */
export const updateProfileAvatar = async (
  userId: string,
  avatarUrl: string | null
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * Get avatar URL for a user (returns default if none set)
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined, userId?: string): string => {
  if (avatarUrl) {
    return avatarUrl;
  }
  return userId ? generateDefaultAvatarUrl(userId) : DEFAULT_AVATAR_URL;
};
