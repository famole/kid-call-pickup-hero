-- Fix the auto_complete_expired_requests function to work with actual pickup_requests table schema
DROP FUNCTION IF EXISTS public.auto_complete_expired_requests() CASCADE;

CREATE OR REPLACE FUNCTION public.auto_complete_expired_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update pickup requests that have been in 'called' status for more than 5 minutes
  UPDATE public.pickup_requests
  SET status = 'completed'
  WHERE status = 'called'
    AND request_time <= now() - interval '5 minutes';
END;
$$;

-- Grant execute permission to postgres role for cron jobs
GRANT EXECUTE ON FUNCTION public.auto_complete_expired_requests() TO postgres;

-- Also grant to authenticated users so the client-side backup can call it
GRANT EXECUTE ON FUNCTION public.auto_complete_expired_requests() TO authenticated;