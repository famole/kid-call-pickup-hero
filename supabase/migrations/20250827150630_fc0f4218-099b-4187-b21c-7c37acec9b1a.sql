-- Drop and recreate the policy with a more permissive WITH CHECK condition
DROP POLICY IF EXISTS "Allow invitation status updates for matching emails" ON public.pickup_invitations;

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
  -- Allow acceptance with all the fields that get updated during invitation acceptance
  (invitation_status = 'accepted' AND accepted_parent_id IS NOT NULL)
  OR
  -- Allow decline
  invitation_status = 'declined'
  OR  
  -- Allow other updates by the creator
  inviting_parent_id = get_current_parent_id()
);