alter table public.orders
add column if not exists fulfillment_carrier text,
add column if not exists fulfillment_tracking_number text,
add column if not exists fulfillment_tracking_url text,
add column if not exists fulfillment_notes text,
add column if not exists shipped_at timestamptz,
add column if not exists delivered_at timestamptz;
