-- =============================================
-- Security Improvements Migration
-- Fixes RLS policies to use proper admin role checks
-- =============================================

-- =============================================
-- HELPER FUNCTION: Check if user is admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- PROFILES TABLE - Fix visibility for community
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Allow users to view basic profile info of other users (for community)
CREATE POLICY "Public profiles are viewable by authenticated users" ON profiles
    FOR SELECT 
    TO authenticated
    USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Profile creation handled by trigger, but allow manual insert for own profile
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for user management)
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- =============================================
-- TOURS TABLE - Restrict modifications to admins
-- =============================================

-- Drop existing admin policies
DROP POLICY IF EXISTS "Authenticated users can create tours" ON tours;
DROP POLICY IF EXISTS "Authenticated users can update tours" ON tours;
DROP POLICY IF EXISTS "Authenticated users can delete tours" ON tours;

-- Only admins can create tours
CREATE POLICY "Admins can create tours" ON tours
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

-- Only admins can update tours
CREATE POLICY "Admins can update tours" ON tours
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete tours
CREATE POLICY "Admins can delete tours" ON tours
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- PROMOTIONS TABLE - Restrict to admins
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can create promotions" ON promotions;
DROP POLICY IF EXISTS "Authenticated users can update promotions" ON promotions;
DROP POLICY IF EXISTS "Authenticated users can delete promotions" ON promotions;

CREATE POLICY "Admins can create promotions" ON promotions
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update promotions" ON promotions
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete promotions" ON promotions
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- CATEGORIES TABLE - Restrict to admins
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can create categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

CREATE POLICY "Admins can create categories" ON categories
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories" ON categories
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete categories" ON categories
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- CAFES TABLE - Restrict to admins
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can create cafes" ON cafes;
DROP POLICY IF EXISTS "Authenticated users can update cafes" ON cafes;
DROP POLICY IF EXISTS "Authenticated users can delete cafes" ON cafes;

CREATE POLICY "Admins can create cafes" ON cafes
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update cafes" ON cafes
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete cafes" ON cafes
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- COMMUNITY POSTS - Add proper moderation policies
-- =============================================

-- Ensure moderation_logs can only be created by admins
DROP POLICY IF EXISTS "Admins can create moderation logs" ON moderation_logs;
CREATE POLICY "Admins can create moderation logs" ON moderation_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

-- Moderation logs are readable by admins only
DROP POLICY IF EXISTS "Admins can view moderation logs" ON moderation_logs;
CREATE POLICY "Admins can view moderation logs" ON moderation_logs
    FOR SELECT 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- NOTIFICATIONS - Admin only for creation
-- =============================================

-- Only admins can create notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Admins can create notifications" ON notifications
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

-- Only admins can update notifications
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON notifications;
CREATE POLICY "Admins can update notifications" ON notifications
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete notifications
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON notifications;
CREATE POLICY "Admins can delete notifications" ON notifications
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- THEMATIC ROUTES - Admin only for modifications
-- =============================================

-- Only admins can create routes
DROP POLICY IF EXISTS "Authenticated users can create routes" ON thematic_routes;
CREATE POLICY "Admins can create routes" ON thematic_routes
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_admin());

-- Only admins can update routes
DROP POLICY IF EXISTS "Authenticated users can update routes" ON thematic_routes;
CREATE POLICY "Admins can update routes" ON thematic_routes
    FOR UPDATE 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete routes
DROP POLICY IF EXISTS "Authenticated users can delete routes" ON thematic_routes;
CREATE POLICY "Admins can delete routes" ON thematic_routes
    FOR DELETE 
    TO authenticated
    USING (public.is_admin());

-- =============================================
-- INDEX for faster admin checks
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role = 'admin';

-- =============================================
-- COMMENT for documentation
-- =============================================
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if the current user has admin role. Used in RLS policies.';
