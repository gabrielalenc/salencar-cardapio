-- Admin dashboard, catalog costs and authoritative manual/automatic inventory.
-- Existing orders and catalog prices are preserved. Inventory starts at zero
-- (unconfigured) and automatic deduction starts disabled.

alter table public.catalog_products
  add column if not exists unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  add column if not exists available boolean not null default true;

revoke all on public.catalog_products from public, anon, authenticated;
grant select (product_id, product_name, product_image, price, active, available, bases, extras, updated_at)
  on public.catalog_products to anon, authenticated;
drop policy if exists "catalog public read" on public.catalog_products;
create policy "catalog public read" on public.catalog_products
  for select to anon, authenticated using (true);
revoke update on public.catalog_products from public, anon, authenticated;
revoke update (price, active, available, unit_cost) on public.catalog_products from public, anon, authenticated;

create table if not exists public.inventory_settings (
  id smallint primary key default 1 check (id = 1),
  automatic_control boolean not null default false,
  low_stock_limit integer not null default 5 check (low_stock_limit >= 0),
  updated_at timestamptz not null default now()
);
insert into public.inventory_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.inventory_items (
  stock_item_id text primary key,
  name text not null,
  quantity integer not null default 0 check (quantity >= 0),
  manual_available boolean not null default true,
  updated_at timestamptz not null default now()
);

-- These are existing sellable Salencar products/options; zero means the owner
-- has not entered a real balance yet. No example quantities are inserted.
insert into public.inventory_items (stock_item_id, name) values
  ('morango-com-alcool', 'Morango'),
  ('maracuja-com-alcool', 'Maracujá'),
  ('limao-com-alcool', 'Limão'),
  ('morango-creme-avela', 'Morango com creme de avelã'),
  ('maracuja-creme-avela', 'Maracujá com creme de avelã'),
  ('limao-creme-avela', 'Limão com creme de avelã'),
  ('batida-espanhola', 'Batida Espanhola')
on conflict (stock_item_id) do nothing;

alter table public.inventory_settings enable row level security;
alter table public.inventory_items enable row level security;
revoke all on public.inventory_settings, public.inventory_items from public, anon, authenticated;
drop policy if exists "inventory admin read settings" on public.inventory_settings;
create policy "inventory admin read settings" on public.inventory_settings
  for select to authenticated using ((select public.is_admin()));
drop policy if exists "inventory admin read items" on public.inventory_items;
create policy "inventory admin read items" on public.inventory_items
  for select to authenticated using ((select public.is_admin()));
grant select on public.inventory_settings, public.inventory_items to authenticated;

create or replace function public.admin_set_inventory_settings(p_automatic_control boolean, p_low_stock_limit integer)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_settings public.inventory_settings;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente administradores podem alterar o controle de estoque.' using errcode = '42501';
  end if;
  if p_automatic_control is null or p_low_stock_limit is null or p_low_stock_limit not between 0 and 1000000 then
    raise exception 'Configuração de estoque inválida.' using errcode = '22023';
  end if;
  insert into public.inventory_settings (id, automatic_control, low_stock_limit, updated_at)
  values (1, p_automatic_control, p_low_stock_limit, now())
  on conflict (id) do update set automatic_control = excluded.automatic_control,
    low_stock_limit = excluded.low_stock_limit, updated_at = now()
  returning * into v_settings;
  return to_jsonb(v_settings);
end;
$$;
revoke all on function public.admin_set_inventory_settings(boolean, integer) from public, anon;
grant execute on function public.admin_set_inventory_settings(boolean, integer) to authenticated;

create or replace function public.admin_set_inventory_item(p_stock_item_id text, p_quantity integer, p_manual_available boolean)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_item public.inventory_items;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente administradores podem alterar o estoque.' using errcode = '42501';
  end if;
  if p_stock_item_id is null or p_quantity is null or p_quantity not between 0 and 1000000 or p_manual_available is null then
    raise exception 'Quantidade ou disponibilidade inválida.' using errcode = '22023';
  end if;
  update public.inventory_items set quantity = p_quantity, manual_available = p_manual_available, updated_at = now()
  where stock_item_id = p_stock_item_id returning * into v_item;
  if not found then raise exception 'Item de estoque não encontrado.' using errcode = 'P0002'; end if;
  return to_jsonb(v_item);
end;
$$;
revoke all on function public.admin_set_inventory_item(text, integer, boolean) from public, anon;
grant execute on function public.admin_set_inventory_item(text, integer, boolean) to authenticated;

create or replace function public.admin_list_catalog_costs()
returns table(product_id text, unit_cost numeric)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente administradores podem consultar custos.' using errcode = '42501';
  end if;
  return query select p.product_id, p.unit_cost from public.catalog_products p order by p.product_name;
end;
$$;
revoke all on function public.admin_list_catalog_costs() from public, anon;
grant execute on function public.admin_list_catalog_costs() to authenticated;

create or replace function public.admin_update_catalog_product(p_product_id text, p_changes jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_product public.catalog_products;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente administradores podem alterar o catálogo.' using errcode = '42501';
  end if;
  if p_product_id is null or jsonb_typeof(p_changes) is distinct from 'object'
     or p_changes - array['price', 'active', 'available', 'unit_cost'] <> '{}'::jsonb then
    raise exception 'Dados do produto inválidos.' using errcode = '22023';
  end if;
  update public.catalog_products set
    price = case when p_changes ? 'price' then (p_changes ->> 'price')::numeric else price end,
    active = case when p_changes ? 'active' then (p_changes ->> 'active')::boolean else active end,
    available = case when p_changes ? 'available' then (p_changes ->> 'available')::boolean else available end,
    unit_cost = case when p_changes ? 'unit_cost' then nullif(p_changes ->> 'unit_cost', '')::numeric else unit_cost end,
    updated_at = now()
  where product_id = p_product_id returning * into v_product;
  if not found then raise exception 'Produto não encontrado.' using errcode = 'P0002'; end if;
  return jsonb_build_object('product_id', v_product.product_id, 'price', v_product.price,
    'active', v_product.active, 'available', v_product.available, 'unit_cost', v_product.unit_cost);
end;
$$;
revoke all on function public.admin_update_catalog_product(text, jsonb) from public, anon;
grant execute on function public.admin_update_catalog_product(text, jsonb) to authenticated;

-- Exposes only stock identifiers and availability, never quantities.
create or replace function public.get_public_inventory_availability()
returns table(stock_item_id text, available boolean)
language sql stable security definer set search_path = public, pg_temp
as $$
  select i.stock_item_id,
    i.manual_available and (not coalesce(s.automatic_control, false) or i.quantity > 0)
  from public.inventory_items i
  left join public.inventory_settings s on s.id = 1;
$$;
revoke all on function public.get_public_inventory_availability() from public;
grant execute on function public.get_public_inventory_availability() to anon, authenticated;

-- Resolve each order line to the real inventory units it consumes.
create or replace function public.order_stock_requirements(p_order_id uuid)
returns table(stock_item_id text, required_quantity integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  with lines as (
    select i.product_id, i.base_id, i.quantity,
      regexp_match(i.base_id, '^dupla-(.+)--(.+)$') as pair
    from public.order_items i where i.order_id = p_order_id
  ), expanded as (
    select case
      when pair is null then product_id
      when pair[1] = 'morango' then 'morango-com-alcool'
      when pair[1] = 'maracuja' then 'maracuja-com-alcool'
      when pair[1] = 'limao' then 'limao-com-alcool'
      else pair[1]
    end as stock_item_id, quantity from lines
    union all
    select case
      when pair[2] = 'morango' then 'morango-com-alcool'
      when pair[2] = 'maracuja' then 'maracuja-com-alcool'
      when pair[2] = 'limao' then 'limao-com-alcool'
      else pair[2]
    end, quantity from lines where pair is not null
  )
  select e.stock_item_id, sum(e.quantity)::integer
  from expanded e
  group by e.stock_item_id;
$$;
revoke all on function public.order_stock_requirements(uuid) from public, anon, authenticated;

-- Refuse checkout when an item has been manually paused or automatic stock is
-- enabled and the order exceeds the current balance. This never reserves stock.
create or replace function public.validate_order_inventory()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_settings public.inventory_settings;
begin
  select * into v_settings from public.inventory_settings where id = 1;
  if not found then return new; end if;
  if exists (
    select 1 from public.order_stock_requirements(new.order_id) r
    left join public.inventory_items i on i.stock_item_id = r.stock_item_id
    where i.stock_item_id is null or not i.manual_available
      or (v_settings.automatic_control and i.quantity < r.required_quantity)
  ) then
    raise exception 'Um ou mais sabores ficaram indisponíveis ou não têm estoque suficiente.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_order_inventory() from public, anon, authenticated;
drop trigger if exists order_items_validate_inventory on public.order_items;
create trigger order_items_validate_inventory after insert on public.order_items
  for each row execute function public.validate_order_inventory();

alter table public.orders
  add column if not exists stock_deducted_at timestamptz,
  add column if not exists stock_restored_at timestamptz;

create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_settings public.inventory_settings;
  v_requirement record;
  v_item public.inventory_items;
  v_old_confirmed boolean;
  v_new_confirmed boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente administradores podem atualizar pedidos.' using errcode = '42501';
  end if;
  if p_status not in ('new', 'awaiting_delivery_quote', 'awaiting_customer_approval', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'quote_rejected', 'cancelled') then
    raise exception 'Status de pedido inválido.' using errcode = '22023';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.status = p_status then return jsonb_build_object('id', v_order.id, 'status', v_order.status); end if;

  v_old_confirmed := v_order.status in ('confirmed', 'preparing', 'out_for_delivery', 'completed');
  v_new_confirmed := p_status in ('confirmed', 'preparing', 'out_for_delivery', 'completed');
  select * into v_settings from public.inventory_settings where id = 1 for share;

  if not v_old_confirmed and v_new_confirmed and coalesce(v_settings.automatic_control, false) then
    for v_requirement in
      select * from public.order_stock_requirements(v_order.id) order by stock_item_id
    loop
      select * into v_item from public.inventory_items where stock_item_id = v_requirement.stock_item_id for update;
      if not found or not v_item.manual_available or v_item.quantity < v_requirement.required_quantity then
        raise exception 'Estoque insuficiente para %.', coalesce(v_item.name, v_requirement.stock_item_id) using errcode = 'P0001';
      end if;
      update public.inventory_items set quantity = quantity - v_requirement.required_quantity, updated_at = now()
      where stock_item_id = v_requirement.stock_item_id;
    end loop;
    v_order.stock_deducted_at := now();
    v_order.stock_restored_at := null;
  elsif v_old_confirmed and p_status = 'cancelled' and v_order.stock_deducted_at is not null and v_order.stock_restored_at is null then
    for v_requirement in
      select * from public.order_stock_requirements(v_order.id) order by stock_item_id
    loop
      update public.inventory_items set quantity = quantity + v_requirement.required_quantity, updated_at = now()
      where stock_item_id = v_requirement.stock_item_id;
    end loop;
    v_order.stock_restored_at := now();
  end if;

  update public.orders set status = p_status, stock_deducted_at = v_order.stock_deducted_at,
    stock_restored_at = v_order.stock_restored_at
  where id = v_order.id returning * into v_order;
  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number,
    'status', v_order.status, 'stock_deducted_at', v_order.stock_deducted_at,
    'stock_restored_at', v_order.stock_restored_at);
end;
$$;
revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
revoke update on public.orders from public, anon, authenticated;
