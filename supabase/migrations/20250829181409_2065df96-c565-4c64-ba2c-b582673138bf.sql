-- Add support for multiple students per pickup authorization
-- First, add a new column for student_ids array
ALTER TABLE public.pickup_authorizations 
ADD COLUMN student_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Update existing records to populate the new array column with the single student_id
UPDATE public.pickup_authorizations 
SET student_ids = ARRAY[student_id] 
WHERE student_ids IS NULL OR array_length(student_ids, 1) IS NULL;

-- Make the array column not null since we've populated it
ALTER TABLE public.pickup_authorizations 
ALTER COLUMN student_ids SET NOT NULL;

-- We'll keep the old student_id column for backward compatibility for now
-- In a future migration, we can remove it after updating all application code