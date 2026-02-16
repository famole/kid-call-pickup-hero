-- Add status column to students table
ALTER TABLE public.students 
ADD COLUMN status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'graduated'));

-- Set existing non-deleted students to active
UPDATE public.students SET status = 'active' WHERE deleted_at IS NULL;

-- Set deleted students to keep their status as active (deleted_at handles soft delete separately)

-- Create index for faster filtering
CREATE INDEX idx_students_status ON public.students (status);
