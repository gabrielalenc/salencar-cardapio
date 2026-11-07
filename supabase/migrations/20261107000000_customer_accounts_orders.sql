-- Salencar: autenticação Supabase, perfis, endereços e pedidos persistentes.
-- Execute esta migração no SQL Editor do projeto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Principal',
  recipient_name text not null default '',
  phone text not null default '',
  street text not null,
  number text not null,
  complement text not null default '',
  neighborhood text not null,
  city text not null,
  postal_code text not null,
  reference text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists addresses_one_default_per_user
  on public.addresses(user_id) where is_default;

create table if not exists public.customer_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payment_method text not null default 'pix'
    check (payment_method in ('pix', 'money', 'credit', 'debit')),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('SAL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  phone text not null,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  delivery_type text not null check (delivery_type in ('delivery', 'pickup')),
  address_snapshot jsonb not null default '{}'::jsonb,
  payment_method text not null check (payment_method in ('pix', 'money', 'credit', 'debit')),
  order_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_total_matches_subtotal check (abs(total - subtotal - delivery_fee) < 0.02)
);
create index if not exists orders_customer_created_at on public.orders(customer_id, created_at desc);
create index if not exists orders_status_created_at on public.orders(status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  product_image text not null default '',
  base_id text not null default '',
  option text not null default '',
  extras jsonb not null default '[]'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id on public.order_items(order_id);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.sync_auth_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  -- Authentication metadata can never grant administrative privileges.
  v_role := 'customer';

  insert into public.profiles (id, full_name, email, role)
  values (new.id, v_name, coalesce(new.email, ''), v_role)
  on conflict (id) do update set
    full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
    email = excluded.email,
    role = case
      when lower(profiles.email) = 'admin@salencar.com'
        and lower(excluded.email) <> 'admin@salencar.com' then 'customer'
      else profiles.role
    end,
    updated_at = now();
  return new;
end;
$$;
revoke all on function public.sync_auth_profile() from public, anon, authenticated;

drop trigger if exists salencar_auth_user_inserted on auth.users;
create trigger salencar_auth_user_inserted
  after insert on auth.users
  for each row execute function public.sync_auth_profile();
drop trigger if exists salencar_auth_user_updated on auth.users;
create trigger salencar_auth_user_updated
  after update of email, email_confirmed_at, raw_user_meta_data on auth.users
  for each row execute function public.sync_auth_profile();

-- Promove com segurança uma conta admin@salencar.com já confirmada.
insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(
         nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
         nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
         split_part(coalesce(u.email, ''), '@', 1)
       ),
       coalesce(u.email, ''),
       'customer'
from auth.users u
on conflict (id) do update set
  full_name = case when excluded.full_name <> '' then excluded.full_name else profiles.full_name end,
  email = excluded.email,
  updated_at = now();

insert into public.profiles (id, full_name, email, role)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(u.raw_user_meta_data ->> 'name'), ''), 'Administrador'),
       u.email,
       'admin'
from auth.users u
where lower(u.email) = 'admin@salencar.com' and u.email_confirmed_at is not null
on conflict (id) do update set role = 'admin', email = excluded.email, updated_at = now();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists addresses_touch_updated_at on public.addresses;
create trigger addresses_touch_updated_at before update on public.addresses
  for each row execute function public.touch_updated_at();
drop trigger if exists preferences_touch_updated_at on public.customer_preferences;
create trigger preferences_touch_updated_at before update on public.customer_preferences
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();
revoke all on function public.touch_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.customer_preferences enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "profile update self" on public.profiles;
create policy "profile update self" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "addresses own rows" on public.addresses;
create policy "addresses own rows" on public.addresses
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "preferences own row" on public.customer_preferences;
create policy "preferences own row" on public.customer_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "orders read own or admin" on public.orders;
create policy "orders read own or admin" on public.orders
  for select to authenticated using (customer_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admin update order status" on public.orders;
create policy "admin update order status" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "order items read own or admin" on public.order_items;
create policy "order items read own or admin" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or (select public.is_admin())))
  );

revoke all on public.profiles, public.addresses, public.customer_preferences, public.orders, public.order_items from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select, insert, update, delete on public.customer_preferences to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant update (status) on public.orders to authenticated;

create or replace function public.create_customer_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders;
  v_subtotal numeric(12,2);
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_item jsonb;
begin
  if v_user_id is null then raise exception 'É necessário entrar na conta para criar um pedido.' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'O pedido precisa ter ao menos um item.'; end if;
  if p_order ->> 'delivery_type' not in ('delivery', 'pickup') then raise exception 'Tipo de entrega inválido.'; end if;
  if p_order ->> 'payment_method' not in ('pix', 'money', 'credit', 'debit') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_order ->> 'delivery_type' = 'delivery' and (
    jsonb_typeof(p_order -> 'address_snapshot') <> 'object'
    or coalesce(trim(p_order #>> '{address_snapshot,street}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,number}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,neighborhood}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,city}'), '') = ''
    or length(regexp_replace(coalesce(p_order #>> '{address_snapshot,postal_code}', ''), '\D', '', 'g')) <> 8
  ) then raise exception 'Informe um endereço completo para entrega.'; end if;
  if length(regexp_replace(coalesce(p_order ->> 'phone', ''), '\D', '', 'g')) < 10 then
    raise exception 'Informe um telefone válido para o pedido.';
  end if;

  v_subtotal := coalesce((p_order ->> 'subtotal')::numeric, -1);
  v_delivery_fee := coalesce((p_order ->> 'delivery_fee')::numeric, -1);
  v_total := coalesce((p_order ->> 'total')::numeric, -1);
  if v_subtotal < 0 or v_delivery_fee < 0 or v_total < 0 or abs(v_total - v_subtotal - v_delivery_fee) >= 0.02 then
    raise exception 'Os valores do pedido são inválidos.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where coalesce((i ->> 'quantity')::integer, 0) < 1
       or coalesce((i ->> 'unit_price')::numeric, -1) < 0
       or coalesce((i ->> 'total_price')::numeric, -1) < 0
       or coalesce(i ->> 'product_id', '') = ''
       or coalesce(i ->> 'product_name', '') = ''
  ) then raise exception 'Um ou mais itens do pedido são inválidos.'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where abs((i ->> 'total_price')::numeric - ((i ->> 'unit_price')::numeric * (i ->> 'quantity')::integer)) >= 0.02
  ) then raise exception 'O total de um item não corresponde à quantidade e ao preço unitário.'; end if;
  if abs(v_subtotal - (select coalesce(sum((i ->> 'total_price')::numeric), 0) from jsonb_array_elements(p_items) i)) >= 0.02 then
    raise exception 'O subtotal não corresponde à soma dos itens.';
  end if;

  insert into public.orders (
    customer_id, customer_name, customer_email, phone, subtotal, delivery_fee, total,
    delivery_type, address_snapshot, payment_method, order_notes
  ) values (
    v_user_id,
    coalesce(nullif(trim(p_order ->> 'customer_name'), ''), (select full_name from public.profiles where id = v_user_id)),
    (select email from public.profiles where id = v_user_id),
    coalesce(nullif(trim(p_order ->> 'phone'), ''), (select phone from public.profiles where id = v_user_id)),
    v_subtotal, v_delivery_fee, v_total, p_order ->> 'delivery_type',
    coalesce(p_order -> 'address_snapshot', '{}'::jsonb), p_order ->> 'payment_method',
    coalesce(p_order ->> 'order_notes', '')
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, product_image, base_id, option, extras, quantity, unit_price, total_price
    ) values (
      v_order.id, v_item ->> 'product_id', v_item ->> 'product_name', coalesce(v_item ->> 'product_image', ''),
      coalesce(v_item ->> 'base_id', ''), coalesce(v_item ->> 'option', ''), coalesce(v_item -> 'extras', '[]'::jsonb),
      (v_item ->> 'quantity')::integer, (v_item ->> 'unit_price')::numeric, (v_item ->> 'total_price')::numeric
    );
  end loop;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'created_at', v_order.created_at, 'status', v_order.status);
end;
$$;
revoke all on function public.create_customer_order(jsonb, jsonb) from public, anon;
grant execute on function public.create_customer_order(jsonb, jsonb) to authenticated;

-- Realtime disponibiliza mudanças de status para o acompanhamento do cliente.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    execute 'alter publication supabase_realtime add table public.orders';
  end if;
end;
$$;
