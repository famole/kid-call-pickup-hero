-- Fix the UPDATE policy
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;

CREATE POLICY "Admins can update activities" 
ON public.school_activities 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM parents p
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND p.role = 'admin'::app_role
  )
);

-- Fix the DELETE policy
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;

CREATE POLICY "Admins can delete activities" 
ON public.school_activities 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM parents p
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND p.role = 'admin'::app_role
  )
);