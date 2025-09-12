-- Add username field to parents table
ALTER TABLE public.parents 
ADD COLUMN username text UNIQUE;

-- Create index for username lookups
CREATE INDEX idx_parents_username ON public.parents(username);

-- Add constraint to ensure either email or username is present
ALTER TABLE public.parents 
ADD CONSTRAINT check_email_or_username 
CHECK ((email IS NOT NULL AND email != '') OR (username IS NOT NULL AND username != ''));

-- Create function to get parent by username or email
CREATE OR REPLACE FUNCTION public.get_parent_by_identifier(identifier text)
RETURNS TABLE(
    id uuid,
    name text,
    email text,
    username text,
    phone text,
    role app_role,
    is_preloaded boolean,
    password_set boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.id, p.name, p.email, p.username, p.phone, p.role, p.is_preloaded, p.password_set, p.created_at, p.updated_at, p.deleted_at
  FROM public.parents p
  WHERE (p.email = identifier OR p.username = identifier)
  AND p.deleted_at IS NULL
  LIMIT 1;
$$;