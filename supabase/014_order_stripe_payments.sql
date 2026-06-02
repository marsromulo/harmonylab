alter table public.orders
add column if not exists payment_method text,
add column if not exists payment_status text not null default 'unpaid' check (
  payment_status in ('unpaid', 'paid', 'failed', 'cancelled', 'expired')
),
add column if not exists stripe_checkout_session_id text unique,
add column if not exists stripe_payment_intent_id text,
add column if not exists paid_at timestamptz;

create index if not exists orders_stripe_checkout_session_id_idx
on public.orders (stripe_checkout_session_id);
