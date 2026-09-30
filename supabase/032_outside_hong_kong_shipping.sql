-- Apply before deploying the outside Hong Kong checkout option.
begin;

insert into public.site_settings (setting_key, label, setting_value, description)
values (
  'outside_hk_shipping_fee_hkd',
  'Outside Hong Kong Shipping Fee (HK$)',
  '180'::jsonb,
  'Flat shipping fee for deliveries outside Hong Kong, in HKD.'
)
on conflict (setting_key) do nothing;

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

  if nullif(trim(p_shipping_country), '') is null then
    raise exception 'Shipping country is required.';
  end if;

  if p_shipping_country <> 'Hong Kong' then
    if upper(p_currency) <> 'HKD' then
      raise exception 'Outside Hong Kong shipping is priced in HKD.';
    end if;
    base_shipping_cents := round(public.get_site_setting_numeric(
      'outside_hk_shipping_fee_hkd', 180
    ) * 100)::integer;
    if base_shipping_cents < 0 then
      raise exception 'Outside Hong Kong shipping fee cannot be negative.';
    end if;
  else
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

  end if;

  calculated_shipping_cents := base_shipping_cents;

  select discount_rules.*
  into selected_rule
  from public.discount_rules
  where p_shipping_country = 'Hong Kong'
    and discount_rules.discount_type = 'shipping'
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

commit;
