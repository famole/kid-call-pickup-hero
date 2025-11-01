-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to complete all pending pickup requests
CREATE OR REPLACE FUNCTION public.complete_all_pending_pickup_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pickup_requests
  SET status = 'completed'
  WHERE status IN ('pending', 'called');
END;
$$;

-- Schedule the job to run daily at 21:00 UTC (18:00 UTC-3)
SELECT cron.schedule(
  'complete-pending-pickups-daily',
  '0 21 * * *', -- Every day at 21:00 UTC
  $$
  SELECT public.complete_all_pending_pickup_requests();
  $$
);