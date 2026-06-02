drop policy if exists "Customers can view own order items" on public.order_items;
create policy "Customers can view own order items"
on public.order_items
for select
to authenticated
using (
  order_id in (
    select public.orders.id
    from public.orders
    join public.customer_profiles on public.customer_profiles.id = public.orders.customer_id
    where public.customer_profiles.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items"
on public.order_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view customer profiles" on public.customer_profiles;
create policy "Admins can view customer profiles"
on public.customer_profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view customer addresses" on public.customer_addresses;
create policy "Admins can view customer addresses"
on public.customer_addresses
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view referral ledger" on public.referral_points_ledger;
create policy "Admins can view referral ledger"
on public.referral_points_ledger
for select
to authenticated
using (public.is_admin());
