-- Fix RLS policy to avoid per-row auth.uid() evaluation on pickup_requests
DROP POLICY IF EXISTS "Users can create pickup requests for their students" ON public.pickup_requests;

CREATE POLICY "Users can create pickup requests for their students"
ON public.pickup_requests
FOR INSERT
WITH CHECK (
  (parent_id = (SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.student_parents sp
    WHERE sp.student_id = public.pickup_requests.student_id
      AND sp.parent_id = (SELECT auth.uid())
  )
);
