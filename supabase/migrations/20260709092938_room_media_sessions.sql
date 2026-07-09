-- TASK-002.8J Chunk C: room-scoped uploaded-media playback sessions.
-- This table is an internal server authority record. It lets the app represent
-- uploaded room playback by opaque session id before temporary URL resolution.

create table if not exists public.room_media_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'ended', 'expired', 'revoked')),
  started_by_user_id uuid references auth.users(id) on delete set null,
  started_by_member_id uuid references public.room_members(id) on delete set null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > started_at),
  check (ended_at is null or ended_at >= started_at)
);

create index if not exists room_media_sessions_room_created_idx
  on public.room_media_sessions (room_id, created_at desc);

create index if not exists room_media_sessions_asset_created_idx
  on public.room_media_sessions (media_asset_id, created_at desc);

create index if not exists room_media_sessions_expires_idx
  on public.room_media_sessions (expires_at)
  where status = 'active';

create unique index if not exists room_media_sessions_one_active_per_room_idx
  on public.room_media_sessions (room_id)
  where status = 'active';

drop trigger if exists room_media_sessions_set_updated_at
on public.room_media_sessions;

create trigger room_media_sessions_set_updated_at
before update on public.room_media_sessions
for each row execute function private.set_updated_at();

alter table public.room_media_sessions enable row level security;

revoke all on public.room_media_sessions
  from public, anon, authenticated;

grant select, insert, update, delete
  on public.room_media_sessions
  to service_role;
