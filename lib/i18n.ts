import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from '@/locales/tr.json';
import en from '@/locales/en.json';

const LANGUAGE_KEY = '@app_language';

// Available languages
export const languages = {
  tr: { name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷', comingSoon: false },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', comingSoon: false },
  el: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', comingSoon: true },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', comingSoon: true },
} as const;

export type LanguageCode = keyof typeof languages;

// Get stored language or device language
const getInitialLanguage = async (): Promise<LanguageCode> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLanguage && storedLanguage in languages) {
      return storedLanguage as LanguageCode;
    }
  } catch (error) {
    console.log('Error getting stored language:', error);
  }

  // Fall back to device language
  const deviceLanguage = Localization.getLocales()[0]?.languageCode;
  if (deviceLanguage && deviceLanguage in languages) {
    return deviceLanguage as LanguageCode;
  }

  // Default to Turkish
  return 'tr';
};

// Initialize i18n
const initI18n = async () => {
  const initialLanguage = await getInitialLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng: initialLanguage,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
};

// Change language and persist
export const changeLanguage = async (languageCode: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    await i18n.changeLanguage(languageCode);
  } catch (error) {
    console.log('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
  return (i18n.language as LanguageCode) || 'tr';
};

// Initialize and export
initI18n();

export default i18n;
