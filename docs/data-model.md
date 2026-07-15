# Mistake Watch Data Model Plan

## Scope

This document started as the Task 8 schema plan and now records the Task 9
implementation. The initial MVP schema has been applied to the remote Supabase
project through migrations, with RLS, grants, generated types, and server-side
guest identity helpers in place.

Supabase project:

- Name: `watch-mistakestudios`
- Project ref: `qzmivwhzotuleivzphhm`
- Region: `eu-central-1`
- API URL: `https://qzmivwhzotuleivzphhm.supabase.co`
- Current state: Task 9 MVP app tables exist in the public schema with RLS
  enabled.

## Applied Migrations

- `supabase/migrations/20260528094250_mvp_schema_guest_identity.sql`
- `supabase/migrations/20260528094847_task9_advisor_fixes.sql`

Task 9 applied tables for profiles, rooms, guest identities, room members, room
settings, member permissions, queue items, and playback sessions. It also
revoked execution on the existing `public.rls_auto_enable()` helper for `anon`
and `authenticated`, created private RLS helper functions, added policy
indexes, generated TypeScript database types, and added a restrictive deny
policy for direct client access to `guest_identities`.

## Source Responsibilities

Supabase is the durable product database:

- accounts and profile records
- guest identities and invite metadata
- room records and room membership
- room settings and member permission defaults
- persisted queue records and playback history
- later friendships and friend-room discovery

SpacetimeDB is the live room engine:

- active playback timeline
- connected presence
- queue reducers for active sessions
- host/controller locks
- reconnect snapshots
- drift and room-health state

Do not write every live playback tick to Supabase. Supabase should receive
durable snapshots and audit/history records only when they matter for recovery,
dashboard state, or later analytics.

## Guest Identity

Guest display names are not user IDs. They are room-visible labels that can
collide and can change later. The stable guest-first identifiers are:

- `guest_identities.id`: durable room-scoped guest identity.
- `room_members.id`: durable room membership identity used by the app and live
  room reducers.
- room-scoped HTTP-only guest token cookie: reclaim proof for a guest returning
  to the same room.

When accounts are added later, `auth.users.id` and profile IDs become the stable
account identity. Until then, do not key authorization, ownership, queue
history, or permissions by username/display name.

## Room Lifecycle

Rooms should distinguish temporary unsaved rooms from saved rooms:

- Unsaved rooms are disposable active sessions.
- Saved rooms are rejoinable spaces whose persisted queue should remain
  available after everyone leaves.
- Newly created guest-first rooms should default to unsaved so casual test rooms
  do not linger forever.
- Hosts should be able to save or unsave a room from the room UI. Until accounts
  exist, saved ownership is tied to the room host/member identity and room-scoped
  reclaim token; later it should migrate cleanly to `auth.users.id`.
- Saved-room quick links on the dashboard should show saved spaces without
  implying that anyone is currently online.
- Dashboard active people counts must come from live/fresh presence, not from
  durable room membership count.
- Unsaved rooms should close after one hour of idle time.
- Closed unsaved rooms should not be silently reopened by old invite links or
  room codes.
- Saved rooms should remain open or archived according to later saved-room
  product rules, but their queue should not be deleted by idle cleanup.

The cleanup mechanism should use Supabase Cron or an equivalent scheduled server
job. A SQL scheduled cleanup is sufficient for closing idle unsaved rooms unless
future cleanup needs to call external services.

## Security Baseline

The app should use the public Supabase Data API only with RLS and explicit
grants.

Current Supabase guidance to carry into Task 9:

- Enable RLS on every app table in the exposed `public` schema.
- Do not rely on RLS alone for schema visibility; use explicit `GRANT` /
  `REVOKE` for `anon` and `authenticated`.
- Prefer publishable keys for browser/client code.
- Never expose service role or secret keys to the browser.
- Do not use user-editable `raw_user_meta_data` for authorization.
- Specify policy roles with `to authenticated` or `to anon` instead of leaving
  policies role-agnostic.
- Wrap stable auth helper calls as `(select auth.uid())` in policies where
  appropriate.
- Add indexes on columns used in policy predicates.
- Keep `security definer` helper functions out of exposed schemas.
- Views exposed to clients should use `security_invoker = true` on Postgres 15+
  or remain outside exposed schemas.

The existing project currently has a security advisor warning for
`public.rls_auto_enable()` being callable as a `SECURITY DEFINER` function by
`anon` and `authenticated`. Task 9 should either remove it, move it to a private
schema, revoke execute, or document why it is intentionally callable before app
tables are exposed.

## Proposed Tables

### `profiles`

Purpose: durable account profile for signed-in users.

Columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `avatar_url text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS intent:

- `authenticated` can select basic profile fields for users who share a room or
  friendship edge.
- `authenticated` can insert/update only their own profile.
- `anon` has no table access.

Indexes:

- primary key on `id`
- optional lower/display-name search index later, only when search exists

### `guest_identities`

Purpose: room-scoped guest identity without full account creation.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `room_id uuid not null references rooms(id) on delete cascade`
- `display_name text not null`
- `token_hash text not null`
- `last_seen_at timestamptz`
- `created_at timestamptz not null default now()`

RLS intent:

- Direct browser access should be minimal. Guest join should preferably go
  through a server route or action that validates invite context.
- Guests should only recover their own room-scoped identity through a verified
  token, never list all guests.
- `anon` should not have broad select access.

Indexes:

- unique index on `(room_id, token_hash)`
- index on `room_id`

### `rooms`

Purpose: durable room metadata and dashboard visibility.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `owner_id uuid references auth.users(id)`
- `name text not null`
- `slug text unique`
- `privacy text not null check (privacy in ('invite', 'friends'))`
- `mode text not null check (mode in ('watch', 'listen', 'browser'))`
- `status text not null check (status in ('open', 'closed', 'archived'))`
- `is_saved boolean not null default false`
- `saved_by_user_id uuid references auth.users(id)`
- `saved_by_guest_identity_id uuid references guest_identities(id)`
- `idle_deadline_at timestamptz`
- `closed_at timestamptz`
- `close_reason text check (close_reason in ('idle_timeout', 'host_closed', 'manual_cleanup'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `last_active_at timestamptz`

RLS intent:

- Room owner and members can select their rooms.
- Friends can select rooms only when account/friending is implemented and room
  privacy is `friends`.
- `anon` can only resolve invite-link join metadata through a narrow server
  flow, not list rooms.
- Owner can update durable room metadata.
- Host/member save actions can update `is_saved` and saved-by fields through a
  server action that validates room-scoped host access.
- Cleanup jobs can close unsaved idle rooms but must not delete saved rooms or
  their queues.

Indexes:

- index on `owner_id`
- index on `status, last_active_at desc`
- index on `is_saved, status, last_active_at desc`
- index on `idle_deadline_at` where `is_saved = false and status = 'open'`
- unique index on `slug` if invite slugs are used

### `room_members`

Purpose: durable membership, roles, and rejoin state.

Columns:

- `room_id uuid not null references rooms(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `guest_identity_id uuid references guest_identities(id) on delete cascade`
- `role text not null check (role in ('host', 'guest'))`
- `joined_at timestamptz not null default now()`
- `last_seen_at timestamptz`
- primary key candidate: `(room_id, user_id)` for accounts and a separate unique
  index on `(room_id, guest_identity_id)` for guests

RLS intent:

- Room members can select membership for rooms they belong to.
- Host can manage durable membership/role metadata.
- Server-side guest join creates guest membership.
- Ensure exactly one of `user_id` or `guest_identity_id` is present.

Indexes:

- index on `room_id`
- index on `user_id`
- index on `guest_identity_id`

### `room_settings`

Purpose: per-room defaults for permissions and feature flags.

Columns:

- `room_id uuid primary key references rooms(id) on delete cascade`
- `guest_can_add_queue boolean not null default true`
- `guest_can_control_playback boolean not null default false`
- `guest_can_load_source boolean not null default false`
- `browser_mode_enabled boolean not null default false`
- `voting_enabled boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS intent:

- Room members can select settings.
- Host can update settings.
- No `anon` list access.

Indexes:

- primary key on `room_id`

### `member_permissions`

Purpose: host-managed overrides for a specific account or guest member.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `room_id uuid not null references rooms(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `guest_identity_id uuid references guest_identities(id) on delete cascade`
- `can_add_queue boolean`
- `can_manage_queue boolean`
- `can_control_playback boolean`
- `can_load_source boolean`
- `can_control_browser boolean`
- `updated_at timestamptz not null default now()`

RLS intent:

- Room members can select effective permissions for their room.
- Host can update overrides.
- The app should compute effective permissions by combining settings and
  overrides; SpacetimeDB should mirror effective live permissions for active
  sessions.

Indexes:

- unique partial indexes for `(room_id, user_id)` and
  `(room_id, guest_identity_id)`

### `queue_items`

Purpose: persisted queue items for recovery, dashboard state, and history.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `room_id uuid not null references rooms(id) on delete cascade`
- `source_type text not null check (source_type in ('direct', 'hls', 'youtube'))`
- `source_url text not null`
- `provider_id text`
- `title text`
- `artist text`
- `duration_seconds integer`
- `position integer not null`
- `status text not null check (status in ('queued', 'playing', 'played', 'removed'))`
- `added_by_user_id uuid references auth.users(id)`
- `added_by_guest_identity_id uuid references guest_identities(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS intent:

- Room members can select queue items for their room.
- Members with queue-add permission can insert queued items.
- Host can reorder, remove, and clear.
- SpacetimeDB owns active queue reducers; Supabase persists queue state at
  durable mutation boundaries, not on every live event.

Indexes:

- unique index on `(room_id, position)` for active queue ordering
- index on `room_id, status, position`
- index on `added_by_user_id`
- index on `added_by_guest_identity_id`

### `playback_sessions`

Purpose: optional durable playback history/current-source recovery.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `room_id uuid not null references rooms(id) on delete cascade`
- `queue_item_id uuid references queue_items(id) on delete set null`
- `source_type text not null`
- `source_url text not null`
- `started_at timestamptz`
- `ended_at timestamptz`
- `last_position_seconds numeric`
- `last_status text check (last_status in ('playing', 'paused', 'ended', 'error'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS intent:

- Room members can select playback session summaries.
- Live timeline remains in SpacetimeDB.
- Host/server can insert/update session records at source changes and room
  close/recovery points.

Indexes:

- index on `room_id, updated_at desc`
- index on `queue_item_id`

### `friendships` Later

Purpose: account-only friend-room discovery.

Columns:

- `requester_id uuid references auth.users(id) on delete cascade`
- `addressee_id uuid references auth.users(id) on delete cascade`
- `status text not null check (status in ('pending', 'accepted', 'blocked'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- primary key on `(requester_id, addressee_id)`

RLS intent:

- A user can see friendship rows where they are requester or addressee.
- A user can create a pending request from themselves.
- Accepted friendships enable dashboard friend-room discovery.

## Task 9 Migration Result

1. Reviewed and remediated `public.rls_auto_enable()` by revoking execute from
   `public`, `anon`, and `authenticated`.
2. Created migration files with the Supabase CLI.
3. Reused existing UUID support; no new extension install was required.
4. Created tables in dependency order:
   `profiles`, `rooms`, `guest_identities`, `room_members`, `room_settings`,
   `member_permissions`, `queue_items`, `playback_sessions`.
5. Added check constraints for enum-like fields and identity ownership shape.
6. Added indexes for joins, dashboard queries, policy predicates, queue order,
   and foreign keys.
7. Enabled RLS on every app table.
8. Revoked broad table access, granted only required privileges to
   `authenticated`, and left direct `anon` table access unavailable.
9. Created RLS policies with explicit roles and private helper functions.
10. Ran SQL smoke verification for guest room creation, membership, settings,
    and reclaim matching. The smoke row was explicitly deleted afterward.
11. Ran Supabase security and performance advisors after applying migrations.
12. Generated TypeScript database types in `lib/supabase/database.types.ts`.

## Access Model Notes

Guest-first does not mean public-readable tables. Guest access is backed by
server-created invite tokens and room-scoped identity records. Broad `anon`
table policies are intentionally avoided.

For the first friends-and-family release, the safest path is:

- unauthenticated user opens invite link
- server route validates invite and creates or reclaims a guest identity
- guest receives room-scoped session material
- Supabase stores durable identity and membership
- SpacetimeDB handles live room participation

## Open Questions For Task 9

- Should guest cookies be plain opaque tokens or signed/encrypted envelopes once
  route handlers are wired in Task 10?
- Should queue persistence happen on every queue reducer mutation or on periodic
  room snapshots from SpacetimeDB?
- Should invite slugs be short human-readable codes, UUID links, or both?
- Should `pg_graphql` be disabled if Mistake Watch only uses REST/client SDKs?
- Should room history be retained indefinitely, user-pruned, or auto-expired?
