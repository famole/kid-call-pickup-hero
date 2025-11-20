-- Create a security definer function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin_for_activities()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM parents p
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND p.role = 'admin'::app_role
  );
$$;

-- Drop the existing policies
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;

-- Recreate policies using the security definer function
CREATE POLICY "Admins can insert activities" 
ON public.school_activities 
FOR INSERT 
WITH CHECK (is_current_user_admin_for_activities());

CREATE POLICY "Admins can update activities" 
ON public.school_activities 
FOR UPDATE 
USING (is_current_user_admin_for_activities());

CREATE POLICY "Admins can delete activities" 
ON public.school_activities 
FOR DELETE 
USING (is_current_user_admin_for_activities());