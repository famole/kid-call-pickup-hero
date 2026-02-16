
-- Drop and recreate get_parent_by_identifier with auth_uid column
DROP FUNCTION IF EXISTS public.get_parent_by_identifier(text);

CREATE OR REPLACE FUNCTION public.get_parent_by_identifier(identifier text)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  username text,
  phone text,
  role public.app_role,
  is_preloaded boolean,
  password_set boolean,
  created_at timestamptz,
  updated_at timestamptz,
  auth_uid uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email, p.username, p.phone, p.role, p.is_preloaded, p.password_set, p.created_at, p.updated_at, p.auth_uid
  FROM public.parents p
  WHERE (p.email = identifier OR p.username = identifier)
    AND p.deleted_at IS NULL
  LIMIT 1;
END;
$$;
