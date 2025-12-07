-- =============================================
-- Cyprigo - Supabase Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (User profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories are public readable
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Insert default categories
INSERT INTO categories (id, name, icon, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Tümü', 'apps-outline', 0),
    ('00000000-0000-0000-0000-000000000002', 'Plaj', 'sunny-outline', 1),
    ('00000000-0000-0000-0000-000000000003', 'Dağ', 'trail-sign-outline', 2),
    ('00000000-0000-0000-0000-000000000004', 'Tarihi', 'library-outline', 3),
    ('00000000-0000-0000-0000-000000000005', 'Doğa', 'leaf-outline', 4)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- TOURS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT '€',
    duration TEXT NOT NULL,
    rating DECIMAL(2, 1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    image TEXT NOT NULL,
    highlights TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Tours are public readable
CREATE POLICY "Tours are viewable by everyone" ON tours
    FOR SELECT USING (is_active = true);

-- Create index for category filtering
CREATE INDEX idx_tours_category ON tours(category);
CREATE INDEX idx_tours_featured ON tours(is_featured) WHERE is_featured = true;

-- Insert featured tours from Tours.ts
INSERT INTO tours (id, title, location, description, price, currency, duration, rating, review_count, image, highlights, category, is_featured) VALUES
    ('00000000-0000-0000-0000-000000000101', 'Bellapais Manastırı', 'Girne, KKTC', '13. yüzyıldan kalma gotik mimari harikası manastırı keşfedin. Akdeniz''in muhteşem manzarası eşliğinde tarihe yolculuk.', 25, '€', '2 saat', 4.8, 1247, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop', ARRAY['Gotik mimari', 'Panoramik manzara', 'Rehberli tur'], 'history', true),
    ('00000000-0000-0000-0000-000000000102', 'Altın Kum Plajı', 'Karpaz, KKTC', 'KKTC''nin en güzel plajlarından biri. Altın sarısı kumları ve berrak suları ile unutulmaz bir deniz deneyimi.', 15, '€', 'Tam gün', 4.9, 2156, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop', ARRAY['Altın kum', 'Berrak deniz', 'Doğal güzellik'], 'beach', true),
    ('00000000-0000-0000-0000-000000000103', 'Salamis Antik Kenti', 'Gazimağusa, KKTC', 'Antik dönemin en önemli liman şehirlerinden biri. Roma hamamları, tiyatro ve gymnasium kalıntıları.', 20, '€', '3 saat', 4.7, 1823, 'https://images.unsplash.com/photo-1553913861-c0a9e9d5c5e9?w=800&h=600&fit=crop', ARRAY['Roma hamamları', 'Antik tiyatro', 'Mozaikler'], 'history', true),
    ('00000000-0000-0000-0000-000000000104', 'Girne Kalesi', 'Girne, KKTC', 'Bizans döneminden kalma tarihi kale. İçinde batık gemi müzesi ve muhteşem liman manzarası.', 18, '€', '2 saat', 4.6, 2341, 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=600&fit=crop', ARRAY['Batık gemi müzesi', 'Liman manzarası', 'Tarihi surlar'], 'history', true),
    ('00000000-0000-0000-0000-000000000105', 'Beşparmak Dağları', 'Girne, KKTC', 'Eşsiz doğa yürüyüşleri ve nefes kesen manzaralar. St. Hilarion Kalesi''ne tırmanış.', 30, '€', '4 saat', 4.8, 987, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop', ARRAY['Doğa yürüyüşü', 'St. Hilarion', 'Panoramik manzara'], 'mountain', true),
    ('00000000-0000-0000-0000-000000000106', 'Karpaz Eşekleri Safari', 'Karpaz, KKTC', 'Karpaz yarımadasının ünlü yabani eşeklerini doğal ortamlarında görün.', 35, '€', 'Yarım gün', 4.5, 654, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop', ARRAY['Yabani eşekler', 'Doğa turu', 'Fotoğraf imkanı'], 'nature', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- PROMOTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    discount TEXT NOT NULL,
    button_text TEXT NOT NULL,
    background_color TEXT DEFAULT '#E8F4FD',
    image TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Promotions are public readable
CREATE POLICY "Promotions are viewable by everyone" ON promotions
    FOR SELECT USING (is_active = true);

-- Insert default promotions
INSERT INTO promotions (id, title, subtitle, discount, button_text, background_color, image) VALUES
    ('00000000-0000-0000-0000-000000000201', '3 Plaj ziyaret et', '%50 indirim kazan', '50%', 'Kuponu Al', '#E8F4FD', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop'),
    ('00000000-0000-0000-0000-000000000202', 'Tarihi yerler için', '%30 indirim', '30%', 'Şimdi Rezerve Et', '#1E3A5F', 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=400&h=300&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- CAFES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cafes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    rating DECIMAL(2, 1) DEFAULT 0,
    image TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;

-- Cafes are public readable
CREATE POLICY "Cafes are viewable by everyone" ON cafes
    FOR SELECT USING (is_active = true);

-- Insert default cafes
INSERT INTO cafes (id, name, location, rating, image) VALUES
    ('00000000-0000-0000-0000-000000000301', 'The Soulist Coffee', 'Girne', 4.7, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop'),
    ('00000000-0000-0000-0000-000000000302', 'Cafe Nero', 'Lefkoşa', 4.5, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- FAVORITES TABLE (User favorites)
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tour_id)
);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_tour_id ON favorites(tour_id);

-- =============================================
-- BOOKINGS TABLE (Tour reservations)
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    number_of_guests INTEGER DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tour_id)
);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own reviews" ON reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_reviews_tour_id ON reviews(tour_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at
    BEFORE UPDATE ON tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cafes_updated_at
    BEFORE UPDATE ON cafes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update tour rating when a review is added
CREATE OR REPLACE FUNCTION update_tour_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tours
    SET 
        rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE tour_id = NEW.tour_id AND is_approved = true),
        review_count = (SELECT COUNT(*) FROM reviews WHERE tour_id = NEW.tour_id AND is_approved = true)
    WHERE id = NEW.tour_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tour_rating_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_tour_rating();

-- =============================================
-- HANDLE NEW USER SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
