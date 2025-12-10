/**
 * Theme Store Tests
 * Tests for theme/color scheme management
 */

import { useThemeStore, selectThemeMode, selectColorScheme, selectIsDarkMode } from '@/stores/themeStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Mock Appearance
jest.mock('react-native', () => ({
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useThemeStore.setState({
      themeMode: 'system',
      colorScheme: 'light',
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useThemeStore.getState();
      
      expect(state.themeMode).toBe('system');
      expect(state.colorScheme).toBe('light');
    });
  });

  describe('Selectors', () => {
    it('selectThemeMode should return theme mode', () => {
      useThemeStore.setState({ themeMode: 'dark' });
      
      const themeMode = selectThemeMode(useThemeStore.getState());
      
      expect(themeMode).toBe('dark');
    });

    it('selectColorScheme should return color scheme', () => {
      useThemeStore.setState({ colorScheme: 'dark' });
      
      const colorScheme = selectColorScheme(useThemeStore.getState());
      
      expect(colorScheme).toBe('dark');
    });

    it('selectIsDarkMode should return true when colorScheme is dark', () => {
      useThemeStore.setState({ colorScheme: 'dark' });
      
      const isDark = selectIsDarkMode(useThemeStore.getState());
      
      expect(isDark).toBe(true);
    });

    it('selectIsDarkMode should return false when colorScheme is light', () => {
      useThemeStore.setState({ colorScheme: 'light' });
      
      const isDark = selectIsDarkMode(useThemeStore.getState());
      
      expect(isDark).toBe(false);
    });
  });

  describe('Actions', () => {
    it('setThemeMode should update theme mode to light', () => {
      const { setThemeMode } = useThemeStore.getState();
      
      setThemeMode('light');
      
      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('light');
      expect(state.colorScheme).toBe('light');
    });

    it('setThemeMode should update theme mode to dark', () => {
      const { setThemeMode } = useThemeStore.getState();
      
      setThemeMode('dark');
      
      const state = useThemeStore.getState();
      expect(state.themeMode).toBe('dark');
      expect(state.colorScheme).toBe('dark');
    });

    it('setThemeMode should update theme mode to system', () => {
      const { setThemeMode } = useThemeStore.getState();
      
      setThemeMode('system');
      
      expect(useThemeStore.getState().themeMode).toBe('system');
    });

    it('toggleDarkMode should toggle between light and dark', () => {
      const { toggleDarkMode } = useThemeStore.getState();
      
      // Start with light
      useThemeStore.setState({ themeMode: 'light', colorScheme: 'light' });
      
      toggleDarkMode();
      expect(useThemeStore.getState().themeMode).toBe('dark');
      expect(useThemeStore.getState().colorScheme).toBe('dark');
      
      toggleDarkMode();
      expect(useThemeStore.getState().themeMode).toBe('light');
      expect(useThemeStore.getState().colorScheme).toBe('light');
    });
  });
});
