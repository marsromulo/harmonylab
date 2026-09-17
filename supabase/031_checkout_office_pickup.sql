-- Run this migration before deploying the website pickup option.
-- Keep pickup creation and its final price in the same database transaction.
begin;

create or replace function public.create_checkout_pickup_order(
  p_auth_user_id uuid,
  p_customer_id uuid,
  p_customer_email text,
  p_customer_name text,
  p_delivery_notes text,
  p_shipping_address_line1 text,
  p_shipping_address_line2 text,
  p_shipping_city text,
  p_shipping_region text,
  p_shipping_postal_code text,
  p_shipping_country text,
  p_referral_code text,
  p_expected_currency text,
  p_expected_subtotal_cents integer,
  p_items jsonb
)
returns table (
  id uuid,
  order_number text,
  currency text,
  shipping_cents integer,
  discount_cents integer,
  total_cents integer,
  discount_details jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_order record;
begin
  select * into strict created_order
  from public.create_checkout_order(
    p_auth_user_id,
    p_customer_id,
    p_customer_email,
    p_customer_name,
    concat_ws(E'\n', 'Pick up at Harmony Lab office', nullif(trim(p_delivery_notes), '')),
    '1606 Corn Yan Centre, 3 Jupiter Street',
    'Harmony Lab office pickup',
    'Fortress Hill',
    'Hong Kong',
    '',
    'Hong Kong',
    p_referral_code,
    p_expected_currency,
    p_expected_subtotal_cents,
    p_items
  );

  return query
  update public.orders as pickup_order
  set shipping_cents = 0,
      total_cents = pickup_order.total_cents - pickup_order.shipping_cents,
      discount_details = (
        select coalesce(jsonb_agg(detail), '[]'::jsonb)
        from jsonb_array_elements(coalesce(pickup_order.discount_details, '[]'::jsonb)) as detail
        where detail ->> 'type' is distinct from 'shipping'
      )
  where pickup_order.id = created_order.id
  returning pickup_order.id, pickup_order.order_number, pickup_order.currency,
    pickup_order.shipping_cents, pickup_order.discount_cents,
    pickup_order.total_cents, pickup_order.discount_details;
end;
$$;

revoke all on function public.create_checkout_pickup_order(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, integer, jsonb
) from public, anon, authenticated;

grant execute on function public.create_checkout_pickup_order(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, integer, jsonb
) to service_role;

commit;
