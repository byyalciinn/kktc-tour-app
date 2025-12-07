# Adapty Payment SDK Integration Plan

> ✅ **STATUS: CODE IMPLEMENTATION COMPLETE**
> 
> Kod implementasyonu tamamlandı. SDK kurulumu ve dashboard konfigürasyonu gerekli.

KKTC Tour uygulaması için Adapty SDK kullanarak in-app purchase (IAP) entegrasyonu kurulum planı.

## Genel Bakış

Adapty SDK, paywall yönetimi, abonelik takibi ve A/B testi özelliklerini sunmaktadır. Bu entegrasyon mevcut `subscriptionStore.ts` altyapısının üzerine kurulacak ve Adapty'nin Paywall Builder aracıyla oluşturulan paywallları destekleyecektir.

## Önemli Gereksinimler

> **⚠️ Adapty Dashboard Kurulumu Gerekli**
> - Adapty hesabı oluşturulmalı ve Public SDK Key alınmalı
> - Products (monthly/yearly) App Store Connect ve Google Play Console'da oluşturulmalı
> - Paywall Builder'da paywall tasarlanmalı
> - Placement ID'ler belirlenmeli

> **⚠️ Expo DevClient Gerekli**
> - Expo Go **çalışmayacaktır** çünkü Adapty native modüller içerir
> - `npx expo prebuild` komutu ile native dizinler oluşturulmalı
> - EAS Build veya local build ile development build alınmalı

---

## Değişiklik Planı

### 1. SDK Kurulumu

```bash
# Adapty SDK'yı yükle
npx expo install react-native-adapty

# Native dizinleri oluştur
npx expo prebuild

# iOS için
npx expo run:ios

# Android için  
npx expo run:android
```

---

### 2. Yeni Dosyalar

#### `lib/adaptyService.ts` - SDK Initialization

```typescript
import { adapty } from 'react-native-adapty';

export const initializeAdapty = async (publicKey: string) => {
  adapty.activate(publicKey, {
    logLevel: __DEV__ ? 'verbose' : 'error',
    ipAddressCollectionDisabled: false,
    ios: {
      idfaCollectionDisabled: true,
    },
    android: {
      adIdCollectionDisabled: true,
    },
  });
};

export const logoutAdapty = async () => {
  await adapty.logout();
};

export { adapty };
```

#### `hooks/usePaywall.ts` - Paywall Management

```typescript
import { useState, useCallback } from 'react';
import { adapty, createPaywallView } from 'react-native-adapty';
import { useSubscriptionStore } from '@/stores';

export function usePaywall() {
  const [isLoading, setIsLoading] = useState(false);
  const { syncWithAdapty } = useSubscriptionStore();

  const showPaywall = useCallback(async (placementId: string) => {
    setIsLoading(true);
    try {
      const paywall = await adapty.getPaywall(placementId);
      
      if (!paywall.hasViewConfiguration) {
        return { success: false, error: 'No view configuration' };
      }

      const view = await createPaywallView(paywall);
      
      view.registerEventHandlers({
        onCloseButtonPress: () => true,
        onPurchaseCompleted: (result) => {
          syncWithAdapty();
          return result.type !== 'user_cancelled';
        },
        onRestoreCompleted: (profile) => {
          syncWithAdapty();
        },
      });

      await view.present();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [syncWithAdapty]);

  return { showPaywall, isLoading };
}
```

---

### 3. Mevcut Dosya Güncellemeleri

#### `subscriptionStore.ts` Değişiklikleri

```diff
+import { adapty } from '@/lib/adaptyService';

// subscribe fonksiyonu:
-// TODO: Integrate with RevenueCat or native IAP
-// For now, simulate subscription
+const paywall = await adapty.getPaywall(placementId);
+const view = await createPaywallView(paywall);
+await view.present();

// restorePurchases fonksiyonu:
-// TODO: Integrate with RevenueCat or native IAP
+const profile = await adapty.restorePurchases();
```

#### `_layout.tsx` Değişiklikleri

```typescript
import { initializeAdapty } from '@/lib/adaptyService';

useEffect(() => {
  const setupAdapty = async () => {
    const publicKey = process.env.EXPO_PUBLIC_ADAPTY_PUBLIC_KEY;
    if (publicKey) {
      await initializeAdapty(publicKey);
    }
  };
  setupAdapty();
}, []);
```

#### `authStore.ts` Değişiklikleri

```typescript
// Login sonrası:
await adapty.identify(user.id);

// Logout sonrası:
await adapty.logout();
```

#### `.env` Değişiklikleri

```bash
EXPO_PUBLIC_ADAPTY_PUBLIC_KEY=public_live_xxxx
```

---

### 4. Fallback Paywall Dosyaları

Adapty Dashboard'dan indirilen fallback dosyaları:

| Platform | Konum |
|----------|-------|
| iOS | `ios/ios_fallback.json` |
| Android | `android/app/src/main/assets/android_fallback.json` |

---

## Dosya Yapısı Özeti

```
tour-app/
├── lib/
│   └── adaptyService.ts      [✅ OLUŞTURULDU]
│   └── logger.ts             [✅ GÜNCELLENDI - adaptyLogger eklendi]
├── hooks/
│   └── usePaywall.ts         [✅ OLUŞTURULDU]
│   └── index.ts              [✅ GÜNCELLENDI - usePaywall export]
├── stores/
│   └── subscriptionStore.ts  [✅ GÜNCELLENDI - syncWithAdapty eklendi]
│   └── authStore.ts          [✅ GÜNCELLENDI - identify/logout eklendi]
├── app/
│   └── _layout.tsx           [✅ GÜNCELLENDI - initialization eklendi]
├── ios/
│   └── ios_fallback.json     [⏳ BEKLENİYOR - Dashboard'dan indirilecek]
├── android/app/src/main/assets/
│   └── android_fallback.json [⏳ BEKLENİYOR - Dashboard'dan indirilecek]
└── .env.example              [✅ GÜNCELLENDI - ADAPTY_PUBLIC_KEY eklendi]
```

---

## Uygulama Sırası

1. **Faz 1: SDK Kurulumu**
   - Package kurulumu (`npx expo install react-native-adapty`)
   - Prebuild (`npx expo prebuild`)
   - `adaptyService.ts` oluşturma
   - `_layout.tsx`'e initialization ekleme

2. **Faz 2: Store Entegrasyonu**
   - `subscriptionStore.ts` güncelleme
   - `authStore.ts`'e identify/logout ekleme

3. **Faz 3: Paywall**
   - `usePaywall.ts` hook oluşturma
   - UI'da paywall gösterimi

4. **Faz 4: Test**
   - Sandbox satın alma testi
   - Restore purchases testi

---

## Test Planı

| Test | Açıklama |
|------|----------|
| SDK Başlatma | Console'da `[Adapty]` loglarını kontrol et |
| Paywall Gösterimi | Butona tıkla, paywall açılsın |
| Sandbox Purchase | Test hesabıyla satın alma dene |
| Restore | Önceki satın almaları geri yükle |

---

## Referanslar

- [Adapty React Native SDK](https://adapty.io/docs/react-native-sdk-overview)
- [SDK Installation](https://adapty.io/docs/sdk-installation-reactnative)
- [Paywall Quickstart](https://adapty.io/docs/react-native-quickstart-paywalls)
- [Handle Events](https://adapty.io/docs/react-native-handling-events-1)
- [Check Subscription](https://adapty.io/docs/react-native-check-subscription-status)
