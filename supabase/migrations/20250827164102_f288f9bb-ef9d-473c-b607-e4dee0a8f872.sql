-- Create a more permissive policy for invitation updates that works for newly created users

-- Drop the current policy
DROP POLICY IF EXISTS "Allow invitation updates" ON public.pickup_invitations;

-- Create a new policy that allows updates based on email match directly
CREATE POLICY "Allow invitation updates" ON public.pickup_invitations
FOR UPDATE USING (
  -- Always allow admins/superadmins
  EXISTS (
    SELECT 1 FROM public.parents p 
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND p.role = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role])
  )
  OR
  -- Allow if the authenticated user's email matches the invited email
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Allow if invitation is pending and not expired (public token-based access)
  (invitation_status = 'pending' AND expires_at > now())
)
WITH CHECK (
  -- Same conditions for updates
  EXISTS (
    SELECT 1 FROM public.parents p 
    WHERE p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND p.role = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role])
  )
  OR
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR
  -- Allow updating to accepted/declined if the invitation was pending
  (invitation_status = ANY (ARRAY['accepted'::text, 'declined'::text]) AND expires_at > now())
);