-- Update get_current_parent_id to also check user metadata for username-only users
CREATE OR REPLACE FUNCTION public.get_current_parent_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try to get by auth.uid() directly (for proper auth users)
  SELECT id FROM public.parents WHERE id = auth.uid()
  UNION
  -- Then try to get by email for email-based auth
  SELECT id FROM public.parents WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) AND email IS NOT NULL
  UNION
  -- Finally, try to get by parent_id stored in user metadata for username-only users
  SELECT id FROM public.parents WHERE id = (
    SELECT (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
  ) AND (auth.jwt() -> 'user_metadata' ->> 'parent_id') IS NOT NULL
  LIMIT 1;
$function$;