-- Keep quoting and sending as separate steps. Opening WhatsApp never changes
-- the order state; an administrator confirms the send explicitly.

alter table public.orders
  add column if not exists delivery_quote_sent_at timestamptz,
  add column if not exists delivery_quote_sent_by uuid references public.profiles(id) on delete set null;

create table if not exists public.order_delivery_quote_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_quote numeric(12,2) not null check (delivery_quote between 0 and 100000),
  total numeric(12,2) not null check (total >= subtotal),
  quoted_at timestamptz not null,
  quoted_by uuid references public.profiles(id) on delete set null,
  status text not null default 'quoted' check (status in ('quoted', 'sent', 'accepted', 'rejected')),
  sent_at timestamptz,
  sent_by uuid references public.profiles(id) on delete set null
);
create unique index if not exists order_delivery_quote_history_order_quoted_at
  on public.order_delivery_quote_history(order_id, quoted_at);
create index if not exists order_delivery_quote_history_quoted_at
  on public.order_delivery_quote_history(quoted_at desc);

alter table public.order_delivery_quote_history enable row level security;
drop policy if exists "admins read delivery quote history" on public.order_delivery_quote_history;
create policy "admins read delivery quote history"
  on public.order_delivery_quote_history for select to authenticated
  using ((select public.is_admin()));
revoke all on public.order_delivery_quote_history from public, anon, authenticated;
grant select on public.order_delivery_quote_history to authenticated;

-- Preserve the latest quote already saved on each existing order as its initial
-- history entry before the new quote lifecycle starts.
insert into public.order_delivery_quote_history
  (order_id, subtotal, delivery_quote, total, quoted_at, quoted_by, status, sent_at, sent_by)
select id, subtotal, delivery_quote, total,
       coalesce(delivery_quote_at, updated_at, created_at), delivery_quote_by,
       case when delivery_quote_response = 'accepted' then 'accepted'
         when delivery_quote_response = 'rejected' then 'rejected'
         when delivery_quote_sent_at is not null then 'sent' else 'quoted' end,
       delivery_quote_sent_at, delivery_quote_sent_by
from public.orders
where delivery_quote is not null
on conflict (order_id, quoted_at) do nothing;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in (
    'new', 'awaiting_delivery_quote', 'delivery_quote_ready',
    'awaiting_customer_approval', 'confirmed', 'preparing', 'out_for_delivery',
    'completed', 'quote_rejected', 'cancelled'
  ));

-- Quotes that were awaiting customer approval before this migration now require
-- the administrator to confirm their actual send. Their saved price is kept.
update public.orders
set status = 'delivery_quote_ready'
where delivery_type = 'delivery'
  and status = 'awaiting_customer_approval'
  and delivery_quote is not null
  and delivery_quote_sent_at is null;

create or replace function public.guard_delivery_quote_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'delivery_quote_ready'
     and new.delivery_type = 'delivery'
     and new.delivery_quote is null then
    raise exception 'Salve a cotação antes de marcar esta etapa.' using errcode = '42501';
  end if;

  if new.status = 'awaiting_customer_approval'
     and new.delivery_type = 'delivery'
     and new.delivery_quote_sent_at is null then
    raise exception 'O administrador precisa confirmar o envio da cotação.' using errcode = '42501';
  end if;

  if old.status in ('awaiting_delivery_quote', 'delivery_quote_ready', 'awaiting_customer_approval', 'quote_rejected')
     and new.delivery_type = 'delivery'
     and new.status in ('confirmed', 'preparing', 'out_for_delivery', 'completed')
     and new.delivery_quote_response is distinct from 'accepted' then
    raise exception 'O cliente precisa aprovar uma cotação válida antes da confirmação.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_delivery_quote_status() from public, anon, authenticated;

create or replace function public.save_delivery_quote(p_order_id uuid, p_delivery_quote numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente um administrador pode salvar a cotação.' using errcode = '42501';
  end if;
  if p_delivery_quote is null or p_delivery_quote < 0 or p_delivery_quote > 100000 then
    raise exception 'Informe um valor de entrega válido.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.delivery_type <> 'delivery' then raise exception 'Pedidos para retirada não precisam de cotação.'; end if;
  if v_order.status not in ('awaiting_delivery_quote', 'delivery_quote_ready', 'awaiting_customer_approval') then
    raise exception 'Este pedido não aceita mais alterações na cotação.';
  end if;

  update public.orders
  set delivery_quote = round(p_delivery_quote, 2),
      delivery_fee = round(p_delivery_quote, 2),
      total = subtotal + round(p_delivery_quote, 2),
      delivery_quote_at = clock_timestamp(),
      delivery_quote_by = auth.uid(),
      delivery_quote_sent_at = null,
      delivery_quote_sent_by = null,
      delivery_quote_response = null,
      delivery_quote_responded_at = null,
      status = 'delivery_quote_ready'
  where id = p_order_id
  returning * into v_order;

  insert into public.order_delivery_quote_history
    (order_id, subtotal, delivery_quote, total, quoted_at, quoted_by, status)
  values (v_order.id, v_order.subtotal, v_order.delivery_quote, v_order.total,
          v_order.delivery_quote_at, v_order.delivery_quote_by, 'quoted');

  return jsonb_build_object(
    'id', v_order.id, 'order_number', v_order.order_number,
    'delivery_quote', v_order.delivery_quote, 'delivery_fee', v_order.delivery_fee,
    'subtotal', v_order.subtotal, 'total', v_order.total, 'status', v_order.status,
    'delivery_quote_at', v_order.delivery_quote_at,
    'delivery_quote_sent_at', v_order.delivery_quote_sent_at
  );
end;
$$;
revoke all on function public.save_delivery_quote(uuid, numeric) from public, anon;
grant execute on function public.save_delivery_quote(uuid, numeric) to authenticated;

create or replace function public.mark_delivery_quote_sent(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Somente um administrador pode confirmar o envio da cotação.' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'P0002'; end if;
  if v_order.delivery_type <> 'delivery' or v_order.delivery_quote is null then
    raise exception 'Este pedido não possui uma cotação de entrega salva.' using errcode = '22023';
  end if;
  if v_order.status not in ('delivery_quote_ready', 'awaiting_customer_approval') then
    raise exception 'Este pedido não está aguardando o envio da cotação.' using errcode = '22023';
  end if;

  if v_order.delivery_quote_sent_at is null then
    update public.orders
    set delivery_quote_sent_at = clock_timestamp(),
        delivery_quote_sent_by = auth.uid(),
        status = 'awaiting_customer_approval'
    where id = p_order_id
    returning * into v_order;

    update public.order_delivery_quote_history
    set sent_at = v_order.delivery_quote_sent_at,
        sent_by = v_order.delivery_quote_sent_by,
        status = 'sent'
    where id = (
      select id from public.order_delivery_quote_history
      where order_id = v_order.id and status = 'quoted'
      order by quoted_at desc limit 1
    );
  end if;

  return jsonb_build_object(
    'id', v_order.id, 'order_number', v_order.order_number,
    'status', v_order.status, 'delivery_quote_sent_at', v_order.delivery_quote_sent_at
  );
end;
$$;
revoke all on function public.mark_delivery_quote_sent(uuid) from public, anon;
grant execute on function public.mark_delivery_quote_sent(uuid) to authenticated;

create or replace function public.respond_to_delivery_quote(p_order_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_status text;
  v_response text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para responder à cotação.' using errcode = '42501'; end if;
  if p_accept is null then raise exception 'Informe se deseja aceitar a cotação.' using errcode = '22023'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id <> auth.uid() then
    raise exception 'Pedido não encontrado para esta conta.' using errcode = '42501';
  end if;
  if v_order.status <> 'awaiting_customer_approval'
     or v_order.delivery_quote is null
     or v_order.delivery_quote_sent_at is null then
    raise exception 'Este pedido ainda não possui uma cotação enviada e pendente de resposta.';
  end if;

  v_status := case when p_accept then 'confirmed' else 'quote_rejected' end;
  v_response := case when p_accept then 'accepted' else 'rejected' end;
  update public.orders
  set status = v_status, delivery_quote_response = v_response, delivery_quote_responded_at = clock_timestamp()
  where id = p_order_id
  returning * into v_order;

  update public.order_delivery_quote_history
  set status = v_response
  where id = (
    select id from public.order_delivery_quote_history
    where order_id = v_order.id and status = 'sent'
    order by quoted_at desc limit 1
  );

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number,
    'status', v_order.status, 'delivery_quote_response', v_order.delivery_quote_response,
    'delivery_quote_responded_at', v_order.delivery_quote_responded_at);
end;
$$;
revoke all on function public.respond_to_delivery_quote(uuid, boolean) from public, anon;
grant execute on function public.respond_to_delivery_quote(uuid, boolean) to authenticated;
