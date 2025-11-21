-- Drop the existing UPDATE policy for school_activities
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;

-- Recreate the UPDATE policy with explicit WITH CHECK clause
CREATE POLICY "Admins can update activities" 
ON public.school_activities
FOR UPDATE
USING (is_current_user_admin_for_activities())
WITH CHECK (is_current_user_admin_for_activities());