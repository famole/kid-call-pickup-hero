-- Ensure pg_cron extension is enabled
create extension if not exists pg_cron with schema extensions;

-- Function to auto-complete called pickup requests older than 5 minutes
create or replace function public.auto_complete_expired_requests()
returns void
language plpgsql
as $$
begin
  -- Mark requests that have been in 'called' for >= 5 minutes as 'completed'
  update public.pickup_requests
  set status = 'completed'
  where status = 'called'
    and request_time <= now() - interval '5 minutes';
end;
$$;

-- Optional: index to help the function run fast (safe if it already exists)
create index if not exists idx_pickup_requests_status_request_time
  on public.pickup_requests (status, request_time);

-- Remove any existing cron with the same name to avoid duplicates
select cron.unschedule(jobid)
from cron.job
where jobname = 'auto-complete-expired-pickup-requests';

-- Schedule the job to run every 5 minutes
select cron.schedule(
  'auto-complete-expired-pickup-requests',
  '*/5 * * * *',
  $$select public.auto_complete_expired_requests();$$
);
