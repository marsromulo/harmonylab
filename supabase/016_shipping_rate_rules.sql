create table if not exists public.shipping_rate_rules (
  id uuid primary key default gen_random_uuid(),
  country text not null,
  region text,
  currency text not null default 'HKD',
  free_shipping_threshold_cents integer not null default 0 check (free_shipping_threshold_cents >= 0),
  shipping_fee_cents integer not null default 0 check (shipping_fee_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists shipping_rate_rules_country_region_idx
on public.shipping_rate_rules (country, coalesce(region, ''));

drop trigger if exists set_shipping_rate_rules_updated_at on public.shipping_rate_rules;
create trigger set_shipping_rate_rules_updated_at
before update on public.shipping_rate_rules
for each row execute function public.set_updated_at();

alter table public.shipping_rate_rules enable row level security;

drop policy if exists "Anyone can view active shipping rules" on public.shipping_rate_rules;
create policy "Anyone can view active shipping rules"
on public.shipping_rate_rules
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage shipping rules" on public.shipping_rate_rules;
create policy "Admins can manage shipping rules"
on public.shipping_rate_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

delete from public.shipping_rate_rules
where country = 'Hong Kong' and region is null;

insert into public.shipping_rate_rules (
  country,
  region,
  currency,
  free_shipping_threshold_cents,
  shipping_fee_cents,
  is_active
)
values ('Hong Kong', null, 'HKD', 50000, 5000, true);
