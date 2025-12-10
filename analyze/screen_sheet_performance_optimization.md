# Ekran ve Sheet Performans Optimizasyonu Analizi

## 📊 Genel Bakış

Bu döküman, mobil uygulamadaki tüm ekran ve sheet yapılarının performans açısından analizini içermektedir.

---

## 🗂️ Uygulama Yapısı Özeti

| Kategori | Dosya Sayısı | Toplam Satır (Tahmini) |
|----------|--------------|------------------------|
| Tab Ekranları | 7 | ~4,500 |
| Profile Ekranları | 14 | ~3,800 |
| Admin Ekranları | 7 | ~2,100 |
| Sheet Bileşenleri | 8 | ~2,800 |
| Auth Ekranı | 2 | ~2,800 |

---

## 🔴 Yüksek Öncelikli Performans Sorunları

### 1. `explore.tsx` - Harita Ekranı (1618 satır)

**Sorunlar:**
| Sorun | Etki | Öneri |
|-------|------|-------|
| Tek dosyada çok fazla kod | Karmaşıklık, bakım zorluğu | Alt bileşenlere ayır |
| PanResponder + Map + BottomSheet bir arada | Gesture çakışmaları | Sheet için `react-native-bottom-sheet` kullan |
| Her pin için ayrı `Marker` render | Bellek kullanımı | Cluster kütüphanesi kullan |
| `useMemo` yetersiz kullanımı | Gereksiz re-render | Memoization artır |

**Önerilen Refactoring:**
```
explore.tsx (1618 satır)
├── components/map/MapView.tsx
├── components/map/TourMarkers.tsx
├── components/map/MapControls.tsx
├── components/map/TourPreviewCard.tsx
└── components/sheets/ExploreBottomSheet.tsx
```

---

### 2. Sheet Bileşenlerindeki Ortak Sorunlar

| Sheet | Satır | Sorun | Çözüm |
|-------|-------|-------|-------|
| `TourDetailSheet.tsx` | 719 | Manuel PanResponder | `react-native-bottom-sheet` geçişi |
| `CreatePostSheet.tsx` | 725 | Image resize ana thread'de | `expo-image-manipulator` ile optimize |
| `PostDetailSheet.tsx` | ~700 | FlatList içinde ScrollView | Tek liste yapısına geç |
| `RouteDetailSheet.tsx` | ~800 | Harita + Sheet çakışması | Priority gesture management |

---

### 3. Animasyon Performansı

**Mevcut Durum:**
- `Animated.Value` kullanımı (JS thread)
- `useNativeDriver: false` bazı animasyonlarda

**Öneriler:**
```javascript
// ❌ Yavaş
useNativeDriver: false

// ✅ Hızlı  
useNativeDriver: true

// ✅ En iyi (Reanimated 2)
import Animated from 'react-native-reanimated';
```

---

## 🟡 Orta Öncelikli Optimizasyonlar

### 4. Resim Yükleme ve Önbellekleme

**Mevcut:** `CachedImage` bileşeni kullanılıyor ✅

**İyileştirmeler:**
| Öneri | Fayda |
|-------|-------|
| Progressive JPEG kullanımı | Algılanan hız artışı |
| BlurHash placeholder | Daha iyi UX |
| WebP format desteği | %30 küçük dosya boyutu |
| Prefetch critical images | Anında görüntüleme |

---

### 5. Liste Optimizasyonları

**FlatList Ayarları:**
```javascript
// Önerilen konfigürasyon
<FlatList
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  windowSize={5}
  initialNumToRender={8}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

**Etkilenen Ekranlar:**
- `community.tsx` - Post listesi
- `favorites.tsx` - Favori turlar
- Sheet içi listeler

---

### 6. Bundle Boyutu ve Lazy Loading

**Şu An:**
- Tüm ekranlar başlangıçta yükleniyor
- Admin ekranları gereksiz yere bundle'da

**Öneri:**
```javascript
// Admin ekranları için lazy loading
const AdminScreen = React.lazy(() => import('./admin/index'));

// Route-based code splitting
export const unstable_settings = {
  initialRouteName: '(tabs)',
};
```

---

## 🟢 Düşük Öncelikli İyileştirmeler

### 7. State Yönetimi

**Mevcut:** Zustand ✅ (iyi seçim)

**İyileştirmeler:**
```javascript
// Selector kullanımını artır
const tours = useTourStore((state) => state.tours);
// yerine
const tours = useTourStore(useShallow((state) => state.tours));
```

---

### 8. Render Optimizasyonu

**`React.memo` Kullanılması Gereken Bileşenler:**
- `TourCard`
- `PostCard`
- `CategoryItem`
- `MapControlButton` ✅ (zaten var)
- `TourListItem` ✅ (zaten var)

---

## 📱 Ekran Bazlı Performans Tablosu

| Ekran | Karmaşıklık | Re-render Riski | Bellek | Öncelik |
|-------|-------------|-----------------|--------|---------|
| `explore.tsx` | 🔴 Çok Yüksek | 🔴 Yüksek | 🔴 Yüksek | P0 |
| `scan.tsx` | 🟡 Orta | 🟢 Düşük | 🟡 Orta | P1 |
| `community.tsx` | 🟡 Orta | 🟡 Orta | 🟡 Orta | P2 |
| `index.tsx` (Home) | 🟢 Düşük | 🟢 Düşük | 🟢 Düşük | P3 |
| `favorites.tsx` | 🟢 Düşük | 🟢 Düşük | 🟢 Düşük | P3 |

---

## 📦 Önerilen Kütüphane Değişiklikleri

| Mevcut | Önerilen | Fayda |
|--------|----------|-------|
| Manuel PanResponder sheet | `@gorhom/bottom-sheet` | Performans, stabilite |
| Animated API | `react-native-reanimated` | 60fps animasyonlar |
| Düz Image | `expo-image` (yeni) | Daha iyi caching |
| react-native-maps | + `react-native-map-clustering` | Pin performansı |

---

## 🛠️ Uygulama Öncelik Sırası

### Faz 1 (Kritik - 1 hafta)
1. [ ] `explore.tsx` refactoring
2. [ ] Sheet'leri `@gorhom/bottom-sheet`'e geçir
3. [ ] `useNativeDriver: true` zorla

### Faz 2 (Önemli - 2 hafta)
4. [ ] FlatList optimizasyonları
5. [ ] Image lazy loading
6. [ ] `React.memo` yaygınlaştır

### Faz 3 (İyileştirme - 2 hafta)
7. [ ] Admin ekranları lazy load
8. [ ] Reanimated 2 geçişi
9. [ ] Bundle analizi ve tree shaking

---

## 📈 Beklenen İyileşmeler

| Metrik | Mevcut (Tahmini) | Hedef |
|--------|------------------|-------|
| İlk açılış | ~3-4 sn | < 2 sn |
| Sheet açılma | ~200-300ms | < 100ms |
| Harita smooth scroll | 45-50 fps | 60 fps |
| Bellek kullanımı | ~200MB | < 150MB |
| Bundle boyutu | ~8MB | < 6MB |

---

## 🔧 Debugging Araçları

```bash
# React Native Performance Monitor
npx react-native start --reset-cache

# Flipper ile profiling
# Perf Monitor -> React DevTools

# Bundle analizi
npx react-native-bundle-visualizer
```

---

*Son güncelleme: 2024-12-10*
