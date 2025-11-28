-- =============================================
-- Tours Admin Policies - Allow authenticated users to manage tours
-- =============================================

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Tours are viewable by everyone" ON tours;

-- Create new SELECT policy (allow all tours to be viewed)
CREATE POLICY "Tours are viewable by everyone" ON tours
    FOR SELECT USING (true);

-- Allow authenticated users to INSERT tours
CREATE POLICY "Authenticated users can create tours" ON tours
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE tours
CREATE POLICY "Authenticated users can update tours" ON tours
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to DELETE tours
CREATE POLICY "Authenticated users can delete tours" ON tours
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- Promotions Admin Policies
-- =============================================

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Promotions are viewable by everyone" ON promotions;

-- Create new SELECT policy
CREATE POLICY "Promotions are viewable by everyone" ON promotions
    FOR SELECT USING (true);

-- Allow authenticated users to manage promotions
CREATE POLICY "Authenticated users can create promotions" ON promotions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update promotions" ON promotions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete promotions" ON promotions
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- Categories Admin Policies
-- =============================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

-- Create new SELECT policy
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can create categories" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories" ON categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete categories" ON categories
    FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- Cafes Admin Policies
-- =============================================

-- Drop existing restrictive SELECT policy if exists
DROP POLICY IF EXISTS "Cafes are viewable by everyone" ON cafes;

-- Create new SELECT policy
CREATE POLICY "Cafes are viewable by everyone" ON cafes
    FOR SELECT USING (true);

-- Allow authenticated users to manage cafes
CREATE POLICY "Authenticated users can create cafes" ON cafes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cafes" ON cafes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cafes" ON cafes
    FOR DELETE USING (auth.role() = 'authenticated');
