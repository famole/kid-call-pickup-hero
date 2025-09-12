-- Test the get_current_parent_id function and temporarily disable RLS for debugging
-- First, let's create a test function to check what auth.uid() returns
CREATE OR REPLACE FUNCTION public.debug_auth_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'auth_uid', auth.uid(),
    'user_email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'user_metadata', (SELECT raw_user_meta_data FROM auth.users WHERE id = auth.uid()),
    'parent_by_uid', (SELECT id FROM public.parents WHERE id = auth.uid()),
    'parent_by_email', (SELECT id FROM public.parents WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())),
    'get_current_parent_id_result', get_current_parent_id()
  );
END;
$$;