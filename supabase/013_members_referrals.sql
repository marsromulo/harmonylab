create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  referral_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_referral_code_idx
on public.members (referral_code);

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

alter table public.members enable row level security;

drop policy if exists "Admins can manage members" on public.members;
create policy "Admins can manage members"
on public.members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.orders
add column if not exists referral_owner_member_id uuid references public.members(id) on delete set null;

create or replace function public.get_referral_owner_member_id(p_referral_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.members
  where upper(referral_code) = upper(nullif(trim(p_referral_code), ''))
  limit 1;
$$;

grant execute on function public.get_referral_owner_member_id(text) to authenticated;
