create table if not exists public.site_settings (
  setting_key text primary key,
  label text not null,
  setting_value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
on public.site_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.site_settings (
  setting_key,
  label,
  setting_value,
  description
)
values (
  'referral_reward_rate_percent',
  'Referral Reward Rate (%)',
  to_jsonb(0::numeric),
  'Percentage of the paid order total converted into whole referral points.'
)
on conflict (setting_key) do nothing;

create or replace function public.get_site_setting_numeric(
  p_setting_key text,
  p_default numeric
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  raw_value jsonb;
  parsed_value numeric;
begin
  select site_settings.setting_value
  into raw_value
  from public.site_settings
  where site_settings.setting_key = p_setting_key;

  if raw_value is null then
    return p_default;
  end if;

  begin
    parsed_value := (raw_value #>> '{}')::numeric;
  exception
    when others then
      return p_default;
  end;

  return parsed_value;
end;
$$;

revoke all on function public.get_site_setting_numeric(text, numeric)
from public, anon, authenticated;

grant execute on function public.get_site_setting_numeric(text, numeric)
to service_role;

create or replace function public.award_order_referral_points(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_points integer;
  order_payment_status text;
  order_total_cents integer;
  owner_customer_id uuid;
  owner_member_id uuid;
  reward_points integer;
  reward_rate numeric;
begin
  select
    orders.payment_status,
    orders.total_cents,
    orders.referral_owner_customer_id,
    orders.referral_owner_member_id,
    orders.referral_points_awarded
  into
    order_payment_status,
    order_total_cents,
    owner_customer_id,
    owner_member_id,
    current_points
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    return 0;
  end if;

  if order_payment_status <> 'paid'
    or (owner_customer_id is null and owner_member_id is null)
    or current_points > 0 then
    return current_points;
  end if;

  reward_rate := greatest(
    0,
    least(
      100,
      public.get_site_setting_numeric('referral_reward_rate_percent', 0)
    )
  );
  reward_points := round(order_total_cents::numeric * reward_rate / 10000)::integer;

  if reward_points <= 0 then
    return 0;
  end if;

  update public.orders
  set referral_points_awarded = reward_points
  where id = p_order_id;

  if owner_customer_id is not null then
    if not exists (
      select 1
      from public.referral_points_ledger
      where referral_points_ledger.order_id = p_order_id
        and referral_points_ledger.reason = 'Referral reward'
    ) then
      insert into public.referral_points_ledger (
        customer_id,
        order_id,
        points,
        reason
      )
      values (
        owner_customer_id,
        p_order_id,
        reward_points,
        'Referral reward'
      );

      update public.customer_profiles
      set referral_points_balance = referral_points_balance + reward_points
      where id = owner_customer_id;
    end if;
  end if;

  return reward_points;
end;
$$;

revoke all on function public.award_order_referral_points(uuid)
from public, anon, authenticated;

grant execute on function public.award_order_referral_points(uuid)
to service_role;

create or replace function public.award_referral_points_when_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid'
    and old.payment_status is distinct from new.payment_status then
    perform public.award_order_referral_points(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists award_referral_points_when_paid on public.orders;
create trigger award_referral_points_when_paid
after update of payment_status on public.orders
for each row execute function public.award_referral_points_when_paid();

create or replace function public.award_pending_referral_points()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  awarded_count integer := 0;
  order_record record;
begin
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  for order_record in
    select orders.id
    from public.orders
    where orders.payment_status = 'paid'
      and orders.referral_points_awarded = 0
      and (
        orders.referral_owner_customer_id is not null
        or orders.referral_owner_member_id is not null
      )
    order by orders.created_at
  loop
    if public.award_order_referral_points(order_record.id) > 0 then
      awarded_count := awarded_count + 1;
    end if;
  end loop;

  return awarded_count;
end;
$$;

revoke all on function public.award_pending_referral_points()
from public, anon;

grant execute on function public.award_pending_referral_points()
to authenticated, service_role;
