-- Fix the search path security warning by updating the function
CREATE OR REPLACE FUNCTION public.get_pickup_requests_for_parent(p_parent_id UUID)
RETURNS TABLE(
  id UUID,
  student_id UUID,
  parent_id UUID,
  request_time TIMESTAMP WITH TIME ZONE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate that the parent exists
  IF NOT EXISTS (SELECT 1 FROM parents WHERE parents.id = p_parent_id) THEN
    RAISE EXCEPTION 'Invalid parent ID';
  END IF;

  -- Return pickup requests for the specified parent
  RETURN QUERY
  SELECT 
    pr.id,
    pr.student_id,
    pr.parent_id,
    pr.request_time,
    pr.status
  FROM pickup_requests pr
  WHERE pr.parent_id = p_parent_id
  AND pr.status IN ('pending', 'called');
END;
$$;