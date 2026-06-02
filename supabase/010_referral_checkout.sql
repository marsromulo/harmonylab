create or replace function public.get_referral_owner_customer_id(referral_code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.customer_profiles
  where upper(referral_id) = upper(nullif(trim(referral_code), ''))
  limit 1;
$$;

grant execute on function public.get_referral_owner_customer_id(text) to authenticated;
