-- =============================================
-- Migration: Add Tour Coordinates
-- Description: Add latitude and longitude columns to tours table
--              for dynamic map pin display
-- =============================================

-- Add latitude and longitude columns to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create index for geospatial queries (only for tours with coordinates)
CREATE INDEX IF NOT EXISTS idx_tours_coordinates ON tours(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================
-- Update existing tours with KKTC coordinates
-- =============================================

-- Bellapais Manastırı (Bellapais Abbey)
UPDATE tours SET latitude = 35.3344, longitude = 33.3182 
WHERE title = 'Bellapais Manastırı' AND latitude IS NULL;

-- Altın Kum Plajı (Golden Beach, Karpaz)
UPDATE tours SET latitude = 35.6636, longitude = 34.5528 
WHERE title = 'Altın Kum Plajı' AND latitude IS NULL;

-- Salamis Antik Kenti (Salamis Ancient City)
UPDATE tours SET latitude = 35.1853, longitude = 33.9039 
WHERE title = 'Salamis Antik Kenti' AND latitude IS NULL;

-- Girne Kalesi (Kyrenia Castle)
UPDATE tours SET latitude = 35.3420, longitude = 33.3228 
WHERE title = 'Girne Kalesi' AND latitude IS NULL;

-- Beşparmak Dağları (St. Hilarion Castle area)
UPDATE tours SET latitude = 35.3064, longitude = 33.2825 
WHERE title = 'Beşparmak Dağları' AND latitude IS NULL;

-- Karpaz Eşekleri Safari (Karpaz Wild Donkeys Safari)
UPDATE tours SET latitude = 35.6033, longitude = 34.3833 
WHERE title = 'Karpaz Eşekleri Safari' AND latitude IS NULL;

-- =============================================
-- Additional popular KKTC locations (if tours exist)
-- =============================================

-- Gazimağusa (Famagusta)
UPDATE tours SET latitude = 35.1256, longitude = 33.9417 
WHERE (title ILIKE '%Gazimağusa%' OR title ILIKE '%Famagusta%') AND latitude IS NULL;

-- Lefkoşa (Nicosia)
UPDATE tours SET latitude = 35.1856, longitude = 33.3823 
WHERE (title ILIKE '%Lefkoşa%' OR title ILIKE '%Nicosia%') AND latitude IS NULL;

-- Güzelyurt (Morphou)
UPDATE tours SET latitude = 35.1989, longitude = 32.9922 
WHERE (title ILIKE '%Güzelyurt%' OR title ILIKE '%Morphou%') AND latitude IS NULL;

-- Dipkarpaz (Rizokarpaso)
UPDATE tours SET latitude = 35.5889, longitude = 34.4333 
WHERE (title ILIKE '%Dipkarpaz%' OR title ILIKE '%Rizokarpaso%') AND latitude IS NULL;

-- St. Barnabas Manastırı
UPDATE tours SET latitude = 35.1500, longitude = 33.8833 
WHERE title ILIKE '%Barnabas%' AND latitude IS NULL;

-- Kantara Kalesi
UPDATE tours SET latitude = 35.4000, longitude = 33.9167 
WHERE title ILIKE '%Kantara%' AND latitude IS NULL;

-- Buffavento Kalesi
UPDATE tours SET latitude = 35.2833, longitude = 33.4500 
WHERE title ILIKE '%Buffavento%' AND latitude IS NULL;

-- Escape Beach
UPDATE tours SET latitude = 35.3500, longitude = 33.2833 
WHERE title ILIKE '%Escape%' AND latitude IS NULL;

-- Alagadi Turtle Beach
UPDATE tours SET latitude = 35.3333, longitude = 33.4833 
WHERE (title ILIKE '%Alagadi%' OR title ILIKE '%Turtle%') AND latitude IS NULL;

-- Comment: This migration adds coordinate support for dynamic map pins.
-- Frontend code in explore.tsx already filters tours by coordinates.
-- New tours can be added with coordinates through the admin panel.
