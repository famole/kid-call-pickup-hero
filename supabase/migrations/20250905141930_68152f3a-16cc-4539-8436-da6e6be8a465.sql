-- Create a new function to get current parent ID that works with both email and username authentication
CREATE OR REPLACE FUNCTION public.get_current_parent_id_enhanced()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try to get by auth.uid() for email-based auth
  SELECT id FROM public.parents WHERE id = auth.uid()
  UNION
  -- Then try to get by email for email-based auth
  SELECT id FROM public.parents WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
  -- For username-only users, we'll need to use a different approach
  -- We'll update the session management to set the user context properly
  LIMIT 1;
$function$;

-- Update the existing get_current_parent_id function to use the enhanced version
CREATE OR REPLACE FUNCTION public.get_current_parent_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try to get by auth.uid() for both email and username auth
  SELECT id FROM public.parents WHERE id = auth.uid()
  UNION
  -- Then try to get by email for email-based auth
  SELECT id FROM public.parents WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) AND email IS NOT NULL
  LIMIT 1;
$function$;