-- =============================================
-- Favorites Table
-- =============================================

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user-tour combination
    UNIQUE(user_id, tour_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tour_id ON favorites(tour_id);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Favorites RLS Policies
-- =============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add to own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
CREATE POLICY "Users can remove from own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);
