-- Migration: User Block Reports Table
-- Description: Creates a table to store automatic reports when users block each other
-- This enables admin panel to review block actions for moderation purposes

-- Create user_block_reports table
CREATE TABLE IF NOT EXISTS user_block_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'user_blocked',
  description TEXT,
  source TEXT NOT NULL DEFAULT 'other', -- 'post', 'comment', 'profile', 'other'
  post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES community_comments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_block_reports_reporter ON user_block_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_block_reports_reported ON user_block_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_block_reports_status ON user_block_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_block_reports_created ON user_block_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_block_reports_source ON user_block_reports(source);

-- Enable RLS
ALTER TABLE user_block_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own block reports
CREATE POLICY "Users can create block reports"
  ON user_block_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON user_block_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all block reports"
  ON user_block_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update reports (for review)
CREATE POLICY "Admins can update block reports"
  ON user_block_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_block_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_block_reports_updated_at
  BEFORE UPDATE ON user_block_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_block_reports_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_block_reports IS 'Stores automatic reports created when users block each other for admin review';
COMMENT ON COLUMN user_block_reports.source IS 'Where the block originated: post, comment, profile, or other';
COMMENT ON COLUMN user_block_reports.status IS 'Review status: pending, reviewed, resolved, dismissed';
