-- Update pickup_requests RLS policies to properly handle username users with user metadata
DROP POLICY IF EXISTS "pickup_requests_select_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_insert_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_update_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_delete_policy" ON pickup_requests;

-- Create improved policies that handle both email and username users correctly
CREATE POLICY "pickup_requests_select_policy" 
ON pickup_requests FOR SELECT 
USING (
  -- Option 1: For username users - check if auth.uid() matches parent_id directly
  parent_id = auth.uid()
  OR
  -- Option 2: For username users - check user metadata parent_id
  parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
  OR
  -- Option 3: For email users - use get_current_parent_id() 
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Option 4: Allow if user is parent of the student (direct relationship)
  EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND (
      sp.parent_id = auth.uid() 
      OR sp.parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
      OR sp.parent_id = get_current_parent_id()
    )
  )
  OR
  -- Option 5: Allow if user has pickup authorization for the student
  EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND (
      pa.authorized_parent_id = auth.uid() 
      OR pa.authorized_parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
      OR pa.authorized_parent_id = get_current_parent_id()
    )
    AND pa.is_active = true 
    AND CURRENT_DATE >= pa.start_date 
    AND CURRENT_DATE <= pa.end_date
  )
  OR
  -- Admin/teacher access
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "pickup_requests_insert_policy"
ON pickup_requests FOR INSERT
WITH CHECK (
  -- For username users: auth.uid() or user metadata parent_id matches
  (
    (parent_id = auth.uid() OR parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid)
    AND EXISTS (
      SELECT 1 FROM student_parents sp 
      WHERE sp.student_id = pickup_requests.student_id 
      AND (
        sp.parent_id = auth.uid() 
        OR sp.parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
      )
    )
  )
  OR
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND 
   parent_id = get_current_parent_id() AND 
   EXISTS (
     SELECT 1 FROM student_parents sp 
     WHERE sp.student_id = pickup_requests.student_id AND sp.parent_id = get_current_parent_id()
   ))
);

CREATE POLICY "pickup_requests_update_policy"
ON pickup_requests FOR UPDATE
USING (
  -- For username users
  parent_id = auth.uid() 
  OR parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
  OR 
  -- For email users
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin/teacher access
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "pickup_requests_delete_policy"
ON pickup_requests FOR DELETE
USING (
  -- For username users
  parent_id = auth.uid() 
  OR parent_id = (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
  OR 
  -- For email users
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin access
  get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role])
);