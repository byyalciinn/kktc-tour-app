import { create } from 'zustand';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { 
  uploadAvatar, 
  deleteAvatar, 
  updateProfileAvatar, 
  getAvatarUrl,
  generateDefaultAvatarUrl 
} from '@/lib/avatarService';
import { identifyAdaptyUser, logoutAdapty } from '@/lib/adaptyService';
import { createLogger } from '@/lib/logger';

const authLogger = createLogger('Auth');

interface DeleteAccountResult {
  success: boolean;
  error?: string;
  deletedData?: {
    posts: number;
    favorites: number;
    reports: number;
    hidden_posts: number;
  };
}

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  isNewUser: boolean; // Flag for onboarding redirect

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setIsNewUser: (isNewUser: boolean) => void;
  clearNewUserFlag: () => void;

  // Async actions
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  deleteAccount: () => Promise<DeleteAccountResult>;
  
  // Avatar actions
  uploadUserAvatar: (imageUri: string) => Promise<{ success: boolean; error: Error | null }>;
  deleteUserAvatar: () => Promise<{ success: boolean; error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error: Error | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  isNewUser: false,

  // Setters
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setIsNewUser: (isNewUser) => set({ isNewUser }),
  clearNewUserFlag: () => set({ isNewUser: false }),

  // Initialize auth state and listen for changes
  initialize: async () => {
    if (get().initialized) return;

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      
      set({
        session,
        user: session?.user ?? null,
      });

      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }

      // Listen for auth changes - store subscription for cleanup
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });

        if (session?.user) {
          await get().fetchProfile(session.user.id);
        } else {
          set({ profile: null });
        }
      });

      // Store unsubscribe function for potential cleanup
      // Note: In a Zustand store, this runs once on app init
      // Cleanup would be needed if the store is destroyed (rare in RN)
      if (typeof window !== 'undefined') {
        (window as any).__authSubscription = subscription;
      }

      set({ initialized: true, loading: false });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false, initialized: true });
    }
  },

  // Fetch user profile from database
  fetchProfile: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        set({ profile: data as UserProfile });
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  },

  // Refresh current user's profile
  refreshProfile: async () => {
    const { user } = get();
    if (user) {
      await get().fetchProfile(user.id);
    }
  },

  // Sign up new user
  signUp: async (email: string, password: string, fullName?: string) => {
    set({ loading: true });

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    // Profile is automatically created by database trigger (handle_new_user)
    // No need to manually insert - this was causing "database error saving new user"
    
    // Set isNewUser flag for onboarding redirect
    if (!error && data.user) {
      set({ isNewUser: true });
    }

    set({ loading: false });
    return { error };
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    // Clear isNewUser flag BEFORE auth call - prevents race condition with onAuthStateChange
    set({ loading: true, isNewUser: false });

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Identify user with Adapty on successful login
    if (!error && data.user) {
      try {
        await identifyAdaptyUser(data.user.id);
        authLogger.info('User identified with Adapty');
      } catch (adaptyError) {
        // Don't fail login if Adapty fails
        authLogger.error('Failed to identify with Adapty:', adaptyError);
      }
    }

    set({ loading: false });
    return { error };
  },

  // Sign out current user
  signOut: async () => {
    set({ loading: true });
    
    // Logout from Adapty
    try {
      await logoutAdapty();
      authLogger.info('Logged out from Adapty');
    } catch (adaptyError) {
      // Don't fail logout if Adapty fails
      authLogger.error('Failed to logout from Adapty:', adaptyError);
    }
    
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      loading: false,
    });
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  },

  // Delete user account and all related data
  deleteAccount: async () => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      set({ loading: true });

      // Call the database function to delete all user data
      const { data, error } = await supabase.rpc('delete_user_account', {
        target_user_id: user.id,
      });

      if (error) {
        console.error('[AuthStore] Delete account error:', error);
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Sign out the user after successful deletion
      await supabase.auth.signOut();

      // Clear local state
      set({
        user: null,
        session: null,
        profile: null,
        loading: false,
      });

      return {
        success: true,
        deletedData: data?.deleted,
      };
    } catch (error: any) {
      console.error('[AuthStore] Delete account error:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },

  // Upload user avatar
  uploadUserAvatar: async (imageUri: string) => {
    const { user, profile } = get();
    if (!user) {
      return { success: false, error: new Error('User not authenticated') };
    }

    try {
      // Upload to storage
      const { url, error: uploadError } = await uploadAvatar(user.id, imageUri);
      if (uploadError || !url) {
        return { success: false, error: uploadError || new Error('Upload failed') };
      }

      // Update profile with new avatar URL
      const { error: updateError } = await updateProfileAvatar(user.id, url);
      if (updateError) {
        return { success: false, error: updateError };
      }

      // Update local state
      if (profile) {
        set({ profile: { ...profile, avatar_url: url } });
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  // Delete user avatar
  deleteUserAvatar: async () => {
    const { user, profile } = get();
    if (!user) {
      return { success: false, error: new Error('User not authenticated') };
    }

    try {
      // Delete from storage
      const { error: deleteError } = await deleteAvatar(user.id);
      if (deleteError) {
        return { success: false, error: deleteError };
      }

      // Update profile to remove avatar URL (will use default)
      const defaultUrl = generateDefaultAvatarUrl(user.id);
      const { error: updateError } = await updateProfileAvatar(user.id, defaultUrl);
      if (updateError) {
        return { success: false, error: updateError };
      }

      // Update local state
      if (profile) {
        set({ profile: { ...profile, avatar_url: defaultUrl } });
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },

  // Update user profile
  updateProfile: async (data: Partial<UserProfile>) => {
    const { user, profile } = get();
    if (!user) {
      return { success: false, error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: new Error(error.message) };
      }

      // Update local state
      if (profile) {
        set({ profile: { ...profile, ...data } });
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  },
}));

// Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user;
export const selectProfile = (state: AuthState) => state.profile;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.loading;
