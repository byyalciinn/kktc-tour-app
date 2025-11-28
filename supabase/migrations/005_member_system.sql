-- =============================================
-- Member System - Add member_number and member_class to profiles
-- =============================================

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS member_number VARCHAR(6) UNIQUE,
ADD COLUMN IF NOT EXISTS member_class VARCHAR(20) DEFAULT 'Normal';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_member_number ON profiles(member_number);

-- Function to generate unique 6-digit member number
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS VARCHAR(6) AS $$
DECLARE
    new_number VARCHAR(6);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate random 6-digit number (100000-999999)
        new_number := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
        
        -- Check if it already exists
        SELECT COUNT(*) INTO exists_count FROM profiles WHERE member_number = new_number;
        
        -- If unique, return it
        IF exists_count = 0 THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate member_number on insert
CREATE OR REPLACE FUNCTION set_member_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.member_number IS NULL THEN
        NEW.member_number := generate_member_number();
    END IF;
    
    -- Set default member_class if not provided
    IF NEW.member_class IS NULL THEN
        NEW.member_class := 'Normal';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_member_number ON profiles;
CREATE TRIGGER trigger_set_member_number
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_member_number();

-- Update existing profiles without member_number
UPDATE profiles 
SET member_number = generate_member_number()
WHERE member_number IS NULL;

-- Update existing profiles without member_class
UPDATE profiles 
SET member_class = 'Normal'
WHERE member_class IS NULL;
