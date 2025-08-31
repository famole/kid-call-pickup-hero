-- Fix RLS policy for pickup_invitations UPDATE to handle newly created users

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Allow invitation updates via token or email" ON public.pickup_invitations;

-- Create a simpler, more permissive UPDATE policy that works for new users
CREATE POLICY "Allow invitation updates" ON public.pickup_invitations
FOR UPDATE USING (
  -- Allow if user is admin/superadmin
  (get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role]))
  OR
  -- Allow if user is the one who created the invitation
  (inviting_parent_id = get_current_parent_id())
  OR
  -- Allow if the user's email matches the invited email (for accepting invitations)
  (invited_email = get_current_user_email())
  OR
  -- Allow if invitation is pending and not expired (public access for token-based updates)
  (invitation_status = 'pending' AND expires_at > now())
)
WITH CHECK (
  -- Similar conditions for what can be updated
  (get_current_user_role() = ANY (ARRAY['admin'::app_role, 'superadmin'::app_role]))
  OR
  (inviting_parent_id = get_current_parent_id())
  OR
  (invited_email = get_current_user_email())
  OR
  -- Allow updating to accepted/declined if the invitation was pending
  (invitation_status = ANY (ARRAY['accepted'::text, 'declined'::text]) AND expires_at > now())
);