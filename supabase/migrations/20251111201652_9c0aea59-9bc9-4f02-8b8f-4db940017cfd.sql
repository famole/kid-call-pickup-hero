-- Fix the UPDATE policy for school_activities to properly check admin on new row state
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;

CREATE POLICY "Admins can update activities"
ON public.school_activities
FOR UPDATE
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());