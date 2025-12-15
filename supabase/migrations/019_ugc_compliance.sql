-- =====================================================
-- UGC Compliance Migration
-- Apple App Store Guideline 1.2 Compliance
-- =====================================================

-- 1. Terms Acceptance Tracking
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT NULL;

-- Function to check if user accepted latest terms
CREATE OR REPLACE FUNCTION has_accepted_terms(user_id UUID, required_version TEXT DEFAULT '1.0')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND terms_accepted_at IS NOT NULL
    AND terms_version >= required_version
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Blocked Users System
-- =====================================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate blocks
  UNIQUE(blocker_id, blocked_id),
  
  -- Can't block yourself
  CHECK (blocker_id != blocked_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- RLS Policies for blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks
CREATE POLICY "Users can view own blocks"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can create blocks
CREATE POLICY "Users can create blocks"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(checker_id UUID, target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users 
    WHERE blocker_id = checker_id AND blocked_id = target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create report when blocking (notifies developer)
CREATE OR REPLACE FUNCTION auto_report_on_block()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the most recent post from blocked user and create a report
  INSERT INTO community_reports (post_id, reporter_id, reason, description)
  SELECT id, NEW.blocker_id, 'harassment', 'User blocked - auto-generated report for review'
  FROM community_posts
  WHERE user_id = NEW.blocked_id
  ORDER BY created_at DESC
  LIMIT 1
  ON CONFLICT (post_id, reporter_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS auto_report_on_block_trigger ON blocked_users;
CREATE TRIGGER auto_report_on_block_trigger
  AFTER INSERT ON blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_report_on_block();

-- 3. Enhanced Moderation Fields
-- =====================================================
-- Add moderation action tracking to community_reports
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS action_taken TEXT CHECK (action_taken IN ('content_removed', 'user_warned', 'user_banned', 'dismissed'));
ALTER TABLE community_reports ADD COLUMN IF NOT EXISTS action_notes TEXT;

-- 4. Grant necessary permissions
-- =====================================================
GRANT SELECT, INSERT, DELETE ON blocked_users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
