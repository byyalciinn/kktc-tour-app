# Uygulama Adı Güncelleme Analizi

> **Hedef:** Tüm eski uygulama adı referansları "Cyprigo" olarak güncellenecek

## Mevcut İsimler

| Eski İsim | Kullanım Yeri | Yeni İsim |
|-----------|---------------|-----------|
| KKTC Gezi | Uygulama görünen adı | Cyprigo |
| kktc-gezi | Slug ve URL'ler | cyprigo |
| com.kktc.gezi | Bundle/Package ID | com.cyprigo.app |
| tour-app | Package name ve scheme | cyprigo |
| KKTC Tour App | Açıklama metinleri | Cyprigo |
| KKTC Tour | Badge metinleri | Cyprigo |
| KKTCGezi | iOS proje adı | Cyprigo |

---

## Değiştirilmesi Gereken Dosyalar

### 1. Konfigürasyon Dosyaları

#### app.json
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 3 | `"name": "KKTC Gezi"` | `"name": "Cyprigo"` |
| 4 | `"slug": "kktc-gezi"` | `"slug": "cyprigo"` |
| 10 | `"scheme": "tour-app"` | `"scheme": "cyprigo"` |
| 18 | `"bundleIdentifier": "com.kktc.gezi"` | `"bundleIdentifier": "com.cyprigo.app"` |
| 28 | `"package": "com.kktc.gezi"` | `"package": "com.cyprigo.app"` |

#### package.json
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 2 | `"name": "tour-app"` | `"name": "cyprigo"` |
| 4 | `"description": "KKTC Tour App - Discover tours in North Cyprus"` | `"description": "Cyprigo - Discover tours in North Cyprus"` |

---

### 2. Lokalizasyon Dosyaları

#### locales/en.json
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 183 | `"discoveredWith": "Discovered with KKTC Tour App"` | `"discoveredWith": "Discovered with Cyprigo"` |

#### locales/tr.json
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 183 | `"discoveredWith": "KKTC Tour App ile keşfedildi"` | `"discoveredWith": "Cyprigo ile keşfedildi"` |

---

### 3. Uygulama Kaynak Kodları

#### app/onboarding.tsx
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 101 | `KKTC Tour` | `Cyprigo` |

#### app/(tabs)/_layout.tsx
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 11 | `// KKTC Tour App - Primary color: #F03A52` | `// Cyprigo - Primary color: #F03A52` |

#### constants/Colors.ts
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 2 | `* KKTC Tour App Color Palette` | `* Cyprigo Color Palette` |

---

### 4. Veritabanı ve Dokümantasyon

#### supabase/migrations/001_initial_schema.sql
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 2 | `-- KKTC Tour App - Supabase Database Schema` | `-- Cyprigo - Supabase Database Schema` |

#### README.md
| Satır | Mevcut Değer | Yeni Değer |
|-------|--------------|------------|
| 39 | `cd tour-app` | `cd cyprigo` |
| 61 | `tour-app/` | `cyprigo/` |

---

### 5. iOS Proje Dosyaları

> ⚠️ iOS klasörleri `.gitignore` ile korunduğu için otomatik arama yapılamadı. Manuel kontrol gerekli.

Aşağıdaki dosya ve klasör adlarının değiştirilmesi gerekiyor:
- `ios/KKTCGezi/` → `ios/Cyprigo/`
- `ios/KKTCGezi.xcodeproj/` → `ios/Cyprigo.xcodeproj/`
- `ios/KKTCGezi.xcworkspace/` → `ios/Cyprigo.xcworkspace/`
- Xcode proje içindeki tüm `KKTCGezi` referansları

---

## Otomatik Oluşturulan Dosyalar

> ℹ️ Bu dosyalar yeniden oluşturulabilir, doğrudan düzenleme önerilmez.

#### package-lock.json
- Satır 2: `"name": "tour-app"` → `"name": "cyprigo"`
- Satır 8: `"name": "tour-app"` → `"name": "cyprigo"`
- **Öneri:** `package.json` güncellendikten sonra `npm install` ile otomatik güncellenecek

---

## Özet Tablo

| Kategori | Dosya Sayısı | Değişiklik Sayısı |
|----------|--------------|-------------------|
| Konfigürasyon | 2 | 7 |
| Lokalizasyon | 2 | 2 |
| Kaynak Kod | 3 | 3 |
| DB/Dokümantasyon | 2 | 3 |
| iOS Proje | 3+ | Çoklu |
| **Toplam** | **12+** | **15+** |
