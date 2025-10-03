-- Update the pickup_requests DELETE policy to allow authorized users to delete their own requests
DROP POLICY IF EXISTS "pickup_requests_delete_policy" ON pickup_requests;

CREATE POLICY "pickup_requests_delete_policy" ON pickup_requests
FOR DELETE 
USING (
  -- Allow if user is the parent who made the request
  (parent_id = get_current_parent_id()) 
  OR 
  -- Allow if user is an admin/superadmin
  (get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role]))
  OR
  -- Allow if user is authorized to pick up this student and made this request
  (parent_id = get_current_parent_id() AND EXISTS (
    SELECT 1 FROM pickup_authorizations pa
    WHERE pa.student_id = pickup_requests.student_id 
    AND pa.authorized_parent_id = get_current_parent_id()
    AND pa.is_active = true
    AND CURRENT_DATE >= pa.start_date
    AND CURRENT_DATE <= pa.end_date
  ))
);