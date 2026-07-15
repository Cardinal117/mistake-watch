-- TASK-002.8: R2 media library and authorized upload pipeline.
-- R2 stores the large media objects. Supabase stores safe metadata, upload
-- intent/status, and source-match records.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  media_kind text not null default 'video'
    check (media_kind in ('video', 'audio', 'other')),
  source_type text not null default 'r2_object'
    check (source_type in ('r2_object', 'authorized_direct')),
  status text not null default 'ready'
    check (status in ('pending', 'uploading', 'ready', 'failed', 'unsupported')),
  r2_bucket text not null,
  r2_object_key text not null unique,
  public_url text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  duration_seconds integer check (
    duration_seconds is null or duration_seconds >= 0
  ),
  thumbnail_url text,
  waveform_peaks_url text,
  waveform_peaks_key text,
  waveform_status text not null default 'missing'
    check (waveform_status in ('missing', 'pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  object_key text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 240),
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'ready', 'failed', 'expired')),
  error_message text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_source_matches (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  source_type text not null check (source_type in ('youtube', 'direct', 'hls')),
  source_id text not null check (char_length(source_id) between 1 and 240),
  normalized_source_url text,
  status text not null default 'ready'
    check (status in ('pending', 'ready', 'disabled', 'failed')),
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists media_assets_owner_created_idx
  on public.media_assets (owner_user_id, created_at desc);

create index if not exists media_assets_ready_created_idx
  on public.media_assets (created_at desc)
  where status = 'ready';

create index if not exists media_upload_sessions_owner_created_idx
  on public.media_upload_sessions (owner_user_id, created_at desc);

create index if not exists media_upload_sessions_expires_idx
  on public.media_upload_sessions (expires_at);

create index if not exists media_source_matches_asset_idx
  on public.media_source_matches (media_asset_id);

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

drop trigger if exists media_upload_sessions_set_updated_at
on public.media_upload_sessions;
create trigger media_upload_sessions_set_updated_at
before update on public.media_upload_sessions
for each row execute function private.set_updated_at();

alter table public.media_assets enable row level security;
alter table public.media_upload_sessions enable row level security;
alter table public.media_source_matches enable row level security;

revoke all on public.media_assets from public, anon, authenticated;
revoke all on public.media_upload_sessions from public, anon, authenticated;
revoke all on public.media_source_matches from public, anon, authenticated;

grant select on public.media_assets to anon, authenticated;
grant select on public.media_source_matches to anon, authenticated;
grant select on public.media_upload_sessions to authenticated;
grant select, insert, update, delete on public.media_assets to service_role;
grant select, insert, update, delete on public.media_upload_sessions to service_role;
grant select, insert, update, delete on public.media_source_matches to service_role;

create policy "media_assets_ready_public_select"
on public.media_assets
for select
to anon, authenticated
using (status = 'ready');

create policy "media_assets_owner_select"
on public.media_assets
for select
to authenticated
using (owner_user_id = (select auth.uid()));

create policy "media_upload_sessions_owner_select"
on public.media_upload_sessions
for select
to authenticated
using (owner_user_id = (select auth.uid()));

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
  )
);
