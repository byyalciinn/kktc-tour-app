# Auth Ekranı Popup Mesajları Uygulama Planı

## 📋 Genel Bakış

Bu döküman, `app/(auth)/index.tsx` dosyasındaki **Giriş Yap** ve **Kayıt Ol** ekranlarına kullanıcı dostu popup/toast mesajları eklenmesini planlamaktadır.

---

## 🔍 Mevcut Durum Analizi

### Şu An Kullanılan Hata Gösterimi
- `Alert.alert()` - Native sistem dialog'u (kaba, kullanıcı deneyimi zayıf)
- `useUIStore.getState().showToast()` - Sadece başarı mesajlarında kullanılıyor

### Mevcut Validasyon Fonksiyonları
| Fonksiyon | Satır | Açıklama |
|-----------|-------|----------|
| `validateEmail()` | 51-59 | E-posta format kontrolü |
| `validatePassword()` | 68-85 | Şifre güç kontrolü (min 8 karakter, büyük/küçük harf, rakam) |
| `validateName()` | 90-98 | İsim uzunluk kontrolü |

---

## 🎯 Hata Senaryoları ve Popup Mesajları

### 1. Giriş Yap (Login) Ekranı

| Hata Senaryosu | Supabase Hata Kodu | Önerilen Mesaj (TR) | Önerilen Mesaj (EN) | Popup Tipi |
|----------------|-------------------|---------------------|---------------------|------------|
| E-posta boş | Client-side | "Lütfen e-posta adresinizi girin" | "Please enter your email" | ⚠️ Warning |
| Geçersiz e-posta formatı | Client-side | "Geçerli bir e-posta adresi girin" | "Enter a valid email address" | ⚠️ Warning |
| Şifre boş | Client-side | "Lütfen şifrenizi girin" | "Please enter your password" | ⚠️ Warning |
| E-posta kayıtlı değil | `user_not_found` | "Bu e-posta adresi ile kayıtlı hesap bulunamadı" | "No account found with this email" | ❌ Error |
| Yanlış şifre | `invalid_credentials` | "E-posta veya şifre hatalı" | "Invalid email or password" | ❌ Error |
| Çok fazla deneme | `too_many_requests` | "Çok fazla deneme yaptınız. Lütfen biraz bekleyin" | "Too many attempts. Please wait" | ⏳ Warning |
| Hesap onaylanmamış | `email_not_confirmed` | "E-posta adresinizi onaylayın" | "Please confirm your email" | ℹ️ Info |
| Sunucu hatası | `server_error` | "Bir hata oluştu. Tekrar deneyin" | "An error occurred. Try again" | ❌ Error |
| Ağ bağlantısı yok | `network_error` | "İnternet bağlantınızı kontrol edin" | "Check your internet connection" | ⚠️ Warning |

---

### 2. Kayıt Ol (Register) Ekranı

| Hata Senaryosu | Supabase Hata Kodu | Önerilen Mesaj (TR) | Önerilen Mesaj (EN) | Popup Tipi |
|----------------|-------------------|---------------------|---------------------|------------|
| İsim boş | Client-side | "Lütfen adınızı girin" | "Please enter your name" | ⚠️ Warning |
| İsim çok kısa | Client-side | "İsim en az 2 karakter olmalı" | "Name must be at least 2 characters" | ⚠️ Warning |
| E-posta boş | Client-side | "Lütfen e-posta adresinizi girin" | "Please enter your email" | ⚠️ Warning |
| Geçersiz e-posta formatı | Client-side | "Geçerli bir e-posta adresi girin" | "Enter a valid email address" | ⚠️ Warning |
| Şifre boş | Client-side | "Lütfen şifrenizi girin" | "Please enter your password" | ⚠️ Warning |
| Şifre çok kısa | Client-side | "Şifre en az 8 karakter olmalı" | "Password must be at least 8 characters" | ⚠️ Warning |
| Şifrede büyük harf yok | Client-side | "Şifrede en az 1 büyük harf olmalı" | "Password needs at least 1 uppercase letter" | ⚠️ Warning |
| Şifrede küçük harf yok | Client-side | "Şifrede en az 1 küçük harf olmalı" | "Password needs at least 1 lowercase letter" | ⚠️ Warning |
| Şifrede rakam yok | Client-side | "Şifrede en az 1 rakam olmalı" | "Password needs at least 1 number" | ⚠️ Warning |
| E-posta zaten kayıtlı | `user_already_exists` | "Bu e-posta adresi zaten kullanılıyor" | "This email is already registered" | ❌ Error |
| Geçersiz e-posta domain | `invalid_email` | "Bu e-posta adresi kullanılamaz" | "This email cannot be used" | ❌ Error |
| Sunucu hatası | `database_error` | "Kayıt oluşturulamadı. Tekrar deneyin" | "Registration failed. Try again" | ❌ Error |

---

### 3. Şifremi Unuttum Ekranı

| Hata Senaryosu | Supabase Hata Kodu | Önerilen Mesaj (TR) | Önerilen Mesaj (EN) | Popup Tipi |
|----------------|-------------------|---------------------|---------------------|------------|
| E-posta boş | Client-side | "Lütfen e-posta adresinizi girin" | "Please enter your email" | ⚠️ Warning |
| Geçersiz e-posta formatı | Client-side | "Geçerli bir e-posta adresi girin" | "Enter a valid email address" | ⚠️ Warning |
| E-posta bulunamadı | `user_not_found` | "Bu e-posta ile kayıtlı hesap yok" | "No account with this email" | ❌ Error |
| Sıfırlama maili gönderildi | Success | "Şifre sıfırlama bağlantısı gönderildi ✉️" | "Password reset link sent ✉️" | ✅ Success |

---

## 🎨 Popup/Toast Tasarım Önerileri

### Tip Bazlı Renk ve İkon Şeması

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ SUCCESS (Yeşil)                                          │
│    Background: #10B981 (green-500)                          │
│    Icon: checkmark-circle                                   │
│    Örnek: "Kayıt başarılı!"                                 │
├─────────────────────────────────────────────────────────────┤
│ ❌ ERROR (Kırmızı)                                          │
│    Background: #EF4444 (red-500)                            │
│    Icon: close-circle                                       │
│    Örnek: "E-posta veya şifre hatalı"                       │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ WARNING (Turuncu/Sarı)                                   │
│    Background: #F59E0B (amber-500)                          │
│    Icon: warning                                            │
│    Örnek: "Şifre çok kısa"                                  │
├─────────────────────────────────────────────────────────────┤
│ ℹ️ INFO (Mavi)                                              │
│    Background: #3B82F6 (blue-500)                           │
│    Icon: information-circle                                 │
│    Örnek: "E-postanızı onaylayın"                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Değiştirilecek Dosyalar

### 1. Dil Dosyaları (i18n)
- `locales/tr.json` - Türkçe mesajlar eklenmeli
- `locales/en.json` - İngilizce mesajlar eklenmeli

```json
{
  "auth": {
    "errors": {
      "userNotFound": "Bu e-posta adresi ile kayıtlı hesap bulunamadı",
      "invalidCredentials": "E-posta veya şifre hatalı",
      "tooManyRequests": "Çok fazla deneme. Lütfen biraz bekleyin",
      "emailNotConfirmed": "E-posta adresinizi onaylayın",
      "userAlreadyExists": "Bu e-posta adresi zaten kullanılıyor",
      "networkError": "İnternet bağlantınızı kontrol edin",
      "serverError": "Bir hata oluştu. Tekrar deneyin"
    }
  }
}
```

### 2. Auth Ekranı
- `app/(auth)/index.tsx` - `Alert.alert()` → `showToast()` dönüşümü

**Değiştirilecek Satırlar:**
- Satır 503: Login email validation Alert → Toast
- Satır 509: Login password validation Alert → Toast
- Satır 527: Login error Alert → Toast (hata tipine göre farklılaştırılmalı)
- Satır 586-601: Register validation Alerts → Toasts
- Satır 609: Register error Alert → Toast
- Satır 638: Forgot password validation Alert → Toast
- Satır 654: Forgot password error Alert → Toast

### 3. Error Handler (Opsiyonel iyileştirme)
- `lib/errorHandler.ts` - Supabase hata kodlarını Türkçe/İngilizce mesajlara çeviren fonksiyon

---

## 🔧 Uygulama Adımları

### Adım 1: Toast Bileşenini Geliştir
Mevcut `showToast()` fonksiyonuna `type` parametresi ekle:
- `success` (yeşil)
- `error` (kırmızı)
- `warning` (turuncu)
- `info` (mavi)

### Adım 2: Dil Dosyalarını Güncelle
Tüm hata mesajlarını `tr.json` ve `en.json` içine ekle.

### Adım 3: Error Handler'ı Güncelle
Supabase hata kodlarını kullanıcı dostu mesajlara çeviren helper fonksiyon oluştur:

```typescript
const getAuthErrorMessage = (error: AuthError, t: TFunction): string => {
  const errorCode = error.message.toLowerCase();
  
  if (errorCode.includes('invalid_credentials') || errorCode.includes('invalid login')) {
    return t('auth.errors.invalidCredentials');
  }
  if (errorCode.includes('user_not_found')) {
    return t('auth.errors.userNotFound');
  }
  // ... diğer durumlar
  
  return t('auth.errors.serverError');
};
```

### Adım 4: Auth Ekranını Güncelle
`Alert.alert()` → `showToast()` dönüşümü yap.

---

## 📊 Öncelik Sıralaması

| Öncelik | İş | Etki |
|---------|------|------|
| 🔴 Yüksek | Login hata mesajlarını Toast'a çevir | Kullanıcı deneyimi iyileşir |
| 🔴 Yüksek | Register hata mesajlarını Toast'a çevir | Kullanıcı deneyimi iyileşir |
| 🟡 Orta | Forgot Password mesajlarını Toast'a çevir | Tutarlılık sağlanır |
| 🟢 Düşük | Toast bileşenine animasyon ekle | Görsel iyileştirme |

---

## ⏱️ Tahmini Süre

| Görev | Süre |
|-------|------|
| Dil dosyalarını güncelleme | 15 dk |
| Error handler güncelleme | 20 dk |
| Auth ekranı Toast dönüşümü | 30 dk |
| Test ve doğrulama | 15 dk |
| **Toplam** | **~1.5 saat** |

---

## ✅ Beklenen Sonuç

Değişiklikler tamamlandığında:
1. ✅ Tüm auth hataları artık modern Toast mesajlarıyla gösterilecek
2. ✅ Hata mesajları Türkçe ve İngilizce destekleyecek
3. ✅ Farklı hata türleri için farklı renkler kullanılacak
4. ✅ Kullanıcı deneyimi önemli ölçüde iyileşecek
5. ✅ Native Alert dialog'ları kaldırılacak
