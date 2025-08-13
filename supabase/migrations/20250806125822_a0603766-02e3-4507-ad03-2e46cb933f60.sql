-- Add indexes to improve pickup_history query performance

-- Index for ordering by completed_time (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_pickup_history_completed_time 
ON pickup_history (completed_time DESC);

-- Index for filtering by parent_id (for parent-specific queries)
CREATE INDEX IF NOT EXISTS idx_pickup_history_parent_id 
ON pickup_history (parent_id);

-- Index for filtering by student_id (for student-specific queries)
CREATE INDEX IF NOT EXISTS idx_pickup_history_student_id 
ON pickup_history (student_id);

-- Composite index for parent queries with time ordering
CREATE INDEX IF NOT EXISTS idx_pickup_history_parent_completed_time 
ON pickup_history (parent_id, completed_time DESC);

-- Index for students table foreign key relationships (if not exists)
CREATE INDEX IF NOT EXISTS idx_students_class_id 
ON students (class_id);

-- Index for student_parents relationships
CREATE INDEX IF NOT EXISTS idx_student_parents_student_id 
ON student_parents (student_id);

CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id 
ON student_parents (parent_id);

-- Composite index for student-parent lookups
CREATE INDEX IF NOT EXISTS idx_student_parents_student_parent 
ON student_parents (student_id, parent_id);