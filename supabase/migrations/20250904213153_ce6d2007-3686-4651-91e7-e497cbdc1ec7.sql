-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_parent_by_identifier(text);

-- Recreate the function with password_hash included
CREATE OR REPLACE FUNCTION public.get_parent_by_identifier(identifier text)
 RETURNS TABLE(id uuid, name text, email text, username text, phone text, role app_role, is_preloaded boolean, password_set boolean, password_hash text, created_at timestamp with time zone, updated_at timestamp with time zone, deleted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name, p.email, p.username, p.phone, p.role, p.is_preloaded, p.password_set, p.password_hash, p.created_at, p.updated_at, p.deleted_at
  FROM public.parents p
  WHERE (p.email = identifier OR p.username = identifier)
  AND p.deleted_at IS NULL
  LIMIT 1;
$function$;