
-- Enable Row Level Security on the parents table
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own parent record
CREATE POLICY "Users can view their own parent record" 
  ON public.parents 
  FOR SELECT 
  USING (email = public.get_current_user_email());

-- Policy to allow users to update their own parent record
CREATE POLICY "Users can update their own parent record" 
  ON public.parents 
  FOR UPDATE 
  USING (email = public.get_current_user_email());

-- Policy to allow superadmins to view all parent records
CREATE POLICY "Superadmins can view all parent records" 
  ON public.parents 
  FOR SELECT 
  USING (public.is_current_user_superadmin());

-- Policy to allow superadmins to insert new parent records
CREATE POLICY "Superadmins can insert parent records" 
  ON public.parents 
  FOR INSERT 
  WITH CHECK (public.is_current_user_superadmin());

-- Policy to allow superadmins to update all parent records
CREATE POLICY "Superadmins can update all parent records" 
  ON public.parents 
  FOR UPDATE 
  USING (public.is_current_user_superadmin());

-- Policy to allow superadmins to delete parent records
CREATE POLICY "Superadmins can delete parent records" 
  ON public.parents 
  FOR DELETE 
  USING (public.is_current_user_superadmin());

-- Policy to allow admins to view parent records with lower roles
CREATE POLICY "Admins can view parent records with lower roles" 
  ON public.parents 
  FOR SELECT 
  USING (
    public.is_current_user_admin() AND 
    public.can_manage_user(role)
  );

-- Policy to allow admins to insert parent records with lower roles
CREATE POLICY "Admins can insert parent records with lower roles" 
  ON public.parents 
  FOR INSERT 
  WITH CHECK (
    public.is_current_user_admin() AND 
    public.can_manage_user(role)
  );

-- Policy to allow admins to update parent records with lower roles
CREATE POLICY "Admins can update parent records with lower roles" 
  ON public.parents 
  FOR UPDATE 
  USING (
    public.is_current_user_admin() AND 
    public.can_manage_user(role)
  );

-- Policy to allow admins to delete parent records with lower roles
CREATE POLICY "Admins can delete parent records with lower roles" 
  ON public.parents 
  FOR DELETE 
  USING (
    public.is_current_user_admin() AND 
    public.can_manage_user(role)
  );

-- Policy to allow teachers to view parent records (parents and other teachers)
CREATE POLICY "Teachers can view parent records" 
  ON public.parents 
  FOR SELECT 
  USING (
    public.is_current_user_teacher() AND 
    (role = 'parent' OR role = 'teacher')
  );

-- Policy to allow teachers to insert parent records (parents only)
CREATE POLICY "Teachers can insert parent records" 
  ON public.parents 
  FOR INSERT 
  WITH CHECK (
    public.is_current_user_teacher() AND 
    role = 'parent'
  );

-- Policy to allow teachers to update parent records (parents only)
CREATE POLICY "Teachers can update parent records" 
  ON public.parents 
  FOR UPDATE 
  USING (
    public.is_current_user_teacher() AND 
    role = 'parent'
  );

-- Policy to allow teachers to delete parent records (parents only)
CREATE POLICY "Teachers can delete parent records" 
  ON public.parents 
  FOR DELETE 
  USING (
    public.is_current_user_teacher() AND 
    role = 'parent'
  );
