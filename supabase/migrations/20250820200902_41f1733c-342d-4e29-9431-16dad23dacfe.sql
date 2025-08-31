-- CRITICAL SECURITY FIX: Remove dangerous public access policy for pickup_requests
-- This policy allows anyone to access all pickup request data, creating serious safety risks

-- Drop the overly permissive policy that allows all operations with no restrictions
DROP POLICY IF EXISTS "Allow all operations on pickup_requests" ON public.pickup_requests;

-- Ensure we have secure, specific policies in place
-- (The existing restrictive policies will remain active)

-- Add a comprehensive secure policy for viewing pickup requests
-- Only allow access to:
-- 1. Parents viewing their own requests or requests for their children
-- 2. Teachers and admins for school operations
-- 3. Authorized pickup persons for students they can pick up
CREATE POLICY "Secure view pickup requests" ON public.pickup_requests
FOR SELECT 
USING (
  -- Parent viewing their own requests
  parent_id = get_current_parent_id() 
  OR 
  -- Parent viewing requests for their children (direct parent relationship)
  EXISTS (
    SELECT 1 FROM student_parents sp 
    WHERE sp.student_id = pickup_requests.student_id 
    AND sp.parent_id = get_current_parent_id()
  )
  OR 
  -- Authorized pickup person viewing requests for students they can pick up
  EXISTS (
    SELECT 1 FROM pickup_authorizations pa 
    WHERE pa.student_id = pickup_requests.student_id 
    AND pa.authorized_parent_id = get_current_parent_id()
    AND pa.is_active = true
    AND CURRENT_DATE >= pa.start_date 
    AND CURRENT_DATE <= pa.end_date
  )
  OR 
  -- Teachers and admins can view all requests for school operations
  get_current_user_role() IN ('teacher', 'admin', 'superadmin')
);

-- Ensure insert operations are properly restricted
-- Only allow parents to create requests for their own children or authorized children
CREATE POLICY "Secure insert pickup requests" ON public.pickup_requests
FOR INSERT 
WITH CHECK (
  -- Must be the requesting parent
  parent_id = get_current_parent_id()
  AND
  (
    -- Either direct parent of the student
    EXISTS (
      SELECT 1 FROM student_parents sp 
      WHERE sp.student_id = pickup_requests.student_id 
      AND sp.parent_id = get_current_parent_id()
    )
    OR
    -- Or authorized to pick up the student
    EXISTS (
      SELECT 1 FROM pickup_authorizations pa 
      WHERE pa.student_id = pickup_requests.student_id 
      AND pa.authorized_parent_id = get_current_parent_id()
      AND pa.is_active = true
      AND CURRENT_DATE >= pa.start_date 
      AND CURRENT_DATE <= pa.end_date
    )
  )
);

-- Secure update operations - only allow status updates by authorized personnel
CREATE POLICY "Secure update pickup requests" ON public.pickup_requests
FOR UPDATE 
USING (
  -- Parents can update their own requests
  parent_id = get_current_parent_id()
  OR 
  -- Teachers and admins can update any request (for status changes)
  get_current_user_role() IN ('teacher', 'admin', 'superadmin')
);

-- Secure delete operations - only allow deletion by request owner or admins
CREATE POLICY "Secure delete pickup requests" ON public.pickup_requests
FOR DELETE 
USING (
  -- Parents can delete their own requests
  parent_id = get_current_parent_id()
  OR 
  -- Admins can delete any request
  get_current_user_role() IN ('admin', 'superadmin')
);