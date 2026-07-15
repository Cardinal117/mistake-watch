-- TASK-002.8D: CloudConvert-backed owner media processing.
-- Browser uploads store source files in R2. CloudConvert normalizes them into
-- browser-safe MP4 files and exports posters back to R2.

alter table public.media_assets
  drop constraint if exists media_assets_status_check,
  add constraint media_assets_status_check
    check (status in ('pending', 'uploading', 'processing', 'ready', 'failed', 'unsupported'));

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_status_check,
  add constraint media_upload_sessions_status_check
    check (status in ('pending', 'uploading', 'processing', 'ready', 'failed', 'expired', 'aborted', 'completing'));

alter table public.media_assets
  add column if not exists source_object_key text,
  add column if not exists source_mime_type text,
  add column if not exists source_file_size_bytes bigint check (
    source_file_size_bytes is null or source_file_size_bytes > 0
  ),
  add column if not exists processed_object_key text,
  add column if not exists processing_provider text check (
    processing_provider is null or processing_provider in ('cloudconvert', 'local', 'manual')
  ),
  add column if not exists processing_status text not null default 'not_required'
    check (processing_status in ('not_required', 'queued', 'processing', 'ready', 'failed')),
  add column if not exists processing_job_id text,
  add column if not exists processing_error_message text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_completed_at timestamptz;

create table if not exists public.media_processing_events (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  provider text not null default 'cloudconvert'
    check (provider in ('cloudconvert', 'local', 'manual')),
  job_id text,
  task_name text,
  task_operation text,
  status text not null,
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists media_assets_processing_status_idx
  on public.media_assets (processing_status, created_at desc)
  where processing_provider = 'cloudconvert';

create index if not exists media_assets_processing_job_idx
  on public.media_assets (processing_job_id)
  where processing_job_id is not null;

create index if not exists media_processing_events_asset_created_idx
  on public.media_processing_events (media_asset_id, created_at desc);

alter table public.media_processing_events enable row level security;

revoke all on public.media_processing_events from public, anon, authenticated;

grant select on public.media_processing_events to authenticated;
grant select, insert, update, delete on public.media_processing_events to service_role;

create policy "media_processing_events_owner_select"
on public.media_processing_events
for select
to authenticated
using (
  exists (
    select 1
    from public.media_assets asset
    where asset.id = media_processing_events.media_asset_id
      and asset.owner_user_id = (select auth.uid())
  )
);
