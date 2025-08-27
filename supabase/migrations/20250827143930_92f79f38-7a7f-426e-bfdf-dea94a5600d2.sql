-- Add RLS policy to allow parent creation when accepting invitations
CREATE POLICY "Users can create parent records when accepting invitations"
ON public.parents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pickup_invitations pi
    WHERE pi.invited_email = parents.email
    AND pi.invitation_status = 'pending'
    AND pi.expires_at > now()
  )
);