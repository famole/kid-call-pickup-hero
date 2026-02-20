
-- Add unique constraint on student_parents to prevent duplicate relationships
ALTER TABLE public.student_parents
ADD CONSTRAINT student_parents_student_id_parent_id_unique UNIQUE (student_id, parent_id);
