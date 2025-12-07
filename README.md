# Cyprigo - KKTC Tur Uygulaması

Kuzey Kıbrıs Türk Cumhuriyeti'ndeki turları keşfetmek, favorilere eklemek ve rezervasyon yapmak için geliştirilmiş modern bir mobil uygulama.

## Özellikler

- 🗺️ **Tur Keşfi**: Kategorilere göre turları keşfedin
- ❤️ **Favoriler**: Beğendiğiniz turları kaydedin
- 🔍 **Akıllı Arama**: Debounced sunucu tarafı arama
- 👤 **Kullanıcı Profili**: Üyelik bilgileri ve ayarlar
- 🌙 **Karanlık Mod**: Sistem temasına uyumlu
- 🌍 **Çoklu Dil**: Türkçe ve İngilizce desteği
- 📱 **Modern UI**: Skeleton loaders, toast bildirimleri

## Teknoloji Stack

- **Framework**: React Native + Expo (SDK 54)
- **Routing**: Expo Router v6
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: React Native StyleSheet
- **i18n**: i18next + expo-localization
- **Icons**: @expo/vector-icons (Ionicons)

## Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Expo CLI
- iOS Simulator veya Android Emulator (veya Expo Go)

### Adımlar

1. **Repo'yu klonlayın**
   ```bash
   git clone <repo-url>
   cd cyprigo
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Environment değişkenlerini ayarlayın**
   ```bash
   cp .env.example .env
   # .env dosyasını Supabase bilgilerinizle doldurun
   ```

4. **Uygulamayı başlatın**
   ```bash
   npm start
   ```

## Proje Yapısı

```
cyprigo/
├── app/                    # Expo Router sayfaları
│   ├── (auth)/            # Auth ekranları
│   ├── (tabs)/            # Tab navigasyonu
│   ├── admin/             # Admin paneli
│   └── profile/           # Profil sayfaları
├── components/            # React bileşenleri
│   ├── cards/            # Kart bileşenleri
│   ├── sheets/           # Modal/Sheet bileşenleri
│   └── ui/               # Temel UI bileşenleri
├── constants/            # Sabitler ve tema
├── hooks/                # Custom React hooks
├── lib/                  # Servisler ve utilities
├── locales/              # Çeviri dosyaları
├── stores/               # Zustand store'ları
├── supabase/             # Supabase migrations
└── types/                # TypeScript tipleri
```

## Supabase Kurulumu

### Veritabanı Tabloları

Aşağıdaki tabloları Supabase'de oluşturun:

```sql
-- Profiles tablosu
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  member_number TEXT UNIQUE,
  member_class TEXT DEFAULT 'Normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tours tablosu
CREATE TABLE tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  currency TEXT DEFAULT '€',
  duration TEXT,
  rating DECIMAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  image TEXT,
  highlights TEXT[],
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories tablosu
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Favorites tablosu
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tour_id UUID REFERENCES tours NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tour_id)
);
```

### Row Level Security (RLS) Politikaları

**ÖNEMLİ**: Aşağıdaki RLS politikalarını etkinleştirin:

```sql
-- Profiles için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tours için RLS (herkes okuyabilir)
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tours"
  ON tours FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admins can modify tours"
  ON tours FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND member_class = 'Business'
    )
  );

-- Categories için RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Favorites için RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
```

### Storage Bucket

```sql
-- image-bucket oluştur
INSERT INTO storage.buckets (id, name, public)
VALUES ('image-bucket', 'image-bucket', true);

-- Storage politikaları
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'image-bucket');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'image-bucket');
```

## Güvenlik Notları

1. **Environment Variables**
   - `.env` dosyasını asla commit etmeyin
   - `service_role` key'ini client-side kodda kullanmayın
   - Sadece `anon` key'ini kullanın

2. **Row Level Security**
   - Tüm tablolarda RLS etkinleştirin
   - Her tablo için uygun politikalar tanımlayın
   - Kullanıcılar sadece kendi verilerine erişebilmeli

3. **API Güvenliği**
   - Rate limiting uygulayın
   - Input validation yapın
   - SQL injection'a karşı koruma sağlayın (Supabase bunu otomatik yapar)

## Geliştirme

### Scripts

```bash
npm start          # Expo dev server başlat
npm run ios        # iOS simulator'da çalıştır
npm run android    # Android emulator'da çalıştır
npm run web        # Web'de çalıştır
```

### Kod Stili

- TypeScript strict mode
- ESLint + Prettier
- Functional components + hooks
- Zustand for state management

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## İletişim

Sorularınız için issue açabilirsiniz.
