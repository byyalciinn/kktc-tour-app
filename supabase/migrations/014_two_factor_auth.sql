-- =============================================
-- 014: Two-Factor Email Authentication System
-- =============================================
-- This migration adds email-based 2FA support
-- Users can enable 2FA in settings, and will need
-- to verify a 6-digit code sent to their email on login

-- =============================================
-- 1. Add two_factor_enabled column to profiles
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;

-- =============================================
-- 2. Create email_verification_codes table
-- =============================================
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'two_factor', -- 'two_factor', 'email_change', 'password_reset'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one active code per user per purpose
    CONSTRAINT unique_active_code UNIQUE (user_id, purpose, verified_at)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup ON public.email_verification_codes(user_id, code, purpose) WHERE verified_at IS NULL;

-- =============================================
-- 3. Enable RLS on email_verification_codes
-- =============================================
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own verification codes
CREATE POLICY "Users can view own verification codes"
ON public.email_verification_codes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (via functions)
CREATE POLICY "Service role can manage verification codes"
ON public.email_verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================
-- 4. Function to generate verification code
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_verification_code(
    p_user_id UUID,
    p_email VARCHAR,
    p_purpose VARCHAR DEFAULT 'two_factor',
    p_expires_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(code VARCHAR, expires_at TIMESTAMPTZ) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code VARCHAR(6);
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Generate 6-digit numeric code
    v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    v_expires_at := NOW() + (p_expires_minutes || ' minutes')::INTERVAL;
    
    -- Invalidate any existing unverified codes for this user and purpose
    UPDATE public.email_verification_codes
    SET verified_at = NOW() -- Mark as used/expired
    WHERE user_id = p_user_id 
      AND purpose = p_purpose 
      AND verified_at IS NULL;
    
    -- Insert new code
    INSERT INTO public.email_verification_codes (
        user_id, 
        code, 
        email, 
        purpose, 
        expires_at
    ) VALUES (
        p_user_id, 
        v_code, 
        p_email, 
        p_purpose, 
        v_expires_at
    );
    
    RETURN QUERY SELECT v_code, v_expires_at;
END;
$$;

-- =============================================
-- 5. Function to verify code
-- =============================================
CREATE OR REPLACE FUNCTION public.verify_email_code(
    p_user_id UUID,
    p_code VARCHAR,
    p_purpose VARCHAR DEFAULT 'two_factor'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_result JSONB;
BEGIN
    -- Find the most recent unverified code for this user and purpose
    SELECT * INTO v_record
    FROM public.email_verification_codes
    WHERE user_id = p_user_id
      AND purpose = p_purpose
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- No code found
    IF v_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'no_code_found',
            'message', 'No verification code found'
        );
    END IF;
    
    -- Check if expired
    IF v_record.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'code_expired',
            'message', 'Verification code has expired'
        );
    END IF;
    
    -- Check max attempts
    IF v_record.attempts >= v_record.max_attempts THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'max_attempts_exceeded',
            'message', 'Maximum verification attempts exceeded'
        );
    END IF;
    
    -- Increment attempts
    UPDATE public.email_verification_codes
    SET attempts = attempts + 1
    WHERE id = v_record.id;
    
    -- Check if code matches
    IF v_record.code != p_code THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'invalid_code',
            'message', 'Invalid verification code',
            'attempts_remaining', v_record.max_attempts - v_record.attempts - 1
        );
    END IF;
    
    -- Code is valid - mark as verified
    UPDATE public.email_verification_codes
    SET verified_at = NOW()
    WHERE id = v_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Code verified successfully'
    );
END;
$$;

-- =============================================
-- 6. Function to check if user has 2FA enabled
-- =============================================
CREATE OR REPLACE FUNCTION public.check_two_factor_enabled(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT two_factor_enabled INTO v_enabled
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN COALESCE(v_enabled, false);
END;
$$;

-- =============================================
-- 7. Function to toggle 2FA
-- =============================================
CREATE OR REPLACE FUNCTION public.toggle_two_factor(
    p_user_id UUID,
    p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user is updating their own profile
    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'You can only update your own settings'
        );
    END IF;
    
    UPDATE public.profiles
    SET two_factor_enabled = p_enabled,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'two_factor_enabled', p_enabled,
        'message', CASE WHEN p_enabled 
            THEN 'Two-factor authentication enabled' 
            ELSE 'Two-factor authentication disabled' 
        END
    );
END;
$$;

-- =============================================
-- 8. Cleanup function for expired codes
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.email_verification_codes
    WHERE expires_at < NOW() - INTERVAL '1 day'
       OR verified_at IS NOT NULL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- =============================================
-- 9. Grant necessary permissions
-- =============================================
GRANT EXECUTE ON FUNCTION public.generate_verification_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_code TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_two_factor_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_two_factor TO authenticated;

-- Service role for cleanup
GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes TO service_role;

-- =============================================
-- 10. Comment documentation
-- =============================================
COMMENT ON TABLE public.email_verification_codes IS 'Stores temporary verification codes for 2FA and other email verifications';
COMMENT ON COLUMN public.email_verification_codes.purpose IS 'Purpose of the code: two_factor, email_change, password_reset';
COMMENT ON COLUMN public.email_verification_codes.attempts IS 'Number of failed verification attempts';
COMMENT ON COLUMN public.email_verification_codes.max_attempts IS 'Maximum allowed verification attempts before code is invalidated';
COMMENT ON FUNCTION public.generate_verification_code IS 'Generates a 6-digit verification code for email verification';
COMMENT ON FUNCTION public.verify_email_code IS 'Verifies a submitted code and returns success/failure with details';
COMMENT ON FUNCTION public.check_two_factor_enabled IS 'Checks if a user has 2FA enabled';
COMMENT ON FUNCTION public.toggle_two_factor IS 'Enables or disables 2FA for a user';
