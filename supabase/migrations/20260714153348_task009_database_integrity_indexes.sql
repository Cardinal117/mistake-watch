-- Cover foreign keys used by room-session cleanup and authorization revocation.
-- These indexes are additive and may be applied before the application release.
create index if not exists room_media_sessions_started_by_member_id_idx
  on public.room_media_sessions (started_by_member_id);

create index if not exists room_media_sessions_started_by_user_id_idx
  on public.room_media_sessions (started_by_user_id);

create index if not exists uploaded_catalogue_authorizations_granted_by_user_id_idx
  on public.uploaded_catalogue_authorizations (granted_by_user_id);

comment on table public.room_media_sessions is
  'Server-managed uploaded-media playback sessions. Client roles have no direct grants or RLS policies.';

comment on table public.uploaded_catalogue_authorizations is
  'Server-managed uploaded catalogue allowlist. Client roles have no direct grants or RLS policies.';
