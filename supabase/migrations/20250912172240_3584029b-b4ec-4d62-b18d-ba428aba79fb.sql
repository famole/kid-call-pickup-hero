-- Create a secure function for username users to cancel their pickup requests
CREATE OR REPLACE FUNCTION public.cancel_pickup_request_for_username_user(p_request_id uuid, p_parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_exists BOOLEAN := FALSE;
  is_parent_of_student BOOLEAN := FALSE;
  is_authorized_for_student BOOLEAN := FALSE;
  request_student_id UUID;
BEGIN
  -- Check if the pickup request exists and get the student_id
  SELECT EXISTS (
    SELECT 1 FROM pickup_requests pr
    WHERE pr.id = p_request_id AND pr.status IN ('pending', 'called')
  ), student_id INTO request_exists, request_student_id
  FROM pickup_requests
  WHERE id = p_request_id AND status IN ('pending', 'called')
  LIMIT 1;

  IF NOT request_exists THEN
    RAISE EXCEPTION 'Pickup request not found or already processed';
  END IF;

  -- Check if the parent is a direct parent of the student
  SELECT EXISTS (
    SELECT 1 FROM student_parents sp
    WHERE sp.student_id = request_student_id AND sp.parent_id = p_parent_id
  ) INTO is_parent_of_student;

  -- Check if the parent is authorized to manage pickup for the student
  SELECT EXISTS (
    SELECT 1 FROM pickup_authorizations pa
    WHERE pa.student_id = request_student_id 
    AND pa.authorized_parent_id = p_parent_id
    AND pa.is_active = true
    AND CURRENT_DATE >= pa.start_date
    AND CURRENT_DATE <= pa.end_date
  ) INTO is_authorized_for_student;

  -- Only allow if parent is either direct parent or authorized
  IF NOT (is_parent_of_student OR is_authorized_for_student) THEN
    RAISE EXCEPTION 'Parent is not authorized to cancel this pickup request';
  END IF;

  -- Cancel the pickup request
  UPDATE pickup_requests 
  SET status = 'cancelled'
  WHERE id = p_request_id;
END;
$function$;