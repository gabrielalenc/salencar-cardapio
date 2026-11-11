-- Keep order prices and product details authoritative in the database.
-- Existing orders and customer data are not modified by this migration.

create table if not exists public.catalog_products (
  product_id text primary key,
  product_name text not null,
  product_image text not null,
  price numeric(12,2) not null check (price >= 0),
  active boolean not null default true,
  bases jsonb not null default '[]'::jsonb check (jsonb_typeof(bases) = 'array'),
  extras jsonb not null default '[]'::jsonb check (jsonb_typeof(extras) = 'array'),
  updated_at timestamptz not null default now()
);

insert into public.catalog_products (product_id, product_name, product_image, price, bases, extras)
values
  ('morango-com-alcool', 'Batida de Morango com álcool', '/images/batida-morango.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb,
   '[{"id":"calda-morango","name":"Calda extra de morango na borda","price":2.5},{"id":"leite-condensado","name":"Dose extra de leite condensado","price":2}]'::jsonb),
  ('maracuja-com-alcool', 'Batida de Maracujá com álcool', '/images/batida-maracuja.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb,
   '[{"id":"calda-maracuja","name":"Polpa extra com sementes","price":2.5},{"id":"leite-condensado","name":"Dose extra de leite condensado","price":2}]'::jsonb),
  ('limao-com-alcool', 'Batida de Limão com álcool', '/images/batida-limao.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb, '[]'::jsonb),
  ('morango-creme-avela', 'Batida de Morango com creme de avelã', '/images/batida-morango.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb,
   '[{"id":"calda-morango","name":"Calda extra de morango na borda","price":2.5},{"id":"leite-condensado","name":"Dose extra de leite condensado","price":2}]'::jsonb),
  ('maracuja-creme-avela', 'Batida de Maracujá com creme de avelã', '/images/batida-maracuja.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb,
   '[{"id":"calda-maracuja","name":"Polpa extra com sementes","price":2.5},{"id":"leite-condensado","name":"Dose extra de leite condensado","price":2}]'::jsonb),
  ('limao-creme-avela', 'Batida de Limão com creme de avelã', '/images/batida-limao-creme-avela.jpg', 15,
   '[{"id":"com-alcool","name":"Com álcool","price":0}]'::jsonb, '[]'::jsonb),
  ('batida-espanhola', 'Batida Espanhola', '/images/batida-espanhola.jpg', 19.9,
   '[{"id":"vinho-suave","name":"Vinho tinto suave","price":0},{"id":"vinho-seco","name":"Vinho tinto seco","price":0}]'::jsonb,
   '[{"id":"dose-abacaxi","name":"Pedaços extras de abacaxi","price":2.5},{"id":"leite-condensado","name":"Dose extra de leite condensado","price":2}]'::jsonb),
  ('combo-2-batidas-alcoolicas', 'Duplas de Batidas', '/images/header-batidas.png', 25,
   (select jsonb_agg(jsonb_build_object(
      'id', 'dupla-' || first_flavor.id || '--' || second_flavor.id,
      'name', case when first_flavor.id = second_flavor.id then '2x ' || first_flavor.name else first_flavor.name || ' + ' || second_flavor.name end,
      'price', 0
    ) order by first_flavor.ordinal, second_flavor.ordinal)
    from (values
      (1, 'morango', 'Morango'),
      (2, 'morango-creme-avela', 'Morango com creme de avelã'),
      (3, 'maracuja', 'Maracujá'),
      (4, 'maracuja-creme-avela', 'Maracujá com creme de avelã'),
      (5, 'limao', 'Limão'),
      (6, 'limao-creme-avela', 'Limão com creme de avelã')
    ) as first_flavor(ordinal, id, name)
    join (values
      (1, 'morango', 'Morango'),
      (2, 'morango-creme-avela', 'Morango com creme de avelã'),
      (3, 'maracuja', 'Maracujá'),
      (4, 'maracuja-creme-avela', 'Maracujá com creme de avelã'),
      (5, 'limao', 'Limão'),
      (6, 'limao-creme-avela', 'Limão com creme de avelã')
    ) as second_flavor(ordinal, id, name) on first_flavor.ordinal <= second_flavor.ordinal),
   '[]'::jsonb)
on conflict (product_id) do nothing;

alter table public.catalog_products enable row level security;
revoke all on public.catalog_products from public, anon, authenticated;
grant select on public.catalog_products to anon, authenticated;
grant update (price, active) on public.catalog_products to authenticated;
drop policy if exists "catalog public read" on public.catalog_products;
create policy "catalog public read" on public.catalog_products
  for select to anon, authenticated using (true);
drop policy if exists "catalog admin update" on public.catalog_products;
create policy "catalog admin update" on public.catalog_products
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.touch_catalog_product_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.touch_catalog_product_updated_at() from public, anon, authenticated;
drop trigger if exists catalog_products_touch_updated_at on public.catalog_products;
create trigger catalog_products_touch_updated_at before update on public.catalog_products
  for each row execute function public.touch_catalog_product_updated_at();

-- Price, base, extra, name, and image values supplied by the browser are never
-- trusted. The function recomputes the item and order totals from this catalog.
create or replace function public.create_customer_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_order public.orders;
  v_item jsonb;
  v_product public.catalog_products;
  v_base jsonb;
  v_extra jsonb;
  v_input_extra jsonb;
  v_input_extras jsonb;
  v_canonical_extras jsonb;
  v_seen_extra_ids text[];
  v_canonical_items jsonb := '[]'::jsonb;
  v_canonical_item jsonb;
  v_base_price numeric(12,2);
  v_extra_total numeric(12,2);
  v_unit_price numeric(12,2);
  v_quantity integer;
  v_subtotal numeric(12,2) := 0;
begin
  if v_user_id is null then raise exception 'É necessário entrar na conta para criar um pedido.' using errcode = '42501'; end if;
  select role into v_user_role from public.profiles where id = v_user_id;
  if v_user_role is distinct from 'customer' then raise exception 'Somente clientes podem criar pedidos.' using errcode = '42501'; end if;
  if jsonb_typeof(p_order) is distinct from 'object' then raise exception 'Os dados do pedido são inválidos.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Os itens do pedido são inválidos.'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'O pedido precisa ter entre 1 e 50 itens.'; end if;
  if coalesce(p_order ->> 'delivery_type', '') not in ('delivery', 'pickup') then raise exception 'Tipo de entrega inválido.'; end if;
  if coalesce(p_order ->> 'payment_method', '') not in ('pix', 'money', 'credit', 'debit') then raise exception 'Forma de pagamento inválida.'; end if;
  if p_order ->> 'delivery_type' = 'delivery' and (
    jsonb_typeof(p_order -> 'address_snapshot') <> 'object'
    or coalesce(trim(p_order #>> '{address_snapshot,street}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,number}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,neighborhood}'), '') = ''
    or coalesce(trim(p_order #>> '{address_snapshot,city}'), '') = ''
    or length(regexp_replace(coalesce(p_order #>> '{address_snapshot,postal_code}', ''), '\D', '', 'g')) <> 8
  ) then raise exception 'Informe um endereço completo para entrega.'; end if;
  if length(regexp_replace(coalesce(p_order ->> 'phone', ''), '\D', '', 'g')) not between 10 and 15 then
    raise exception 'Informe um telefone válido para o pedido.';
  end if;
  if length(coalesce(p_order ->> 'order_notes', '')) > 2000 then raise exception 'As observações excedem o limite permitido.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.catalog_products
    where product_id = coalesce(v_item ->> 'product_id', '') and active;
    if not found then raise exception 'Um produto não está disponível para venda.'; end if;

    v_base := null;
    select value into v_base from jsonb_array_elements(v_product.bases) where value ->> 'id' = coalesce(v_item ->> 'base_id', '');
    if v_base is null then raise exception 'Uma opção de produto é inválida.'; end if;
    v_base_price := coalesce((v_base ->> 'price')::numeric, 0);

    v_input_extras := coalesce(v_item -> 'extras', '[]'::jsonb);
    if jsonb_typeof(v_input_extras) <> 'array' then raise exception 'Os adicionais do pedido são inválidos.'; end if;
    v_canonical_extras := '[]'::jsonb;
    v_seen_extra_ids := array[]::text[];
    v_extra_total := 0;
    for v_input_extra in select value from jsonb_array_elements(v_input_extras)
    loop
      if coalesce(v_input_extra ->> 'id', '') = '' or v_input_extra ->> 'id' = any(v_seen_extra_ids) then
        raise exception 'Um adicional do pedido é inválido ou está duplicado.';
      end if;
      select value into v_extra from jsonb_array_elements(v_product.extras) where (value ->> 'id') = (v_input_extra ->> 'id');
      if v_extra is null then raise exception 'Um adicional não pertence a este produto.'; end if;
      v_seen_extra_ids := array_append(v_seen_extra_ids, v_extra ->> 'id');
      v_extra_total := v_extra_total + (v_extra ->> 'price')::numeric;
      v_canonical_extras := v_canonical_extras || jsonb_build_array(v_extra);
    end loop;

    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity < 1 or v_quantity > 100 then raise exception 'A quantidade de um item é inválida.'; end if;
    v_unit_price := v_product.price + v_base_price + v_extra_total;
    v_subtotal := v_subtotal + v_unit_price * v_quantity;

    v_canonical_items := v_canonical_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.product_id,
      'product_name', v_product.product_name,
      'product_image', v_product.product_image,
      'base_id', v_base ->> 'id',
      'option', v_base ->> 'name',
      'extras', v_canonical_extras,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'total_price', v_unit_price * v_quantity
    ));
  end loop;

  if abs(v_subtotal - coalesce((p_order ->> 'subtotal')::numeric, -1)) >= 0.02 then
    raise exception 'Os preços do pedido foram atualizados. Revise o carrinho e tente novamente.';
  end if;
  if length(trim(coalesce(p_order ->> 'customer_name', ''))) < 2 then raise exception 'Informe o nome do cliente.'; end if;

  insert into public.orders (
    customer_id, customer_name, customer_email, phone, subtotal, delivery_fee, total,
    delivery_type, address_snapshot, payment_method, order_notes
  ) values (
    v_user_id,
    trim(p_order ->> 'customer_name'),
    (select email from public.profiles where id = v_user_id),
    regexp_replace(p_order ->> 'phone', '\D', '', 'g'),
    v_subtotal, 0, v_subtotal, p_order ->> 'delivery_type',
    case when p_order ->> 'delivery_type' = 'delivery' then p_order -> 'address_snapshot' else '{}'::jsonb end,
    p_order ->> 'payment_method', coalesce(p_order ->> 'order_notes', '')
  ) returning * into v_order;

  for v_canonical_item in select value from jsonb_array_elements(v_canonical_items)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, product_image, base_id, option, extras, quantity, unit_price, total_price
    ) values (
      v_order.id, v_canonical_item ->> 'product_id', v_canonical_item ->> 'product_name',
      v_canonical_item ->> 'product_image', v_canonical_item ->> 'base_id', v_canonical_item ->> 'option',
      v_canonical_item -> 'extras', (v_canonical_item ->> 'quantity')::integer,
      (v_canonical_item ->> 'unit_price')::numeric, (v_canonical_item ->> 'total_price')::numeric
    );
  end loop;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'created_at', v_order.created_at, 'status', v_order.status);
end;
$$;
revoke all on function public.create_customer_order(jsonb, jsonb) from public, anon;
grant execute on function public.create_customer_order(jsonb, jsonb) to authenticated;
