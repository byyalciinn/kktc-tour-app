import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  // Current theme mode setting
  themeMode: ThemeMode;
  
  // Resolved color scheme (what's actually displayed)
  colorScheme: 'light' | 'dark';
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  
  // Internal
  _updateColorScheme: () => void;
}

// Get system color scheme
const getSystemColorScheme = (): 'light' | 'dark' => {
  const systemScheme = Appearance.getColorScheme();
  return systemScheme === 'dark' ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      colorScheme: getSystemColorScheme(),

      setThemeMode: (mode: ThemeMode) => {
        let newColorScheme: 'light' | 'dark';
        
        if (mode === 'system') {
          newColorScheme = getSystemColorScheme();
        } else {
          newColorScheme = mode;
        }
        
        set({ themeMode: mode, colorScheme: newColorScheme });
      },

      toggleDarkMode: () => {
        const { themeMode, colorScheme } = get();
        
        // If currently on system, switch to opposite of current system theme
        // Otherwise, toggle between light and dark
        if (themeMode === 'system') {
          const newMode = colorScheme === 'dark' ? 'light' : 'dark';
          set({ themeMode: newMode, colorScheme: newMode });
        } else {
          const newMode = themeMode === 'dark' ? 'light' : 'dark';
          set({ themeMode: newMode, colorScheme: newMode });
        }
      },

      _updateColorScheme: () => {
        const { themeMode } = get();
        if (themeMode === 'system') {
          set({ colorScheme: getSystemColorScheme() });
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, update colorScheme based on themeMode
        if (state) {
          if (state.themeMode === 'system') {
            state.colorScheme = getSystemColorScheme();
          } else {
            state.colorScheme = state.themeMode;
          }
        }
      },
    }
  )
);

// Selectors
export const selectThemeMode = (state: ThemeState) => state.themeMode;
export const selectColorScheme = (state: ThemeState) => state.colorScheme;
export const selectIsDarkMode = (state: ThemeState) => state.colorScheme === 'dark';

// Listen to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useThemeStore.getState();
  if (store.themeMode === 'system') {
    store._updateColorScheme();
  }
});
