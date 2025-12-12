# Auth Ekranı Yönlendirme Hatası Analizi

Bu belge, kullanıcı giriş yaptıktan sonra yaşanan ekran titremeyi (flash) ve hatalı yönlendirmeyi analiz eder.

---

## Problem Özeti

Kullanıcı giriş bilgilerini girip "Giriş Yap" butonuna bastığında:
1. Ekran kısa süreliğine değişiyor
2. Auth veya Intro ekranına geçiş yapılıyor  
3. 1-2 saniye sonra home screen'e yönlendiriliyor

---

## 🔍 Bulgu #1: Çift Yönlendirme Sorunu (ÇÖZÜLDÜ ✅)

**Orijinal Sorun:** `is2FAChecking = true` durumunda auth'a çift redirect yapılıyordu.

**Uygulanan Çözüm:** Navigation guard eklenerek gereksiz redirectler engellendi.

---

## 🔍 Bulgu #2: Intro Flash Sorunu

### Console Log Analizi

```
segments: '(auth)' → segments: undefined → segments: 'intro'
[_layout] 2FA checking in progress, suspending navigation...
[_layout] 2FA checking in progress, suspending navigation... (intro'da)
[_layout] Redirecting logged-in user to tabs from: intro  ← Intro'dan yönlendiriyor
```

**Problem:** 2FA kontrolü sırasında navigasyonu askıya aldığımızda, expo-router'ın varsayılan davranışı intro ekranını gösteriyor.

### Kök Neden

1. `signIn` sonrası `segments` değeri geçici olarak `undefined` oluyor
2. Expo-router varsayılan Stack sıralamasına göre intro'yu gösteriyor
3. Biz sadece `return` yaptığımız için bu durumu düzeltemiyoruz

---

## ✅ Uygulanan Çözüm

`_layout.tsx` satır 114-124'te güncelleme yapıldı:

```typescript
// 2FA kontrolü yapılıyorsa, kullanıcıyı auth'da tut
// Intro veya başka bir ekrana düşmüşse auth'a yönlendir (sadece bir kere)
if (is2FAChecking) {
  if (!inAuthGroup) {
    console.log('[_layout] 2FA checking, keeping user in auth (preventing intro flash)');
    router.replace('/(auth)');
  } else {
    console.log('[_layout] 2FA checking in progress, staying on auth...');
  }
  return;
}
```

**Çözüm Mantığı:**
- Eğer `is2FAChecking = true` VE kullanıcı auth'da değilse → auth'a yönlendir
- Eğer zaten auth'daysa → hiçbir şey yapma, orda kal
- Bu sayede intro flash'ı önlenir ve çift yönlendirme olmaz

---

## 📋 Doğrulama

### Beklenen Console Çıktısı

```
[handleLogin] Starting login process...
[handleLogin] Setting isCheckingRequired = true
[_layout] 2FA checking, keeping user in auth (preventing intro flash)
[_layout] 2FA checking in progress, staying on auth...
[handleLogin] 2FA not enabled, proceeding to tabs
[_layout] Redirecting logged-in user to tabs from: (auth)
```

- `segments: 'intro'` **OLMAMALI**
- Sadece auth'dan tabs'a tek yönlendirme olmalı

---

## Değiştirilen Dosya

| Dosya | Değişiklik |
|-------|------------|
| [_layout.tsx](file:///Users/berkay/Desktop/tour-app/app/_layout.tsx) | `is2FAChecking` sırasında kullanıcıyı auth'da tutacak guard eklendi |
