-- Mistake Watch MVP schema and guest identity foundation.
-- Supabase is durable state; SpacetimeDB remains the live room engine.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  invite_code text not null unique check (char_length(invite_code) between 4 and 32),
  invite_token_hash text not null unique,
  privacy text not null default 'invite' check (privacy in ('invite', 'friends')),
  mode text not null default 'watch' check (mode in ('watch', 'listen', 'browser')),
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create table public.guest_identities (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  token_hash text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (room_id, token_hash)
);

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_identity_id uuid references public.guest_identities(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'guest' check (role in ('host', 'guest')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  check (
    (user_id is not null and guest_identity_id is null)
    or
    (user_id is null and guest_identity_id is not null)
  )
);

create table public.room_settings (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  guest_can_add_queue boolean not null default true,
  guest_can_control_playback boolean not null default false,
  guest_can_load_source boolean not null default false,
  browser_mode_enabled boolean not null default false,
  voting_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_permissions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_identity_id uuid references public.guest_identities(id) on delete cascade,
  can_add_queue boolean,
  can_manage_queue boolean,
  can_control_playback boolean,
  can_load_source boolean,
  can_control_browser boolean,
  updated_at timestamptz not null default now(),
  check (
    (user_id is not null and guest_identity_id is null)
    or
    (user_id is null and guest_identity_id is not null)
  )
);

create table public.queue_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  source_type text not null check (source_type in ('direct', 'hls', 'youtube')),
  source_url text not null,
  provider_id text,
  title text,
  artist text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  position integer not null check (position >= 0),
  status text not null default 'queued' check (status in ('queued', 'playing', 'played', 'removed')),
  added_by_user_id uuid references auth.users(id) on delete set null,
  added_by_guest_identity_id uuid references public.guest_identities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    added_by_user_id is not null
    or
    added_by_guest_identity_id is not null
  )
);

create table public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  queue_item_id uuid references public.queue_items(id) on delete set null,
  source_type text not null check (source_type in ('direct', 'hls', 'youtube')),
  source_url text not null,
  started_at timestamptz,
  ended_at timestamptz,
  last_position_seconds numeric check (last_position_seconds is null or last_position_seconds >= 0),
  last_status text check (last_status is null or last_status in ('playing', 'paused', 'ended', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_display_name_idx on public.profiles (display_name);
create index rooms_owner_user_id_idx on public.rooms (owner_user_id);
create index rooms_status_last_active_idx on public.rooms (status, last_active_at desc);
create index rooms_invite_code_idx on public.rooms (invite_code);
create index guest_identities_room_id_idx on public.guest_identities (room_id);
create index room_members_room_id_idx on public.room_members (room_id);
create index room_members_user_id_idx on public.room_members (user_id);
create index room_members_guest_identity_id_idx on public.room_members (guest_identity_id);
create unique index room_members_room_user_unique_idx
  on public.room_members (room_id, user_id)
  where user_id is not null;
create unique index room_members_room_guest_unique_idx
  on public.room_members (room_id, guest_identity_id)
  where guest_identity_id is not null;
create index member_permissions_room_id_idx on public.member_permissions (room_id);
create unique index member_permissions_room_user_unique_idx
  on public.member_permissions (room_id, user_id)
  where user_id is not null;
create unique index member_permissions_room_guest_unique_idx
  on public.member_permissions (room_id, guest_identity_id)
  where guest_identity_id is not null;
create unique index queue_items_room_position_active_idx
  on public.queue_items (room_id, position)
  where status in ('queued', 'playing');
create index queue_items_room_status_position_idx on public.queue_items (room_id, status, position);
create index queue_items_added_by_user_idx on public.queue_items (added_by_user_id);
create index queue_items_added_by_guest_idx on public.queue_items (added_by_guest_identity_id);
create index playback_sessions_room_updated_idx on public.playback_sessions (room_id, updated_at desc);
create index playback_sessions_queue_item_idx on public.playback_sessions (queue_item_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function private.set_updated_at();

create trigger room_settings_set_updated_at
before update on public.room_settings
for each row execute function private.set_updated_at();

create trigger member_permissions_set_updated_at
before update on public.member_permissions
for each row execute function private.set_updated_at();

create trigger queue_items_set_updated_at
before update on public.queue_items
for each row execute function private.set_updated_at();

create trigger playback_sessions_set_updated_at
before update on public.playback_sessions
for each row execute function private.set_updated_at();

create or replace function private.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_room_host(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.room_id = p_room_id
      and rm.user_id = (select auth.uid())
      and rm.role = 'host'
  )
  or exists (
    select 1
    from public.rooms r
    where r.id = p_room_id
      and r.owner_user_id = (select auth.uid())
  );
$$;

create or replace function private.member_can_add_queue(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_room_host(p_room_id)
    or (
      private.is_room_member(p_room_id)
      and exists (
        select 1
        from public.room_settings rs
        where rs.room_id = p_room_id
          and rs.guest_can_add_queue is true
      )
    )
    or exists (
      select 1
      from public.member_permissions mp
      where mp.room_id = p_room_id
        and mp.user_id = (select auth.uid())
        and mp.can_add_queue is true
    );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;
grant execute on function private.is_room_host(uuid) to authenticated;
grant execute on function private.member_can_add_queue(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.guest_identities enable row level security;
alter table public.room_members enable row level security;
alter table public.room_settings enable row level security;
alter table public.member_permissions enable row level security;
alter table public.queue_items enable row level security;
alter table public.playback_sessions enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.rooms from public, anon, authenticated;
revoke all on public.guest_identities from public, anon, authenticated;
revoke all on public.room_members from public, anon, authenticated;
revoke all on public.room_settings from public, anon, authenticated;
revoke all on public.member_permissions from public, anon, authenticated;
revoke all on public.queue_items from public, anon, authenticated;
revoke all on public.playback_sessions from public, anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.rooms to authenticated;
grant select, insert on public.room_members to authenticated;
grant select, update on public.room_settings to authenticated;
grant select, insert, update, delete on public.member_permissions to authenticated;
grant select, insert, update, delete on public.queue_items to authenticated;
grant select, insert, update on public.playback_sessions to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

create policy "profiles_select_room_peers"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.room_members rm_self
    join public.room_members rm_profile
      on rm_profile.room_id = rm_self.room_id
    where rm_self.user_id = (select auth.uid())
      and rm_profile.user_id = public.profiles.id
  )
);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "rooms_select_members"
on public.rooms
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or private.is_room_member(id)
);

create policy "rooms_insert_owner"
on public.rooms
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and owner_user_id is not null
);

create policy "rooms_update_hosts"
on public.rooms
for update
to authenticated
using (private.is_room_host(id))
with check (private.is_room_host(id));

create policy "room_members_select_members"
on public.room_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_room_member(room_id)
);

create policy "room_members_insert_self_or_host"
on public.room_members
for insert
to authenticated
with check (
  (
    user_id = (select auth.uid())
    and role = 'guest'
  )
  or
  (
    user_id = (select auth.uid())
    and role = 'host'
    and exists (
      select 1
      from public.rooms r
      where r.id = room_id
        and r.owner_user_id = (select auth.uid())
    )
  )
  or private.is_room_host(room_id)
);

create policy "room_settings_select_members"
on public.room_settings
for select
to authenticated
using (private.is_room_member(room_id));

create policy "room_settings_update_hosts"
on public.room_settings
for update
to authenticated
using (private.is_room_host(room_id))
with check (private.is_room_host(room_id));

create policy "member_permissions_select_members"
on public.member_permissions
for select
to authenticated
using (private.is_room_member(room_id));

create policy "member_permissions_insert_hosts"
on public.member_permissions
for insert
to authenticated
with check (private.is_room_host(room_id));

create policy "member_permissions_update_hosts"
on public.member_permissions
for update
to authenticated
using (private.is_room_host(room_id))
with check (private.is_room_host(room_id));

create policy "member_permissions_delete_hosts"
on public.member_permissions
for delete
to authenticated
using (private.is_room_host(room_id));

create policy "queue_items_select_members"
on public.queue_items
for select
to authenticated
using (private.is_room_member(room_id));

create policy "queue_items_insert_allowed_members"
on public.queue_items
for insert
to authenticated
with check (
  private.member_can_add_queue(room_id)
  and added_by_user_id = (select auth.uid())
  and added_by_guest_identity_id is null
);

create policy "queue_items_update_hosts"
on public.queue_items
for update
to authenticated
using (private.is_room_host(room_id))
with check (private.is_room_host(room_id));

create policy "queue_items_delete_hosts"
on public.queue_items
for delete
to authenticated
using (private.is_room_host(room_id));

create policy "playback_sessions_select_members"
on public.playback_sessions
for select
to authenticated
using (private.is_room_member(room_id));

create policy "playback_sessions_insert_hosts"
on public.playback_sessions
for insert
to authenticated
with check (private.is_room_host(room_id));

create policy "playback_sessions_update_hosts"
on public.playback_sessions
for update
to authenticated
using (private.is_room_host(room_id))
with check (private.is_room_host(room_id));
