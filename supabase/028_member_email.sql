alter table public.members
add column if not exists email text;

create index if not exists members_email_idx
on public.members (lower(email))
where email is not null;
