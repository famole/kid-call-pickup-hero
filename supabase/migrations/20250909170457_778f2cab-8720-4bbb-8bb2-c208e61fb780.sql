-- Fix get_current_parent_id function to properly handle username users
CREATE OR REPLACE FUNCTION public.get_current_parent_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_uuid uuid;
  user_metadata jsonb;
  parent_id_text text;
BEGIN
  -- Check if auth.uid() directly matches a parent ID (for proper auth users)
  SELECT id INTO parent_uuid FROM public.parents WHERE id = auth.uid();
  IF parent_uuid IS NOT NULL THEN
    RETURN parent_uuid;
  END IF;
  
  -- Try to get by email for email-based auth
  SELECT id INTO parent_uuid FROM public.parents WHERE email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) AND email IS NOT NULL;
  IF parent_uuid IS NOT NULL THEN
    RETURN parent_uuid;
  END IF;
  
  -- For username-only users, extract from user metadata
  SELECT raw_user_meta_data INTO user_metadata FROM auth.users WHERE id = auth.uid();
  IF user_metadata IS NOT NULL THEN
    -- Try different possible keys in metadata
    parent_id_text := user_metadata ->> 'parent_id';
    IF parent_id_text IS NOT NULL AND parent_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN parent_id_text::uuid;
    END IF;
    
    -- Also try 'parentId' key as fallback
    parent_id_text := user_metadata ->> 'parentId';
    IF parent_id_text IS NOT NULL AND parent_id_text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN parent_id_text::uuid;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;