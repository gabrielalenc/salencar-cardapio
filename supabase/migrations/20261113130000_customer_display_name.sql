-- Keep the customer's chosen Salencar name separate from provider metadata.
alter table public.profiles
  add column if not exists display_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_valid
      check (display_name is null or length(btrim(display_name)) between 1 and 80);
  end if;
end;
$$;

revoke update (display_name) on public.profiles from public, anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- The browser cannot choose the customer name stored on a new order. Read it
-- from the RLS-protected profile and keep the existing idempotent transaction.
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
  v_role text;
  v_display_name text;
  v_existing public.orders;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta para criar um pedido.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'A chave de confirmação do pedido está ausente.' using errcode = '22023';
  end if;

  select role, nullif(btrim(display_name), '')
    into v_role, v_display_name
  from public.profiles
  where id = v_user_id;
  if v_role is distinct from 'customer' then
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
      'status', v_existing.status,
      'customer_name', v_existing.customer_name
    );
  end if;

  if v_display_name is null then
    raise exception 'Defina seu nome de exibição antes de fazer um pedido.' using errcode = '22023';
  end if;

  perform set_config('salencar.idempotency_key', p_idempotency_key::text, true);
  v_result := public.create_customer_order(
    coalesce(p_order, '{}'::jsonb) || jsonb_build_object('customer_name', v_display_name),
    p_items
  );
  return v_result || jsonb_build_object('customer_name', v_display_name);
end;
$$;
revoke all on function public.create_customer_order_idempotent(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.create_customer_order_idempotent(jsonb, jsonb, uuid) to authenticated;
