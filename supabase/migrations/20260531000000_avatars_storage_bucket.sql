-- Avatar uploads — public Storage bucket + per-user RLS on storage.objects.
-- Users upload to `avatars/{user_id}/...`; everyone can read (public bucket).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatars (public bucket)
drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload only into their own folder: {user_id}/...
drop policy if exists "Avatar self insert" on storage.objects;
create policy "Avatar self insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Users can overwrite their own avatar
drop policy if exists "Avatar self update" on storage.objects;
create policy "Avatar self update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Users can delete their own avatar
drop policy if exists "Avatar self delete" on storage.objects;
create policy "Avatar self delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
