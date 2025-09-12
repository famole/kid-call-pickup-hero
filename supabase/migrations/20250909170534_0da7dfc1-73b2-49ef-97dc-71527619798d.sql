-- Create a debug function to check what's in user metadata
CREATE OR REPLACE FUNCTION public.debug_user_auth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'auth_uid', auth.uid(),
    'user_exists', EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid()),
    'user_metadata', (SELECT raw_user_meta_data FROM auth.users WHERE id = auth.uid()),
    'user_email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'parent_found_by_uid', (SELECT id FROM public.parents WHERE id = auth.uid()),
    'current_parent_id_result', get_current_parent_id()
  );
END;
$$;