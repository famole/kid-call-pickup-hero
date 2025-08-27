-- Add minimal RLS policies for pickup_invitations to enable invitation acceptance

-- Allow reading invitations by token (needed for invitation acceptance page)
CREATE POLICY "Allow reading pending invitations by token"
ON public.pickup_invitations
FOR SELECT
USING (invitation_status = 'pending' AND expires_at > now());

-- Allow updating invitations for acceptance/decline
CREATE POLICY "Allow updating invitation status"
ON public.pickup_invitations
FOR UPDATE
USING (invitation_status = 'pending' AND expires_at > now())
WITH CHECK (invitation_status IN ('accepted', 'declined'));