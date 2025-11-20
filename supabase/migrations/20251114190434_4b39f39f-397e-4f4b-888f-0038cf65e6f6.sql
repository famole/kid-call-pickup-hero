-- Enable RLS on school_activities table
ALTER TABLE public.school_activities ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view activities
CREATE POLICY "Anyone can view activities"
ON public.school_activities
FOR SELECT
USING (true);

-- Only non-parent roles can insert activities
CREATE POLICY "Only admins and teachers can insert activities"
ON public.school_activities
FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Only non-parent roles can update activities
CREATE POLICY "Only admins and teachers can update activities"
ON public.school_activities
FOR UPDATE
USING (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);

-- Only non-parent roles can delete activities
CREATE POLICY "Only admins and teachers can delete activities"
ON public.school_activities
FOR DELETE
USING (
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
);