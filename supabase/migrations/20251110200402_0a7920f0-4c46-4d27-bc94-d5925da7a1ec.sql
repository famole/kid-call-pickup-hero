-- Drop the policies first
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;

-- Now drop the custom function
DROP FUNCTION IF EXISTS public.is_current_user_admin_for_activities();

-- Recreate INSERT policy with existing function
CREATE POLICY "Admins can insert activities" 
ON public.school_activities
FOR INSERT
WITH CHECK (is_current_user_admin());

-- Recreate UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Admins can update activities" 
ON public.school_activities
FOR UPDATE
USING (is_current_user_admin())
WITH CHECK (true);  -- Allow the update to proceed if USING passes

-- Recreate DELETE policy
CREATE POLICY "Admins can delete activities" 
ON public.school_activities
FOR DELETE
USING (is_current_user_admin());