-- Trial only: this script always rolls back.
-- Review the before/after result sets, then use a separate permanent reset script.

begin;

create temporary table reset_keep_emails (
  email text primary key
) on commit drop;

insert into reset_keep_emails (email)
values
  ('harmonylabhk@gmail.com'),
  ('marsromulo@hotmail.com');

select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_items) as order_items,
  (select count(*) from public.members) as members,
  (select count(*) from public.customer_profiles) as customer_profiles,
  (select count(*) from auth.users) as login_accounts,
  (select count(*) from public.customer_addresses) as customer_addresses,
  (select count(*) from public.referral_points_ledger) as referral_ledger_entries,
  (select count(*) from public.order_email_notifications) as order_email_notifications,
  (select count(*) from public.customer_notifications) as customer_notifications,
  (select count(*) from public.mobile_push_tokens) as mobile_push_tokens;

delete from public.orders;
delete from public.members;

delete from public.customer_profiles
where lower(coalesce(email, '')) not in (
  select lower(reset_keep_emails.email)
  from reset_keep_emails
);

-- Remove test and anonymous login accounts, but never remove an admin login.
delete from auth.users
where lower(coalesce(email, '')) not in (
    select lower(reset_keep_emails.email)
    from reset_keep_emails
  )
  and lower(coalesce(email, '')) not in (
    select lower(admin_users.email)
    from public.admin_users
  );

alter sequence public.order_number_sequence restart with 1;

select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_items) as order_items,
  (select count(*) from public.members) as members,
  (select count(*) from public.customer_profiles) as customer_profiles,
  (select count(*) from auth.users) as login_accounts,
  (select count(*) from public.customer_addresses) as customer_addresses,
  (select count(*) from public.referral_points_ledger) as referral_ledger_entries,
  (select count(*) from public.order_email_notifications) as order_email_notifications,
  (select count(*) from public.customer_notifications) as customer_notifications,
  (select count(*) from public.mobile_push_tokens) as mobile_push_tokens;

select
  order_number_sequence.last_value,
  order_number_sequence.is_called,
  case
    when order_number_sequence.last_value = 1 and not order_number_sequence.is_called
      then 'HL-000000001'
    else 'Sequence requires review'
  end as expected_next_order_number
from public.order_number_sequence;

select
  customer_profiles.email,
  customer_profiles.referral_points_balance
from public.customer_profiles
order by customer_profiles.email;

select
  users.email,
  users.is_anonymous
from auth.users as users
order by users.email nulls last;

rollback;
