-- Administrative authorization is exclusively controlled by public.profiles.role.
-- Run this as a Supabase project owner; no authenticated client can grant roles.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Keep Auth metadata limited to profile details. It can never set the role.
create or replace function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  insert into public.profiles (id, full_name, email, role)
  values (new.id, v_name, coalesce(new.email, ''), 'customer')
  on conflict (id) do update set
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;
revoke all on function public.sync_auth_profile() from public, anon, authenticated;

-- Remove any legacy/permissive policies on these tables before applying the
-- intended rules below. PostgreSQL combines permissive policies with OR.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array['profiles', 'addresses', 'customer_preferences', 'orders', 'order_items'])
  loop
    execute format('drop policy if exists %I on public.%I', v_policy.policyname, v_policy.tablename);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.customer_preferences enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profile read self or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profile update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "addresses own rows" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "preferences own row" on public.customer_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "orders read own or admin" on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));
create policy "admin update order status" on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "order items read own or admin" on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = (select auth.uid()) or (select public.is_admin()))
    )
  );

revoke all on public.profiles, public.addresses, public.customer_preferences, public.orders, public.order_items from public, anon, authenticated;
revoke insert (id, full_name, email, phone, role, created_at, updated_at),
       update (id, full_name, email, phone, role, created_at, updated_at)
  on public.profiles from public, anon, authenticated;
revoke update (id, order_number, customer_id, customer_name, customer_email, phone, subtotal, delivery_fee, total, delivery_type, address_snapshot, payment_method, order_notes, created_at, updated_at)
  on public.orders from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.customer_preferences to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;

-- Remove the one legacy email-based promotion from the previous migration.
-- The operator must grant the administrator role explicitly after this runs.
update public.profiles p
set role = 'customer', updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = 'admin@salencar.com'
  and p.role = 'admin';
