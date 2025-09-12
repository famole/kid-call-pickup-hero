-- Fix RLS policy for pickup_requests to handle username users better
-- The issue is that get_current_parent_id() returns null for username users
-- We need to modify the policy to also check auth.uid() directly as a fallback

-- Drop the existing policy
DROP POLICY IF EXISTS "pickup_requests_select_policy" ON public.pickup_requests;

-- Create a new policy that handles both email and username users
CREATE POLICY "pickup_requests_select_policy" ON public.pickup_requests
FOR SELECT USING (
  -- Allow if parent_id matches current user (email-based auth)
  (parent_id = get_current_parent_id()) OR
  -- Allow if parent_id matches auth.uid() directly (username-based auth fallback)
  (parent_id = auth.uid()) OR
  -- Allow if user is parent of the student (email-based auth)
  (EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND sp.parent_id = get_current_parent_id()
  )) OR
  -- Allow if user is parent of the student (username-based auth fallback)
  (EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND sp.parent_id = auth.uid()
  )) OR
  -- Allow if user is authorized to pick up the student (email-based auth)
  (EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND pa.authorized_parent_id = get_current_parent_id()
    AND pa.is_active = true 
    AND CURRENT_DATE >= pa.start_date 
    AND CURRENT_DATE <= pa.end_date
  )) OR
  -- Allow if user is authorized to pick up the student (username-based auth fallback)
  (EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND pa.authorized_parent_id = auth.uid()
    AND pa.is_active = true 
    AND CURRENT_DATE >= pa.start_date 
    AND CURRENT_DATE <= pa.end_date
  )) OR
  -- Allow teachers, admins, and superadmins to view all requests
  (get_current_user_role() = ANY (ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role]))
);