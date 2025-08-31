-- Fix RLS policy for pickup_invitations to allow updates by invited users
-- The issue is that when accepting invitations, the current user might not have a parent record yet
-- or there's a timing issue between parent creation and the update

DROP POLICY IF EXISTS "Allow invitation updates" ON public.pickup_invitations;

-- Create a new policy that allows updates by:
-- 1. The creator (inviting parent)
-- 2. Anyone whose auth email matches the invited_email (even without parent record)
CREATE POLICY "Allow invitation updates by creator or invited user"
ON public.pickup_invitations
FOR UPDATE
USING (
  -- Allow the creator to update
  inviting_parent_id = get_current_parent_id()
  OR
  -- Allow the invited person to update by matching their auth email directly
  invited_email = get_current_user_email()
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  inviting_parent_id = get_current_parent_id()
  OR
  invited_email = get_current_user_email()
);