# App Store Reject: Guideline 5.1.1(v) - Login Zorunluluğu / Guest Mode

## Reject Sebebi

> **Issue Description**: The app requires users to register or log in to access features that are not account based.
>
> Specifically, the app requires users to register before accessing the app. Apps may not require users to enter personal information to function, except when directly relevant to the core functionality of the app or required by law.
>
> **Next Steps**: Revise the app to let users freely access the app's features that are not account based. The app may still require registration for other features that are account based.

---

## Mevcut Durum Analizi

### Kök Neden: `app/_layout.tsx`

```typescript
// app/_layout.tsx:135-154
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

// Intro görüldü, auth'a yönlendir  ← ❌ SORUN BURADA
if (!inAuthGroup) {
  console.log('[_layout] Intro seen, redirecting to auth');
  router.replace('/(auth)');
}
```

### Sorun Akışı

```
Uygulama Açılışı
    ↓
Intro görüldü mü?
    ↓ Evet
User var mı?
    ↓ Hayır
/(auth)'a zorla yönlendir  ← ❌ Apple bunu istemiyor
```

### Mevcut Tab Yapısı

| Tab | Dosya | Account-Based? | Guest Erişimi Olmalı mı? |
|-----|-------|----------------|--------------------------|
| Home | `app/(tabs)/index.tsx` | ❌ Hayır | ✅ Evet |
| Explore | `app/(tabs)/explore.tsx` | ❌ Hayır | ✅ Evet |
| Scan | `app/(tabs)/scan.tsx` | ❌ Hayır | ✅ Evet |
| Community | `app/(tabs)/community.tsx` | Kısmen (okuma: hayır, yazma: evet) | ✅ Evet (sadece okuma) |
| Favorites | `app/(tabs)/favorites.tsx` | ✅ Evet | ❌ Hayır (login prompt) |
| Profile | `app/(tabs)/profile.tsx` | ✅ Evet | ❌ Hayır (login prompt) |

### Account-Based Özellikler (Login Gerektirenler)

1. **Post oluşturma** - `CreatePostSheet.tsx`
2. **Like / Yorum yazma** - `PostDetailSheet.tsx`, `CommunityPostCard.tsx`
3. **Favorilere ekleme** - `TourDetailSheet.tsx`
4. **Profil yönetimi** - Tüm `/profile/*` ekranları
5. **Admin paneli** - `/admin/*` (zaten guard'lı)

---

## Implementation Planı

### Adım 1: Root Layout Değişikliği

#### `app/_layout.tsx` - Guest Mode Desteği

**Mevcut Kod (Satır 135-154):**
```typescript
// Intro görüldü, auth'a yönlendir
if (!inAuthGroup) {
  console.log('[_layout] Intro seen, redirecting to auth');
  router.replace('/(auth)');
}
```

**Yeni Kod:**
```typescript
// Intro görüldü → Guest olarak tabs'a yönlendir (login zorunlu DEĞİL)
// Kullanıcı isterse profile tab'ından veya account-based aksiyonlarda login yapabilir
if (inAuthGroup || inIntro) {
  // Auth veya intro'daysa, tabs'a yönlendir (guest mode)
  console.log('[_layout] Guest user, redirecting to tabs');
  router.replace('/(tabs)');
}
// Diğer durumlarda (zaten tabs'ta) → bir şey yapma
```

### Adım 2: Profile Tab - Guest State

#### `app/(tabs)/profile.tsx` - Login Prompt Ekle

**Değişiklik:**
```typescript
export default function ProfileScreen() {
  const { user, profile, signOut } = useAuthStore();
  const { t } = useTranslation();
  
  // Guest kullanıcı için login prompt göster
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.guestContainer}>
          <Ionicons name="person-circle-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            {t('profile.guestTitle')}
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            {t('profile.guestSubtitle')}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)')}
          >
            <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // ... mevcut kod devam eder
}
```

### Adım 3: Favorites Tab - Guest State

#### `app/(tabs)/favorites.tsx` - Login Prompt Ekle

**Değişiklik:**
```typescript
export default function FavoritesScreen() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  
  // Guest kullanıcı için login prompt göster
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.guestContainer}>
          <Ionicons name="heart-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            {t('favorites.guestTitle')}
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            {t('favorites.guestSubtitle')}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(auth)')}
          >
            <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // ... mevcut kod devam eder
}
```

### Adım 4: Community Tab - Guest Okuma İzni

#### `app/(tabs)/community.tsx` - FAB ve Aksiyon Kontrolü

Community tab'ında guest kullanıcılar:
- ✅ Post'ları okuyabilir
- ✅ Post detaylarını görebilir
- ❌ Post oluşturamaz (FAB gizle veya login prompt)
- ❌ Like yapamaz (login prompt)
- ❌ Yorum yazamaz (login prompt)

**Değişiklik:**
```typescript
// FAB'ı sadece login olmuş kullanıcılara göster
{user && (
  <AnimatedFab
    isOpen={isFabMenuOpen}
    onToggle={() => setIsFabMenuOpen(!isFabMenuOpen)}
    items={fabMenuItems}
    colors={colors}
    isDark={isDark}
  />
)}
```

**Like Handler Kontrolü (zaten var ama kontrol edelim):**
```typescript
const handleLikePress = useCallback(async (post: CommunityPost) => {
  if (!user) {
    // Login prompt göster
    Alert.alert(
      t('auth.loginRequired'),
      t('auth.loginRequiredForLike'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.signIn'), onPress: () => router.push('/(auth)') },
      ]
    );
    return;
  }
  await toggleLike(user.id, post.id);
}, [user, toggleLike, t]);
```

### Adım 5: Tour Detail Sheet - Favorite Kontrolü

#### `components/sheets/TourDetailSheet.tsx`

**Mevcut kod zaten kontrol yapıyor:**
```typescript
const handleToggleFavorite = async () => {
  if (!user) {
    Alert.alert('Giriş Gerekli', 'Favorilere eklemek için giriş yapmalısınız.');
    return;
  }
  // ...
};
```

**İyileştirme (i18n + navigation):**
```typescript
const handleToggleFavorite = async () => {
  if (!user) {
    Alert.alert(
      t('auth.loginRequired'),
      t('auth.loginRequiredForFavorite'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.signIn'), onPress: () => router.push('/(auth)') },
      ]
    );
    return;
  }
  // ...
};
```

### Adım 6: i18n Çevirileri Ekle

#### `locales/en.json`
```json
{
  "profile": {
    "guestTitle": "Sign in to your account",
    "guestSubtitle": "Create an account or sign in to manage your profile, view your bookings, and access exclusive features."
  },
  "favorites": {
    "guestTitle": "Save your favorites",
    "guestSubtitle": "Sign in to save tours and destinations you love. Your favorites will be synced across all your devices."
  },
  "auth": {
    "loginRequired": "Sign In Required",
    "loginRequiredForLike": "Please sign in to like posts and interact with the community.",
    "loginRequiredForFavorite": "Please sign in to save this tour to your favorites.",
    "loginRequiredForComment": "Please sign in to comment on posts."
  }
}
```

#### `locales/tr.json`
```json
{
  "profile": {
    "guestTitle": "Hesabınıza giriş yapın",
    "guestSubtitle": "Profilinizi yönetmek, rezervasyonlarınızı görüntülemek ve özel özelliklere erişmek için giriş yapın veya hesap oluşturun."
  },
  "favorites": {
    "guestTitle": "Favorilerinizi kaydedin",
    "guestSubtitle": "Beğendiğiniz turları ve destinasyonları kaydetmek için giriş yapın. Favorileriniz tüm cihazlarınızda senkronize edilir."
  },
  "auth": {
    "loginRequired": "Giriş Gerekli",
    "loginRequiredForLike": "Paylaşımları beğenmek ve toplulukla etkileşime geçmek için lütfen giriş yapın.",
    "loginRequiredForFavorite": "Bu turu favorilerinize kaydetmek için lütfen giriş yapın.",
    "loginRequiredForComment": "Yorum yapmak için lütfen giriş yapın."
  }
}
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik Tipi | Açıklama |
|-------|-----------------|----------|
| `app/_layout.tsx` | Modify | Guest mode navigation logic |
| `app/(tabs)/profile.tsx` | Modify | Guest state UI ekleme |
| `app/(tabs)/favorites.tsx` | Modify | Guest state UI ekleme |
| `app/(tabs)/community.tsx` | Modify | FAB visibility + like prompt |
| `components/sheets/TourDetailSheet.tsx` | Modify | Favorite prompt i18n |
| `components/sheets/PostDetailSheet.tsx` | Modify | Comment prompt kontrolü |
| `locales/en.json` | Modify | Guest mode çevirileri |
| `locales/tr.json` | Modify | Guest mode çevirileri |

---

## Akış Diyagramı (Yeni)

```
Uygulama Açılışı
    ↓
Intro görüldü mü?
    ├─ Hayır → /intro göster
    └─ Evet ↓
User var mı?
    ├─ Evet → /(tabs) (normal kullanım)
    └─ Hayır → /(tabs) (guest mode) ← ✅ YENİ
                    ↓
            Tab'lara erişim:
            • Home ✅
            • Explore ✅
            • Scan ✅
            • Community ✅ (okuma)
            • Favorites → Login Prompt
            • Profile → Login Prompt
```

---

## Checklist

- [ ] `app/_layout.tsx` - Guest mode navigation
- [ ] `app/(tabs)/profile.tsx` - Guest state UI
- [ ] `app/(tabs)/favorites.tsx` - Guest state UI
- [ ] `app/(tabs)/community.tsx` - FAB visibility kontrolü
- [ ] `components/sheets/TourDetailSheet.tsx` - Favorite prompt i18n
- [ ] `components/sheets/PostDetailSheet.tsx` - Comment prompt kontrolü
- [ ] `locales/en.json` - Çeviriler
- [ ] `locales/tr.json` - Çeviriler
- [ ] Test: Guest olarak tüm tab'lara erişim
- [ ] Test: Account-based aksiyonlarda login prompt
- [ ] Test: Login sonrası normal akış

---

## Tahmini Süre

- `_layout.tsx` değişikliği: **15 dakika**
- Profile/Favorites guest UI: **30 dakika**
- Community/TourDetail kontrolleri: **20 dakika**
- i18n çevirileri: **10 dakika**
- Test: **30 dakika**
- **Toplam: ~2 saat**

---

## Risk Değerlendirmesi

| Risk | Seviye | Açıklama | Mitigasyon |
|------|--------|----------|------------|
| Navigation loop | Orta | Guest mode'da yanlış redirect | Kapsamlı test |
| UX karmaşıklığı | Düşük | Kullanıcı ne zaman login gerektiğini anlamalı | Clear prompts |
| State yönetimi | Düşük | Guest → Login geçişinde state kaybı | AuthStore zaten handle ediyor |

---

## Notlar

- Apple'ın istediği: "Account-based olmayan feature'lara login olmadan erişim"
- Bizim yaklaşım: Home, Explore, Scan, Community (okuma) → Guest erişimi
- Profile, Favorites, Community (yazma) → Login gerekli
- Bu değişiklik Apple'ın 5.1.1(v) maddesini doğrudan adresler
