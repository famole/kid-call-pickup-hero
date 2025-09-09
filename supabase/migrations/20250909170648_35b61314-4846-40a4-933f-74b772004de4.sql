-- Create a function to set the username user context
-- This will temporarily store the parent_id in a session variable that can be accessed by get_current_parent_id()
CREATE OR REPLACE FUNCTION public.set_username_user_context(parent_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Store the parent_id in a custom session variable
  -- This is a workaround for username users who don't have proper Supabase auth sessions
  PERFORM set_config('app.current_parent_id', parent_id::text, true);
END;
$$;

-- Update get_current_parent_id to also check the session variable
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
  session_parent_id text;
BEGIN
  -- First check if we have a session variable set (for username users)
  session_parent_id := current_setting('app.current_parent_id', true);
  IF session_parent_id IS NOT NULL AND session_parent_id != '' THEN
    BEGIN
      RETURN session_parent_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Invalid UUID format, continue with other methods
    END;
  END IF;

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