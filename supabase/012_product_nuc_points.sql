alter table public.products
add column if not exists nuc_points numeric(10, 2) not null default 0 check (nuc_points >= 0);
