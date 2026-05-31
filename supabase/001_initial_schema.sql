create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'HKD',
  image_url text,
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  full_name text,
  phone text,
  referral_id text unique,
  referral_points_balance integer not null default 0 check (referral_points_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customer_profiles(id) on delete set null,
  customer_email text,
  customer_name text,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
  ),
  currency text not null default 'HKD',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  referral_code_entered text,
  referral_owner_customer_id uuid references public.customer_profiles(id) on delete set null,
  referral_points_awarded integer not null default 0 check (referral_points_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.referral_points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.referral_points_ledger enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Customers can view own profile" on public.customer_profiles;
create policy "Customers can view own profile"
on public.customer_profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "Customers can view own orders" on public.orders;
create policy "Customers can view own orders"
on public.orders
for select
to authenticated
using (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can view own referral ledger" on public.referral_points_ledger;
create policy "Customers can view own referral ledger"
on public.referral_points_ledger
for select
to authenticated
using (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

insert into public.products (
  name,
  slug,
  description,
  price_cents,
  currency,
  image_url,
  inventory_quantity,
  is_active,
  sort_order
) values
  (
    'VC Brighten Travel Kit',
    'vc-brighten-travel-kit',
    'Brightening skincare essentials for travel.',
    36000,
    'HKD',
    '/asset/featured-1.png',
    50,
    true,
    10
  ),
  (
    'Niacinamide VC Serum',
    'niacinamide-vc-serum',
    'Vitamin C serum for a clearer-looking glow.',
    22000,
    'HKD',
    '/asset/featured-2.png',
    75,
    true,
    20
  ),
  (
    'VC Fresh Radiance & Night Cream Set',
    'vc-fresh-radiance-night-cream-set',
    'Day-to-night care for radiant skin.',
    32000,
    'HKD',
    '/asset/featured-3.png',
    40,
    true,
    30
  ),
  (
    'Peptide Anti-Wrinkle Serum',
    'peptide-anti-wrinkle-serum',
    'Peptide serum for smoother-looking skin.',
    21000,
    'HKD',
    '/asset/featured-4.png',
    60,
    true,
    40
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  image_url = excluded.image_url,
  inventory_quantity = excluded.inventory_quantity,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();
