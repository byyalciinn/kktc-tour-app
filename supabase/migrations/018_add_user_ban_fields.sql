-- Add ban fields to profiles table
-- This migration adds support for banning users

-- Add is_banned column with default false
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Add ban_reason column for storing the reason
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Add banned_at column for tracking when the ban was applied
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Create index for faster banned user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_banned IS 'Whether the user is banned from the system';
COMMENT ON COLUMN profiles.ban_reason IS 'The reason for banning the user';
COMMENT ON COLUMN profiles.banned_at IS 'Timestamp when the user was banned';
