insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'admin-avatars',
  'admin-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view admin avatar files" on storage.objects;
create policy "Public can view admin avatar files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'admin-avatars');

drop policy if exists "Admins can upload own avatar files" on storage.objects;
create policy "Admins can upload own avatar files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'admin-avatars'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins can update own avatar files" on storage.objects;
create policy "Admins can update own avatar files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'admin-avatars'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'admin-avatars'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Admins can delete own avatar files" on storage.objects;
create policy "Admins can delete own avatar files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'admin-avatars'
  and public.is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);
