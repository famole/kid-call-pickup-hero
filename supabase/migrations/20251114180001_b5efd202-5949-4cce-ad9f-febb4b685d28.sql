-- Improve the is_current_user_admin function to be more explicit with enum handling
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT p.role INTO user_role
  FROM public.parents p
  INNER JOIN auth.users u ON u.email = p.email
  WHERE u.id = auth.uid();
  
  RETURN user_role = 'admin'::app_role OR user_role = 'superadmin'::app_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Also ensure there's a similar function for teachers
CREATE OR REPLACE FUNCTION public.is_current_user_teacher()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT p.role INTO user_role
  FROM public.parents p
  INNER JOIN auth.users u ON u.email = p.email
  WHERE u.id = auth.uid();
  
  RETURN user_role = 'teacher'::app_role OR user_role = 'admin'::app_role OR user_role = 'superadmin'::app_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- And for superadmin
CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  SELECT p.role INTO user_role
  FROM public.parents p
  INNER JOIN auth.users u ON u.email = p.email
  WHERE u.id = auth.uid();
  
  RETURN user_role = 'superadmin'::app_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;