alter table public.orders
add column if not exists shipping_address_line1 text,
add column if not exists shipping_address_line2 text,
add column if not exists shipping_city text,
add column if not exists shipping_region text,
add column if not exists shipping_postal_code text,
add column if not exists shipping_country text,
add column if not exists delivery_notes text;
