alter table public.customer_profiles
add column if not exists referral_code text;

create index if not exists customer_profiles_referral_code_idx
on public.customer_profiles (referral_code);
