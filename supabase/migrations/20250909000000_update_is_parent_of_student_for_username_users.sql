-- Update is_parent_of_student to support username-only parents by using get_current_parent_id
CREATE OR REPLACE FUNCTION public.is_parent_of_student(student_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_parents sp
    WHERE sp.student_id = $1
      AND sp.parent_id = get_current_parent_id()
  ) OR EXISTS (
    SELECT 1
    FROM public.pickup_authorizations pa
    WHERE pa.student_id = $1
      AND pa.authorized_parent_id = get_current_parent_id()
      AND pa.is_active = true
      AND CURRENT_DATE >= pa.start_date
      AND CURRENT_DATE <= pa.end_date
  );
$function$;
