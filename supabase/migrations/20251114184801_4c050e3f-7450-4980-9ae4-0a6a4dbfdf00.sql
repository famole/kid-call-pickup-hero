-- Fix the is_current_user_admin function with case-insensitive email matching
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  -- If no email found, return false
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get the role with case-insensitive email matching
  SELECT p.role INTO user_role
  FROM public.parents p
  WHERE lower(p.email) = lower(user_email)
  AND p.deleted_at IS NULL;
  
  -- Return true if admin or superadmin
  RETURN user_role IN ('admin'::app_role, 'superadmin'::app_role);
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but return false for security
    RAISE WARNING 'Error in is_current_user_admin: %', SQLERRM;
    RETURN false;
END;
$$;

-- Update is_current_user_teacher with same fix
CREATE OR REPLACE FUNCTION public.is_current_user_teacher()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT p.role INTO user_role
  FROM public.parents p
  WHERE lower(p.email) = lower(user_email)
  AND p.deleted_at IS NULL;
  
  RETURN user_role IN ('teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in is_current_user_teacher: %', SQLERRM;
    RETURN false;
END;
$$;

-- Update is_current_user_superadmin with same fix
CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT p.role INTO user_role
  FROM public.parents p
  WHERE lower(p.email) = lower(user_email)
  AND p.deleted_at IS NULL;
  
  RETURN user_role = 'superadmin'::app_role;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in is_current_user_superadmin: %', SQLERRM;
    RETURN false;
END;
$$;