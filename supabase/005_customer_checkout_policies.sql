drop policy if exists "Customers can create own profile" on public.customer_profiles;
create policy "Customers can create own profile"
on public.customer_profiles
for insert
to authenticated
with check (auth.uid() = auth_user_id);

drop policy if exists "Customers can update own profile" on public.customer_profiles;
create policy "Customers can update own profile"
on public.customer_profiles
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "Customers can create own orders" on public.orders;
create policy "Customers can create own orders"
on public.orders
for insert
to authenticated
with check (
  customer_id in (
    select id from public.customer_profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can create own order items" on public.order_items;
create policy "Customers can create own order items"
on public.order_items
for insert
to authenticated
with check (
  order_id in (
    select public.orders.id
    from public.orders
    join public.customer_profiles on public.customer_profiles.id = public.orders.customer_id
    where public.customer_profiles.auth_user_id = auth.uid()
  )
);
