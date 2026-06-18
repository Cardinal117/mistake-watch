-- TASK-002.8C: uploaded-library management refinement.

alter table public.media_assets
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'owner_only'));

alter table public.media_folders
  add column if not exists default_sort_key text not null default 'created_at'
    check (default_sort_key in ('name', 'created_at', 'duration_seconds')),
  add column if not exists default_sort_direction text not null default 'desc'
    check (default_sort_direction in ('asc', 'desc'));

create index if not exists media_assets_visibility_ready_idx
  on public.media_assets (visibility, status, created_at desc)
  where status = 'ready';

drop policy if exists "media_assets_anon_ready_select"
on public.media_assets;

drop policy if exists "media_assets_authenticated_select"
on public.media_assets;

create policy "media_assets_anon_ready_select"
on public.media_assets
for select
to anon
using (
  status = 'ready'
  and visibility = 'public'
);

create policy "media_assets_authenticated_select"
on public.media_assets
for select
to authenticated
using (
  (
    status = 'ready'
    and visibility = 'public'
  )
  or owner_user_id = (select auth.uid())
);

drop policy if exists "media_source_matches_ready_public_select"
on public.media_source_matches;

create policy "media_source_matches_ready_public_select"
on public.media_source_matches
for select
to anon, authenticated
using (
  status = 'ready'
  and exists (
    select 1
    from public.media_assets asset
    where asset.id = media_source_matches.media_asset_id
      and asset.status = 'ready'
      and asset.visibility = 'public'
  )
);
