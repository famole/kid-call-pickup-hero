-- Clean up ALL existing pickup_requests policies and create fresh ones

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow parents to create pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Allow parents to delete their pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Allow parents to update their pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Allow parents to view their pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Delete pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Parents can create pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Update pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Users can create pickup requests for their students" ON pickup_requests;
DROP POLICY IF EXISTS "Users can update their own pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Users can view pickup requests for their students" ON pickup_requests;
DROP POLICY IF EXISTS "View pickup requests" ON pickup_requests;

-- Create clean, simple policies that work for both email and username users
CREATE POLICY "pickup_requests_select_policy" 
ON pickup_requests FOR SELECT 
USING (
  -- For username users: their auth.uid() IS their parent_id
  parent_id = auth.uid()
  OR
  -- For email users: use get_current_parent_id() 
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Allow if user is parent of the student (direct relationship)
  EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND (sp.parent_id = auth.uid() OR sp.parent_id = get_current_parent_id())
  )
  OR
  -- Allow if user has pickup authorization for the student
  EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND (pa.authorized_parent_id = auth.uid() OR pa.authorized_parent_id = get_current_parent_id())
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
  -- For username users: their auth.uid() IS their parent_id
  (parent_id = auth.uid() AND EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id AND sp.parent_id = auth.uid()
  ))
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
  -- For username users: their auth.uid() IS their parent_id
  parent_id = auth.uid() 
  OR 
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin/teacher access
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "pickup_requests_delete_policy"
ON pickup_requests FOR DELETE
USING (
  -- For username users: their auth.uid() IS their parent_id
  parent_id = auth.uid() 
  OR 
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin access
  get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role])
);