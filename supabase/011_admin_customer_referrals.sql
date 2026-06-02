drop policy if exists "Admins can update customer profiles" on public.customer_profiles;
create policy "Admins can update customer profiles"
on public.customer_profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
