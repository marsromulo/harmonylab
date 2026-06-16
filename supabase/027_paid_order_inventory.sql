alter table public.orders
add column if not exists inventory_deducted_at timestamptz;

comment on column public.orders.inventory_deducted_at is
'Timestamp when order item quantities were deducted from product inventory.';

update public.orders
set inventory_deducted_at = coalesce(paid_at, updated_at, now())
where payment_status = 'paid'
  and inventory_deducted_at is null;

create or replace function public.validate_order_item_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available_quantity integer;
  requested_quantity integer;
begin
  if new.product_id is null then
    return new;
  end if;

  select products.inventory_quantity
  into available_quantity
  from public.products
  where products.id = new.product_id
    and products.is_active = true
  for update;

  if not found then
    raise exception 'Checkout contains an unavailable product.';
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(order_items.quantity), 0) + new.quantity
    into requested_quantity
    from public.order_items
    where order_items.order_id = new.order_id
      and order_items.product_id = new.product_id
      and order_items.id <> old.id;
  else
    select coalesce(sum(order_items.quantity), 0) + new.quantity
    into requested_quantity
    from public.order_items
    where order_items.order_id = new.order_id
      and order_items.product_id = new.product_id;
  end if;

  if available_quantity < requested_quantity then
    raise exception 'Product % does not have enough stock.', new.product_name;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_order_item_inventory on public.order_items;
create trigger validate_order_item_inventory
before insert or update of product_id, quantity
on public.order_items
for each row execute function public.validate_order_item_inventory();

create or replace function public.deduct_inventory_when_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  updated_product_id uuid;
begin
  if new.payment_status <> 'paid'
    or old.payment_status = 'paid'
    or old.inventory_deducted_at is not null then
    return new;
  end if;

  for item in
    select
      order_items.product_id,
      max(order_items.product_name) as product_name,
      sum(order_items.quantity)::integer as quantity
    from public.order_items
    where order_items.order_id = new.id
      and order_items.product_id is not null
    group by order_items.product_id
    order by order_items.product_id
  loop
    updated_product_id := null;

    update public.products
    set inventory_quantity = inventory_quantity - item.quantity
    where products.id = item.product_id
      and products.inventory_quantity >= item.quantity
    returning products.id into updated_product_id;

    if updated_product_id is null then
      raise exception 'Product % does not have enough stock to complete this paid order.',
        item.product_name;
    end if;
  end loop;

  new.inventory_deducted_at := now();
  return new;
end;
$$;

drop trigger if exists deduct_inventory_when_order_paid on public.orders;
create trigger deduct_inventory_when_order_paid
before update of payment_status
on public.orders
for each row execute function public.deduct_inventory_when_order_paid();
