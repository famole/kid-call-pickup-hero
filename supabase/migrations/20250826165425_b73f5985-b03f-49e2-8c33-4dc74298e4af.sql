-- Create a function to check if a user is an invited user (only has authorizations, no direct student relationships)
CREATE OR REPLACE FUNCTION public.is_invited_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.student_parents sp
    WHERE sp.parent_id = get_current_parent_id()
  ) AND EXISTS (
    SELECT 1 FROM public.pickup_authorizations pa
    WHERE pa.authorized_parent_id = get_current_parent_id()
  );
$$;