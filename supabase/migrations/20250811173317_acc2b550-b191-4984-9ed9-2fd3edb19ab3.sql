-- Fix RLS policy to avoid per-row auth.jwt() evaluation
-- Drop the existing policy
DROP POLICY IF EXISTS "Parents can view their authorizations" ON public.pickup_authorizations;

-- Recreate the policy with auth.jwt() wrapped in a subselect per Supabase recommendation
CREATE POLICY "Parents can view their authorizations"
ON public.pickup_authorizations
FOR SELECT
USING (
  (
    authorizing_parent_id IN (
      SELECT p.id
      FROM public.parents p
      WHERE p.email = ((SELECT auth.jwt()) ->> 'email')
    )
  ) OR (
    authorized_parent_id IN (
      SELECT p.id
      FROM public.parents p
      WHERE p.email = ((SELECT auth.jwt()) ->> 'email')
    )
  )
);
