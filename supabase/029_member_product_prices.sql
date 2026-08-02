alter table public.products
add column if not exists member_price_cents integer;

update public.products
set member_price_cents = price_cents
where member_price_cents is null;

alter table public.products
alter column member_price_cents set not null;

alter table public.products
drop constraint if exists products_member_price_cents_check;

alter table public.products
add constraint products_member_price_cents_check
check (member_price_cents >= 0);

create or replace function public.create_checkout_order(
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
  calculated_discount_cents integer;
  calculated_shipping_cents integer;
  calculated_subtotal_cents integer := 0;
  calculated_total_cents integer;
  created_order_id uuid;
  created_order_number text;
  applied_discount_details jsonb;
  item jsonb;
  item_product_id uuid;
  item_quantity integer;
  product_currency text;
  product_name text;
  product_price_cents integer;
  referral_owner_customer_id uuid;
  referral_owner_member_id uuid;
  order_currency text;
  use_member_price boolean := false;
begin
  if not exists (
    select 1
    from public.customer_profiles
    where customer_profiles.id = p_customer_id
      and customer_profiles.auth_user_id = p_auth_user_id
  ) then
    raise exception 'Customer profile does not belong to the authenticated user.';
  end if;

  select exists (
    select 1
    from public.customer_profiles
    join auth.users
      on auth.users.id = customer_profiles.auth_user_id
    join public.members
      on lower(public.members.email) = lower(customer_profiles.email)
    where customer_profiles.id = p_customer_id
      and customer_profiles.auth_user_id = p_auth_user_id
      and auth.users.is_anonymous = false
      and nullif(trim(customer_profiles.email), '') is not null
  )
  into use_member_price;

  if coalesce(jsonb_typeof(p_items), '') <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Checkout requires at least one item.';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    begin
      item_product_id := (item ->> 'product_id')::uuid;
      item_quantity := (item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'Checkout contains an invalid item.';
    end;

    if item_quantity < 1 or item_quantity > 20 then
      raise exception 'Checkout contains an invalid quantity.';
    end if;

    select
      products.name,
      case when use_member_price then products.member_price_cents else products.price_cents end,
      products.currency
    into product_name, product_price_cents, product_currency
    from public.products
    where products.id = item_product_id
      and products.is_active = true;

    if not found then
      raise exception 'Checkout contains an unavailable product.';
    end if;

    if order_currency is null then
      order_currency := product_currency;
    elsif order_currency <> product_currency then
      raise exception 'Checkout items must use the same currency.';
    end if;

    calculated_subtotal_cents := calculated_subtotal_cents + (product_price_cents * item_quantity);
  end loop;

  if order_currency <> p_expected_currency or calculated_subtotal_cents <> p_expected_subtotal_cents then
    raise exception 'Product pricing changed during checkout.';
  end if;

  if nullif(trim(p_referral_code), '') is not null then
    select members.id
    into referral_owner_member_id
    from public.members
    where upper(members.referral_code) = upper(trim(p_referral_code))
    limit 1;

    if referral_owner_member_id is null then
      select customer_profiles.id
      into referral_owner_customer_id
      from public.customer_profiles
      where upper(customer_profiles.referral_id) = upper(trim(p_referral_code))
        and customer_profiles.id <> p_customer_id
      limit 1;
    end if;
  end if;

  select
    quote.shipping_cents,
    quote.discount_cents,
    quote.total_cents,
    quote.discount_details
  into
    calculated_shipping_cents,
    calculated_discount_cents,
    calculated_total_cents,
    applied_discount_details
  from public.get_checkout_discount_quote(
    calculated_subtotal_cents,
    p_shipping_country,
    p_shipping_region,
    order_currency,
    case when referral_owner_member_id is not null then p_referral_code else null end
  ) as quote;

  created_order_number := public.get_next_order_number();

  insert into public.orders (
    order_number,
    customer_id,
    customer_email,
    customer_name,
    currency,
    delivery_notes,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_country,
    shipping_postal_code,
    shipping_region,
    referral_code_entered,
    referral_owner_customer_id,
    referral_owner_member_id,
    payment_method,
    payment_status,
    subtotal_cents,
    shipping_cents,
    discount_cents,
    discount_details,
    total_cents
  )
  values (
    created_order_number,
    p_customer_id,
    p_customer_email,
    p_customer_name,
    order_currency,
    nullif(trim(p_delivery_notes), ''),
    p_shipping_address_line1,
    nullif(trim(p_shipping_address_line2), ''),
    p_shipping_city,
    p_shipping_country,
    nullif(trim(p_shipping_postal_code), ''),
    nullif(trim(p_shipping_region), ''),
    nullif(trim(p_referral_code), ''),
    referral_owner_customer_id,
    referral_owner_member_id,
    'credit_card',
    'unpaid',
    calculated_subtotal_cents,
    calculated_shipping_cents,
    calculated_discount_cents,
    applied_discount_details,
    calculated_total_cents
  )
  returning orders.id into created_order_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_product_id := (item ->> 'product_id')::uuid;
    item_quantity := (item ->> 'quantity')::integer;

    select
      products.name,
      case when use_member_price then products.member_price_cents else products.price_cents end
    into product_name, product_price_cents
    from public.products
    where products.id = item_product_id
      and products.is_active = true;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price_cents,
      line_total_cents
    )
    values (
      created_order_id,
      item_product_id,
      product_name,
      item_quantity,
      product_price_cents,
      product_price_cents * item_quantity
    );
  end loop;

  return query
  select
    created_order_id,
    created_order_number,
    order_currency,
    calculated_shipping_cents,
    calculated_discount_cents,
    calculated_total_cents,
    applied_discount_details;
end;
$$;

revoke all on function public.create_checkout_order(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_checkout_order(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  jsonb
) to service_role;
