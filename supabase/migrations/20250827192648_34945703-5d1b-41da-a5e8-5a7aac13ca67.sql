-- Fix INSERT policy for pickup_invitations - create separate policies for each operation

-- Drop the restrictive user policy and create separate ones
DROP POLICY IF EXISTS "Users can manage their own invitations" ON public.pickup_invitations;

-- Allow users to INSERT invitations
CREATE POLICY "Users can create invitations"
ON public.pickup_invitations
FOR INSERT
WITH CHECK (inviting_parent_id = get_current_parent_id());

-- Allow users to SELECT their own invitations  
CREATE POLICY "Users can view their own invitations"
ON public.pickup_invitations
FOR SELECT
USING (inviting_parent_id = get_current_parent_id());

-- Allow users to UPDATE their own invitations
CREATE POLICY "Users can update their own invitations" 
ON public.pickup_invitations
FOR UPDATE
USING (inviting_parent_id = get_current_parent_id());

-- Allow users to DELETE their own invitations
CREATE POLICY "Users can delete their own invitations"
ON public.pickup_invitations  
FOR DELETE
USING (inviting_parent_id = get_current_parent_id());