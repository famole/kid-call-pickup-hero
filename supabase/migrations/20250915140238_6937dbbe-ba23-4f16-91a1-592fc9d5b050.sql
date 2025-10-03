-- Add allowed_days_of_week column to pickup_authorizations table
-- Array of integers representing days of week (0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE public.pickup_authorizations 
ADD COLUMN allowed_days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6];

-- Update existing records to have all days allowed by default
UPDATE public.pickup_authorizations 
SET allowed_days_of_week = ARRAY[0,1,2,3,4,5,6] 
WHERE allowed_days_of_week IS NULL;

-- Create function to check pickup authorization with day restrictions
CREATE OR REPLACE FUNCTION public.check_pickup_authorization_with_days(
  p_student_id uuid,
  p_parent_id uuid,
  p_check_date date DEFAULT CURRENT_DATE
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  day_of_week integer;
  auth_exists boolean := false;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
  day_of_week := EXTRACT(DOW FROM p_check_date);
  
  -- Check if authorization exists for this date and day of week
  SELECT EXISTS (
    SELECT 1 FROM pickup_authorizations pa
    WHERE pa.student_id = p_student_id
    AND pa.authorized_parent_id = p_parent_id
    AND pa.is_active = true
    AND p_check_date >= pa.start_date
    AND p_check_date <= pa.end_date
    AND day_of_week = ANY(pa.allowed_days_of_week)
  ) INTO auth_exists;
  
  RETURN auth_exists;
END;
$$;