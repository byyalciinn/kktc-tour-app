import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAuthStore, useThemeStore, useOnboardingStore, useTwoFactorStore } from '@/stores';
import { Toast, ErrorBoundary, LoadingScreen } from '@/components/ui';
import { usePushNotifications } from '@/hooks';

// Initialize i18n
import '@/lib/i18n';

export default function RootLayout() {
  const { colorScheme } = useThemeStore();
  const segments = useSegments();
  
  // Zustand auth store
  const { user, loading, initialized, initialize } = useAuthStore();
  
  // Onboarding store
  const { hasSeenIntro, isCheckingIntro, checkIntroStatus } = useOnboardingStore();
  
  // 2FA store - check if 2FA verification is pending or being checked
  const { isPending: is2FAPending, isCheckingRequired: is2FAChecking } = useTwoFactorStore();
  
  // Initialize push notifications
  usePushNotifications();

  // Initialize auth and check intro status on mount
  useEffect(() => {
    initialize();
    checkIntroStatus();
  }, []);

  // Handle navigation based on auth state and intro status
  useEffect(() => {
    console.log('[_layout] Navigation check:', {
      initialized,
      loading,
      isCheckingIntro,
      user: !!user,
      userId: user?.id,
      hasSeenIntro,
      is2FAPending,
      is2FAChecking,
      segments: segments[0],
    });
    
    if (!initialized || loading || isCheckingIntro) {
      console.log('[_layout] Waiting for initialization...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inIntro = segments[0] === 'intro';

    // ========================================
    // 1. GİRİŞ YAPMIŞ KULLANICI
    // ========================================
    const inVerify2FA = segments[0] === 'verify-2fa';
    
    if (user) {
      console.log('[_layout] User logged in, checking 2FA:', { is2FAPending, is2FAChecking, inAuthGroup, inIntro, inVerify2FA });
      
      // 2FA doğrulaması bekleniyorsa
      if (is2FAPending) {
        // 2FA ekranında değilse, 2FA ekranına yönlendir
        if (!inVerify2FA) {
          console.log('[_layout] 2FA pending, redirecting to verify-2fa screen');
          router.replace('/verify-2fa');
        } else {
          console.log('[_layout] 2FA pending, staying on verify-2fa screen');
        }
        return;
      }
      
      // 2FA kontrolü yapılıyorsa, auth sayfasında kal (intro'ya düşmesin)
      if (is2FAChecking) {
        if (!inAuthGroup) {
          console.log('[_layout] 2FA checking, redirecting to auth to prevent intro flash');
          router.replace('/(auth)');
        } else {
          console.log('[_layout] 2FA checking, staying on auth...');
        }
        return;
      }
      
      // Giriş yapmış kullanıcı intro, auth veya verify-2fa'da olmamalı → tabs'a yönlendir
      if (inIntro || inAuthGroup || inVerify2FA) {
        console.log('[_layout] Redirecting logged-in user to tabs from:', segments[0]);
        router.replace('/(tabs)');
      }
      return;
    }

    // ========================================
    // 2. GİRİŞ YAPMAMIŞ KULLANICI
    // ========================================
    console.log('[_layout] No user, checking intro status:', { hasSeenIntro, inIntro, inAuthGroup });
    
    // İlk kurulum: Intro görülmemişse intro'ya yönlendir
    if (!hasSeenIntro) {
      if (!inIntro) {
        console.log('[_layout] First time user, redirecting to intro');
        router.replace('/intro');
      }
      return;
    }

    // Intro görüldü, auth'a yönlendir
    if (!inAuthGroup) {
      console.log('[_layout] Intro seen, redirecting to auth');
      router.replace('/(auth)');
    }
  }, [user, loading, initialized, segments, hasSeenIntro, isCheckingIntro, is2FAPending, is2FAChecking]);

  if (!initialized || loading || isCheckingIntro) {
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
        <Stack.Screen 
          name="intro" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
            animation: 'fade',
          }} 
        />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="verify-2fa" 
          options={{ 
            headerShown: false, 
            gestureEnabled: false,
            animation: 'fade',
          }} 
        />
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
