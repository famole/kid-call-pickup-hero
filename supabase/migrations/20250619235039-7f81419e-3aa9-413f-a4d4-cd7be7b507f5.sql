
-- First, let's identify and remove orphaned pickup_history records that reference non-existent students
DELETE FROM public.pickup_history 
WHERE student_id NOT IN (SELECT id FROM public.students);

-- Also remove pickup_history records that reference non-existent parents
DELETE FROM public.pickup_history 
WHERE parent_id NOT IN (SELECT id FROM public.parents);

-- Now add foreign key constraints to pickup_history table (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_pickup_history_student') THEN
        ALTER TABLE public.pickup_history 
        ADD CONSTRAINT fk_pickup_history_student 
        FOREIGN KEY (student_id) REFERENCES public.students(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_pickup_history_parent') THEN
        ALTER TABLE public.pickup_history 
        ADD CONSTRAINT fk_pickup_history_parent 
        FOREIGN KEY (parent_id) REFERENCES public.parents(id);
    END IF;
END $$;

-- Enable RLS on pickup_history table
ALTER TABLE public.pickup_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Superadmins can view all pickup history" ON public.pickup_history;
    DROP POLICY IF EXISTS "Admins can view all pickup history" ON public.pickup_history;
    DROP POLICY IF EXISTS "Teachers can view all pickup history" ON public.pickup_history;
    DROP POLICY IF EXISTS "Parents can view their students pickup history" ON public.pickup_history;
    
    -- Create new policies
    CREATE POLICY "Superadmins can view all pickup history" 
      ON public.pickup_history 
      FOR SELECT 
      USING (public.is_current_user_superadmin());

    CREATE POLICY "Admins can view all pickup history" 
      ON public.pickup_history 
      FOR SELECT 
      USING (public.is_current_user_admin());

    CREATE POLICY "Teachers can view all pickup history" 
      ON public.pickup_history 
      FOR SELECT 
      USING (public.is_current_user_teacher());

    CREATE POLICY "Parents can view their students pickup history" 
      ON public.pickup_history 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.student_parents sp
          WHERE sp.student_id = pickup_history.student_id 
          AND sp.parent_id = public.get_current_parent_id()
        )
      );
END $$;

-- Enable RLS on students table if not already enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Handle students table policies
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Superadmins can view all students" ON public.students;
    DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
    DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;
    DROP POLICY IF EXISTS "Parents can view their own students" ON public.students;
    
    -- Create new policies
    CREATE POLICY "Superadmins can view all students" 
      ON public.students 
      FOR SELECT 
      USING (public.is_current_user_superadmin());

    CREATE POLICY "Admins can view all students" 
      ON public.students 
      FOR SELECT 
      USING (public.is_current_user_admin());

    CREATE POLICY "Teachers can view all students" 
      ON public.students 
      FOR SELECT 
      USING (public.is_current_user_teacher());

    CREATE POLICY "Parents can view their own students" 
      ON public.students 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.student_parents sp
          WHERE sp.student_id = students.id 
          AND sp.parent_id = public.get_current_parent_id()
        )
      );
END $$;
