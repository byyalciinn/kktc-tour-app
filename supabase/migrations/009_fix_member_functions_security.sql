-- =============================================
-- Fix member number functions for auth trigger
-- =============================================

-- Update generate_member_number to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS VARCHAR(6) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update set_member_number to be SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.set_member_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_member_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_member_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_member_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_number() TO service_role;
