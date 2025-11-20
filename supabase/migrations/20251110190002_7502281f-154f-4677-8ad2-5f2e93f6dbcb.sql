-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;

-- Create a corrected policy that properly checks admin role
CREATE POLICY "Admins can insert activities" 
ON public.school_activities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM parents p
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND p.role = 'admin'::app_role
  )
);