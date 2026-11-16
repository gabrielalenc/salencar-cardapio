-- Persist authenticated customer carts while keeping each row private to its owner.
-- Run after the existing customer account/profile migrations.

create table if not exists public.customer_carts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  tombstones jsonb not null default '{}'::jsonb check (jsonb_typeof(tombstones) = 'object'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table public.customer_carts enable row level security;
revoke all on public.customer_carts from public, anon, authenticated;
grant select on public.customer_carts to authenticated;
drop policy if exists "customer carts read own" on public.customer_carts;
create policy "customer carts read own" on public.customer_carts
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.get_customer_cart()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.customer_carts;
begin
  if v_user_id is null then raise exception 'Entre na sua conta para sincronizar a sacola.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.role = 'customer') then
    raise exception 'Somente clientes podem sincronizar a sacola.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 73021));
  insert into public.customer_carts (user_id) values (v_user_id) on conflict (user_id) do nothing;
  select * into v_row from public.customer_carts where user_id = v_user_id for update;
  if v_row.expires_at <= now() and (v_row.items <> '[]'::jsonb or v_row.tombstones <> '{}'::jsonb) then
    update public.customer_carts set items = '[]'::jsonb, tombstones = '{}'::jsonb,
      revision = revision + 1, updated_at = now(), last_activity_at = now(), expires_at = now() + interval '30 days'
    where user_id = v_user_id returning * into v_row;
  end if;
  return jsonb_build_object(
    'items', v_row.items, 'tombstones', v_row.tombstones, 'revision', v_row.revision,
    'createdAt', floor(extract(epoch from v_row.created_at) * 1000)::bigint,
    'lastActivityAt', floor(extract(epoch from v_row.last_activity_at) * 1000)::bigint,
    'expiresAt', floor(extract(epoch from v_row.expires_at) * 1000)::bigint
  );
end;
$$;
revoke all on function public.get_customer_cart() from public, anon;
grant execute on function public.get_customer_cart() to authenticated;

create or replace function public.save_customer_cart(p_items jsonb, p_tombstones jsonb, p_expected_revision integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.customer_carts;
  v_now timestamptz := now();
begin
  if v_user_id is null then raise exception 'Entre na sua conta para salvar a sacola.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.role = 'customer') then
    raise exception 'Somente clientes podem salvar a sacola.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then raise exception 'Itens da sacola inválidos.' using errcode = '22023'; end if;
  if jsonb_typeof(p_tombstones) <> 'object' or (select count(*) from jsonb_object_keys(p_tombstones)) > 5000 then raise exception 'Remoções da sacola inválidas.' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where coalesce(item ->> 'cart_key', '') = ''
      or coalesce(item ->> 'product_id', '') = ''
      or item ->> 'base_id' is null
      or coalesce((item ->> 'quantity')::integer, 0) < 1
      or coalesce((item ->> 'quantity')::integer, 0) > 1000000
      or jsonb_typeof(coalesce(item -> 'extras', '[]'::jsonb)) <> 'array'
      or length(coalesce(item ->> 'notes', '')) > 500
  ) then raise exception 'Um ou mais itens da sacola são inválidos.' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 73021));
  insert into public.customer_carts (user_id) values (v_user_id) on conflict (user_id) do nothing;
  select * into v_row from public.customer_carts where user_id = v_user_id for update;
  if v_row.revision <> coalesce(p_expected_revision, 0) then
    return jsonb_build_object('conflict', true, 'cart', jsonb_build_object(
      'items', v_row.items, 'tombstones', v_row.tombstones, 'revision', v_row.revision,
      'createdAt', floor(extract(epoch from v_row.created_at) * 1000)::bigint,
      'lastActivityAt', floor(extract(epoch from v_row.last_activity_at) * 1000)::bigint,
      'expiresAt', floor(extract(epoch from v_row.expires_at) * 1000)::bigint
    ));
  end if;
  update public.customer_carts set items = p_items, tombstones = p_tombstones,
    revision = revision + 1, updated_at = v_now, last_activity_at = v_now,
    expires_at = v_now + interval '30 days'
  where user_id = v_user_id returning * into v_row;
  return jsonb_build_object('conflict', false, 'revision', v_row.revision,
    'lastActivityAt', floor(extract(epoch from v_row.last_activity_at) * 1000)::bigint,
    'expiresAt', floor(extract(epoch from v_row.expires_at) * 1000)::bigint);
end;
$$;
revoke all on function public.save_customer_cart(jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_customer_cart(jsonb, jsonb, integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_carts') then
    execute 'alter publication supabase_realtime add table public.customer_carts';
  end if;
end;
$$;
