-- =============================================
-- COMMUNITY SYSTEM MIGRATION
-- Kullanıcı içerik paylaşımı ve moderasyon sistemi
-- =============================================

-- Post türleri için enum
CREATE TYPE community_post_type AS ENUM ('photo', 'review', 'suggestion');

-- Moderasyon durumu için enum
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- COMMUNITY POSTS TABLE
-- Kullanıcı paylaşımları (fotoğraf, yorum, öneri)
-- =============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  
  -- İçerik bilgileri
  type community_post_type NOT NULL DEFAULT 'photo',
  title VARCHAR(200),
  content TEXT,
  images TEXT[] DEFAULT '{}',
  location VARCHAR(200),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Moderasyon
  status moderation_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- İstatistikler
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMUNITY COMMENTS TABLE
-- Paylaşımlara yapılan yorumlar
-- =============================================
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMUNITY LIKES TABLE
-- Paylaşım beğenileri
-- =============================================
CREATE TABLE IF NOT EXISTS community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Her kullanıcı bir paylaşımı sadece bir kez beğenebilir
  UNIQUE(post_id, user_id)
);

-- =============================================
-- MODERATION LOGS TABLE
-- Admin moderasyon işlem geçmişi
-- =============================================
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'deleted'
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_tour_id ON community_posts(tour_id);
CREATE INDEX idx_community_posts_status ON community_posts(status);
CREATE INDEX idx_community_posts_type ON community_posts(type);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_community_likes_post_id ON community_likes(post_id);
CREATE INDEX idx_community_likes_user_id ON community_likes(user_id);
CREATE INDEX idx_moderation_logs_post_id ON moderation_logs(post_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Beğeni sayısını güncelle
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yorum sayısını güncelle
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_community_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================
CREATE TRIGGER trigger_update_likes_count
  AFTER INSERT OR DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

CREATE TRIGGER trigger_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_community_updated_at();

CREATE TRIGGER trigger_community_comments_updated_at
  BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_community_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;

-- Community Posts Policies
-- Herkes onaylı paylaşımları görebilir
CREATE POLICY "Anyone can view approved posts"
  ON community_posts FOR SELECT
  USING (status = 'approved');

-- Kullanıcılar kendi paylaşımlarını görebilir (tüm durumlar)
CREATE POLICY "Users can view own posts"
  ON community_posts FOR SELECT
  USING (auth.uid() = user_id);

-- Adminler tüm paylaşımları görebilir
CREATE POLICY "Admins can view all posts"
  ON community_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Kullanıcılar paylaşım oluşturabilir
CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi paylaşımlarını güncelleyebilir (pending durumunda)
CREATE POLICY "Users can update own pending posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Adminler tüm paylaşımları güncelleyebilir
CREATE POLICY "Admins can update all posts"
  ON community_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Kullanıcılar kendi paylaşımlarını silebilir
CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Adminler tüm paylaşımları silebilir
CREATE POLICY "Admins can delete all posts"
  ON community_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Community Comments Policies
-- Herkes onaylı paylaşımlardaki yorumları görebilir
CREATE POLICY "Anyone can view comments on approved posts"
  ON community_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = post_id AND community_posts.status = 'approved'
    )
  );

-- Kullanıcılar yorum yapabilir
CREATE POLICY "Users can create comments"
  ON community_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi yorumlarını silebilir
CREATE POLICY "Users can delete own comments"
  ON community_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Community Likes Policies
-- Herkes beğenileri görebilir
CREATE POLICY "Anyone can view likes"
  ON community_likes FOR SELECT
  USING (true);

-- Kullanıcılar beğeni ekleyebilir
CREATE POLICY "Users can create likes"
  ON community_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi beğenilerini kaldırabilir
CREATE POLICY "Users can delete own likes"
  ON community_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Moderation Logs Policies
-- Sadece adminler görebilir
CREATE POLICY "Only admins can view moderation logs"
  ON moderation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Sadece adminler log oluşturabilir
CREATE POLICY "Only admins can create moderation logs"
  ON moderation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================
-- STORAGE BUCKET FOR COMMUNITY IMAGES
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('community', 'community', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for community bucket
CREATE POLICY "Anyone can view community images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community');

CREATE POLICY "Authenticated users can upload community images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'community' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own community images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'community' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own community images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'community' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
