-- Allow invited users to view invitations sent to them (including accepted/declined ones)
CREATE POLICY "Invited users can view invitations sent to them"
ON public.pickup_invitations
FOR SELECT
USING (invited_email = get_current_user_email());