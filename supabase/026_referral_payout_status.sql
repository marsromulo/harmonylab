alter table public.orders
add column if not exists referral_payout_status text not null default 'unpaid'
check (referral_payout_status in ('unpaid', 'paid'));

create index if not exists orders_referral_payout_status_idx
on public.orders (referral_payout_status);
