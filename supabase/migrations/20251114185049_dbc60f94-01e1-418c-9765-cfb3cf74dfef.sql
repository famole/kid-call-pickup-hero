-- Drop all existing UPDATE and DELETE policies for school_activities
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;

-- Recreate clean policies
CREATE POLICY "Admins can manage activities"
ON public.school_activities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parents p
    INNER JOIN auth.users u ON lower(u.email) = lower(p.email)
    WHERE u.id = auth.uid()
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.parents p
    INNER JOIN auth.users u ON lower(u.email) = lower(p.email)
    WHERE u.id = auth.uid()
    AND p.role IN ('admin', 'superadmin')
    AND p.deleted_at IS NULL
  )
);