alter table public.product_images
add column if not exists media_type text not null default 'image';

alter table public.product_images
drop constraint if exists product_images_media_type_check;

alter table public.product_images
add constraint product_images_media_type_check
check (media_type in ('image', 'video'));

update storage.buckets
set file_size_limit = greatest(coalesce(file_size_limit, 0), 62914560),
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id = 'product-images';
