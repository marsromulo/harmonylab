alter table public.customer_profiles
drop constraint if exists customer_profiles_email_key;

create index if not exists customer_profiles_email_idx
on public.customer_profiles (lower(email))
where email is not null;
