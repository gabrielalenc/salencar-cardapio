-- Idempotently create a missing profile for the currently authenticated user.
-- The user ID is obtained from auth.uid(); clients cannot choose another ID or role.
create or replace function public.ensure_customer_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to create a profile.' using errcode = '42501';
  end if;

  select
    coalesce(u.email, ''),
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )
  into v_email, v_name
  from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception 'Authenticated user was not found.' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (v_user_id, v_name, v_email, 'customer')
  on conflict (id) do update set
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else profiles.full_name
    end,
    email = excluded.email,
    updated_at = now();
end;
$$;

revoke all on function public.ensure_customer_profile() from public, anon;
grant execute on function public.ensure_customer_profile() to authenticated;
