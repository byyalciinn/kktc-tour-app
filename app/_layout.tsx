import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Toast, ErrorBoundary } from '@/components/ui';

// Initialize i18n
import '@/lib/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  
  // Zustand auth store
  const { user, loading, initialized, initialize } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Kullanıcı giriş yapmamış ve auth sayfasında değil
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      // Kullanıcı giriş yapmış ama hala auth sayfasında
      router.replace('/(tabs)');
    }
  }, [user, loading, initialized, segments]);

  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
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
      </Stack>
      {/* Global Toast Notifications */}
      <Toast />
    </ErrorBoundary>
  );
}
