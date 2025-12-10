/**
 * Auth Store Tests
 * Tests for authentication state management
 */

import { useAuthStore, selectUser, selectProfile, selectIsAuthenticated } from '@/stores/authStore';

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock avatar service
jest.mock('@/lib/avatarService', () => ({
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  updateProfileAvatar: jest.fn(),
  getAvatarUrl: jest.fn(),
  generateDefaultAvatarUrl: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      loading: false,
      initialized: false,
      isNewUser: false,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(false);
      expect(state.isNewUser).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('selectUser should return user', () => {
      const mockUser = { id: 'test-id', email: 'test@test.com' };
      useAuthStore.setState({ user: mockUser as any });
      
      const user = selectUser(useAuthStore.getState());
      
      expect(user).toEqual(mockUser);
    });

    it('selectProfile should return profile', () => {
      const mockProfile = { id: 'test-id', full_name: 'Test User' };
      useAuthStore.setState({ profile: mockProfile as any });
      
      const profile = selectProfile(useAuthStore.getState());
      
      expect(profile).toEqual(mockProfile);
    });

    it('selectIsAuthenticated should return true when user exists', () => {
      useAuthStore.setState({ user: { id: 'test-id' } as any });
      
      const isAuth = selectIsAuthenticated(useAuthStore.getState());
      
      expect(isAuth).toBe(true);
    });

    it('selectIsAuthenticated should return false when user is null', () => {
      useAuthStore.setState({ user: null });
      
      const isAuth = selectIsAuthenticated(useAuthStore.getState());
      
      expect(isAuth).toBe(false);
    });
  });

  describe('Actions', () => {
    it('setUser should update user state', () => {
      const mockUser = { id: 'test-id', email: 'test@test.com' };
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser as any);
      
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('setSession should update session state', () => {
      const mockSession = { access_token: 'token', user: { id: 'test' } };
      const { setSession } = useAuthStore.getState();
      
      setSession(mockSession as any);
      
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('setProfile should update profile state', () => {
      const mockProfile = { id: 'test-id', full_name: 'Test User' };
      const { setProfile } = useAuthStore.getState();
      
      setProfile(mockProfile as any);
      
      expect(useAuthStore.getState().profile).toEqual(mockProfile);
    });

    it('setLoading should update loading state', () => {
      const { setLoading } = useAuthStore.getState();
      
      setLoading(true);
      expect(useAuthStore.getState().loading).toBe(true);
      
      setLoading(false);
      expect(useAuthStore.getState().loading).toBe(false);
    });

    it('setIsNewUser should update isNewUser state', () => {
      const { setIsNewUser } = useAuthStore.getState();
      
      setIsNewUser(true);
      expect(useAuthStore.getState().isNewUser).toBe(true);
      
      setIsNewUser(false);
      expect(useAuthStore.getState().isNewUser).toBe(false);
    });

    it('clearNewUserFlag should reset isNewUser to false', () => {
      useAuthStore.setState({ isNewUser: true });
      
      const { clearNewUserFlag } = useAuthStore.getState();
      clearNewUserFlag();
      
      expect(useAuthStore.getState().isNewUser).toBe(false);
    });
  });

  describe('Sign Out', () => {
    it('signOut should clear user and session state', async () => {
      useAuthStore.setState({
        user: { id: 'test' } as any,
        session: { access_token: 'token' } as any,
        profile: { id: 'test' } as any,
      });
      
      const { signOut } = useAuthStore.getState();
      await signOut();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
    });
  });
});
