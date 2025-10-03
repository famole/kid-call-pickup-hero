-- Grant execute permissions on get_parent_by_identifier to allow password setup
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_by_identifier(text) TO service_role;