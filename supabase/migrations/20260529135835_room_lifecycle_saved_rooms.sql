-- Task 15.D: saved-room lifecycle and idle cleanup.

alter table public.rooms
  add column is_saved boolean not null default false,
  add column saved_by_user_id uuid references auth.users(id) on delete set null,
  add column saved_by_guest_identity_id uuid references public.guest_identities(id) on delete set null,
  add column idle_deadline_at timestamptz,
  add column closed_at timestamptz,
  add column close_reason text check (
    close_reason is null
    or close_reason in ('idle_timeout', 'host_closed', 'manual_cleanup')
  );

update public.rooms
set
  last_active_at = coalesce(last_active_at, updated_at, created_at),
  idle_deadline_at = coalesce(last_active_at, updated_at, created_at) + interval '1 hour'
where last_active_at is null
   or idle_deadline_at is null;

create index rooms_saved_status_last_active_idx
  on public.rooms (is_saved, status, last_active_at desc);

create index rooms_idle_deadline_open_unsaved_idx
  on public.rooms (idle_deadline_at)
  where is_saved = false and status = 'open';

create or replace function private.close_idle_unsaved_rooms(
  p_now timestamptz default now()
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  closed_count integer := 0;
begin
  update public.rooms room
  set
    status = 'closed',
    closed_at = p_now,
    close_reason = 'idle_timeout',
    updated_at = p_now
  where room.status = 'open'
    and room.is_saved = false
    and coalesce(
      room.idle_deadline_at,
      room.last_active_at + interval '1 hour',
      room.created_at + interval '1 hour'
    ) <= p_now
    and not exists (
      select 1
      from public.room_members member
      where member.room_id = room.id
        and member.last_seen_at > p_now - interval '1 hour'
    );

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function private.close_idle_unsaved_rooms(timestamptz)
  from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then
    if exists (
      select 1
      from cron.job
      where jobname = 'mistake-watch-close-idle-unsaved-rooms'
    ) then
      perform cron.unschedule('mistake-watch-close-idle-unsaved-rooms');
    end if;

    perform cron.schedule(
      'mistake-watch-close-idle-unsaved-rooms',
      '*/10 * * * *',
      $cron$select private.close_idle_unsaved_rooms();$cron$
    );
  end if;
end $$;
