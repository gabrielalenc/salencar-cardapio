-- Adds customer delivery confirmations, one review per order, and a server-side
-- completion timestamp. Existing orders are preserved; historical completed
-- orders keep completed_at = NULL because their true completion time is unknown.

alter table public.orders
  add column if not exists completed_at timestamptz;

create or replace function public.set_order_completed_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, clock_timestamp());
    else
      new.completed_at := null;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'completed' then
      new.completed_at := clock_timestamp();
    else
      new.completed_at := null;
    end if;
  elsif new.status = 'completed' then
    new.completed_at := old.completed_at;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.set_order_completed_at() from public, anon, authenticated;

drop trigger if exists orders_set_completed_at on public.orders;
create trigger orders_set_completed_at
  before insert or update on public.orders
  for each row execute function public.set_order_completed_at();

create table if not exists public.order_delivery_confirmations (
  order_id uuid primary key references public.orders(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  confirmed_at timestamptz not null default clock_timestamp()
);
create index if not exists order_delivery_confirmations_customer_id
  on public.order_delivery_confirmations(customer_id, confirmed_at desc);

create table if not exists public.order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists order_reviews_created_at
  on public.order_reviews(created_at desc);

alter table public.order_delivery_confirmations enable row level security;
alter table public.order_reviews enable row level security;

drop policy if exists "customers read own delivery confirmations or admin" on public.order_delivery_confirmations;
create policy "customers read own delivery confirmations or admin"
  on public.order_delivery_confirmations for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "customers confirm own completed orders" on public.order_delivery_confirmations;
create policy "customers confirm own completed orders"
  on public.order_delivery_confirmations for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'customer'
    )
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select auth.uid()) and o.status = 'completed'
    )
  );

drop policy if exists "customers read own reviews or admin" on public.order_reviews;
create policy "customers read own reviews or admin"
  on public.order_reviews for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "customers review own completed confirmed orders" on public.order_reviews;
create policy "customers review own completed confirmed orders"
  on public.order_reviews for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'customer'
    )
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.customer_id = (select auth.uid()) and o.status = 'completed'
    )
    and exists (
      select 1 from public.order_delivery_confirmations c
      where c.order_id = order_reviews.order_id and c.customer_id = (select auth.uid())
    )
  );

revoke all on public.order_delivery_confirmations, public.order_reviews from public, anon, authenticated;
grant select on public.order_delivery_confirmations, public.order_reviews to authenticated;
grant insert (order_id, customer_id) on public.order_delivery_confirmations to authenticated;
grant insert (order_id, customer_id, rating, comment) on public.order_reviews to authenticated;
