-- Create a function to create pickup requests for username-only users
CREATE OR REPLACE FUNCTION create_pickup_request_for_username_user(
  p_student_id UUID,
  p_parent_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id UUID;
  is_parent_of_student BOOLEAN := FALSE;
  is_authorized_for_student BOOLEAN := FALSE;
BEGIN
  -- Check if the parent is a direct parent of the student
  SELECT EXISTS (
    SELECT 1 FROM student_parents sp
    WHERE sp.student_id = p_student_id AND sp.parent_id = p_parent_id
  ) INTO is_parent_of_student;

  -- Check if the parent is authorized to pick up the student
  SELECT EXISTS (
    SELECT 1 FROM pickup_authorizations pa
    WHERE pa.student_id = p_student_id 
    AND pa.authorized_parent_id = p_parent_id
    AND pa.is_active = true
    AND CURRENT_DATE >= pa.start_date
    AND CURRENT_DATE <= pa.end_date
  ) INTO is_authorized_for_student;

  -- Only allow if parent is either direct parent or authorized
  IF NOT (is_parent_of_student OR is_authorized_for_student) THEN
    RAISE EXCEPTION 'Parent is not authorized to request pickup for this student';
  END IF;

  -- Check if there's already an active pickup request for this student by this parent
  IF EXISTS (
    SELECT 1 FROM pickup_requests pr
    WHERE pr.student_id = p_student_id 
    AND pr.parent_id = p_parent_id
    AND pr.status IN ('pending', 'called')
  ) THEN
    RAISE EXCEPTION 'Active pickup request already exists for this student';
  END IF;

  -- Create the pickup request
  INSERT INTO pickup_requests (student_id, parent_id, status, request_time)
  VALUES (p_student_id, p_parent_id, 'pending', NOW())
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$$;