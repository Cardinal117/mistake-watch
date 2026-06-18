-- TASK-002.8D: multipart R2 uploads and durable upload progress.
-- The browser uploads large owner media directly to R2 in parts while
-- Supabase keeps the server-verifiable session state.

alter table public.media_upload_sessions
  add column if not exists upload_mode text not null default 'single',
  add column if not exists multipart_upload_id text,
  add column if not exists part_size_bytes bigint,
  add column if not exists part_count integer,
  add column if not exists completed_parts jsonb not null default '[]'::jsonb,
  add column if not exists bytes_uploaded bigint not null default 0,
  add column if not exists resumable_until timestamptz;

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_upload_mode_check,
  add constraint media_upload_sessions_upload_mode_check
    check (upload_mode in ('single', 'multipart'));

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_part_size_bytes_check,
  add constraint media_upload_sessions_part_size_bytes_check
    check (part_size_bytes is null or part_size_bytes >= 5242880);

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_part_count_check,
  add constraint media_upload_sessions_part_count_check
    check (part_count is null or (part_count > 0 and part_count <= 10000));

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_bytes_uploaded_check,
  add constraint media_upload_sessions_bytes_uploaded_check
    check (bytes_uploaded >= 0 and bytes_uploaded <= file_size_bytes);

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_status_check,
  add constraint media_upload_sessions_status_check
    check (status in ('pending', 'uploading', 'ready', 'failed', 'expired', 'aborted', 'completing'));

create index if not exists media_upload_sessions_multipart_idx
  on public.media_upload_sessions (owner_user_id, multipart_upload_id)
  where upload_mode = 'multipart' and multipart_upload_id is not null;
