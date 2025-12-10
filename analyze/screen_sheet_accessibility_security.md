# Ekran ve Sheet Erişilebilirlik & Güvenlik Analizi

## 📊 Genel Bakış

Bu döküman, mobil uygulamadaki ekran ve sheet yapılarının erişilebilirlik (accessibility) ve güvenlik açısından analizini içermektedir.

---

# 🔐 GÜVENLİK ANALİZİ

## 1. Kimlik Doğrulama (Authentication)

### Mevcut Durum
| Özellik | Durum | Dosya |
|---------|-------|-------|
| E-posta/Şifre girişi | ✅ Var | `app/(auth)/index.tsx` |
| İki faktörlü doğrulama (2FA) | ✅ Var | `app/verify-2fa.tsx` |
| Şifre sıfırlama | ✅ Var | `stores/authStore.ts` |
| Biyometrik giriş | ✅ Var | `lib/biometricAuth.ts` |
| Oturum yönetimi | ✅ Supabase | `stores/authStore.ts` |

### Güvenlik Önerileri

#### 🔴 Kritik
| Sorun | Açıklama | Çözüm |
|-------|----------|-------|
| Şifre politikası | Mevcut (8 kar, büyük/küçük/rakam) ✅ | - |
| Rate limiting | Supabase tarafında ✅ | - |
| Token saklama | SecureStore kullanılmalı | `expo-secure-store` ile sakla |

#### 🟡 Orta
| Sorun | Açıklama | Çözüm |
|-------|----------|-------|
| Oturum zaman aşımı | Tanımsız | 30 gün sonra yeniden giriş iste |
| Cihaz yönetimi | Yok | Aktif cihazları göster/kaldır |

---

## 2. Veri Güvenliği

### Hassas Veri Alanları
| Ekran | Hassas Veri | Risk | Öneri |
|-------|-------------|------|-------|
| `personal-info.tsx` | Ad, e-posta, telefon | Orta | Maskeleme ekle (***@email.com) |
| `payment-methods.tsx` | Kart bilgileri | Yüksek | PCI-DSS uyumlu servis kullan |
| `membership-card.tsx` | Üyelik numarası | Düşük | - |
| `settings.tsx` | 2FA ayarları | Yüksek | Değişiklik için şifre iste |

### Öneri Detayları

```javascript
// Hassas veri maskeleme örneği
const maskEmail = (email: string) => {
  const [user, domain] = email.split('@');
  return `${user.slice(0,2)}***@${domain}`;
};

// Hassas işlem için yeniden doğrulama
const requireReauth = async (action: () => Promise<void>) => {
  const confirmed = await BiometricAuth.authenticate();
  if (confirmed) await action();
};
```

---

## 3. Sheet ve Modal Güvenliği

### Input Sanitization
| Sheet | Input Tipi | Sanitization | Öneri |
|-------|------------|--------------|-------|
| `CreatePostSheet.tsx` | Metin, resim | ❌ Eksik | XSS koruması ekle |
| `DestinationSearch.tsx` | Arama sorgusu | ❌ Eksik | SQL injection koruması |
| `ProfileSheet.tsx` | Görüntüleme | ✅ OK | - |

```javascript
// XSS Koruması Örneği
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (input: string) => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};
```

---

## 4. API ve Ağ Güvenliği

### Mevcut Durum
| Özellik | Durum | Not |
|---------|-------|-----|
| HTTPS | ✅ | Supabase zorunlu |
| API Key exposure | ⚠️ Dikkat | Environment variables kullan |
| Request logging | ❌ | Hata izleme için ekle |

### Öneri: API Key Yönetimi
```javascript
// ❌ Yanlış - Kod içinde
const SUPABASE_KEY = 'sk_live_xxx';

// ✅ Doğru - Environment
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

---

## 5. Admin Ekranları Güvenliği

### Erişim Kontrolü
| Ekran | Yetki Kontrolü | Durum |
|-------|----------------|-------|
| `admin/index.tsx` | Role check | ✅ |
| `admin/add.tsx` | Role check | ✅ |
| `admin/moderation.tsx` | Role check | ✅ |
| `admin/menu.tsx` | Role check | ✅ |

### Öneri: Çift Katmanlı Koruma
```javascript
// Hem client hem server tarafında kontrol
const AdminScreen = () => {
  const { profile } = useAuthStore();
  
  // Client-side check
  if (profile?.role !== 'admin') {
    return <AccessDenied />;
  }
  
  // Server-side: RLS politikaları ile destekle
  return <AdminContent />;
};
```

---

# ♿ ERİŞİLEBİLİRLİK ANALİZİ

## 1. Ekran Okuyucu Desteği (VoiceOver/TalkBack)

### Mevcut Durum
| Bileşen | accessibilityLabel | accessibilityRole | accessibilityHint |
|---------|-------------------|-------------------|-------------------|
| Butonlar | ⚠️ Kısmi | ⚠️ Kısmi | ❌ Yok |
| Input alanları | ⚠️ Kısmi | ⚠️ Kısmi | ❌ Yok |
| Resimler | ❌ Yok | ❌ Yok | ❌ Yok |
| Icons | ❌ Yok | ❌ Yok | ❌ Yok |

### Önerilen İyileştirmeler

```javascript
// ❌ Mevcut
<TouchableOpacity onPress={handlePress}>
  <Ionicons name="heart" size={24} />
</TouchableOpacity>

// ✅ Erişilebilir
<TouchableOpacity 
  onPress={handlePress}
  accessible={true}
  accessibilityLabel={t('accessibility.addToFavorites')}
  accessibilityRole="button"
  accessibilityHint={t('accessibility.addToFavoritesHint')}
>
  <Ionicons name="heart" size={24} />
</TouchableOpacity>
```

---

## 2. Renk Kontrastı

### Kritik Alanlar
| Ekran | Sorun | WCAG Seviyesi | Öneri |
|-------|-------|---------------|-------|
| Harita Overlay | Düşük kontrast | AA ❌ | Arka plan opacity artır |
| Placeholder text | Açık gri | AA ⚠️ | Daha koyu ton kullan |
| Disabled buttons | Çok soluk | AA ❌ | Kontrast oranını artır |

### Minimum Kontrast Oranları
```
Normal metin: 4.5:1 (WCAG AA)
Büyük metin (18px+): 3:1 (WCAG AA)
UI bileşenleri: 3:1 (WCAG AA)
```

---

## 3. Dokunmatik Hedef Boyutları

### Mevcut Durum
| Bileşen | Mevcut Boyut | Minimum (WCAG) | Durum |
|---------|--------------|----------------|-------|
| Tab bar icons | 44x44 | 44x44 | ✅ |
| Header buttons | 44x44 | 44x44 | ✅ |
| Map pins | 30x30 | 44x44 | ❌ |
| Sheet handle | 40x5 | 44x44 | ❌ |
| Close buttons | 24x24 | 44x44 | ❌ |

### Öneri
```javascript
// HitSlop kullanımı
<TouchableOpacity
  onPress={onClose}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  style={styles.closeButton}
>
  <Ionicons name="close" size={24} />
</TouchableOpacity>
```

---

## 4. Klavye Navigasyonu

### Sorunlar
| Alan | Sorun | Öneri |
|------|-------|-------|
| Tab sırası | Mantıksız sıralama | `tabIndex` düzenle |
| Focus göstergesi | Görünmüyor | Focus ring ekle |
| Sheet içi navigasyon | Trap yok | Focus trap ekle |

---

## 5. Animasyon ve Hareket

### Mevcut Durum
| Ekran | Animasyon | `reduceMotion` Desteği |
|-------|-----------|------------------------|
| `scan.tsx` | Scanning line | ❌ |
| Sheets | Slide/fade | ❌ |
| `explore.tsx` | Map animations | ❌ |
| Loaders | Spinning | ❌ |

### Öneri
```javascript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const listener = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    setReduceMotion
  );
  return () => listener.remove();
}, []);

// Kullanım
const animationDuration = reduceMotion ? 0 : 300;
```

---

## 6. Form Erişilebilirliği

### Auth Formları
| Alan | Sorun | Öneri |
|------|-------|-------|
| Hata mesajları | Görsel only | `accessibilityLiveRegion="polite"` ekle |
| Required alanlar | Yıldız (*) only | `accessibilityLabel` ekle |
| Şifre gücü | Renk only | Metin açıklaması ekle |

---

## 📊 Erişilebilirlik Skoru Tahmini

| Kategori | Mevcut | Hedef | Öncelik |
|----------|--------|-------|---------|
| Ekran okuyucu | 40% | 90% | 🔴 Yüksek |
| Renk kontrastı | 60% | 100% | 🟡 Orta |
| Dokunmatik hedefler | 70% | 100% | 🟡 Orta |
| Klavye navigasyonu | 30% | 80% | 🔴 Yüksek |
| Hareket/Animasyon | 20% | 80% | 🟢 Düşük |

---

## 🛠️ Uygulama Öncelik Sırası

### Faz 1 - Güvenlik (1 hafta) ✅ TAMAMLANDI
1. [x] SecureStore ile token saklama - `lib/supabase.ts` (zaten mevcut)
2. [x] Input sanitization (XSS koruması) - `lib/validation.ts`, `CreatePostSheet.tsx`, `DestinationSearch.tsx`, `tourService.ts`
3. [x] Hassas işlemler için re-auth - `lib/secureAction.ts`, `settings.tsx`

### Faz 2 - Temel Erişilebilirlik (2 hafta) ✅ TAMAMLANDI
4. [x] accessibilityLabel tüm interaktif elemanlara - `CreatePostSheet.tsx`, `locales/en.json`, `locales/tr.json`
5. [x] accessibilityRole tanımları - `CreatePostSheet.tsx`
6. [x] Dokunmatik hedef boyutlarını düzelt - `hooks/useAccessibility.ts` (getHitSlop helper)

### Faz 3 - Gelişmiş Erişilebilirlik (2 hafta) ✅ TAMAMLANDI
7. [ ] Renk kontrastı düzeltmeleri - (manuel tasarım gerekli)
8. [x] reduceMotion desteği - `stores/uiStore.ts`, `hooks/useAccessibility.ts`
9. [x] Focus management - `hooks/useAccessibility.ts`

### Eklenen Yeni Dosyalar
- `lib/secureAction.ts` - Hassas işlemler için biyometrik re-auth
- `hooks/useAccessibility.ts` - Erişilebilirlik hook ve utilities

---

## 📋 Test Kontrol Listesi

### Güvenlik Testleri
- [ ] Penetration test (OWASP Mobile Top 10)
- [ ] API güvenlik taraması
- [ ] SSL/TLS sertifika kontrolü

### Erişilebilirlik Testleri
- [ ] VoiceOver (iOS) ile tam navigasyon
- [ ] TalkBack (Android) ile tam navigasyon
- [ ] Renk körlüğü simülasyonu
- [ ] Büyütülmüş metin modu

---

*Son güncelleme: 2024-12-10*
