-- Permanent test-data reset.
-- Keeps all configuration tables and the two named customer/admin accounts.

begin;

create temporary table reset_keep_emails (
  email text primary key
) on commit drop;

insert into reset_keep_emails (email)
values
  ('harmonylabhk@gmail.com'),
  ('marsromulo@hotmail.com');

-- Orders cascade to order items, order email notifications, and
-- order-linked customer notifications.
delete from public.orders;

delete from public.members;

-- Related addresses, push tokens, notifications, and referral ledger rows
-- for deleted customers are removed by their foreign-key cascades.
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

commit;

select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_items) as order_items,
  (select count(*) from public.members) as members,
  (select count(*) from public.customer_profiles) as customer_profiles,
  (select count(*) from auth.users) as login_accounts;

select
  order_number_sequence.last_value,
  order_number_sequence.is_called,
  case
    when order_number_sequence.last_value = 1 and not order_number_sequence.is_called
      then 'HL-000000001'
    else 'Sequence requires review'
  end as next_order_number
from public.order_number_sequence;

select
  customer_profiles.email,
  customer_profiles.referral_points_balance
from public.customer_profiles
order by customer_profiles.email;
