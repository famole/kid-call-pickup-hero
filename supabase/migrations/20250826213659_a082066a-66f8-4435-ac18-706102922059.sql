-- Fix RLS policies for pickup_invitations to allow proper invitation acceptance

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Invited users can accept invitations" ON public.pickup_invitations;

-- Create a more permissive policy for accepting invitations
-- This allows updates when the user's email matches the invited email, regardless of auth state
CREATE POLICY "Allow invitation acceptance by email match" 
ON public.pickup_invitations 
FOR UPDATE 
USING (
  invited_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) OR 
  invited_email = get_current_user_email()
) 
WITH CHECK (
  (invited_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) OR 
  invited_email = get_current_user_email()) AND
  invitation_status IN ('accepted', 'declined')
);

-- Also ensure the policy for token-based access is working properly
DROP POLICY IF EXISTS "Allow public access to invitations by token" ON public.pickup_invitations;

CREATE POLICY "Allow public token access and updates" 
ON public.pickup_invitations 
FOR ALL
USING (
  (invitation_status = 'pending' AND expires_at > now()) OR
  (inviting_parent_id = get_current_parent_id()) OR
  (get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role]))
)
WITH CHECK (
  (invitation_status IN ('accepted', 'declined') AND expires_at > now()) OR
  (inviting_parent_id = get_current_parent_id()) OR
  (get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role]))
);