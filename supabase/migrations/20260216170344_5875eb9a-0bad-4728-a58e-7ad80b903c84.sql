ALTER TABLE public.students DROP CONSTRAINT students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'graduated', 'withdrawn'));