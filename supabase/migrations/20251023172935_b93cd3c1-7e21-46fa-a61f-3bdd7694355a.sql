-- Create table to store password reset OTP codes
CREATE TABLE IF NOT EXISTS public.password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_code ON public.password_reset_otps(otp_code);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to verify OTPs (needed for password reset flow)
CREATE POLICY "Anyone can verify OTP codes"
  ON public.password_reset_otps
  FOR SELECT
  USING (expires_at > now() AND used = FALSE);

-- Function to verify and mark OTP as used
CREATE OR REPLACE FUNCTION public.verify_password_reset_otp(
  p_email TEXT,
  p_otp_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  otp_valid BOOLEAN := FALSE;
BEGIN
  -- Check if OTP exists, is valid, not used, and not expired
  SELECT EXISTS (
    SELECT 1 FROM password_reset_otps
    WHERE email = p_email
    AND otp_code = p_otp_code
    AND used = FALSE
    AND expires_at > now()
  ) INTO otp_valid;

  -- If valid, mark as used
  IF otp_valid THEN
    UPDATE password_reset_otps
    SET used = TRUE
    WHERE email = p_email
    AND otp_code = p_otp_code
    AND used = FALSE;
  END IF;

  RETURN otp_valid;
END;
$$;

-- Function to clean up expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM password_reset_otps
  WHERE expires_at < now() - interval '1 day';
END;
$$;