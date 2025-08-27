-- Clean up all conflicting UPDATE policies for pickup_invitations
-- Multiple policies are causing conflicts and blocking updates

-- Drop all existing UPDATE policies
DROP POLICY IF EXISTS "Allow invitation updates by creator or invited user" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow invitation updates" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow public token access and updates" ON public.pickup_invitations;

-- Create one simple, clear UPDATE policy
CREATE POLICY "Simple invitation updates"
ON public.pickup_invitations
FOR UPDATE
USING (
  -- Allow admins to update everything
  get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role])
  OR
  -- Allow the creator to update their invitations
  inviting_parent_id = get_current_parent_id()
  OR
  -- Allow the invited person to update (by email match)
  invited_email = get_current_user_email()
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role])
  OR
  inviting_parent_id = get_current_parent_id()
  OR
  invited_email = get_current_user_email()
);

-- Also ensure there's a simple SELECT policy for public access to pending invitations
DROP POLICY IF EXISTS "Allow public pending invitation access" ON public.pickup_invitations;
CREATE POLICY "Allow public pending invitation access"
ON public.pickup_invitations
FOR SELECT
USING (
  -- Allow access to pending, non-expired invitations for anyone
  (invitation_status = 'pending' AND expires_at > now())
  OR
  -- Allow creators to see their invitations
  inviting_parent_id = get_current_parent_id()
  OR
  -- Allow admins to see everything
  get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role])
);