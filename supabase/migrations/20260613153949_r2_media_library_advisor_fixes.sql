-- TASK-002.8 advisor follow-up: index nullable upload-session asset FK and
-- collapse authenticated media asset SELECT policies.

create index if not exists media_upload_sessions_media_asset_id_idx
  on public.media_upload_sessions (media_asset_id)
  where media_asset_id is not null;

drop policy if exists "media_assets_ready_public_select"
on public.media_assets;

drop policy if exists "media_assets_owner_select"
on public.media_assets;

create policy "media_assets_anon_ready_select"
on public.media_assets
for select
to anon
using (status = 'ready');

create policy "media_assets_authenticated_select"
on public.media_assets
for select
to authenticated
using (
  status = 'ready'
  or owner_user_id = (select auth.uid())
);
