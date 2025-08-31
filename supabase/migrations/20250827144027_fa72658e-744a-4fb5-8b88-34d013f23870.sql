-- Drop the problematic policy that might be accessing auth.users
DROP POLICY IF EXISTS "Users can create parent records when accepting invitations" ON public.parents;

-- Create a simpler policy that doesn't access auth.users table
CREATE POLICY "Allow invitation acceptance without auth check"
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