create table if not exists public.order_email_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('admin', 'customer')),
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, recipient_type)
);

drop trigger if exists set_order_email_notifications_updated_at
on public.order_email_notifications;

create trigger set_order_email_notifications_updated_at
before update on public.order_email_notifications
for each row execute function public.set_updated_at();

alter table public.order_email_notifications enable row level security;

revoke all on public.order_email_notifications from public, anon, authenticated;
grant select, insert, update on public.order_email_notifications to service_role;

create or replace function public.claim_order_email_notification(
  p_order_id uuid,
  p_recipient_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_notification_id uuid;
begin
  if p_recipient_type not in ('admin', 'customer') then
    raise exception 'Invalid order email recipient type.';
  end if;

  insert into public.order_email_notifications (
    order_id,
    recipient_type
  )
  values (
    p_order_id,
    p_recipient_type
  )
  on conflict (order_id, recipient_type) do nothing;

  update public.order_email_notifications
  set
    status = 'sending',
    attempts = attempts + 1,
    locked_at = now(),
    last_error = null
  where order_id = p_order_id
    and recipient_type = p_recipient_type
    and (
      status in ('pending', 'failed')
      or (
        status = 'sending'
        and locked_at < now() - interval '15 minutes'
      )
    )
  returning id into claimed_notification_id;

  return claimed_notification_id;
end;
$$;

revoke all on function public.claim_order_email_notification(uuid, text)
from public, anon, authenticated;

grant execute on function public.claim_order_email_notification(uuid, text)
to service_role;
