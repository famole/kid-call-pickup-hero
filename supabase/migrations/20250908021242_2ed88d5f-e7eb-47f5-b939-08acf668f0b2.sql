-- Fix security issue by creating a proper function to get parent ID from user metadata
-- Remove the insecure RLS policies and create a secure function

-- Create a secure function to get parent_id from user metadata
CREATE OR REPLACE FUNCTION public.get_parent_id_from_metadata()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE 
    WHEN auth.jwt() -> 'user_metadata' ->> 'parent_id' IS NOT NULL 
    THEN (auth.jwt() -> 'user_metadata' ->> 'parent_id')::uuid
    ELSE NULL
  END;
$function$;

-- Update get_current_parent_id to use the secure function
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
  -- Finally, try to get by parent_id from user metadata for username-only users
  SELECT get_parent_id_from_metadata()
  WHERE get_parent_id_from_metadata() IS NOT NULL
  LIMIT 1;
$function$;

-- Drop existing insecure policies
DROP POLICY IF EXISTS "pickup_requests_select_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_insert_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_update_policy" ON pickup_requests;
DROP POLICY IF EXISTS "pickup_requests_delete_policy" ON pickup_requests;

-- Create secure policies using the security definer functions
CREATE POLICY "pickup_requests_select_policy" 
ON pickup_requests FOR SELECT 
USING (
  -- For all users - use the secure get_current_parent_id function
  parent_id = get_current_parent_id()
  OR
  -- Allow if user is parent of the student (direct relationship)
  EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND sp.parent_id = get_current_parent_id()
  )
  OR
  -- Allow if user has pickup authorization for the student
  EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND pa.authorized_parent_id = get_current_parent_id()
    AND pa.is_active = true 
    AND CURRENT_DATE >= pa.start_date 
    AND CURRENT_DATE <= pa.end_date
  )
  OR
  -- Admin/teacher access
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "pickup_requests_insert_policy"
ON pickup_requests FOR INSERT
WITH CHECK (
  -- User must own the request and be parent of the student
  parent_id = get_current_parent_id()
  AND EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND sp.parent_id = get_current_parent_id()
  )
);

CREATE POLICY "pickup_requests_update_policy"
ON pickup_requests FOR UPDATE
USING (
  -- User owns the request or has admin/teacher privileges
  parent_id = get_current_parent_id()
  OR
  get_current_user_role() = ANY(ARRAY['teacher'::app_role, 'admin'::app_role, 'superadmin'::app_role])
);

CREATE POLICY "pickup_requests_delete_policy"
ON pickup_requests FOR DELETE
USING (
  -- User owns the request or has admin privileges
  parent_id = get_current_parent_id()
  OR
  get_current_user_role() = ANY(ARRAY['admin'::app_role, 'superadmin'::app_role])
);