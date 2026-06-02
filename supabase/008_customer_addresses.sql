create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  label text,
  first_name text,
  last_name text,
  phone text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  region text,
  postal_code text,
  country text not null default 'Hong Kong',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_id_idx
on public.customer_addresses (customer_id);

create unique index if not exists customer_addresses_one_default_per_customer_idx
on public.customer_addresses (customer_id)
where is_default = true;

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

drop policy if exists "Customers can view own addresses" on public.customer_addresses;
create policy "Customers can view own addresses"
on public.customer_addresses
for select
to authenticated
using (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can create own addresses" on public.customer_addresses;
create policy "Customers can create own addresses"
on public.customer_addresses
for insert
to authenticated
with check (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can update own addresses" on public.customer_addresses;
create policy "Customers can update own addresses"
on public.customer_addresses
for update
to authenticated
using (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
)
with check (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can delete own addresses" on public.customer_addresses;
create policy "Customers can delete own addresses"
on public.customer_addresses
for delete
to authenticated
using (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);
