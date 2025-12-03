-- Add membership_expires_at column to profiles table
-- This allows Gold memberships to have an expiry date

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.membership_expires_at IS 'Expiry date for Gold membership. NULL means unlimited or Normal membership.';

-- Create function to check and reset expired memberships
CREATE OR REPLACE FUNCTION check_expired_memberships()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    member_class = 'Normal',
    membership_expires_at = NULL,
    updated_at = NOW()
  WHERE 
    member_class = 'Gold'
    AND membership_expires_at IS NOT NULL
    AND membership_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run daily (requires pg_cron extension)
-- Note: pg_cron must be enabled in Supabase dashboard first
-- SELECT cron.schedule('check-expired-memberships', '0 0 * * *', 'SELECT check_expired_memberships()');
