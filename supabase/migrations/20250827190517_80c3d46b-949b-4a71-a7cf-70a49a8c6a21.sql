-- Fix INSERT policy for pickup_invitations
-- The current policy requires inviting_parent_id = get_current_parent_id() but this might fail during creation

-- Drop the restrictive user policy and create a more permissive one for INSERT
DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.pickup_invitations;

-- Allow users to INSERT invitations (they will set inviting_parent_id to their own ID)
CREATE POLICY "Users can create invitations"
ON public.pickup_invitations
FOR INSERT
WITH CHECK (inviting_parent_id = get_current_parent_id());

-- Allow users to SELECT, UPDATE, DELETE their own invitations
CREATE POLICY "Users can manage their existing invitations"
ON public.pickup_invitations
FOR SELECT, UPDATE, DELETE
USING (inviting_parent_id = get_current_parent_id());