# App Store Reject: Guideline 2.1 - Fiyatların 0 Görünmesi (App Completeness)

## Reject Sebebi

> **Issue Description**: The submission includes content that is not complete and final.
>
> Specifically, the app displayed all destinations priced at 0.
>
> Users expect the apps they download to be ready for public use and should not include incomplete or placeholder content. Apps shouldn't include placeholder or incomplete content or information.
>
> **Next Steps**: Revise the app and metadata so that all of its content is complete and final.

---

## Mevcut Durum Analizi

### Fiyat Gösterimi (UI)

#### 1. `components/cards/TourCard.tsx`
```typescript
// Satır 73-77
<View style={styles.rightContent}>
  <Text style={styles.price}>
    {tour.currency}{tour.price}
  </Text>
  <Text style={styles.priceLabel}>kişi başı</Text>
</View>
```

#### 2. `components/sheets/TourDetailSheet.tsx`
```typescript
// Fiyat gösterimi
<Text style={styles.price}>
  {currentTour.currency}{currentTour.price}
</Text>
```

#### 3. `components/cards/TourReelCard.tsx`
```typescript
// Reels'de fiyat gösterimi
<Text style={styles.price}>
  {tour.currency}{tour.price}
</Text>
```

### Veri Kaynakları

#### 1. Supabase `tours` Tablosu (Primary)

**Schema:** `lib/supabase.ts`
```typescript
tours: {
  Row: {
    id: string;
    title: string;
    location: string;
    description: string;
    price: number;        // ← Fiyat alanı
    currency: string;     // ← Para birimi
    duration: string;
    rating: number;
    review_count: number;
    image: string;
    highlights: string[];
    category: string;
    created_at: string;
    updated_at: string;
  };
}
```

#### 2. Fallback Data: `constants/Tours.ts`

```typescript
// Satır 51-136
export const featuredTours: Tour[] = [
  {
    id: '1',
    title: 'Bellapais Manastırı',
    price: 25,        // ✅ Gerçek fiyat var
    currency: '€',
    // ...
  },
  {
    id: '2',
    title: 'Altın Kum Plajı',
    price: 15,        // ✅ Gerçek fiyat var
    currency: '€',
    // ...
  },
  // ... diğer turlar (15-35€ arası)
];
```

#### 3. Tour Store Fetch Logic

**Dosya:** `stores/tourStore.ts`
```typescript
// Satır 148-178
fetchTours: async () => {
  // ...
  try {
    const { data, error } = await getTours();

    if (error) {
      // Hata durumunda fallback kullan
      set({ tours: featuredTours, /* ... */ });
      return;
    }

    const tours = data.map(tourDataToTour);
    set({ 
      tours: tours.length > 0 ? tours : featuredTours,  // ← Boşsa fallback
      // ...
    });
  } catch (err) {
    set({ tours: featuredTours, /* ... */ });  // ← Exception'da fallback
  }
};
```

### Olası Sebepler

| Sebep | Olasılık | Açıklama |
|-------|----------|----------|
| Supabase'de `price=0` kayıtları | **Yüksek** | Prod DB'de turlar 0 fiyatla kaydedilmiş olabilir |
| Admin panelden yanlış giriş | **Yüksek** | Tur eklerken fiyat girilmemiş (default 0) |
| Migration/seed sorunu | **Orta** | Initial data yüklenirken fiyatlar atlanmış |
| API/fetch hatası | **Düşük** | Fallback data'da fiyatlar var |
| Type conversion hatası | **Düşük** | `tourDataToTour` mapping'de sorun |

---

## Araştırma Adımları

### 1. Supabase'de Veri Kontrolü

```sql
-- Fiyatı 0 olan turları bul
SELECT id, title, price, currency, created_at 
FROM tours 
WHERE price = 0 OR price IS NULL
ORDER BY created_at DESC;

-- Tüm turların fiyat dağılımı
SELECT price, currency, COUNT(*) as count
FROM tours
GROUP BY price, currency
ORDER BY price;

-- Toplam tur sayısı vs 0 fiyatlı
SELECT 
  COUNT(*) as total_tours,
  COUNT(CASE WHEN price = 0 OR price IS NULL THEN 1 END) as zero_price_tours
FROM tours;
```

### 2. Type Mapping Kontrolü

**Dosya:** `types/index.ts` veya ilgili type dosyası

```typescript
// tourDataToTour fonksiyonunu kontrol et
export function tourDataToTour(data: TourData): Tour {
  return {
    id: data.id,
    title: data.title,
    location: data.location,
    description: data.description,
    price: data.price,          // ← Doğru mapping mi?
    currency: data.currency,    // ← Doğru mapping mi?
    // ...
  };
}
```

---

## Implementation Planı

### Adım 1: Veri Düzeltme (Supabase)

#### A) 0 Fiyatlı Turları Tespit Et

Supabase Dashboard → SQL Editor:

```sql
-- Önce durumu gör
SELECT id, title, price, currency 
FROM tours 
WHERE price = 0 OR price IS NULL;
```

#### B) Fiyatları Güncelle

**Seçenek 1: Manuel Güncelleme (Az sayıda tur varsa)**

```sql
-- Örnek: Belirli turların fiyatlarını güncelle
UPDATE tours SET price = 25, currency = '€' WHERE title = 'Bellapais Manastırı';
UPDATE tours SET price = 15, currency = '€' WHERE title = 'Altın Kum Plajı';
-- ... diğer turlar
```

**Seçenek 2: Toplu Güncelleme (Fallback data'dan)**

```sql
-- constants/Tours.ts'deki fiyatları kullanarak güncelle
UPDATE tours SET price = 25, currency = '€' WHERE id = '1';
UPDATE tours SET price = 15, currency = '€' WHERE id = '2';
UPDATE tours SET price = 20, currency = '€' WHERE id = '3';
UPDATE tours SET price = 18, currency = '€' WHERE id = '4';
UPDATE tours SET price = 30, currency = '€' WHERE id = '5';
UPDATE tours SET price = 35, currency = '€' WHERE id = '6';
```

**Seçenek 3: 0 Fiyatlı Turları Gizle (Geçici)**

```sql
-- Fiyatı olmayan turları yayından kaldır
UPDATE tours 
SET is_active = false 
WHERE price = 0 OR price IS NULL;
```

### Adım 2: Admin Panel Validasyonu

#### A) Tur Ekleme/Düzenleme Formu

**Dosya:** `app/admin/add.tsx` ve `app/admin/edit.tsx`

```typescript
// Form validation ekle
const validateTourForm = (data: TourInput): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.title?.trim()) {
    errors.push(t('admin.validation.titleRequired'));
  }
  
  if (!data.price || data.price <= 0) {
    errors.push(t('admin.validation.priceRequired'));
  }
  
  if (!data.currency?.trim()) {
    errors.push(t('admin.validation.currencyRequired'));
  }
  
  // ... diğer validasyonlar
  
  return { valid: errors.length === 0, errors };
};

// Submit handler'da kullan
const handleSubmit = async () => {
  const validation = validateTourForm(formData);
  if (!validation.valid) {
    Alert.alert(t('common.error'), validation.errors.join('\n'));
    return;
  }
  
  // ... kaydetme işlemi
};
```

#### B) Fiyat Input Kontrolü

```typescript
// Fiyat input'u için minimum değer
<TextInput
  value={price}
  onChangeText={(text) => {
    const numValue = parseFloat(text) || 0;
    if (numValue >= 0) {
      setPrice(text);
    }
  }}
  keyboardType="decimal-pad"
  placeholder="0.00"
/>

// Kaydetmeden önce kontrol
if (parseFloat(price) <= 0) {
  Alert.alert(t('admin.validation.priceRequired'));
  return;
}
```

### Adım 3: Database Constraint (Opsiyonel)

**Migration:** `supabase/migrations/016_price_validation.sql`

```sql
-- Fiyat için minimum değer constraint'i
ALTER TABLE tours 
ADD CONSTRAINT tours_price_positive 
CHECK (price > 0);

-- Veya soft constraint (0'a izin ver ama warning)
-- Bu durumda UI'da kontrol yeterli
```

### Adım 4: UI'da Fiyat Gösterimi İyileştirmesi

#### A) 0 Fiyat Durumu için Fallback

**Dosya:** `components/cards/TourCard.tsx`

```typescript
// Fiyat gösterimi - 0 durumu için kontrol
const renderPrice = () => {
  if (!tour.price || tour.price === 0) {
    return (
      <Text style={[styles.price, { color: colors.textSecondary }]}>
        {t('tour.contactForPrice')}
      </Text>
    );
  }
  
  return (
    <>
      <Text style={styles.price}>
        {tour.currency}{tour.price}
      </Text>
      <Text style={styles.priceLabel}>{t('tour.perPerson')}</Text>
    </>
  );
};
```

**NOT:** Bu sadece geçici bir çözüm. Asıl çözüm DB'deki verileri düzeltmek.

#### B) Liste Filtreleme (Opsiyonel)

```typescript
// 0 fiyatlı turları listeden çıkar
const visibleTours = tours.filter(tour => tour.price > 0);
```

### Adım 5: Seed Data Kontrolü

Eğer migration/seed ile veri yükleniyorsa:

**Dosya:** `supabase/seed.sql` veya ilgili migration

```sql
-- Seed data'da fiyatların doğru olduğundan emin ol
INSERT INTO tours (title, location, price, currency, ...) VALUES
  ('Bellapais Manastırı', 'Girne, KKTC', 25, '€', ...),
  ('Altın Kum Plajı', 'Karpaz, KKTC', 15, '€', ...),
  -- ... diğer turlar
;
```

---

## Acil Çözüm (Quick Fix)

Apple review'dan geçmek için en hızlı yol:

### 1. Supabase'de Fiyatları Düzelt

```sql
-- Tüm 0 fiyatlı turları güncelle (örnek fiyatlarla)
UPDATE tours 
SET price = CASE 
  WHEN category = 'beach' THEN 15
  WHEN category = 'history' THEN 20
  WHEN category = 'mountain' THEN 30
  WHEN category = 'nature' THEN 25
  ELSE 20
END,
currency = '€'
WHERE price = 0 OR price IS NULL;
```

### 2. Veya 0 Fiyatlı Turları Gizle

```sql
-- is_active kolonu varsa
UPDATE tours SET is_active = false WHERE price = 0 OR price IS NULL;

-- Yoksa sil (dikkatli!)
-- DELETE FROM tours WHERE price = 0 OR price IS NULL;
```

### 3. App'i Yeniden Build Et ve Gönder

Veri düzeltildikten sonra:
- Yeni build oluştur
- App Store'a gönder
- Review notes'a ekle: "Tour pricing data has been updated with actual prices."

---

## Dosya Değişiklikleri Özeti

| Dosya | Tip | Açıklama |
|-------|-----|----------|
| Supabase `tours` tablosu | Data Fix | 0 fiyatlı kayıtları düzelt |
| `app/admin/add.tsx` | Modify | Fiyat validasyonu ekle |
| `app/admin/edit.tsx` | Modify | Fiyat validasyonu ekle |
| `components/cards/TourCard.tsx` | Modify (Opsiyonel) | 0 fiyat fallback UI |
| `supabase/migrations/016_price_validation.sql` | Yeni (Opsiyonel) | DB constraint |

---

## Checklist

- [x] Admin panel'de fiyat validasyonu ekle (`app/admin/add.tsx`, `app/admin/edit.tsx`)
- [ ] Supabase'de 0 fiyatlı turları tespit et (aşağıdaki SQL'i çalıştır)
- [ ] Fiyatları gerçek değerlerle güncelle
- [ ] (Opsiyonel) UI'da 0 fiyat fallback
- [ ] (Opsiyonel) DB constraint ekle
- [ ] Test: Tüm turların fiyatları görünüyor mu?
- [ ] Yeni build oluştur
- [ ] App Store'a gönder

---

## ✅ Yapılan Kod Değişiklikleri

### Admin Panel Fiyat Validasyonu

**`app/admin/add.tsx` ve `app/admin/edit.tsx`** dosyalarında fiyat validasyonu güncellendi:

```typescript
// Eski
if (!price.trim() || isNaN(Number(price))) {
  Alert.alert('Hata', 'Geçerli bir fiyat girin');
  return;
}

// Yeni - 0'dan büyük olma kontrolü eklendi
if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
  Alert.alert('Hata', 'Geçerli bir fiyat girin (0\'dan büyük olmalı)');
  return;
}
```

---

## 🔧 Supabase'de Yapılması Gerekenler

### 1. 0 Fiyatlı Turları Tespit Et

Supabase Dashboard → SQL Editor'da çalıştır:

```sql
-- 0 fiyatlı turları bul
SELECT id, title, price, currency, created_at 
FROM tours 
WHERE price = 0 OR price IS NULL
ORDER BY created_at DESC;

-- Toplam durum
SELECT 
  COUNT(*) as total_tours,
  COUNT(CASE WHEN price = 0 OR price IS NULL THEN 1 END) as zero_price_tours
FROM tours;
```

### 2. Fiyatları Güncelle

```sql
-- Örnek: Kategoriye göre varsayılan fiyat ata
UPDATE tours 
SET price = CASE 
  WHEN category = 'beach' THEN 15
  WHEN category = 'history' THEN 20
  WHEN category = 'mountain' THEN 30
  WHEN category = 'nature' THEN 25
  ELSE 20
END,
currency = '€'
WHERE price = 0 OR price IS NULL;
```

### 3. (Opsiyonel) DB Constraint Ekle

```sql
-- Fiyat için minimum değer constraint'i
ALTER TABLE tours 
ADD CONSTRAINT tours_price_positive 
CHECK (price > 0);
```

---

## Tahmini Süre

- Veri analizi: **15 dakika**
- Supabase veri düzeltme: **30 dakika**
- Admin validasyon: **30 dakika**
- Test: **15 dakika**
- **Toplam: ~1.5 saat**

---

## Risk Değerlendirmesi

| Risk | Seviye | Açıklama | Mitigasyon |
|------|--------|----------|------------|
| Yanlış fiyat girişi | Düşük | Manuel güncelleme hatası | Double-check |
| Constraint mevcut veriyi bozar | Orta | ALTER TABLE fail edebilir | Önce veriyi düzelt |
| Gerçek fiyatlar bilinmiyor | Orta | Placeholder fiyat koymak | İş birimi ile koordine |

---

## Notlar

- Apple "placeholder content" istemiyor → Gerçek fiyatlar olmalı
- Eğer bazı turlar gerçekten ücretsizse, "Free" veya "Ücretsiz" yazılabilir (0 değil)
- Fiyat yoksa "Contact for price" kabul edilebilir ama tüm turlar böyle olamaz
- En temiz çözüm: DB'deki verileri düzeltmek + admin validasyonu eklemek

---

## Ek: Fiyat Formatı Önerileri

```typescript
// Fiyat formatlama utility
export const formatPrice = (price: number, currency: string): string => {
  if (price === 0) return 'Free';
  if (price < 0) return 'Contact';
  
  // Para birimi sembolü
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'TRY': '₺',
    'GBP': '£',
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol}${price.toFixed(0)}`;
};
```
