
-- Update the is_parent_of_student function to also check pickup authorizations
CREATE OR REPLACE FUNCTION public.is_parent_of_student(student_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- Check if user is a direct parent
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = $1 
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) OR EXISTS (
    -- Check if user is authorized to pick up this student
    SELECT 1 FROM public.pickup_authorizations pa
    JOIN public.parents p ON pa.authorized_parent_id = p.id
    WHERE pa.student_id = $1
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND pa.is_active = true
    AND CURRENT_DATE >= pa.start_date
    AND CURRENT_DATE <= pa.end_date
  );
$function$
