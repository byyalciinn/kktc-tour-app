# App Store Reject: Guideline 5.1.1 - Camera Purpose String

## Reject Sebebi

> **Issue Description**: One or more purpose strings in the app do not sufficiently explain the use of protected resources. Purpose strings must clearly and completely describe the app's use of data and, in most cases, provide an example of how the data will be used.
>
> **Next Steps**: Update the camera purpose string to explain how the app will use the requested information and provide a specific example of how the data will be used.

---

## Mevcut Durum Analizi

### Projede Bulunan Purpose String'ler

#### 1. `app.json` (Expo Config)
```json
// app.json:19-29
"infoPlist": {
  "NSCameraUsageDescription": "Cyprigo needs camera access to take photos for your profile and posts.",
  "NSPhotoLibraryUsageDescription": "Cyprigo needs photo library access to select images for your profile and posts.",
  "NSLocationWhenInUseUsageDescription": "Cyprigo needs your location to show nearby tours and provide navigation.",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "Cyprigo needs your location to show nearby tours and provide navigation.",
  "NSFaceIDUsageDescription": "Cyprigo uses Face ID for secure authentication."
}
```

#### 2. `ios/Cyprigo/Info.plist` (Native iOS Config)
```xml
<!-- ios/Cyprigo/Info.plist:50-63 -->
<key>NSCameraUsageDescription</key>
<string>Cyprigo needs camera access to take photos.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Cyprigo needs photo library access to select images.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Cyprigo needs your location to show nearby tours and provide navigation.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your microphone</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your location</string>
```

### Sorunlar

| Dosya | Key | Mevcut Metin | Sorun |
|-------|-----|--------------|-------|
| `Info.plist` | `NSCameraUsageDescription` | "Cyprigo needs camera access to take photos." | ❌ Çok genel, örnek yok |
| `Info.plist` | `NSPhotoLibraryUsageDescription` | "Cyprigo needs photo library access to select images." | ⚠️ Örnek yok |
| `Info.plist` | `NSMicrophoneUsageDescription` | "Allow $(PRODUCT_NAME) to access your microphone" | ❌ Placeholder, kullanım amacı yok |
| `Info.plist` | `NSLocationAlwaysUsageDescription` | "Allow $(PRODUCT_NAME) to access your location" | ❌ Placeholder, kullanım amacı yok |

### Kamera Kullanım Yerleri (Kod Analizi)

1. **Profil Fotoğrafı** - `lib/avatarService.ts`
2. **Community Post Oluşturma** - `components/sheets/CreatePostSheet.tsx`
3. **Tur Fotoğrafı (Admin)** - `lib/tourService.ts` → `takePhoto()`
4. **Scan Özelliği** - `app/(tabs)/scan.tsx` → Tarihi yer tanıma

---

## Implementation Planı

### Adım 1: Purpose String'leri Güncelle

#### Önerilen Metinler (Apple Guidelines Uyumlu)

```
NSCameraUsageDescription:
"Cyprigo uses your camera to take photos for your profile picture, share travel moments in the community feed, and scan historical landmarks to learn about them. For example, you can photograph a castle you're visiting and share it with other travelers."

NSPhotoLibraryUsageDescription:
"Cyprigo accesses your photo library so you can select existing photos for your profile picture or share travel photos in the community feed. For example, you can choose a vacation photo to post in the community."

NSLocationWhenInUseUsageDescription:
"Cyprigo uses your location to show nearby tours and attractions on the map, and to provide turn-by-turn navigation to destinations. For example, we'll show you historical sites within walking distance."

NSLocationAlwaysAndWhenInUseUsageDescription:
"Cyprigo uses your location to show nearby tours and provide navigation directions even when the app is in the background."

NSMicrophoneUsageDescription:
"Cyprigo may access your microphone if you record video content to share in the community feed."

NSFaceIDUsageDescription:
"Cyprigo uses Face ID to securely and quickly sign you into your account without entering your password."
```

### Adım 2: Dosya Değişiklikleri

#### A) `ios/Cyprigo/Info.plist` Güncellemesi

```xml
<key>NSCameraUsageDescription</key>
<string>Cyprigo uses your camera to take photos for your profile picture, share travel moments in the community feed, and scan historical landmarks to learn about them. For example, you can photograph a castle you're visiting and share it with other travelers.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Cyprigo accesses your photo library so you can select existing photos for your profile picture or share travel photos in the community feed. For example, you can choose a vacation photo to post in the community.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Cyprigo uses your location to show nearby tours and attractions on the map, and to provide turn-by-turn navigation to destinations. For example, we'll show you historical sites within walking distance.</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Cyprigo uses your location to show nearby tours and provide navigation directions even when the app is in the background.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Cyprigo uses your location to show nearby tours and provide navigation directions even when the app is in the background.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Cyprigo may access your microphone if you record video content to share in the community feed.</string>

<key>NSFaceIDUsageDescription</key>
<string>Cyprigo uses Face ID to securely and quickly sign you into your account without entering your password.</string>
```

#### B) `app.json` Güncellemesi (Tutarlılık için)

```json
"infoPlist": {
  "UIBackgroundModes": ["remote-notification"],
  "ITSAppUsesNonExemptEncryption": false,
  "NSCameraUsageDescription": "Cyprigo uses your camera to take photos for your profile picture, share travel moments in the community feed, and scan historical landmarks to learn about them. For example, you can photograph a castle you're visiting and share it with other travelers.",
  "NSPhotoLibraryUsageDescription": "Cyprigo accesses your photo library so you can select existing photos for your profile picture or share travel photos in the community feed. For example, you can choose a vacation photo to post in the community.",
  "NSLocationWhenInUseUsageDescription": "Cyprigo uses your location to show nearby tours and attractions on the map, and to provide turn-by-turn navigation to destinations. For example, we'll show you historical sites within walking distance.",
  "NSLocationAlwaysAndWhenInUseUsageDescription": "Cyprigo uses your location to show nearby tours and provide navigation directions even when the app is in the background.",
  "NSFaceIDUsageDescription": "Cyprigo uses Face ID to securely and quickly sign you into your account without entering your password."
}
```

### Adım 3: Rebuild & Test

1. `npx expo prebuild --clean` çalıştır (Info.plist yeniden oluşturulur)
2. iOS Simulator'da izin dialog'larını kontrol et
3. Yeni build oluştur ve App Store'a gönder

---

## Checklist

- [ ] `ios/Cyprigo/Info.plist` içindeki tüm purpose string'leri güncelle
- [ ] `app.json` içindeki `infoPlist` bölümünü güncelle
- [ ] `npx expo prebuild --clean` çalıştır
- [ ] iOS Simulator'da izin popup'larını test et
- [ ] Yeni iOS build oluştur
- [ ] App Store Connect'e yükle

---

## Tahmini Süre

- Kod değişiklikleri: **15 dakika**
- Build & Test: **30 dakika**
- **Toplam: ~45 dakika**

---

## Risk Değerlendirmesi

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Expo prebuild sorunu | Düşük | Clean prebuild genelde sorunsuz çalışır |
| String uzunluğu | Düşük | Apple uzun string'leri kabul eder, önemli olan içerik |
| Diğer purpose string'ler | Orta | Kamera dışındaki string'ler de ileride reject sebebi olabilir, hepsini düzeltmek mantıklı |

---

## Notlar

- Apple "specific example" istiyor → Her string'de "For example, ..." cümlesi ekledik
- `$(PRODUCT_NAME)` placeholder'ları kaldırıldı → Gerçek uygulama adı kullanıldı
- Tüm string'ler İngilizce (App Store primary language)
