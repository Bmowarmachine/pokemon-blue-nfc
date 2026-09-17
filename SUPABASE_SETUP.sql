insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'game-saves',
  'game-saves',
  false,
  1048576,
  array['application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "NFC saves can be downloaded" on storage.objects;
create policy "NFC saves can be downloaded"
on storage.objects
for select
to anon
using (
  bucket_id = 'game-saves'
  and storage.allow_only_operation('object.get_authenticated')
);

drop policy if exists "NFC saves can be created" on storage.objects;
create policy "NFC saves can be created"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'game-saves'
  and storage.extension(name) = 'srm'
);

drop policy if exists "NFC saves can be updated" on storage.objects;
create policy "NFC saves can be updated"
on storage.objects
for update
to anon
using (
  bucket_id = 'game-saves'
  and storage.extension(name) = 'srm'
)
with check (
  bucket_id = 'game-saves'
  and storage.extension(name) = 'srm'
);
