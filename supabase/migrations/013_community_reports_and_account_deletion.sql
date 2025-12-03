-- =============================================
-- Community Reports System & Account Deletion
-- =============================================

-- 1. Create community_reports table
CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'harassment', 'misinformation', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate reports from same user for same post
  UNIQUE(post_id, reporter_id)
);

-- 2. Create hidden_posts table (for "not interested" feature)
CREATE TABLE IF NOT EXISTS hidden_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate entries
  UNIQUE(user_id, post_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_reports_post_id ON community_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_reporter_id ON community_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_user_id ON hidden_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_posts_post_id ON hidden_posts(post_id);

-- 4. RLS Policies for community_reports

ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports for posts they don't own
CREATE POLICY "Users can create reports"
  ON community_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND NOT EXISTS (
      SELECT 1 FROM community_posts 
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON community_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Admins can view and manage all reports
CREATE POLICY "Admins can manage all reports"
  ON community_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. RLS Policies for hidden_posts

ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own hidden posts
CREATE POLICY "Users can manage own hidden posts"
  ON hidden_posts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Rate limiting function for reports (max 10 reports per hour per user)
CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM community_reports
  WHERE reporter_id = NEW.reporter_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF report_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Maximum 10 reports per hour.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_report_rate_limit_trigger
  BEFORE INSERT ON community_reports
  FOR EACH ROW
  EXECUTE FUNCTION check_report_rate_limit();

-- 7. Function to auto-hide posts with multiple reports
CREATE OR REPLACE FUNCTION auto_moderate_reported_posts()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM community_reports
  WHERE post_id = NEW.post_id
    AND status = 'pending';
  
  -- Auto-hide post after 5 reports
  IF report_count >= 5 THEN
    UPDATE community_posts
    SET status = 'pending', -- Move back to pending for review
        updated_at = NOW()
    WHERE id = NEW.post_id
      AND status = 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_moderate_trigger
  AFTER INSERT ON community_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_moderate_reported_posts();

-- =============================================
-- Account Deletion System
-- =============================================

-- 8. Function to completely delete user account and all related data
CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  deleted_data JSONB;
  posts_deleted INTEGER;
  favorites_deleted INTEGER;
  reports_deleted INTEGER;
  hidden_deleted INTEGER;
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;
  
  -- Delete community posts (cascade will handle likes, reports)
  DELETE FROM community_posts WHERE user_id = target_user_id;
  GET DIAGNOSTICS posts_deleted = ROW_COUNT;
  
  -- Delete favorites
  DELETE FROM favorites WHERE user_id = target_user_id;
  GET DIAGNOSTICS favorites_deleted = ROW_COUNT;
  
  -- Delete reports made by user
  DELETE FROM community_reports WHERE reporter_id = target_user_id;
  GET DIAGNOSTICS reports_deleted = ROW_COUNT;
  
  -- Delete hidden posts
  DELETE FROM hidden_posts WHERE user_id = target_user_id;
  GET DIAGNOSTICS hidden_deleted = ROW_COUNT;
  
  -- Delete profile (this should cascade to other related tables)
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Build result
  deleted_data := jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'posts', posts_deleted,
      'favorites', favorites_deleted,
      'reports', reports_deleted,
      'hidden_posts', hidden_deleted
    )
  );
  
  RETURN deleted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permission
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- =============================================
-- pg_cron Job for Membership Expiry
-- =============================================

-- 10. Enable pg_cron extension (must be done by superuser/dashboard)
-- Note: Run this in Supabase Dashboard SQL Editor if not already enabled:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 11. Create the cron job (run daily at midnight UTC)
-- This will be executed if pg_cron is available
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('check-expired-memberships');
    
    -- Schedule new job to run daily at midnight
    PERFORM cron.schedule(
      'check-expired-memberships',
      '0 0 * * *',
      'SELECT check_expired_memberships()'
    );
    
    RAISE NOTICE 'pg_cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Please enable it in Supabase Dashboard and run: SELECT cron.schedule(''check-expired-memberships'', ''0 0 * * *'', ''SELECT check_expired_memberships()'');';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Please enable pg_cron in Supabase Dashboard.', SQLERRM;
END $$;

-- 12. Add updated_at trigger for community_reports
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_reports_updated_at
  BEFORE UPDATE ON community_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 13. Comments for documentation
COMMENT ON TABLE community_reports IS 'Stores user reports for community posts';
COMMENT ON TABLE hidden_posts IS 'Stores posts hidden by users (not interested feature)';
COMMENT ON FUNCTION delete_user_account(UUID) IS 'Completely deletes a user account and all related data';
COMMENT ON FUNCTION check_report_rate_limit() IS 'Rate limits reports to 10 per hour per user';
COMMENT ON FUNCTION auto_moderate_reported_posts() IS 'Auto-hides posts with 5+ pending reports';
