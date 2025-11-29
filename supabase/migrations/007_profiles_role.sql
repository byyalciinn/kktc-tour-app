-- =============================================
-- Profiles Role Column - Add role support for admin guard
-- =============================================

-- 1. Add role column with default 'user'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Ensure existing rows have a role value
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;

-- 3. Add a check constraint so only valid roles are stored
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));

-- 4. Update the updated_at timestamp for touched rows
UPDATE profiles
SET updated_at = NOW()
WHERE role = 'user';
