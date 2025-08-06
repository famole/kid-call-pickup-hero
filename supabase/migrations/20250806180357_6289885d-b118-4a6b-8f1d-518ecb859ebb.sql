-- Add logical deletion support for parents and students

-- Add deleted_at column to parents table
ALTER TABLE public.parents 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add deleted_at column to students table  
ALTER TABLE public.students
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_parents_deleted_at 
ON parents (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at 
ON students (deleted_at) WHERE deleted_at IS NULL;

-- Add comments to document the soft delete functionality
COMMENT ON COLUMN parents.deleted_at IS 'Timestamp when the parent was logically deleted. NULL means not deleted.';
COMMENT ON COLUMN students.deleted_at IS 'Timestamp when the student was logically deleted. NULL means not deleted.';