-- Create a policy that allows parents to view all other parents for pickup authorization purposes
-- This is necessary so parents can search and select other parents to authorize for student pickup

-- First, drop any conflicting policies that might be too restrictive
DROP POLICY IF EXISTS "Parents can view other parents for authorization" ON public.parents;

-- Create a new comprehensive policy for pickup authorization
-- Parents should be able to view all other parents in the system to authorize them
CREATE POLICY "Parents can view all parents for pickup authorization"
  ON public.parents
  FOR SELECT
  USING (
    -- Current user must be a parent, teacher, or admin
    EXISTS (
      SELECT 1 FROM public.parents current_parent
      WHERE current_parent.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND current_parent.role IN ('parent', 'teacher', 'admin', 'superadmin')
    )
  );

-- Ensure parents can also view students for pickup authorization purposes
-- This policy allows parents to see all students in the system for authorization
CREATE POLICY "Parents can view all students for pickup authorization"
  ON public.students
  FOR SELECT
  USING (
    -- Current user is a parent, teacher, or admin
    EXISTS (
      SELECT 1 FROM public.parents current_parent
      WHERE current_parent.email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND current_parent.role IN ('parent', 'teacher', 'admin', 'superadmin')
    )
  );