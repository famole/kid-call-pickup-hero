-- Create get_parent_by_identifier_pwd function for username authentication with password
CREATE OR REPLACE FUNCTION public.get_parent_by_identifier_pwd(identifier text)
RETURNS TABLE(
    id uuid,
    name text,
    email text,
    username text,
    phone text,
    role app_role,
    is_preloaded boolean,
    password_set boolean,
    password_hash text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.email, p.username, p.phone, p.role, p.is_preloaded, p.password_set, p.password_hash, p.created_at, p.updated_at, p.deleted_at
  FROM public.parents p
  WHERE (p.email = identifier OR p.username = identifier)
  AND p.deleted_at IS NULL
  LIMIT 1;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier_pwd(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier_pwd(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier_pwd(text) TO service_role;
