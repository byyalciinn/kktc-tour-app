import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useAuthStore, useThemeStore, useOnboardingStore, useTwoFactorStore } from '@/stores';
import { Toast, ErrorBoundary, LoadingScreen } from '@/components/ui';

// Lazy load i18n to prevent startup crashes
let i18nInitialized = false;
const initI18n = () => {
  if (i18nInitialized) return;
  try {
    require('@/lib/i18n');
    i18nInitialized = true;
  } catch (error) {
    console.warn('[_layout] Failed to initialize i18n:', error);
  }
};

export default function RootLayout() {
  const { colorScheme } = useThemeStore();
  const segments = useSegments();
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Zustand auth store
  const { user, loading, initialized, initialize } = useAuthStore();
  
  // Onboarding store
  const { hasSeenIntro, isCheckingIntro, checkIntroStatus } = useOnboardingStore();
  
  // 2FA store - check if 2FA verification is pending or being checked
  const { isPending: is2FAPending, isCheckingRequired: is2FAChecking } = useTwoFactorStore();
  
  // Initialize i18n and push notifications after app is ready
  useEffect(() => {
    // Initialize i18n first
    initI18n();
    
    // Small delay to ensure native modules are fully ready before any native calls
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Initialize push notifications only when app is ready and user exists
  useEffect(() => {
    if (!isAppReady || !user) return;
    
    // Dynamically import notification service to avoid early native module access
    const initPushNotifications = async () => {
      try {
        const notificationService = await import('@/lib/notificationService');
        const token = await notificationService.registerForPushNotifications();
        if (token) {
          await notificationService.savePushToken(user.id, token);
          console.log('[_layout] Push notifications registered');
        }
      } catch (error) {
        console.warn('[_layout] Failed to initialize push notifications:', error);
      }
    };
    
    initPushNotifications();
  }, [isAppReady, user?.id]);

  // Initialize auth and intro status on mount
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

    // Navigation state henüz hazır değilse bekle (auth state değişimi sırasında segments undefined olabilir)
    if (segments[0] === undefined) {
      console.log('[_layout] Segments not ready, waiting for navigation state...');
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
      
      // 2FA kontrolü yapılıyorsa, navigasyonu tamamen askıya al
      // Redirect yapmadan mevcut ekranda kal - handleLogin tamamlandığında yönlendirme yapılacak
      if (is2FAChecking) {
        console.log('[_layout] 2FA checking in progress, suspending navigation...');
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
    // 2. GİRİŞ YAPMAMIŞ KULLANICI (GUEST MODE)
    // ========================================
    // Apple Guideline 5.1.1(v): Login zorunlu olmamalı, account-based olmayan
    // özelliklere guest olarak erişilebilmeli
    console.log('[_layout] No user (guest mode), checking intro status:', { hasSeenIntro, inIntro, inAuthGroup });
    
    // İlk kurulum: Intro görülmemişse intro'ya yönlendir
    if (!hasSeenIntro) {
      if (!inIntro) {
        console.log('[_layout] First time user, redirecting to intro');
        router.replace('/intro');
      }
      return;
    }

    // Intro görüldü → Guest olarak tabs'a yönlendir (login zorunlu DEĞİL)
    // Kullanıcı isterse profile tab'ından veya account-based aksiyonlarda login yapabilir
    const inTabs = segments[0] === '(tabs)';
    if (inIntro) {
      // Intro'dan çıkış → tabs'a git (guest mode)
      console.log('[_layout] Intro completed, redirecting guest to tabs');
      router.replace('/(tabs)');
    }
    // Auth ekranındaysa veya tabs'taysa → olduğu yerde kalsın
    // Guest kullanıcı auth'a gidebilir (isteğe bağlı login için)
  }, [user, loading, initialized, segments, hasSeenIntro, isCheckingIntro, is2FAPending, is2FAChecking]);

  // Loading ekranı göster: initialization, loading, intro check veya 2FA check sırasında
  if (!initialized || loading || isCheckingIntro || is2FAChecking) {
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
        <Stack.Screen 
          name="tour-reels" 
          options={{ 
            headerShown: false, 
            presentation: 'fullScreenModal',
            animation: 'fade',
          }} 
        />
      </Stack>
      {/* Global Toast Notifications */}
      <Toast />
    </ErrorBoundary>
  );
}
