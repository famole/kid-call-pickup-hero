-- Update the pickup_requests_update_policy to allow authorized family members to cancel requests
DROP POLICY IF EXISTS pickup_requests_update_policy ON pickup_requests;

CREATE POLICY "pickup_requests_update_policy" ON pickup_requests
FOR UPDATE 
USING (
  -- Original parent can update
  (parent_id = get_current_parent_id()) 
  OR 
  -- Teachers, admins, superadmins can update
  (get_current_user_role() = ANY (ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role]))
  OR
  -- Authorized family members can update (same logic as delete policy)
  (
    (parent_id = get_current_parent_id()) AND 
    (EXISTS (
      SELECT 1 FROM pickup_authorizations pa
      WHERE pa.student_id = pickup_requests.student_id 
      AND pa.authorized_parent_id = get_current_parent_id()
      AND pa.is_active = true
      AND CURRENT_DATE >= pa.start_date
      AND CURRENT_DATE <= pa.end_date
    ))
  )
);