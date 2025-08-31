-- Drop all existing pickup_invitations policies that are causing auth.users access issues
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow invitation updates" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow public pending invitation access" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow reading pending invitations by token" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Allow updating invitation status" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their students" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON public.pickup_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.pickup_invitations;

-- Create simple, clean policies that don't access auth.users
-- Allow reading pending invitations by anyone (needed for token-based access)
CREATE POLICY "Allow reading pending invitations"
ON public.pickup_invitations
FOR SELECT
USING (invitation_status = 'pending' AND expires_at > now());

-- Allow updating invitation status for pending invitations
CREATE POLICY "Allow updating invitation status to accepted/declined"
ON public.pickup_invitations
FOR UPDATE
USING (invitation_status = 'pending' AND expires_at > now())
WITH CHECK (invitation_status IN ('accepted', 'declined'));

-- Allow admins to manage all invitations
CREATE POLICY "Admins can manage all invitations"
ON public.pickup_invitations
FOR ALL
USING (get_current_user_role() IN ('admin', 'superadmin'))
WITH CHECK (get_current_user_role() IN ('admin', 'superadmin'));

-- Allow users to manage their own invitations
CREATE POLICY "Users can manage their own invitations"
ON public.pickup_invitations
FOR ALL
USING (inviting_parent_id = get_current_parent_id())
WITH CHECK (inviting_parent_id = get_current_parent_id());