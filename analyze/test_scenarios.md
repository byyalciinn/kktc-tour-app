# Mobil Uygulama Test Senaryoları

## 📋 Genel Bakış

Bu döküman, Cyprigo mobil uygulaması için kapsamlı test senaryolarını içermektedir. Her senaryo için test adımları, beklenen sonuçlar ve öncelik seviyeleri belirtilmiştir.

---

# 🔐 1. KİMLİK DOĞRULAMA TESTLERİ

## 1.1 Giriş Yap (Login)

### TC-AUTH-001: Başarılı Giriş
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |
| **Ön Koşul** | Kayıtlı hesap mevcut |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Auth ekranını aç | Giriş/Kayıt seçenekleri görünür |
| 2 | "Giriş Yap" butonuna tıkla | Bottom sheet açılır |
| 3 | Geçerli e-posta gir | Input kabul eder |
| 4 | Geçerli şifre gir | Input kabul eder |
| 5 | "Giriş Yap" butonuna tıkla | Yükleme animasyonu başlar |
| 6 | - | Ana sayfa açılır |

---

### TC-AUTH-002: Yanlış Şifre ile Giriş
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |
| **Ön Koşul** | Kayıtlı hesap mevcut |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Geçerli e-posta gir | - |
| 2 | Yanlış şifre gir | - |
| 3 | "Giriş Yap" butonuna tıkla | Hata popup'ı görünür |
| 4 | - | "E-posta veya şifre hatalı" mesajı |

---

### TC-AUTH-003: Kayıtlı Olmayan E-posta
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Kayıtlı olmayan e-posta gir | - |
| 2 | Herhangi bir şifre gir | - |
| 3 | "Giriş Yap" butonuna tıkla | Hata mesajı görünür |

---

### TC-AUTH-004: Boş Alan Validasyonu
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | E-posta alanını boş bırak | - |
| 2 | "Giriş Yap" butonuna tıkla | "E-posta gerekli" uyarısı |
| 3 | E-posta gir, şifreyi boş bırak | - |
| 4 | "Giriş Yap" butonuna tıkla | "Şifre gerekli" uyarısı |

---

### TC-AUTH-005: Geçersiz E-posta Formatı
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | "test@" gir | - |
| 2 | "Giriş Yap" tıkla | "Geçersiz e-posta" uyarısı |
| 3 | "test.com" gir | - |
| 4 | "Giriş Yap" tıkla | "Geçersiz e-posta" uyarısı |

---

## 1.2 Kayıt Ol (Register)

### TC-AUTH-006: Başarılı Kayıt
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | "Kayıt Ol" butonuna tıkla | Kayıt sheet açılır |
| 2 | Ad soyad gir | Input kabul eder |
| 3 | Yeni e-posta gir | Input kabul eder |
| 4 | Güçlü şifre gir (8+ kar, büyük/küçük/rakam) | Input kabul eder |
| 5 | "Kayıt Ol" tıkla | Yükleme başlar |
| 6 | - | Onboarding ekranına yönlendirilir |

---

### TC-AUTH-007: Zayıf Şifre Kontrolü
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Test Case | Şifre | Beklenen Hata |
|-----------|-------|---------------|
| 7a | "1234567" | "Şifre en az 8 karakter olmalı" |
| 7b | "abcdefgh" | "Şifrede en az 1 büyük harf olmalı" |
| 7c | "ABCDEFGH" | "Şifrede en az 1 küçük harf olmalı" |
| 7d | "Abcdefgh" | "Şifrede en az 1 rakam olmalı" |

---

### TC-AUTH-008: Mevcut E-posta ile Kayıt
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Zaten kayıtlı e-posta gir | - |
| 2 | "Kayıt Ol" tıkla | "Bu e-posta zaten kullanılıyor" |

---

## 1.3 Şifre Sıfırlama

### TC-AUTH-009: Şifre Sıfırlama Akışı
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | "Şifremi Unuttum" tıkla | Şifre sıfırlama sheet açılır |
| 2 | Kayıtlı e-posta gir | - |
| 3 | "Gönder" tıkla | Kod giriş ekranı açılır |
| 4 | E-postadan gelen 6 haneli kodu gir | - |
| 5 | Yeni şifre gir | - |
| 6 | Şifreyi onayla | Başarı mesajı, giriş ekranına yönlendir |

---

## 1.4 İki Faktörlü Doğrulama (2FA)

### TC-AUTH-010: 2FA ile Giriş
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |
| **Ön Koşul** | 2FA etkin hesap |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | E-posta ve şifre ile giriş yap | 2FA doğrulama ekranı açılır |
| 2 | E-postadan gelen kodu gir | - |
| 3 | "Doğrula" tıkla | Ana sayfaya yönlendirilir |

---

### TC-AUTH-011: Yanlış 2FA Kodu
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Yanlış 6 haneli kod gir | "Kod hatalı" mesajı |
| 2 | 3 kez yanlış gir | "Çok fazla deneme" + kilitleme |

---

# 🗺️ 2. HARİTA (EXPLORE) TESTLERİ

### TC-MAP-001: Harita Yükleme
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Explore tab'ına tıkla | Harita yüklenir |
| 2 | - | Tur pinleri görünür |
| 3 | - | Bottom sheet görünür |

---

### TC-MAP-002: Pin Tıklama
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Haritada bir pin'e tıkla | Preview card görünür |
| 2 | Preview'a tıkla | TourDetailSheet açılır |
| 3 | X butonuna tıkla | Preview kapanır |

---

### TC-MAP-003: Konum İzni
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |
| **Ön Koşul** | Konum izni verilmemiş |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Konum butonuna tıkla | İzin popup'ı görünür |
| 2 | İzin ver | Harita kullanıcı konumuna gider |
| 3 | İzin verme | Varsayılan konum (Girne) gösterilir |

---

### TC-MAP-004: Harita Kontrolleri
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Zoom in (+) | Harita yakınlaşır |
| 2 | Zoom out (-) | Harita uzaklaşır |
| 3 | Konum butonu | Kullanıcı konumuna git |
| 4 | Pusula | Kuzey yönüne döndür |

---

# 📷 3. TARAMA (SCAN) TESTLERİ

### TC-SCAN-001: Kamera Tarama
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |
| **Ön Koşul** | Kamera izni verilmiş |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Scan tab'ına tıkla | Kamera açılır |
| 2 | Bir tarihi esere odaklan | Çerçeve görünür |
| 3 | Çekim butonuna tıkla | Analiz ekranı açılır |
| 4 | - | AI analiz animasyonu |
| 5 | - | Sonuç ekranına yönlendir |

---

### TC-SCAN-002: Galeriden Seçim
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Galeri ikonuna tıkla | Galeri açılır |
| 2 | Bir resim seç | Resim yüklenir |
| 3 | - | Analiz başlar |

---

### TC-SCAN-003: Ücretsiz Kullanıcı Limiti
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |
| **Ön Koşul** | Normal üyelik, 5 tarama yapılmış |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Tarama yapmayı dene | Paywall sheet açılır |
| 2 | - | Premium üyelik seçenekleri gösterilir |

---

# 💬 4. TOPLULUK (COMMUNITY) TESTLERİ

### TC-COM-001: Post Oluşturma
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Community tab'ına git | Post listesi görünür |
| 2 | + butonuna tıkla | CreatePostSheet açılır |
| 3 | Post tipi seç (Fotoğraf/Yorum/Öneri) | Seçim vurgulanır |
| 4 | Resim ekle | Resim önizlemesi görünür |
| 5 | Açıklama yaz | - |
| 6 | "Paylaş" tıkla | Yükleme animasyonu |
| 7 | - | Post listede görünür |

---

### TC-COM-002: Post Beğeni
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Bir post'un kalp ikonuna tıkla | İkon dolar (kırmızı) |
| 2 | Tekrar tıkla | İkon boşalır |

---

### TC-COM-003: Post Raporla
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Post'a uzun bas | Aksiyon menüsü açılır |
| 2 | "Raporla" seç | Rapor sebepleri listesi |
| 3 | Bir sebep seç | "Rapor gönderildi" mesajı |

---

# ❤️ 5. FAVORİLER TESTLERİ

### TC-FAV-001: Favorilere Ekle
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | TourDetailSheet aç | - |
| 2 | Kalp ikonuna tıkla | İkon dolar |
| 3 | Favorites tab'ına git | Tur listede görünür |

---

### TC-FAV-002: Favorilerden Kaldır
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Favorites'te bir kartı sola kaydır | Silme butonu görünür |
| 2 | "Sil" tıkla | Tur listeden kaldırılır |

---

# ⚙️ 6. AYARLAR TESTLERİ

### TC-SET-001: Dil Değiştirme
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Ayarlar > Dil | Dil seçenekleri görünür |
| 2 | "English" seç | Uygulama İngilizce'ye döner |
| 3 | "Türkçe" seç | Uygulama Türkçe'ye döner |

---

### TC-SET-002: Tema Değiştirme
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Ayarlar > Görünüm | - |
| 2 | "Karanlık Mod" toggle | UI karanlık temaya döner |
| 3 | Toggle kapatma | UI aydınlık temaya döner |

---

### TC-SET-003: 2FA Etkinleştirme
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Ayarlar > Güvenlik | - |
| 2 | "İki Faktörlü Doğrulama" toggle | Onay dialog'u |
| 3 | "Etkinleştir" onayla | E-postaya kod gönderilir |
| 4 | Kodu gir | "2FA etkinleştirildi" mesajı |

---

### TC-SET-004: Hesap Silme
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Ayarlar > Hesap Sil | Uyarı dialog'u |
| 2 | "Bu işlem geri alınamaz" oku | - |
| 3 | "Hesabı Sil" onayla | Biyometrik doğrulama |
| 4 | Biyometrik onayla | "Hesap silindi", auth ekranına yönlendir |

---

### TC-SET-005: Çıkış Yap
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Ayarlar > Çıkış Yap | Onay dialog'u |
| 2 | "Çıkış Yap" onayla | Auth ekranına yönlendir |

---

# 📱 7. SHEET BİLEŞENLERİ TESTLERİ

### TC-SHEET-001: Sheet Kapatma (Swipe)
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Herhangi bir sheet aç | Sheet görünür |
| 2 | Handle'dan aşağı kaydır | Sheet kapanır |
| 3 | Backdrop'a tıkla | Sheet kapanır |

---

### TC-SHEET-002: Sheet Scroll
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | TourDetailSheet aç (uzun içerik) | - |
| 2 | İçeriği yukarı kaydır | Scroll çalışır, sheet kapanmaz |
| 3 | En üstteyken aşağı kaydır | Sheet kapanır |

---

# 🔔 8. BİLDİRİM TESTLERİ

### TC-NOTIF-001: Bildirim Okuma
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Bildirim ikonuna tıkla | NotificationSheet açılır |
| 2 | Okunmamış bildirimi gör | Mavi nokta görünür |
| 3 | Bildirime tıkla | İlgili içeriğe git, mavi nokta kaybolur |

---

# 📊 9. PERFORMANS TESTLERİ

### TC-PERF-001: Cold Start
| Alan | Değer |
|------|-------|
| **Öncelik** | 🔴 Kritik |

| Metrik | Kabul Kriteri |
|--------|--------------|
| Uygulama açılış süresi | < 3 saniye |
| Splash screen süresi | < 2 saniye |

---

### TC-PERF-002: Scroll Performansı
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Metrik | Kabul Kriteri |
|--------|--------------|
| Liste scroll FPS | > 55 fps |
| Harita pan FPS | > 50 fps |
| Frame drop | < 5% |

---

# ♿ 10. ERİŞİLEBİLİRLİK TESTLERİ

### TC-A11Y-001: VoiceOver Navigasyonu
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |
| **Platform** | iOS |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | VoiceOver'ı etkinleştir | - |
| 2 | Tab bar'da gezin | Her tab okunur |
| 3 | Butonlara fokuslan | Label ve role okunur |
| 4 | Sheet aç | Focus trap çalışır |

---

### TC-A11Y-002: Büyütülmüş Metin
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | Sistem font boyutunu artır | - |
| 2 | Uygulamayı aç | Metinler okunabilir |
| 3 | - | Layout bozulmaz |

---

# 🌐 11. AĞ TESTLERİ

### TC-NET-001: Çevrimdışı Modu
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟡 Orta |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | İnternet bağlantısını kes | - |
| 2 | Uygulama işlemi dene | Uygun hata mesajı |
| 3 | Bağlantıyı geri getir | İşlem retry edilebilir |

---

### TC-NET-002: Yavaş Bağlantı
| Alan | Değer |
|------|-------|
| **Öncelik** | 🟢 Düşük |

| Adım | Aksiyon | Beklenen Sonuç |
|------|---------|---------------|
| 1 | 3G simülasyonu yap | - |
| 2 | Resimler yükle | Placeholder/skeleton görünür |
| 3 | - | Timeout'ta uygun mesaj |

---

# 📈 TEST ÖNCELİK ÖZETİ

| Öncelik | Test Sayısı | Açıklama |
|---------|-------------|----------|
| 🔴 Kritik | 14 | Her release'de çalıştırılmalı |
| 🟡 Orta | 16 | Haftalık regression |
| 🟢 Düşük | 8 | Aylık veya major release |

---

*Toplam: 38 Test Senaryosu*
*Son güncelleme: 2024-12-10*
