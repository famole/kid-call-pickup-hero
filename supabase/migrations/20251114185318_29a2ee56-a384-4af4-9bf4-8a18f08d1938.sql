-- Drop the failing policies
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;

-- Create policies that check by email instead of ID
CREATE POLICY "Admins can insert activities"
ON public.school_activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE lower(p.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
);

CREATE POLICY "Admins can update activities"
ON public.school_activities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE lower(p.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE lower(p.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
);

CREATE POLICY "Admins can delete activities"
ON public.school_activities
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parents p
    WHERE lower(p.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
);