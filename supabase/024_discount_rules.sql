create table if not exists public.discount_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount_type text not null check (
    discount_type in ('shipping', 'referral', 'minimum_order')
  ),
  calculation_type text not null check (
    calculation_type in ('free_shipping', 'fixed', 'percentage')
  ),
  minimum_subtotal_cents integer not null default 0 check (minimum_subtotal_cents >= 0),
  value integer not null default 0 check (value >= 0),
  country text,
  currency text not null default 'HKD',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_rules_type_calculation_check check (
    (discount_type = 'shipping' and calculation_type = 'free_shipping' and value = 0)
    or (
      discount_type in ('referral', 'minimum_order')
      and calculation_type in ('fixed', 'percentage')
      and value > 0
    )
  ),
  constraint discount_rules_percentage_check check (
    calculation_type <> 'percentage' or value <= 10000
  )
);

comment on column public.discount_rules.value is
'Fixed discounts use cents. Percentage discounts use basis points (1000 = 10%).';

create index if not exists discount_rules_checkout_idx
on public.discount_rules (discount_type, is_active, currency, minimum_subtotal_cents);

drop trigger if exists set_discount_rules_updated_at on public.discount_rules;
create trigger set_discount_rules_updated_at
before update on public.discount_rules
for each row execute function public.set_updated_at();

alter table public.discount_rules enable row level security;

drop policy if exists "Admins can manage discount rules" on public.discount_rules;
create policy "Admins can manage discount rules"
on public.discount_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.discount_rules (
  name,
  discount_type,
  calculation_type,
  minimum_subtotal_cents,
  value,
  country,
  currency,
  priority,
  is_active
)
select
  'Free shipping over HK$500',
  'shipping',
  'free_shipping',
  50000,
  0,
  'Hong Kong',
  'HKD',
  0,
  true
where not exists (
  select 1
  from public.discount_rules
  where discount_type = 'shipping'
    and country = 'Hong Kong'
);

alter table public.orders
add column if not exists discount_details jsonb not null default '[]'::jsonb;

create or replace function public.get_checkout_discount_quote(
  p_subtotal_cents integer,
  p_shipping_country text,
  p_shipping_region text,
  p_currency text,
  p_referral_code text
)
returns table (
  shipping_cents integer,
  discount_cents integer,
  total_cents integer,
  discount_details jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  base_shipping_cents integer;
  calculated_discount_cents integer := 0;
  calculated_shipping_cents integer;
  details jsonb := '[]'::jsonb;
  referral_is_valid boolean := false;
  rule_amount_cents integer;
  selected_rule public.discount_rules%rowtype;
begin
  if p_subtotal_cents < 0 then
    raise exception 'Subtotal cannot be negative.';
  end if;

  select shipping_rate_rules.shipping_fee_cents
  into base_shipping_cents
  from public.shipping_rate_rules
  where shipping_rate_rules.country = p_shipping_country
    and shipping_rate_rules.currency = upper(p_currency)
    and shipping_rate_rules.is_active = true
    and (
      shipping_rate_rules.region is null
      or lower(shipping_rate_rules.region) = lower(coalesce(p_shipping_region, ''))
    )
  order by
    case
      when lower(coalesce(shipping_rate_rules.region, '')) =
        lower(coalesce(p_shipping_region, '')) then 0
      else 1
    end
  limit 1;

  if not found then
    raise exception 'No active shipping rate is available for this address.';
  end if;

  calculated_shipping_cents := base_shipping_cents;

  select discount_rules.*
  into selected_rule
  from public.discount_rules
  where discount_rules.discount_type = 'shipping'
    and discount_rules.calculation_type = 'free_shipping'
    and discount_rules.is_active = true
    and discount_rules.currency = upper(p_currency)
    and discount_rules.minimum_subtotal_cents <= p_subtotal_cents
    and (
      discount_rules.country is null
      or discount_rules.country = p_shipping_country
    )
  order by
    discount_rules.minimum_subtotal_cents desc,
    discount_rules.priority desc,
    discount_rules.created_at asc
  limit 1;

  if found then
    calculated_shipping_cents := 0;
    details := details || jsonb_build_array(jsonb_build_object(
      'rule_id', selected_rule.id,
      'name', selected_rule.name,
      'type', selected_rule.discount_type,
      'amount_cents', base_shipping_cents
    ));
  end if;

  referral_is_valid := nullif(trim(p_referral_code), '') is not null
    and exists (
      select 1
      from public.members
      where upper(members.referral_code) = upper(trim(p_referral_code))
    );

  if referral_is_valid then
    select discount_rules.*
    into selected_rule
    from public.discount_rules
    where discount_rules.discount_type = 'referral'
      and discount_rules.is_active = true
      and discount_rules.currency = upper(p_currency)
      and discount_rules.minimum_subtotal_cents <= p_subtotal_cents
    order by
      case
        when discount_rules.calculation_type = 'fixed' then discount_rules.value
        else round(p_subtotal_cents::numeric * discount_rules.value / 10000)::integer
      end desc,
      discount_rules.priority desc,
      discount_rules.created_at asc
    limit 1;

    if found then
      rule_amount_cents := case
        when selected_rule.calculation_type = 'fixed' then selected_rule.value
        else round(p_subtotal_cents::numeric * selected_rule.value / 10000)::integer
      end;
      rule_amount_cents := least(rule_amount_cents, p_subtotal_cents);
      calculated_discount_cents := rule_amount_cents;
      details := details || jsonb_build_array(jsonb_build_object(
        'rule_id', selected_rule.id,
        'name', selected_rule.name,
        'type', selected_rule.discount_type,
        'amount_cents', rule_amount_cents
      ));
    end if;
  end if;

  select discount_rules.*
  into selected_rule
  from public.discount_rules
  where discount_rules.discount_type = 'minimum_order'
    and discount_rules.is_active = true
    and discount_rules.currency = upper(p_currency)
    and discount_rules.minimum_subtotal_cents <= p_subtotal_cents
  order by
    discount_rules.minimum_subtotal_cents desc,
    discount_rules.priority desc,
    discount_rules.created_at asc
  limit 1;

  if found and calculated_discount_cents < p_subtotal_cents then
    rule_amount_cents := case
      when selected_rule.calculation_type = 'fixed' then selected_rule.value
      else round(p_subtotal_cents::numeric * selected_rule.value / 10000)::integer
    end;
    rule_amount_cents := least(
      rule_amount_cents,
      p_subtotal_cents - calculated_discount_cents
    );
    calculated_discount_cents := calculated_discount_cents + rule_amount_cents;
    details := details || jsonb_build_array(jsonb_build_object(
      'rule_id', selected_rule.id,
      'name', selected_rule.name,
      'type', selected_rule.discount_type,
      'amount_cents', rule_amount_cents
    ));
  end if;

  return query
  select
    calculated_shipping_cents,
    calculated_discount_cents,
    p_subtotal_cents + calculated_shipping_cents - calculated_discount_cents,
    details;
end;
$$;

revoke all on function public.get_checkout_discount_quote(
  integer,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.get_checkout_discount_quote(
  integer,
  text,
  text,
  text,
  text
) to service_role;

drop function if exists public.create_checkout_order(
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
);

create function public.create_checkout_order(
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
