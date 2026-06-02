alter table public.customer_profiles
add column if not exists first_name text,
add column if not exists last_name text;

update public.customer_profiles
set
  first_name = coalesce(first_name, nullif(split_part(full_name, ' ', 1), '')),
  last_name = coalesce(
    last_name,
    nullif(trim(regexp_replace(coalesce(full_name, ''), '^\S+\s*', '')), '')
  )
where full_name is not null;
