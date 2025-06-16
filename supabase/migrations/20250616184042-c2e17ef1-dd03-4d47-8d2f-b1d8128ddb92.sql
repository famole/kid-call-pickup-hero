
-- Create the function to auto-complete expired pickup requests
CREATE OR REPLACE FUNCTION public.auto_complete_expired_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pickup_requests
  SET status = 'completed'
  WHERE status = 'called'
    AND request_time < (now() - interval '5 minutes');
END;
$$;

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every 5 minutes
SELECT cron.schedule(
  'auto-complete-expired-requests',
  '*/5 * * * *', -- Every 5 minutes
  'SELECT public.auto_complete_expired_requests();'
);
