drop policy if exists "Customers can create own profile" on public.customer_profiles;
drop policy if exists "Customers can update own profile" on public.customer_profiles;
drop policy if exists "Customers can create own orders" on public.orders;
drop policy if exists "Customers can create own order items" on public.order_items;

revoke insert on public.customer_profiles from authenticated;
revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;

do $$
begin
  if to_regprocedure('public.get_next_order_number()') is not null then
    execute 'revoke execute on function public.get_next_order_number() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.get_referral_owner_customer_id(text)') is not null then
    execute 'revoke execute on function public.get_referral_owner_customer_id(text) from public, anon, authenticated';
  end if;

  if to_regprocedure('public.get_referral_owner_member_id(text)') is not null then
    execute 'revoke execute on function public.get_referral_owner_member_id(text) from public, anon, authenticated';
  end if;
end;
$$;

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
  shipping_cents integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_shipping_cents integer;
  calculated_subtotal_cents integer := 0;
  created_order_id uuid;
  created_order_number text;
  item jsonb;
  item_product_id uuid;
  item_quantity integer;
  product_currency text;
  product_name text;
  product_price_cents integer;
  referral_owner_customer_id uuid;
  referral_owner_member_id uuid;
  shipping_fee_cents integer;
  shipping_threshold_cents integer;
  order_currency text;
begin
  if not exists (
    select 1
    from public.customer_profiles
    where customer_profiles.id = p_customer_id
      and customer_profiles.auth_user_id = p_auth_user_id
  ) then
    raise exception 'Customer profile does not belong to the authenticated user.';
  end if;

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

    select products.name, products.price_cents, products.currency
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

  select
    shipping_rate_rules.free_shipping_threshold_cents,
    shipping_rate_rules.shipping_fee_cents
  into shipping_threshold_cents, shipping_fee_cents
  from public.shipping_rate_rules
  where shipping_rate_rules.country = p_shipping_country
    and shipping_rate_rules.is_active = true
    and (
      shipping_rate_rules.region is null
      or lower(shipping_rate_rules.region) = lower(coalesce(p_shipping_region, ''))
    )
  order by
    case
      when lower(coalesce(shipping_rate_rules.region, '')) = lower(coalesce(p_shipping_region, '')) then 0
      else 1
    end
  limit 1;

  if not found then
    raise exception 'No active shipping rate is available for this address.';
  end if;

  calculated_shipping_cents := case
    when calculated_subtotal_cents >= shipping_threshold_cents then 0
    else shipping_fee_cents
  end;

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
    0,
    calculated_subtotal_cents + calculated_shipping_cents
  )
  returning orders.id into created_order_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_product_id := (item ->> 'product_id')::uuid;
    item_quantity := (item ->> 'quantity')::integer;

    select products.name, products.price_cents
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
  select created_order_id, created_order_number, order_currency, calculated_shipping_cents;
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
