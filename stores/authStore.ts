import { create } from 'zustand';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;

  // Async actions
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  // Setters
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

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

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
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

    // Create profile after signup
    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: email,
        full_name: fullName || null,
      });
    }

    set({ loading: false });
    return { error };
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    set({ loading: true });

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    set({ loading: false });
    return { error };
  },

  // Sign out current user
  signOut: async () => {
    set({ loading: true });
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
}));

// Selectors for optimized re-renders
export const selectUser = (state: AuthState) => state.user;
export const selectProfile = (state: AuthState) => state.profile;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.loading;
