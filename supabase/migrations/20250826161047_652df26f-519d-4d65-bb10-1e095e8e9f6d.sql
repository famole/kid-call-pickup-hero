-- Add RLS policy to allow public access to invitations by token for acceptance
-- This is needed so unauthenticated users can view invitation details when accepting
CREATE POLICY "Allow public access to invitations by token"
ON pickup_invitations
FOR SELECT
TO anon, authenticated
USING (
  invitation_status = 'pending' 
  AND expires_at > now()
);