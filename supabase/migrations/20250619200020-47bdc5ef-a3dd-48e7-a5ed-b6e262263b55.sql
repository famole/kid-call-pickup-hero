
-- Enable Row Level Security on pickup_authorizations table if not already enabled
ALTER TABLE public.pickup_authorizations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view pickup authorizations where they are the authorizing parent
CREATE POLICY "Users can view their own authorizations" 
  ON public.pickup_authorizations 
  FOR SELECT 
  USING (authorizing_parent_id = public.get_current_parent_id());

-- Policy to allow users to view pickup authorizations where they are the authorized parent
CREATE POLICY "Users can view authorizations for them" 
  ON public.pickup_authorizations 
  FOR SELECT 
  USING (authorized_parent_id = public.get_current_parent_id());

-- Policy to allow superadmins to view all pickup authorizations
CREATE POLICY "Superadmins can view all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR SELECT 
  USING (public.is_current_user_superadmin());

-- Policy to allow admins to view all pickup authorizations
CREATE POLICY "Admins can view all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR SELECT 
  USING (public.is_current_user_admin());

-- Policy to allow teachers to view all pickup authorizations
CREATE POLICY "Teachers can view all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR SELECT 
  USING (public.is_current_user_teacher());

-- Policy to allow users to create pickup authorizations (as authorizing parent)
CREATE POLICY "Users can create pickup authorizations" 
  ON public.pickup_authorizations 
  FOR INSERT 
  WITH CHECK (authorizing_parent_id = public.get_current_parent_id());

-- Policy to allow superadmins to insert pickup authorizations
CREATE POLICY "Superadmins can insert pickup authorizations" 
  ON public.pickup_authorizations 
  FOR INSERT 
  WITH CHECK (public.is_current_user_superadmin());

-- Policy to allow admins to insert pickup authorizations
CREATE POLICY "Admins can insert pickup authorizations" 
  ON public.pickup_authorizations 
  FOR INSERT 
  WITH CHECK (public.is_current_user_admin());

-- Policy to allow users to update their own pickup authorizations
CREATE POLICY "Users can update their own pickup authorizations" 
  ON public.pickup_authorizations 
  FOR UPDATE 
  USING (authorizing_parent_id = public.get_current_parent_id());

-- Policy to allow superadmins to update all pickup authorizations
CREATE POLICY "Superadmins can update all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR UPDATE 
  USING (public.is_current_user_superadmin());

-- Policy to allow admins to update all pickup authorizations
CREATE POLICY "Admins can update all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR UPDATE 
  USING (public.is_current_user_admin());

-- Policy to allow users to delete their own pickup authorizations
CREATE POLICY "Users can delete their own pickup authorizations" 
  ON public.pickup_authorizations 
  FOR DELETE 
  USING (authorizing_parent_id = public.get_current_parent_id());

-- Policy to allow superadmins to delete all pickup authorizations
CREATE POLICY "Superadmins can delete all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR DELETE 
  USING (public.is_current_user_superadmin());

-- Policy to allow admins to delete all pickup authorizations
CREATE POLICY "Admins can delete all pickup authorizations" 
  ON public.pickup_authorizations 
  FOR DELETE 
  USING (public.is_current_user_admin());
