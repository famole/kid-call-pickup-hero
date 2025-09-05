-- Fix RLS policies for pickup_requests to work with both email and username users

-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Secure view pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Secure insert pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Secure update pickup requests" ON pickup_requests;
DROP POLICY IF EXISTS "Secure delete pickup requests" ON pickup_requests;

-- Create new policies that work for both email and username users
CREATE POLICY "Allow parents to view their pickup requests" 
ON pickup_requests FOR SELECT 
USING (
  -- For username users: auth.uid() IS the parent_id
  parent_id = auth.uid() 
  OR 
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Allow if user is parent/authorized for the student
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

CREATE POLICY "Allow parents to create pickup requests"
ON pickup_requests FOR INSERT
WITH CHECK (
  -- For username users: auth.uid() IS the parent_id
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

CREATE POLICY "Allow parents to update their pickup requests"
ON pickup_requests FOR UPDATE
USING (
  -- For username users: auth.uid() IS the parent_id
  parent_id = auth.uid() 
  OR 
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin/teacher access
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "Allow parents to delete their pickup requests"
ON pickup_requests FOR DELETE
USING (
  -- For username users: auth.uid() IS the parent_id
  parent_id = auth.uid() 
  OR 
  -- For email users: use get_current_parent_id()
  (get_current_parent_id() IS NOT NULL AND parent_id = get_current_parent_id())
  OR
  -- Admin access
  get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role])
);