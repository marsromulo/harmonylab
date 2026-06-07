create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  device_name text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobile_push_tokens_customer_id_idx
on public.mobile_push_tokens (customer_id)
where is_active = true;

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  notification_key text not null unique,
  notification_type text not null check (
    notification_type in ('order_created', 'order_status')
  ),
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_customer_unread_idx
on public.customer_notifications (customer_id, created_at desc)
where read_at is null;

drop trigger if exists set_mobile_push_tokens_updated_at
on public.mobile_push_tokens;

create trigger set_mobile_push_tokens_updated_at
before update on public.mobile_push_tokens
for each row execute function public.set_updated_at();

alter table public.mobile_push_tokens enable row level security;
alter table public.customer_notifications enable row level security;

revoke all on public.mobile_push_tokens from public, anon, authenticated;
revoke all on public.customer_notifications from public, anon, authenticated;

grant select, insert, update, delete on public.mobile_push_tokens to service_role;
grant select, insert, update on public.customer_notifications to service_role;
