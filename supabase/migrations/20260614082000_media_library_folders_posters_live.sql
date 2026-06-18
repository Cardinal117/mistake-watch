-- TASK-002.8B: Uploaded library folders, poster thumbnails, and live
-- classification metadata.

create table if not exists public.media_folders (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (char_length(slug) between 1 and 140),
  description text,
  folder_type text not null default 'collection'
    check (folder_type in ('series', 'collection', 'general')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, slug)
);

alter table public.media_assets
  add column if not exists folder_id uuid references public.media_folders(id) on delete set null,
  add column if not exists thumbnail_object_key text,
  add column if not exists poster_status text not null default 'missing'
    check (poster_status in ('missing', 'pending', 'ready', 'failed')),
  add column if not exists season_number integer check (season_number is null or season_number >= 0),
  add column if not exists episode_number integer check (episode_number is null or episode_number >= 0),
  add column if not exists sort_index integer not null default 0,
  add column if not exists is_live boolean not null default false;

create index if not exists media_folders_owner_sort_idx
  on public.media_folders (owner_user_id, sort_order, name);

create index if not exists media_assets_folder_sort_idx
  on public.media_assets (folder_id, sort_index, created_at desc)
  where status = 'ready';

create index if not exists media_assets_live_created_idx
  on public.media_assets (is_live, created_at desc)
  where status = 'ready';

drop trigger if exists media_folders_set_updated_at on public.media_folders;
create trigger media_folders_set_updated_at
before update on public.media_folders
for each row execute function private.set_updated_at();

alter table public.media_folders enable row level security;

revoke all on public.media_folders from public, anon, authenticated;

grant select on public.media_folders to anon, authenticated;
grant select, insert, update, delete on public.media_folders to service_role;

create policy "media_folders_public_select"
on public.media_folders
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.media_assets asset
    where asset.folder_id = media_folders.id
      and asset.status = 'ready'
  )
);

create policy "media_folders_owner_select"
on public.media_folders
for select
to authenticated
using (owner_user_id = (select auth.uid()));
