-- Drop the current view policy
DROP POLICY IF EXISTS "Anyone can view activities" ON public.school_activities;

-- Create a new policy that filters activities based on parent's students' classes
CREATE POLICY "Users can view relevant activities"
ON public.school_activities
FOR SELECT
USING (
  -- Admins, teachers, and superadmins can see all activities
  get_current_user_role() IN ('admin', 'teacher', 'superadmin')
  OR
  -- Parents can see activities for their students' classes
  (
    get_current_user_role() = 'parent' AND (
      -- Activities not assigned to any specific class (global activities)
      (
        class_id IS NULL 
        AND NOT EXISTS (
          SELECT 1 FROM activity_classes ac 
          WHERE ac.activity_id = school_activities.id
        )
      )
      OR
      -- Activities assigned to classes where the parent has students
      EXISTS (
        SELECT 1 
        FROM student_parents sp
        JOIN students s ON s.id = sp.student_id
        WHERE sp.parent_id = get_current_parent_id()
        AND (
          s.class_id = school_activities.class_id
          OR EXISTS (
            SELECT 1 FROM activity_classes ac
            WHERE ac.activity_id = school_activities.id
            AND ac.class_id = s.class_id
          )
        )
      )
    )
  )
  OR
  -- Non-authenticated users can see global activities only
  (
    auth.uid() IS NULL 
    AND class_id IS NULL 
    AND NOT EXISTS (
      SELECT 1 FROM activity_classes ac 
      WHERE ac.activity_id = school_activities.id
    )
  )
);