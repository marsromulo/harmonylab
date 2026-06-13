alter table public.orders
add column if not exists payment_provider text,
add column if not exists wonder_order_number text unique,
add column if not exists wonder_payment_link text,
add column if not exists wonder_transaction_id text;

create index if not exists orders_wonder_order_number_idx
on public.orders (wonder_order_number);

create index if not exists orders_payment_provider_idx
on public.orders (payment_provider);

update public.orders
set payment_provider = 'stripe'
where payment_provider is null
  and stripe_checkout_session_id is not null;
