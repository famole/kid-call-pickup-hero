-- Drop the problematic policy that accesses auth.users
DROP POLICY IF EXISTS "Allow invitation acceptance by email match" ON public.pickup_invitations;

-- Create a new policy that doesn't access auth.users table
CREATE POLICY "Allow invitation status updates for matching emails"
ON public.pickup_invitations
FOR UPDATE
USING (
  invitation_status = 'pending' 
  AND expires_at > now()
  AND (
    -- Allow the person who created the invitation to update it
    inviting_parent_id = get_current_parent_id()
    OR
    -- Allow the invited person to update it (without checking auth.users)
    invited_email IN (
      SELECT email FROM public.parents WHERE id = get_current_parent_id()
    )
  )
)
WITH CHECK (
  invitation_status IN ('accepted', 'declined')
);