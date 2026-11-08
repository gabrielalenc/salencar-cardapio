-- Delivery is quoted by an authorized administrator; customers can only
-- accept or decline a saved quote for their own order.

alter table public.orders
  add column if not exists delivery_quote numeric(12,2),
  add column if not exists delivery_quote_at timestamptz,
  add column if not exists delivery_quote_by uuid references public.profiles(id) on delete set null,
  add column if not exists delivery_quote_response text,
  add column if not exists delivery_quote_responded_at timestamptz;

alter table public.orders drop constraint if exists orders_delivery_quote_check;
alter table public.orders add constraint orders_delivery_quote_check
  check (delivery_quote is null or delivery_quote >= 0);
alter table public.orders drop constraint if exists orders_delivery_quote_response_check;
alter table public.orders add constraint orders_delivery_quote_response_check
  check (delivery_quote_response is null or delivery_quote_response in ('accepted', 'rejected'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'new', 'awaiting_delivery_quote', 'awaiting_customer_approval', 'confirmed',
    'preparing', 'out_for_delivery', 'completed', 'quote_rejected', 'cancelled'
  ));

create or replace function public.initialize_order_delivery_quote()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.delivery_fee := 0;
  new.total := new.subtotal;
  new.delivery_quote := null;
  new.delivery_quote_at := null;
  new.delivery_quote_by := null;
  new.delivery_quote_response := null;
  new.delivery_quote_responded_at := null;
  if new.delivery_type = 'delivery' then
    new.status := 'awaiting_delivery_quote';
  else
    new.status := 'confirmed';
  end if;
  return new;
end;
$$;
revoke all on function public.initialize_order_delivery_quote() from public, anon, authenticated;
drop trigger if exists orders_initialize_delivery_quote on public.orders;
create trigger orders_initialize_delivery_quote
  before insert on public.orders
  for each row execute function public.initialize_order_delivery_quote();

create or replace function public.guard_delivery_quote_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status in ('awaiting_delivery_quote', 'awaiting_customer_approval', 'quote_rejected')
     and new.delivery_type = 'delivery'
     and new.status in ('confirmed', 'preparing', 'out_for_delivery', 'completed')
     and new.delivery_quote_response is distinct from 'accepted' then
    raise exception 'O cliente precisa aprovar uma cotação válida antes da confirmação.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_delivery_quote_status() from public, anon, authenticated;
drop trigger if exists orders_guard_delivery_quote_status on public.orders;
create trigger orders_guard_delivery_quote_status
  before update of status, delivery_quote_response on public.orders
  for each row execute function public.guard_delivery_quote_status();

create or replace function public.save_delivery_quote(p_order_id uuid, p_delivery_quote numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente um administrador pode salvar a cotação.' using errcode = '42501';
  end if;
  if p_delivery_quote is null or p_delivery_quote < 0 or p_delivery_quote > 100000 then
    raise exception 'Informe um valor de entrega válido.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;
  if v_order.delivery_type <> 'delivery' then raise exception 'Pedidos para retirada não precisam de cotação.'; end if;
  if v_order.status not in ('awaiting_delivery_quote', 'awaiting_customer_approval') then
    raise exception 'Este pedido não aceita mais alterações na cotação.';
  end if;

  update public.orders
  set delivery_quote = round(p_delivery_quote, 2),
      delivery_fee = round(p_delivery_quote, 2),
      total = subtotal + round(p_delivery_quote, 2),
      delivery_quote_at = now(),
      delivery_quote_by = auth.uid(),
      delivery_quote_response = null,
      delivery_quote_responded_at = null,
      status = 'awaiting_customer_approval'
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number,
    'delivery_quote', v_order.delivery_quote, 'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal, 'total', v_order.total, 'status', v_order.status,
    'delivery_quote_at', v_order.delivery_quote_at);
end;
$$;
revoke all on function public.save_delivery_quote(uuid, numeric) from public, anon;
grant execute on function public.save_delivery_quote(uuid, numeric) to authenticated;

create or replace function public.respond_to_delivery_quote(p_order_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_status text;
  v_response text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para responder à cotação.' using errcode = '42501'; end if;
  if p_accept is null then raise exception 'Informe se deseja aceitar a cotação.'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id <> auth.uid() then
    raise exception 'Pedido não encontrado para esta conta.' using errcode = '42501';
  end if;
  if v_order.status <> 'awaiting_customer_approval' or v_order.delivery_quote is null then
    raise exception 'Este pedido não possui uma cotação pendente válida.';
  end if;

  v_status := case when p_accept then 'confirmed' else 'quote_rejected' end;
  v_response := case when p_accept then 'accepted' else 'rejected' end;
  update public.orders
  set status = v_status, delivery_quote_response = v_response, delivery_quote_responded_at = now()
  where id = p_order_id
  returning * into v_order;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number,
    'status', v_order.status, 'delivery_quote_response', v_order.delivery_quote_response,
    'delivery_quote_responded_at', v_order.delivery_quote_responded_at);
end;
$$;
revoke all on function public.respond_to_delivery_quote(uuid, boolean) from public, anon;
grant execute on function public.respond_to_delivery_quote(uuid, boolean) to authenticated;
