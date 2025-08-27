-- Drop all existing UPDATE policies for pickup_invitations and create a simpler one
DROP POLICY IF EXISTS "Allow invitation status updates for matching emails" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.pickup_invitations;

-- Create a more permissive policy for invitation updates
CREATE POLICY "Allow invitation updates"
ON public.pickup_invitations
FOR UPDATE
USING (
  -- Allow the creator to update
  inviting_parent_id = get_current_parent_id()
  OR
  -- Allow the invited person to update (check by email match in parents table)
  invited_email IN (
    SELECT email FROM public.parents WHERE id = get_current_parent_id()
  )
)
WITH CHECK (
  -- Allow any update that passes the USING clause
  true
);