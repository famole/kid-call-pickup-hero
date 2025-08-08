-- Harden function: set search_path and use SECURITY DEFINER, and restrict execution
create or replace function public.auto_complete_expired_requests()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pickup_requests
  set status = 'completed'
  where status = 'called'
    and request_time <= now() - interval '5 minutes';
end;
$$;

-- Restrict who can execute this function (cron runs as database owner)
revoke all on function public.auto_complete_expired_requests() from public, anon, authenticated;
