
-- Create student class history table
CREATE TABLE public.student_class_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_class_history ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view class history"
  ON public.student_class_history FOR SELECT
  USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert class history"
  ON public.student_class_history FOR INSERT
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update class history"
  ON public.student_class_history FOR UPDATE
  USING (public.is_current_user_admin());

-- Index for fast lookups
CREATE INDEX idx_student_class_history_student ON public.student_class_history(student_id);
CREATE INDEX idx_student_class_history_class ON public.student_class_history(class_id);
