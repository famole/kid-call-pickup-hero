-- Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_role app_role;
BEGIN
  -- Get email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check role in parents table
  SELECT p.role INTO user_role
  FROM public.parents p
  WHERE lower(p.email) = lower(user_email)
  AND p.deleted_at IS NULL;
  
  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

-- Recreate the policies using the security definer function
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;

CREATE POLICY "Admins can insert activities"
ON public.school_activities
FOR INSERT
TO authenticated
WITH CHECK (public.check_user_is_admin());

CREATE POLICY "Admins can update activities"
ON public.school_activities
FOR UPDATE
TO authenticated
USING (public.check_user_is_admin())
WITH CHECK (public.check_user_is_admin());

CREATE POLICY "Admins can delete activities"
ON public.school_activities
FOR DELETE
TO authenticated
USING (public.check_user_is_admin());