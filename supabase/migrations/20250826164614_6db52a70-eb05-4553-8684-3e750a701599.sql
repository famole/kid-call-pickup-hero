-- Allow users to create pickup authorizations when accepting invitations
-- This policy allows creating authorizations where the current user is the authorized_parent_id
-- and there's a pending invitation that matches the authorization details
CREATE POLICY "Users can create authorizations when accepting invitations"
ON public.pickup_authorizations
FOR INSERT
WITH CHECK (
  authorized_parent_id = get_current_parent_id() AND
  EXISTS (
    SELECT 1
    FROM public.pickup_invitations pi
    WHERE pi.inviting_parent_id = pickup_authorizations.authorizing_parent_id
    AND pi.invited_email = get_current_user_email()
    AND pi.invitation_status = 'pending'
    AND pickup_authorizations.student_id = ANY(pi.student_ids)
    AND pickup_authorizations.start_date = pi.start_date
    AND pickup_authorizations.end_date = pi.end_date
  )
);