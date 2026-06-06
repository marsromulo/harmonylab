create sequence if not exists public.order_number_sequence
as bigint
increment by 1
minvalue 1
start with 1
cache 1;

do $$
declare
  next_order_number bigint;
begin
  select coalesce(max(substring(order_number from '^HL-([0-9]+)$')::bigint), 0) + 1
  into next_order_number
  from public.orders
  where order_number ~ '^HL-[0-9]+$';

  execute format('alter sequence public.order_number_sequence restart with %s', next_order_number);
end $$;

create or replace function public.get_next_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  sequence_value bigint;
begin
  sequence_value := nextval('public.order_number_sequence');
  return 'HL-' || lpad(sequence_value::text, 9, '0');
end;
$$;

revoke all on function public.get_next_order_number() from public;
grant execute on function public.get_next_order_number() to authenticated, service_role;
