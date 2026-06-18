-- TASK-002.8B: consolidate media_folders SELECT policies for authenticated
-- users so the table does not carry multiple permissive SELECT policies.

drop policy if exists "media_folders_public_select" on public.media_folders;
drop policy if exists "media_folders_owner_select" on public.media_folders;

create policy "media_folders_anon_public_select"
on public.media_folders
for select
to anon
using (
  exists (
    select 1
    from public.media_assets asset
    where asset.folder_id = media_folders.id
      and asset.status = 'ready'
  )
);

create policy "media_folders_authenticated_select"
on public.media_folders
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.media_assets asset
    where asset.folder_id = media_folders.id
      and asset.status = 'ready'
  )
);
