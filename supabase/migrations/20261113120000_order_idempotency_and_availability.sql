-- Make order retries safe and enforce current product availability at checkout.
-- Apply after 20261111120000_admin_dashboard_inventory.sql.

alter table public.orders
  add column if not exists idempotency_key uuid;

create unique index if not exists orders_customer_idempotency_key_unique
  on public.orders (customer_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.assign_order_idempotency_key()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare v_key text;
begin
  v_key := nullif(current_setting('salencar.idempotency_key', true), '');
  if v_key is not null then new.idempotency_key := v_key::uuid; end if;
  return new;
end;
$$;
revoke all on function public.assign_order_idempotency_key() from public, anon, authenticated;
drop trigger if exists orders_assign_idempotency_key on public.orders;
create trigger orders_assign_idempotency_key
  before insert on public.orders
  for each row execute function public.assign_order_idempotency_key();

-- Serialize retries by customer and key, then return the already-created order.
-- The existing trusted order function still validates catalog data and writes
-- the order plus its lines in one database transaction.
create or replace function public.create_customer_order_idempotent(
  p_order jsonb,
  p_items jsonb,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.orders;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta para criar um pedido.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'A chave de confirmação do pedido está ausente.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = v_user_id and role = 'customer') then
    raise exception 'Somente clientes podem criar pedidos.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_idempotency_key::text, 0));
  select * into v_existing from public.orders
  where customer_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'order_number', v_existing.order_number,
      'created_at', v_existing.created_at,
      'status', v_existing.status
    );
  end if;

  perform set_config('salencar.idempotency_key', p_idempotency_key::text, true);
  v_result := public.create_customer_order(p_order, p_items);
  return v_result;
end;
$$;
revoke all on function public.create_customer_order_idempotent(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.create_customer_order_idempotent(jsonb, jsonb, uuid) to authenticated;
-- Prevent older clients from bypassing the idempotency wrapper.
revoke all on function public.create_customer_order(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.validate_order_inventory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.inventory_settings;
  v_product public.catalog_products;
begin
  select * into v_product from public.catalog_products where product_id = new.product_id;
  if not found or not v_product.active or not v_product.available then
    raise exception 'Um produto do pedido está pausado ou indisponível.' using errcode = 'P0001';
  end if;

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
