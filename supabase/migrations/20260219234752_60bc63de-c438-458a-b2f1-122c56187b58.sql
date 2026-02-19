-- Add composite index for the most common query pattern: filtering by status
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON public.pickup_requests (status);

-- Add composite index for parent + status lookups
CREATE INDEX IF NOT EXISTS idx_pickup_requests_parent_status ON public.pickup_requests (parent_id, status);

-- Add composite index for student + status lookups (used by getParentAffectedRequests)
CREATE INDEX IF NOT EXISTS idx_pickup_requests_student_status ON public.pickup_requests (student_id, status);

-- Add index on pickup_authorizations for authorized_parent lookups
CREATE INDEX IF NOT EXISTS idx_pickup_auth_authorized_parent_active ON public.pickup_authorizations (authorized_parent_id, is_active, start_date, end_date);

-- Add index on student_parents for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id ON public.student_parents (parent_id);