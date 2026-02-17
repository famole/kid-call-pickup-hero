
-- Update get_current_parent_id to also check auth_uid column
CREATE OR REPLACE FUNCTION public.get_current_parent_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  parent_uuid uuid;
  user_metadata jsonb;
  parent_id_text text;
  session_parent_id text;
  current_user_email text;
  current_auth_uid uuid;
BEGIN
  -- 1. Check session variable (for username users via set_username_user_context)
  session_parent_id := current_setting('app.current_parent_id', true);
  IF session_parent_id IS NOT NULL AND session_parent_id != '' THEN
    BEGIN
      RETURN session_parent_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL; -- continue
    END;
  END IF;

  current_auth_uid := auth.uid();

  -- 2. Check auth_uid column (fastest, covers all linked users)
  IF current_auth_uid IS NOT NULL THEN
    SELECT id INTO parent_uuid FROM public.parents
    WHERE auth_uid = current_auth_uid AND deleted_at IS NULL;
    IF parent_uuid IS NOT NULL THEN
      RETURN parent_uuid;
    END IF;
  END IF;

  -- 3. Fallback: email matching
  IF current_auth_uid IS NOT NULL THEN
    SELECT email INTO current_user_email FROM auth.users WHERE id = current_auth_uid;
    IF current_user_email IS NOT NULL THEN
      SELECT id INTO parent_uuid FROM public.parents
      WHERE lower(email) = lower(current_user_email) AND deleted_at IS NULL;
      IF parent_uuid IS NOT NULL THEN
        -- Auto-link auth_uid for future fast lookups
        UPDATE public.parents SET auth_uid = current_auth_uid
        WHERE id = parent_uuid AND auth_uid IS NULL;
        RETURN parent_uuid;
      END IF;
    END IF;
  END IF;

  -- 4. Check if auth.uid() directly matches a parent ID
  IF current_auth_uid IS NOT NULL THEN
    SELECT id INTO parent_uuid FROM public.parents WHERE id = current_auth_uid AND deleted_at IS NULL;
    IF parent_uuid IS NOT NULL THEN
      RETURN parent_uuid;
    END IF;
  END IF;

  -- 5. For username-only users (anonymous session), extract from metadata
  IF current_auth_uid IS NOT NULL THEN
    SELECT raw_user_meta_data INTO user_metadata FROM auth.users WHERE id = current_auth_uid;
    IF user_metadata IS NOT NULL THEN
      parent_id_text := user_metadata ->> 'parent_id';
      IF parent_id_text IS NOT NULL AND parent_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN parent_id_text::uuid;
      END IF;
      parent_id_text := user_metadata ->> 'parentId';
      IF parent_id_text IS NOT NULL AND parent_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN parent_id_text::uuid;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- Update get_current_user_role to use get_current_parent_id (supports username users)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  parent_uuid uuid;
BEGIN
  parent_uuid := get_current_parent_id();
  IF parent_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT role FROM public.parents WHERE id = parent_uuid AND deleted_at IS NULL);
END;
$$;

-- Update get_current_user_email to use get_current_parent_id (supports username users)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  parent_uuid uuid;
BEGIN
  -- For username-only users, return NULL (they have no email)
  parent_uuid := get_current_parent_id();
  IF parent_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT email FROM public.parents WHERE id = parent_uuid AND deleted_at IS NULL);
END;
$$;

-- Update is_current_user_admin to use get_current_parent_id
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  parent_uuid uuid;
BEGIN
  parent_uuid := get_current_parent_id();
  IF parent_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT role INTO user_role FROM public.parents
  WHERE id = parent_uuid AND deleted_at IS NULL;
  
  RETURN user_role IN ('admin'::app_role, 'superadmin'::app_role);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in is_current_user_admin: %', SQLERRM;
    RETURN false;
END;
$$;

-- Update is_current_user_teacher to use get_current_parent_id
CREATE OR REPLACE FUNCTION public.is_current_user_teacher()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  parent_uuid uuid;
BEGIN
  parent_uuid := get_current_parent_id();
  IF parent_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT role INTO user_role FROM public.parents
  WHERE id = parent_uuid AND deleted_at IS NULL;
  
  RETURN user_role IN ('teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in is_current_user_teacher: %', SQLERRM;
    RETURN false;
END;
$$;

-- Update is_current_user_superadmin to use get_current_parent_id
CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  parent_uuid uuid;
BEGIN
  parent_uuid := get_current_parent_id();
  IF parent_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT role INTO user_role FROM public.parents
  WHERE id = parent_uuid AND deleted_at IS NULL;
  
  RETURN user_role = 'superadmin'::app_role;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in is_current_user_superadmin: %', SQLERRM;
    RETURN false;
END;
$$;
