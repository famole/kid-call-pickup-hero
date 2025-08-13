create or replace function public.get_auth_status_for_parents()
returns table (
  email text,
  has_user boolean,
  providers text[],
  email_confirmed boolean,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only admins and superadmins may use this function
  if not (public.is_current_user_admin() or public.is_current_user_superadmin()) then
    raise exception 'insufficient_privilege' using message = 'Only admins can view auth status';
  end if;

  return query
  with users_by_email as (
    select u.email,
           u.id as user_id,
           (u.confirmed_at is not null) as email_confirmed,
           u.last_sign_in_at
    from auth.users as u
  ),
  providers as (
    select i.user_id,
           array_agg(distinct i.provider::text) as providers
    from auth.identities as i
    group by i.user_id
  )
  select p.email,
         (ube.user_id is not null) as has_user,
         coalesce(pr.providers, case when ube.user_id is not null then array['password']::text[] else array[]::text[] end) as providers,
         coalesce(ube.email_confirmed, false) as email_confirmed,
         ube.last_sign_in_at
  from public.parents as p
  left join users_by_email as ube on lower(ube.email) = lower(p.email)
  left join providers as pr on pr.user_id = ube.user_id;
end;
$$;