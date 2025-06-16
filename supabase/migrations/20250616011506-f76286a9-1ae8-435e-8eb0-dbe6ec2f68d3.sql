
-- Update any existing admin users to superadmin if needed (you can modify this query as needed)
-- This is just an example - you'll want to set your own email as superadmin
UPDATE public.parents 
SET role = 'superadmin' 
WHERE email = 'admin@example.com'; -- Replace with your actual email

-- Create a function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_current_user_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.parents 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND role = 'superadmin'
  );
$function$;

-- Create a function to get user role hierarchy level (higher number = more permissions)
CREATE OR REPLACE FUNCTION public.get_user_role_level(user_role app_role)
RETURNS integer
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE 
    WHEN user_role = 'superadmin' THEN 4
    WHEN user_role = 'admin' THEN 3
    WHEN user_role = 'teacher' THEN 2
    WHEN user_role = 'parent' THEN 1
    ELSE 0
  END;
$function$;

-- Create a function to check if current user can manage another user based on role hierarchy
CREATE OR REPLACE FUNCTION public.can_manage_user(target_user_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_user_role_level(
    (SELECT role FROM public.parents 
     WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
     LIMIT 1)
  ) > public.get_user_role_level(target_user_role);
$function$;
