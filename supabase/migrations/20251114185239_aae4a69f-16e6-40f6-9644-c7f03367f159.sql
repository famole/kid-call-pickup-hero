-- Drop the complex policy
DROP POLICY IF EXISTS "Admins can manage activities" ON public.school_activities;

-- Create separate, simpler policies for each operation
CREATE POLICY "Admins can insert activities"
ON public.school_activities
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.parents WHERE id = auth.uid() AND deleted_at IS NULL) IN ('admin', 'superadmin')
);

CREATE POLICY "Admins can update activities"
ON public.school_activities
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.parents WHERE id = auth.uid() AND deleted_at IS NULL) IN ('admin', 'superadmin')
)
WITH CHECK (
  (SELECT role FROM public.parents WHERE id = auth.uid() AND deleted_at IS NULL) IN ('admin', 'superadmin')
);

CREATE POLICY "Admins can delete activities"
ON public.school_activities
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.parents WHERE id = auth.uid() AND deleted_at IS NULL) IN ('admin', 'superadmin')
);