-- Allow invited users to update invitations to accepted status when they match the invited email
CREATE POLICY "Invited users can accept invitations"
ON public.pickup_invitations
FOR UPDATE
USING (
  invited_email = get_current_user_email() AND
  invitation_status = 'pending'
)
WITH CHECK (
  invited_email = get_current_user_email() AND
  invitation_status = 'accepted'
);