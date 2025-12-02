import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_STORAGE_KEY = '@intro_completed';

interface OnboardingState {
  // State
  hasSeenIntro: boolean;
  isCheckingIntro: boolean;

  // Actions
  checkIntroStatus: () => Promise<void>;
  completeIntro: () => Promise<void>;
  resetIntro: () => Promise<void>; // For testing purposes
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenIntro: false,
  isCheckingIntro: true,

  checkIntroStatus: async () => {
    try {
      const value = await AsyncStorage.getItem(INTRO_STORAGE_KEY);
      set({ 
        hasSeenIntro: value === 'true',
        isCheckingIntro: false,
      });
    } catch (error) {
      console.error('Error checking intro status:', error);
      set({ isCheckingIntro: false });
    }
  },

  completeIntro: async () => {
    try {
      await AsyncStorage.setItem(INTRO_STORAGE_KEY, 'true');
      set({ hasSeenIntro: true });
    } catch (error) {
      console.error('Error saving intro status:', error);
    }
  },

  resetIntro: async () => {
    try {
      await AsyncStorage.removeItem(INTRO_STORAGE_KEY);
      set({ hasSeenIntro: false });
    } catch (error) {
      console.error('Error resetting intro status:', error);
    }
  },
}));
