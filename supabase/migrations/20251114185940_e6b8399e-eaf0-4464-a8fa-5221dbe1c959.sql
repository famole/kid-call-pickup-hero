-- Drop all RLS policies on school_activities
DROP POLICY IF EXISTS "Admins can delete activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.school_activities;
DROP POLICY IF EXISTS "Admins can update activities" ON public.school_activities;
DROP POLICY IF EXISTS "Anyone can view activities" ON public.school_activities;

-- Disable RLS on school_activities table
ALTER TABLE public.school_activities DISABLE ROW LEVEL SECURITY;