-- =============================================
-- Migration: Add is_active column to thematic_routes
-- Description: Allows admin to enable/disable routes
-- =============================================

-- Add is_active column with default true
ALTER TABLE thematic_routes 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_thematic_routes_is_active 
ON thematic_routes(is_active);

-- Update existing routes to be active
UPDATE thematic_routes SET is_active = true WHERE is_active IS NULL;

-- Comment for documentation
COMMENT ON COLUMN thematic_routes.is_active IS 'Whether the route is active and visible to users';
