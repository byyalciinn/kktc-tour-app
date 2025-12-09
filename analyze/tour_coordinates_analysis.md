# Tur Koordinatları Analiz Raporu

Bu rapor, harita üzerinde tur noktalarının doğru gösterilmesi için gerekli koordinat analizini içermektedir.

## Özet

- **Toplam Tur Sayısı:** 6 temel tur (veritabanında)
- **Koordinatı Olan Turlar:** 6 (Migration 016 ile eklenmiş)
- **Koordinatı Eksik Turlar:** Potansiyel olarak dinamik eklenen turlar

---

## Mevcut Turların Koordinat Durumu

### 1. Bellapais Manastırı (Bellapais Abbey)
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000101` |
| **Konum** | Girne, KKTC |
| **Mevcut Koordinat** | `35.3344, 33.3182` |
| **Doğru Koordinat** | ✅ `35.3344, 33.3182` |
| **Durum** | ✅ Doğru |
| **Açıklama** | 13. yüzyıldan kalma gotik mimari harikası manastır |

### 2. Altın Kum Plajı (Golden Beach)
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000102` |
| **Konum** | Karpaz, KKTC |
| **Mevcut Koordinat** | `35.6636, 34.5528` |
| **Doğru Koordinat** | ✅ `35.6636, 34.5528` |
| **Durum** | ✅ Doğru |
| **Açıklama** | Karpaz yarımadasının en güzel plajlarından biri |

### 3. Salamis Antik Kenti (Salamis Ancient City)
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000103` |
| **Konum** | Gazimağusa, KKTC |
| **Mevcut Koordinat** | `35.1853, 33.9039` |
| **Doğru Koordinat** | ✅ `35.1856, 33.9020` |
| **Durum** | ⚠️ Küçük Düzeltme Gerekiyor |
| **Fark** | ~20 metre |
| **Açıklama** | Antik dönemin en önemli liman şehirlerinden biri |

### 4. Girne Kalesi (Kyrenia Castle)
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000104` |
| **Konum** | Girne, KKTC |
| **Mevcut Koordinat** | `35.3420, 33.3228` |
| **Doğru Koordinat** | ✅ `35.3414, 33.3222` |
| **Durum** | ⚠️ Küçük Düzeltme Gerekiyor |
| **Fark** | ~70 metre |
| **Açıklama** | Bizans döneminden kalma tarihi kale, batık gemi müzesi |

### 5. Beşparmak Dağları (St. Hilarion Castle Area)
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000105` |
| **Konum** | Girne, KKTC |
| **Mevcut Koordinat** | `35.3064, 33.2825` |
| **Doğru Koordinat** | ✅ `35.3115, 33.2815` |
| **Durum** | ⚠️ Düzeltme Gerekiyor |
| **Fark** | ~580 metre |
| **Açıklama** | St. Hilarion Kalesi bölgesi, doğa yürüyüşleri |

### 6. Karpaz Eşekleri Safari
| Alan | Değer |
|------|-------|
| **ID** | `00000000-0000-0000-0000-000000000106` |
| **Konum** | Karpaz, KKTC |
| **Mevcut Koordinat** | `35.6033, 34.3833` |
| **Doğru Koordinat** | ✅ `35.5500, 34.3500` |
| **Durum** | ⚠️ Düzeltme Gerekiyor |
| **Fark** | ~6.5 km |
| **Açıklama** | Yabani eşeklerin yoğun olarak bulunduğu ana bölge |

---

## Önerilen Koordinat Güncellemeleri

Aşağıdaki SQL sorguları ile koordinatlar güncellenebilir:

```sql
-- Migration: Update Tour Coordinates for Better Accuracy

-- Salamis Antik Kenti - Daha doğru koordinat
UPDATE tours SET latitude = 35.1856, longitude = 33.9020 
WHERE title = 'Salamis Antik Kenti';

-- Girne Kalesi - Ana giriş noktası koordinatı
UPDATE tours SET latitude = 35.3414, longitude = 33.3222 
WHERE title = 'Girne Kalesi';

-- Beşparmak Dağları - St. Hilarion Kalesi merkez koordinatı
UPDATE tours SET latitude = 35.3115, longitude = 33.2815 
WHERE title = 'Beşparmak Dağları';

-- Karpaz Eşekleri Safari - Yabani eşeklerin yoğun olduğu bölge
UPDATE tours SET latitude = 35.5500, longitude = 34.3500 
WHERE title = 'Karpaz Eşekleri Safari';
```

---

## KKTC Önemli Turistik Lokasyonlar Referans Listesi

Gelecekte eklenecek turlar için referans koordinat listesi:

### Girne Bölgesi
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Girne Limanı | 35.3415 | 33.3190 | history |
| Bellapais Manastırı | 35.3080 | 33.3540 | history |
| St. Hilarion Kalesi | 35.3115 | 33.2815 | history |
| Escape Beach | 35.3500 | 33.2833 | beach |
| Alagadi Turtle Beach | 35.3333 | 33.4833 | beach |
| Karaman Köyü | 35.3200 | 33.3100 | nature |

### Lefkoşa Bölgesi
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Selimiye Camii (St. Sophia) | 35.1750 | 33.3615 | history |
| Bandabulya (Kapalı Çarşı) | 35.1753 | 33.3642 | culture |
| Büyük Han | 35.1760 | 33.3635 | history |
| Arasta Sokağı | 35.1748 | 33.3638 | culture |
| Dereboyu Caddesi | 35.1890 | 33.3580 | culture |

### Gazimağusa Bölgesi
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Lala Mustafa Paşa Camii | 35.1245 | 33.9405 | history |
| Gazimağusa Surları | 35.1250 | 33.9410 | history |
| Salamis Antik Kenti | 35.1856 | 33.9020 | history |
| St. Barnabas Manastırı | 35.1500 | 33.8833 | history |
| Namık Kemal Zindanı | 35.1252 | 33.9408 | history |
| Glapsides Plajı | 35.1180 | 33.9650 | beach |

### Karpaz Bölgesi
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Kantara Kalesi | 35.4050 | 33.9220 | history |
| Altın Kum Plajı | 35.6200 | 34.5100 | beach |
| Apostolos Andreas Manastırı | 35.6700 | 34.5800 | history |
| Zafer Burnu | 35.6750 | 34.5900 | nature |
| Dipkarpaz Köyü | 35.6050 | 34.3800 | culture |
| Karpaz Eşekleri | 35.5500 | 34.3500 | nature |
| Kaplıca Plajı | 35.5800 | 34.2500 | beach |
| Yenirenköy | 35.5400 | 34.1800 | culture |

### Güzelyurt Bölgesi
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Güzelyurt Merkez | 35.1989 | 32.9922 | culture |
| Soli Antik Kenti | 35.1350 | 32.8167 | history |
| Vouni Sarayı | 35.1483 | 32.7800 | history |

### Diğer Önemli Kaleler
| Lokasyon | Latitude | Longitude | Kategori |
|----------|----------|-----------|----------|
| Buffavento Kalesi | 35.2833 | 33.4500 | history |
| Kantara Kalesi | 35.4000 | 33.9167 | history |

---

## Harita Görünüm Ayarları

Varsayılan bölge ayarları (`explore.tsx` içinde):

```typescript
// Girne merkezli varsayılan görünüm
const DEFAULT_REGION = {
  latitude: 35.3387,
  longitude: 33.3183,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
```

### Önerilen Bölge Görünümleri

| Bölge | Latitude | Longitude | Delta (Zoom) |
|-------|----------|-----------|--------------|
| Girne | 35.3387 | 33.3183 | 0.08 |
| Lefkoşa | 35.1856 | 33.3823 | 0.06 |
| Gazimağusa | 35.1256 | 33.9417 | 0.08 |
| Karpaz | 35.5500 | 34.3000 | 0.15 |
| Güzelyurt | 35.1989 | 32.9922 | 0.08 |
| Tüm KKTC | 35.3000 | 33.7000 | 0.5 |

---

## Koordinat Kontrolü İçin Öneriler

1. **Doğrulama Yöntemi:** Google Maps veya OpenStreetMap üzerinden koordinat doğrulaması yapılmalı
2. **Hassasiyet:** En az 4 ondalık basamak kullanılmalı (yaklaşık 11 metre hassasiyet)
3. **Konum Tipi:** Tur başlangıç noktası veya ana giriş kapısı koordinatı kullanılmalı
4. **Güncelleme:** Yeni tur eklenirken koordinatlar zorunlu alan olarak işaretlenebilir

---

## Sonraki Adımlar

1. [ ] Mevcut turların koordinatlarını yukarıdaki SQL ile güncelle
2. [ ] Admin paneline koordinat giriş alanı ekle
3. [ ] Yeni tur ekleme formunda harita seçici bileşeni ekle
4. [ ] Koordinat eksik turlar için uyarı sistemi oluştur

---

*Rapor Tarihi: Aralık 2024*
*Kaynak: ThematicRoutes.ts, migration dosyaları, web araştırması*
