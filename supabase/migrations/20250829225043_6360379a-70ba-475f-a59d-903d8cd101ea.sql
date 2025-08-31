-- Fix the recursive RLS policy by using existing security definer functions
-- Drop the problematic policy
DROP POLICY IF EXISTS "Parents can view all parents for pickup authorization" ON public.parents;
DROP POLICY IF EXISTS "Parents can view all students for pickup authorization" ON public.students;

-- Create proper policies using existing security definer functions
-- Parents should be able to view all other parents to authorize them for pickup
CREATE POLICY "Parents can view all parents for pickup authorization"
  ON public.parents
  FOR SELECT
  USING (
    -- Current user must be authenticated and have a parent record
    get_current_user_role() IN ('parent', 'teacher', 'admin', 'superadmin')
  );

-- Ensure parents can view all students for pickup authorization
-- This allows parents to see all students when creating pickup authorizations
CREATE POLICY "Parents can view all students for pickup authorization"  
  ON public.students
  FOR SELECT
  USING (
    -- Current user is a parent, teacher, or admin
    get_current_user_role() IN ('parent', 'teacher', 'admin', 'superadmin')
  );