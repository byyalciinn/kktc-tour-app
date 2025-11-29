import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore, useThemeStore } from '@/stores';
import { Toast, ErrorBoundary, LoadingScreen } from '@/components/ui';
import { usePushNotifications } from '@/hooks';

// Initialize i18n
import '@/lib/i18n';

export default function RootLayout() {
  const { colorScheme } = useThemeStore();
  const segments = useSegments();
  
  // Zustand auth store
  const { user, loading, initialized, initialize, isNewUser } = useAuthStore();
  
  // Initialize push notifications
  usePushNotifications();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Kullanıcı giriş yapmamış ve auth sayfasında değil
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      // Kullanıcı giriş yapmış ama hala auth sayfasında
      if (isNewUser) {
        // Yeni kullanıcı - onboarding'e yönlendir
        router.replace('/onboarding');
      } else {
        // Mevcut kullanıcı - ana sayfaya yönlendir
        router.replace('/(tabs)');
      }
    }
  }, [user, loading, initialized, segments, isNewUser]);

  if (!initialized || loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
            animation: 'fade_from_bottom',
            animationDuration: 400,
          }} 
        />
      </Stack>
      {/* Global Toast Notifications */}
      <Toast />
    </ErrorBoundary>
  );
}
