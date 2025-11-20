-- Create junction table for many-to-many relationship between activities and classes
CREATE TABLE IF NOT EXISTS public.activity_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.school_activities(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, class_id)
);

-- Migrate existing data from school_activities.class_id to activity_classes
INSERT INTO public.activity_classes (activity_id, class_id)
SELECT id, class_id 
FROM public.school_activities 
WHERE class_id IS NOT NULL;

-- Enable RLS on the new table
ALTER TABLE public.activity_classes ENABLE ROW LEVEL SECURITY;

-- Anyone can view activity-class relationships
CREATE POLICY "Anyone can view activity classes"
ON public.activity_classes
FOR SELECT
USING (true);

-- Admins can insert activity-class relationships
CREATE POLICY "Admins can insert activity classes"
ON public.activity_classes
FOR INSERT
WITH CHECK (is_current_user_admin());

-- Admins can delete activity-class relationships
CREATE POLICY "Admins can delete activity classes"
ON public.activity_classes
FOR DELETE
USING (is_current_user_admin());

-- Create index for better query performance
CREATE INDEX idx_activity_classes_activity_id ON public.activity_classes(activity_id);
CREATE INDEX idx_activity_classes_class_id ON public.activity_classes(class_id);