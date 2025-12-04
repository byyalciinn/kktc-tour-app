# 🛡️ KKTC Tour App - Güvenlik İyileştirmeleri Uygulama Planı

**Oluşturma Tarihi:** 4 Aralık 2025  
**Son Güncelleme:** 4 Aralık 2025

---

## 📋 İçindekiler

1. [Vision API Backend Proxy](#1-vision-api-backend-proxy)
2. [Error Message Maskeleme](#2-error-message-maskeleme)
3. [Certificate Pinning](#3-certificate-pinning)
4. [Session Timeout](#4-session-timeout)
5. [Biometric Authentication](#5-biometric-authentication)
6. [Jailbreak/Root Detection](#6-jailbreakroot-detection)
7. [Screen Capture Protection](#7-screen-capture-protection)

---

## 📊 Uygulama Öncelikleri

| # | İyileştirme | Öncelik | Zorluk | Tahmini Süre |
|---|-------------|---------|--------|--------------|
| 1 | Vision API Backend Proxy | 🔴 Kritik | Orta | 2-3 saat |
| 2 | Error Message Maskeleme | 🔴 Kritik | Kolay | 1-2 saat |
| 3 | Certificate Pinning | 🟡 Yüksek | Orta | 2-3 saat |
| 4 | Session Timeout | 🟡 Yüksek | Kolay | 1-2 saat |
| 5 | Biometric Authentication | 🟢 Orta | Orta | 3-4 saat |
| 6 | Jailbreak Detection | 🟢 Orta | Kolay | 1 saat |
| 7 | Screen Capture Protection | 🟢 Düşük | Kolay | 30 dk |

---

## 1. Vision API Backend Proxy

### 🎯 Amaç
OpenAI ve Anthropic API key'lerini client-side'dan kaldırarak backend üzerinden güvenli erişim sağlamak.

### 📁 Dosya Değişiklikleri

#### [NEW] supabase/functions/analyze-image/index.ts

```typescript
// Supabase Edge Function: analyze-image
// API key'leri güvenli bir şekilde server-side'da tutar
// Deploy: supabase functions deploy analyze-image

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface RequestBody {
  imageBase64: string;
  provider: 'openai' | 'anthropic';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert historian and tour guide specializing in North Cyprus (KKTC/TRNC). 
You analyze images of historical places, monuments, landmarks, and tourist attractions.

When analyzing an image, you must:
1. Identify the place, monument, or landmark
2. Provide detailed historical context
3. Share interesting facts and significance
4. Give practical visitor tips

Respond ONLY in valid JSON format with this exact structure:
{
  "placeName": "Name of the place in English",
  "placeNameLocal": "Name in Turkish if different",
  "category": "historical|natural|religious|architectural|beach|monument|museum|unknown",
  "confidence": 0.0-1.0,
  "description": "Detailed description of what's in the image",
  "historicalPeriod": "e.g., Ottoman Era, Byzantine Period, etc.",
  "yearBuilt": "Year or century if known",
  "architect": "Architect name if known",
  "significance": "Why this place is important",
  "funFacts": ["Interesting fact 1", "Interesting fact 2", "Interesting fact 3"],
  "visitTips": ["Tip 1", "Tip 2", "Tip 3"],
  "bestTimeToVisit": "Morning/Afternoon/Evening or seasonal",
  "estimatedDuration": "e.g., 1-2 hours",
  "nearbyAttractions": ["Nearby place 1", "Nearby place 2"],
  "location": {
    "city": "City name",
    "region": "Region in North Cyprus",
    "address": "Approximate address if known"
  }
}`;

async function analyzeWithOpenAI(imageBase64: string): Promise<any> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  return response.json();
}

async function analyzeWithClaude(imageBase64: string): Promise<any> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this image and identify the historical place, landmark, or tourist attraction.',
            },
          ],
        },
      ],
    }),
  });

  return response.json();
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check (basit implementasyon)
    // Production'da Redis veya database tabanlı rate limiting kullanın

    const { imageBase64, provider }: RequestBody = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API key availability
    const apiKey = provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze image
    const result = provider === 'openai'
      ? await analyzeWithOpenAI(imageBase64)
      : await analyzeWithClaude(imageBase64);

    // Log usage for monitoring (optional)
    console.log(`Image analysis by user ${user.id} using ${provider}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing image:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

#### [MODIFY] lib/visionService.ts

Mevcut API çağrılarını Edge Function üzerinden yönlendirin:

```typescript
// lib/visionService.ts - Güncellenmiş analyzeImage fonksiyonu

import { supabase } from './supabase';
import { logger } from './logger';

export async function analyzeImage(
  imageUri: string,
  provider: 'openai' | 'anthropic' = 'openai'
): Promise<VisionAnalysisResult> {
  try {
    logger.info('Starting image analysis via Edge Function', { provider });

    // Convert image to base64
    const imageBase64 = await imageToBase64(imageUri);

    // Call Edge Function instead of direct API
    const { data, error } = await supabase.functions.invoke('analyze-image', {
      body: { imageBase64, provider },
    });

    if (error) {
      logger.error('Edge function error:', error);
      throw new Error(error.message);
    }

    // Parse response based on provider
    let content: string;
    if (provider === 'openai') {
      content = data?.choices?.[0]?.message?.content;
    } else {
      content = data?.content?.[0]?.text;
    }

    if (!content) {
      throw new Error('No response from AI provider');
    }

    return parseVisionResponse(content);
  } catch (error) {
    logger.error('Image analysis failed', error);
    return {
      success: false,
      placeName: 'Analysis Failed',
      category: 'unknown',
      confidence: 0,
      description: 'Unable to analyze the image. Please try again.',
      significance: '',
      funFacts: [],
      visitTips: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

#### [MODIFY] .env.example

```diff
- # AI Vision API Keys (for Scan Feature)
- # Choose one of the following providers:
- # OpenAI: Get key from https://platform.openai.com/api-keys
- EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
- 
- # Anthropic: Get key from https://console.anthropic.com
- # EXPO_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key-here

+ # AI Vision API Keys - These are now managed via Supabase Edge Functions
+ # Set these in Supabase Dashboard > Edge Functions > Secrets:
+ # - OPENAI_API_KEY
+ # - ANTHROPIC_API_KEY
+ # DO NOT expose API keys in client-side code
```

---

### 🚀 Deploy Adımları

```bash
# 1. Supabase CLI ile deploy
supabase functions deploy analyze-image

# 2. Secrets ayarla
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# 3. Test et
curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-image' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"imageBase64": "...", "provider": "openai"}'
```

---

## 2. Error Message Maskeleme

### 🎯 Amaç
Kullanıcıya gösterilen hata mesajlarından hassas bilgileri gizlemek.

### 📁 Dosya Değişiklikleri

#### [NEW] lib/errorHandler.ts

```typescript
/**
 * Error Handler Utility
 * Masks sensitive error details from users while preserving logs
 */

import { logger } from './logger';

// Error codes for user-friendly messages
export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_SESSION_EXPIRED = 'AUTH_002',
  AUTH_2FA_FAILED = 'AUTH_003',
  AUTH_RATE_LIMITED = 'AUTH_004',
  NETWORK_ERROR = 'NET_001',
  NETWORK_TIMEOUT = 'NET_002',
  SERVER_ERROR = 'SRV_001',
  VALIDATION_ERROR = 'VAL_001',
  PERMISSION_DENIED = 'PERM_001',
  NOT_FOUND = 'NF_001',
  UNKNOWN = 'UNK_001',
}

// User-friendly error messages (Turkish)
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'E-posta veya şifre hatalı.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  [ErrorCode.AUTH_2FA_FAILED]: 'Doğrulama kodu geçersiz.',
  [ErrorCode.AUTH_RATE_LIMITED]: 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.',
  [ErrorCode.NETWORK_ERROR]: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
  [ErrorCode.NETWORK_TIMEOUT]: 'İstek zaman aşımına uğradı. Tekrar deneyin.',
  [ErrorCode.SERVER_ERROR]: 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
  [ErrorCode.VALIDATION_ERROR]: 'Girdiğiniz bilgileri kontrol edin.',
  [ErrorCode.PERMISSION_DENIED]: 'Bu işlem için yetkiniz yok.',
  [ErrorCode.NOT_FOUND]: 'Aradığınız kaynak bulunamadı.',
  [ErrorCode.UNKNOWN]: 'Beklenmeyen bir hata oluştu.',
};

interface MaskedError {
  code: ErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Maps raw error to user-friendly error code
 */
function mapErrorToCode(error: Error | string): ErrorCode {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Auth errors
  if (lowerMessage.includes('invalid login credentials') ||
      lowerMessage.includes('invalid email or password')) {
    return ErrorCode.AUTH_INVALID_CREDENTIALS;
  }
  if (lowerMessage.includes('session') && lowerMessage.includes('expired')) {
    return ErrorCode.AUTH_SESSION_EXPIRED;
  }
  if (lowerMessage.includes('verification') || lowerMessage.includes('2fa') ||
      lowerMessage.includes('code')) {
    return ErrorCode.AUTH_2FA_FAILED;
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return ErrorCode.AUTH_RATE_LIMITED;
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('timeout')) {
    return ErrorCode.NETWORK_TIMEOUT;
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden')) {
    return ErrorCode.PERMISSION_DENIED;
  }

  // Not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return ErrorCode.NOT_FOUND;
  }

  // Server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server')) {
    return ErrorCode.SERVER_ERROR;
  }

  return ErrorCode.UNKNOWN;
}

/**
 * Masks error for user display while logging original
 */
export function maskError(error: Error | string, context?: string): MaskedError {
  const originalError = typeof error === 'string' ? new Error(error) : error;
  const code = mapErrorToCode(originalError);
  
  // Log the original error for debugging
  logger.error(`[${code}] ${context || 'Error'}:`, originalError);
  
  return {
    code,
    message: ERROR_MESSAGES[code],
    originalError: __DEV__ ? originalError : undefined, // Only include in dev
  };
}

/**
 * Get user-friendly message from error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];
}

/**
 * Wrapper for try-catch blocks
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: string
): Promise<{ data: T | null; error: MaskedError | null }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { 
      data: null, 
      error: maskError(error as Error, context) 
    };
  }
}
```

---

#### [MODIFY] app/(auth)/index.tsx

Mevcut hata gösterimlerini güncelleyin:

```diff
+ import { maskError } from '@/lib/errorHandler';

// handleLogin fonksiyonu içinde:
  if (error) {
-   Alert.alert(t('auth.loginErrorTitle'), error.message);
+   const maskedError = maskError(error, 'Login');
+   Alert.alert(t('auth.loginErrorTitle'), maskedError.message);
    return;
  }

// handleRegister fonksiyonu içinde:
  if (error) {
-   Alert.alert(t('auth.registerErrorTitle'), error.message);
+   const maskedError = maskError(error, 'Register');
+   Alert.alert(t('auth.registerErrorTitle'), maskedError.message);
  }

// handleForgotPassword fonksiyonu içinde:
  if (error) {
-   Alert.alert(t('common.error'), error.message);
+   const maskedError = maskError(error, 'Password Reset');
+   Alert.alert(t('common.error'), maskedError.message);
  }
```

---

## 3. Certificate Pinning

### 🎯 Amaç
HTTPS bağlantılarında Man-in-the-Middle (MITM) saldırılarını önlemek.

### 📦 Kurulum

```bash
# Expo managed workflow'da certificate pinning için
npx expo install expo-network
```

> [!WARNING]
> Expo managed workflow'da tam certificate pinning desteği sınırlıdır. 
> Bare workflow veya custom native module gerekebilir.

### 📁 Dosya Değişiklikleri

#### [NEW] lib/networkSecurity.ts

```typescript
/**
 * Network Security Configuration
 * Implements basic network security checks
 */

import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { logger } from './logger';

// Known secure endpoints
const TRUSTED_HOSTS = [
  'supabase.co',
  'supabase.in',
  'api.openai.com',
  'api.anthropic.com',
  'api.resend.com',
];

// SSL Pinning hashes (SHA-256)
// Bu hash'leri sertifika değişikliğinde güncellemeniz gerekir
const SSL_PINS: Record<string, string[]> = {
  'supabase.co': [
    // Primary certificate hash
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Backup certificate hash
    'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  ],
};

/**
 * Check if device is on a secure network
 */
export async function checkNetworkSecurity(): Promise<{
  isSecure: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    // Check if connected
    if (!networkState.isConnected) {
      return { isSecure: false, warnings: ['No network connection'] };
    }
    
    // Check network type
    if (networkState.type === Network.NetworkStateType.CELLULAR) {
      // Cellular networks are generally more secure
      logger.info('Connected via cellular network');
    } else if (networkState.type === Network.NetworkStateType.WIFI) {
      // WiFi might be compromised - just a warning
      warnings.push('Connected via WiFi - ensure you trust this network');
    }
    
    return { isSecure: true, warnings };
  } catch (error) {
    logger.error('Network security check failed:', error);
    return { isSecure: false, warnings: ['Unable to verify network security'] };
  }
}

/**
 * Validate URL against trusted hosts
 */
export function isTrustedHost(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TRUSTED_HOSTS.some(host => urlObj.hostname.endsWith(host));
  } catch {
    return false;
  }
}

/**
 * Get SSL pins for a host
 */
export function getSSLPins(host: string): string[] | null {
  for (const [domain, pins] of Object.entries(SSL_PINS)) {
    if (host.endsWith(domain)) {
      return pins;
    }
  }
  return null;
}

/**
 * Create fetch wrapper with security checks
 */
export function createSecureFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Validate trusted host
    if (!isTrustedHost(url)) {
      logger.warn('Request to untrusted host:', url);
    }
    
    // Ensure HTTPS
    if (!url.startsWith('https://')) {
      throw new Error('Only HTTPS connections are allowed');
    }
    
    // Add security headers
    const secureInit: RequestInit = {
      ...init,
      headers: {
        ...init?.headers,
        'X-Requested-With': 'TourApp',
      },
    };
    
    return fetch(input, secureInit);
  };
}
```

---

#### Bare Workflow için Ek Yapılandırma

> [!NOTE]
> Eğer projeyi bare workflow'a geçirirseniz, aşağıdaki native yapılandırmaları ekleyin.

**Android: android/app/src/main/res/xml/network_security_config.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
    
    <domain-config>
        <domain includeSubdomains="true">supabase.co</domain>
        <pin-set expiration="2025-12-31">
            <pin digest="SHA-256">YOUR_PRIMARY_PIN_HERE</pin>
            <pin digest="SHA-256">YOUR_BACKUP_PIN_HERE</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

**iOS: Info.plist (NSAppTransportSecurity):**

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSPinnedDomains</key>
    <dict>
        <key>supabase.co</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSPinnedCAIdentities</key>
            <array>
                <dict>
                    <key>SPKI-SHA256-BASE64</key>
                    <string>YOUR_PIN_HERE</string>
                </dict>
            </array>
        </dict>
    </dict>
</dict>
```

---

## 4. Session Timeout

### 🎯 Amaç
İnaktivite durumunda kullanıcıyı otomatik olarak çıkarmak.

### 📁 Dosya Değişiklikleri

#### [NEW] hooks/useSessionTimeout.ts

```typescript
/**
 * Session Timeout Hook
 * Automatically logs out user after inactivity
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in background
const LAST_ACTIVITY_KEY = '@session_last_activity';

export function useSessionTimeout() {
  const { user, signOut } = useAuthStore();
  const { showToast } = useUIStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Update last activity timestamp
  const updateActivity = useCallback(async () => {
    const now = Date.now().toString();
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, now);
    
    // Reset timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (user) {
      timeoutRef.current = setTimeout(() => {
        handleSessionTimeout();
      }, SESSION_TIMEOUT_MS);
    }
  }, [user]);

  // Handle session timeout
  const handleSessionTimeout = useCallback(async () => {
    showToast('Oturumunuz zaman aşımına uğradı', 'warning');
    await signOut();
  }, [signOut, showToast]);

  // Check if session should expire on app focus
  const checkSessionValidity = useCallback(async () => {
    if (!user) return;

    const lastActivity = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > SESSION_TIMEOUT_MS) {
        handleSessionTimeout();
      }
    }
  }, [user, handleSessionTimeout]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        const backgroundDuration = Date.now() - backgroundTimeRef.current;
        
        if (backgroundDuration > BACKGROUND_TIMEOUT_MS) {
          // Been in background too long
          handleSessionTimeout();
        } else {
          // Resume normal timeout
          checkSessionValidity();
          updateActivity();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        backgroundTimeRef.current = Date.now();
        
        // Clear foreground timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
      
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkSessionValidity, handleSessionTimeout, updateActivity]);

  // Initialize timeout on mount
  useEffect(() => {
    if (user) {
      updateActivity();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, updateActivity]);

  return { updateActivity };
}
```

---

#### [NEW] components/ActivityTracker.tsx

```typescript
/**
 * Activity Tracker Component
 * Wraps app content and tracks user interactions for session timeout
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface ActivityTrackerProps {
  children: React.ReactNode;
}

export function ActivityTracker({ children }: ActivityTrackerProps) {
  const { updateActivity } = useSessionTimeout();

  const handleTouchStart = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View 
        style={styles.container} 
        onTouchStart={handleTouchStart}
      >
        {children}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

#### [MODIFY] app/_layout.tsx

```diff
+ import { ActivityTracker } from '@/components/ActivityTracker';

export default function RootLayout() {
  // ... existing code ...
  
  return (
+   <ActivityTracker>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* ... stack screens ... */}
        </Stack>
      </ThemeProvider>
+   </ActivityTracker>
  );
}
```

---

## 5. Biometric Authentication

### 🎯 Amaç
Hassas işlemler için parmak izi veya yüz tanıma ile ek güvenlik katmanı.

### 📦 Kurulum

```bash
npx expo install expo-local-authentication
```

### 📁 Dosya Değişiklikleri

#### [NEW] lib/biometricAuth.ts

```typescript
/**
 * Biometric Authentication Service
 * Provides fingerprint and face recognition authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from './logger';

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';
const BIOMETRIC_LAST_SUCCESS_KEY = '@biometric_last_success';

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  hasEnrolledBiometrics: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  warning?: string;
}

/**
 * Check device biometric capabilities
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      isAvailable,
      biometricTypes: supportedTypes,
      hasEnrolledBiometrics: isEnrolled,
      securityLevel,
    };
  } catch (error) {
    logger.error('Biometric capability check failed:', error);
    return {
      isAvailable: false,
      biometricTypes: [],
      hasEnrolledBiometrics: false,
      securityLevel: LocalAuthentication.SecurityLevel.NONE,
    };
  }
}

/**
 * Get human-readable biometric type name
 */
export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Yüz Tanıma';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === 'ios' ? 'Touch ID' : 'Parmak İzi';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'İris Tarama';
  }
  return 'Biyometrik Doğrulama';
}

/**
 * Check if biometric auth is enabled for the app
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

/**
 * Enable/disable biometric auth for the app
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  logger.info(`Biometric authentication ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    disableDeviceFallback?: boolean;
  }
): Promise<BiometricAuthResult> {
  try {
    const capabilities = await checkBiometricCapabilities();
    
    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: 'Biyometrik donanım bulunamadı',
      };
    }

    if (!capabilities.hasEnrolledBiometrics) {
      return {
        success: false,
        error: 'Cihazınızda kayıtlı biyometrik veri yok',
      };
    }

    const biometricName = getBiometricTypeName(capabilities.biometricTypes);

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options?.promptMessage || `${biometricName} ile doğrulayın`,
      cancelLabel: options?.cancelLabel || 'İptal',
      fallbackLabel: options?.fallbackLabel || 'Şifre Kullan',
      disableDeviceFallback: options?.disableDeviceFallback ?? false,
    });

    if (result.success) {
      // Store last successful biometric auth time
      await AsyncStorage.setItem(
        BIOMETRIC_LAST_SUCCESS_KEY,
        Date.now().toString()
      );
      
      logger.info('Biometric authentication successful');
      return { success: true };
    }

    // Handle different error types
    switch (result.error) {
      case 'user_cancel':
        return { success: false, error: 'Doğrulama iptal edildi' };
      case 'user_fallback':
        return { success: false, warning: 'Kullanıcı şifre kullanmayı tercih etti' };
      case 'lockout':
        return { 
          success: false, 
          error: 'Çok fazla başarısız deneme. Lütfen bekleyin.' 
        };
      case 'lockout_permanent':
        return { 
          success: false, 
          error: 'Biyometrik doğrulama kilitlendi. Cihaz şifrenizi kullanın.' 
        };
      case 'not_enrolled':
        return { 
          success: false, 
          error: 'Biyometrik veri kaydedilmemiş' 
        };
      default:
        return { 
          success: false, 
          error: 'Biyometrik doğrulama başarısız' 
        };
    }
  } catch (error) {
    logger.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Biyometrik doğrulama hatası',
    };
  }
}

/**
 * Check if re-authentication is needed (e.g., for sensitive operations)
 */
export async function needsReauthentication(
  maxAgeMins: number = 5
): Promise<boolean> {
  const lastSuccess = await AsyncStorage.getItem(BIOMETRIC_LAST_SUCCESS_KEY);
  if (!lastSuccess) return true;

  const elapsed = Date.now() - parseInt(lastSuccess, 10);
  const maxAgeMs = maxAgeMins * 60 * 1000;

  return elapsed > maxAgeMs;
}
```

---

#### [NEW] hooks/useBiometricAuth.ts

```typescript
/**
 * Biometric Authentication Hook
 */

import { useState, useEffect, useCallback } from 'react';
import {
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  isBiometricEnabled,
  setBiometricEnabled,
  BiometricCapabilities,
  BiometricAuthResult,
  getBiometricTypeName,
} from '@/lib/biometricAuth';

export function useBiometricAuth() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    async function load() {
      const [caps, enabled] = await Promise.all([
        checkBiometricCapabilities(),
        isBiometricEnabled(),
      ]);
      setCapabilities(caps);
      setIsEnabled(enabled);
      setIsLoading(false);
    }
    load();
  }, []);

  // Toggle biometric authentication
  const toggleBiometric = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      // Require biometric verification to enable
      const result = await authenticateWithBiometrics({
        promptMessage: 'Biyometrik doğrulamayı etkinleştirmek için doğrulayın',
      });
      
      if (!result.success) {
        return false;
      }
    }
    
    await setBiometricEnabled(enabled);
    setIsEnabled(enabled);
    return true;
  }, []);

  // Authenticate
  const authenticate = useCallback(async (
    promptMessage?: string
  ): Promise<BiometricAuthResult> => {
    return authenticateWithBiometrics({ promptMessage });
  }, []);

  // Get biometric type name
  const biometricName = capabilities 
    ? getBiometricTypeName(capabilities.biometricTypes)
    : '';

  return {
    capabilities,
    isEnabled,
    isLoading,
    isAvailable: capabilities?.isAvailable && capabilities?.hasEnrolledBiometrics,
    biometricName,
    toggleBiometric,
    authenticate,
  };
}
```

---

## 6. Jailbreak/Root Detection

### 🎯 Amaç
Güvenliği tehlikeye atabilecek jailbreak/root edilmiş cihazları tespit etmek.

### 📦 Kurulum

> [!NOTE]
> Expo managed workflow'da sınırlı destek vardır. 
> Tam destek için bare workflow gerekir.

```bash
# Bare workflow için
npm install jail-monkey
```

### 📁 Dosya Değişiklikleri

#### [NEW] lib/deviceSecurity.ts

```typescript
/**
 * Device Security Check
 * Detects potentially compromised devices
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { logger } from './logger';

export interface SecurityCheckResult {
  isSecure: boolean;
  warnings: string[];
  details: {
    isEmulator: boolean;
    isRooted: boolean | null; // null = unable to detect
    debuggerAttached: boolean | null;
    isTestFlight: boolean | null;
  };
}

/**
 * Check if running on emulator/simulator
 */
async function checkEmulator(): Promise<boolean> {
  return !Device.isDevice;
}

/**
 * Basic root/jailbreak detection
 * Note: This is a basic check, not foolproof
 */
async function checkRootBasic(): Promise<boolean | null> {
  if (Platform.OS === 'android') {
    // Basic Android root indicators
    // Full implementation requires native module
    return null;
  }
  
  if (Platform.OS === 'ios') {
    // Basic iOS jailbreak indicators
    // Full implementation requires native module
    return null;
  }
  
  return null;
}

/**
 * Check if debugger is attached (basic)
 */
function checkDebugger(): boolean | null {
  // __DEV__ is a basic indicator
  if (__DEV__) {
    return true;
  }
  return null;
}

/**
 * Check if app is from TestFlight (iOS)
 */
async function checkTestFlight(): Promise<boolean | null> {
  if (Platform.OS !== 'ios') return null;
  
  try {
    // This is a heuristic - not 100% reliable
    const installSource = await Application.getInstallationTimeAsync();
    return null; // Would need native module for accurate detection
  } catch {
    return null;
  }
}

/**
 * Perform all security checks
 */
export async function checkDeviceSecurity(): Promise<SecurityCheckResult> {
  const warnings: string[] = [];
  
  const isEmulator = await checkEmulator();
  const isRooted = await checkRootBasic();
  const debuggerAttached = checkDebugger();
  const isTestFlight = await checkTestFlight();
  
  // Build warnings
  if (isEmulator) {
    warnings.push('Uygulama bir emülatörde çalışıyor');
  }
  
  if (isRooted === true) {
    warnings.push('Cihaz root/jailbreak edilmiş olabilir');
  }
  
  if (debuggerAttached === true && !__DEV__) {
    warnings.push('Debugger bağlı olabilir');
  }
  
  // Determine if secure
  // In production, you might want stricter checks
  const isSecure = !isRooted && (!isEmulator || __DEV__);
  
  const result: SecurityCheckResult = {
    isSecure,
    warnings,
    details: {
      isEmulator,
      isRooted,
      debuggerAttached,
      isTestFlight,
    },
  };
  
  logger.info('Device security check:', result);
  
  return result;
}

/**
 * Hook for device security
 */
import { useState, useEffect } from 'react';

export function useDeviceSecurity() {
  const [securityResult, setSecurityResult] = useState<SecurityCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkDeviceSecurity()
      .then(setSecurityResult)
      .finally(() => setIsChecking(false));
  }, []);

  return {
    ...securityResult,
    isChecking,
  };
}
```

---

## 7. Screen Capture Protection

### 🎯 Amaç
Hassas ekranların ekran görüntüsü alınmasını veya kaydedilmesini engellemek.

### 📦 Kurulum

```bash
npx expo install expo-screen-capture
```

### 📁 Dosya Değişiklikleri

#### [NEW] hooks/useScreenProtection.ts

```typescript
/**
 * Screen Protection Hook
 * Prevents screen capture on sensitive screens
 */

import { useEffect, useCallback } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Hook to prevent screen capture
 * Use on sensitive screens (payment, personal info, etc.)
 */
export function useScreenProtection(isProtected: boolean = true) {
  useEffect(() => {
    if (!isProtected) return;

    // Prevent screen capture
    ScreenCapture.preventScreenCaptureAsync();
    logger.info('Screen capture protection enabled');

    return () => {
      // Re-enable screen capture when leaving protected screen
      ScreenCapture.allowScreenCaptureAsync();
      logger.info('Screen capture protection disabled');
    };
  }, [isProtected]);

  // Listen for screenshot attempts (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isProtected) return;

    const subscription = ScreenCapture.addScreenshotListener(() => {
      logger.warn('Screenshot attempt detected');
      // You could show a warning to the user here
    });

    return () => subscription.remove();
  }, [isProtected]);
}

/**
 * Wrapper component for protected screens
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProtectedScreenProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export function ProtectedScreen({ 
  children, 
  enabled = true 
}: ProtectedScreenProps) {
  useScreenProtection(enabled);
  
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

#### Kullanım Örneği

```typescript
// app/(tabs)/profile.tsx veya hassas bir ekran

import { ProtectedScreen } from '@/hooks/useScreenProtection';

export default function ProfileScreen() {
  return (
    <ProtectedScreen>
      {/* Hassas içerik */}
      <PersonalInfoSection />
      <PaymentMethodsSection />
    </ProtectedScreen>
  );
}
```

---

## 📋 Test Kontrol Listesi

### Vision API Backend Proxy
- [ ] Edge function deploy edildi
- [ ] Secrets ayarlandı
- [ ] Client-side API key'ler kaldırıldı
- [ ] Authenticated user check çalışıyor
- [ ] Error handling doğru çalışıyor

### Error Message Maskeleme
- [ ] Login hata mesajları maskeleniyor
- [ ] Register hata mesajları maskeleniyor
- [ ] API hata mesajları maskeleniyor
- [ ] Dev mode'da detaylı hatalar görünüyor

### Session Timeout
- [ ] 15 dakika inaktivite sonrası logout
- [ ] 5 dakika background sonrası logout
- [ ] Touch activity doğru takip ediliyor
- [ ] Toast mesajı gösteriliyor

### Biometric Authentication
- [ ] Capability check çalışıyor
- [ ] Face ID/Touch ID doğrulama çalışıyor
- [ ] Settings'de toggle çalışıyor
- [ ] Farklı cihazlarda test edildi

### Jailbreak Detection
- [ ] Emülatör tespit ediliyor
- [ ] Uyarı mesajları gösteriliyor
- [ ] Hassas işlemler engelleniyor (opsiyonel)

### Screen Protection
- [ ] Hassas ekranlarda capture engelleniyor
- [ ] Screenshot listener çalışıyor (iOS)
- [ ] Normal ekranlarda capture izin veriliyor

---

## 📚 Referanslar

- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Expo Screen Capture](https://docs.expo.dev/versions/latest/sdk/screen-capture/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security-testing-guide/)
