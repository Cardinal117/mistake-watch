-- TASK-028.2: private persistent Personal rooms; no hosted activation.
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
alter table public.rooms add constraint rooms_room_kind_enabled_check
  check (room_kind in ('legacy', 'personal'));
alter table public.rooms add constraint personal_room_requires_owner
  check (room_kind <> 'personal' or owner_user_id is not null);
create unique index rooms_one_personal_per_account on public.rooms(owner_user_id)
  where room_kind = 'personal';

create table private.room_kind_features (
  room_kind text primary key check (room_kind = 'personal'),
  enabled boolean not null default false
);
insert into private.room_kind_features(room_kind) values ('personal');
revoke all on private.room_kind_features from public, anon, authenticated;
grant select, update on private.room_kind_features to service_role;

-- Only trusted auth identity and current profile status qualify; user metadata is irrelevant.
create function private.can_access_room_kind(p_room_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rooms r where r.id = p_room_id and (
      r.room_kind = 'legacy' or (r.room_kind = 'personal'
        and r.owner_user_id = (select auth.uid())
        and exists (select 1 from auth.users u join public.profiles p on p.id = u.id
          where u.id = (select auth.uid()) and u.is_anonymous is false
            and p.account_status = 'active'))
    )
  );
$$;
revoke all on function private.can_access_room_kind(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_access_room_kind(uuid) to authenticated;

-- Restrictive policies AND with existing Legacy policies, including policies that
-- grant direct self-membership or owner access without going through helper functions.
create policy room_kind_access on public.rooms as restrictive for all to authenticated
  using (private.can_access_room_kind(id))
  with check (room_kind = 'legacy');
-- SELECT is governed by USING; INSERT/UPDATE Personal is exclusively through trusted server paths.
do $$
declare target record;
begin
  for target in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and a.attname = 'room_id' and not a.attisdropped
  loop
    execute format('create policy room_kind_access on public.%I as restrictive for all to authenticated using (room_id is null or private.can_access_room_kind(room_id)) with check (room_id is null or private.can_access_room_kind(room_id))', target.relname);
  end loop;
end $$;

create function private.guard_personal_room() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.room_kind is distinct from old.room_kind then
      raise exception 'Room kind cannot be changed' using errcode = '23514';
    end if;
    if old.room_kind = 'personal' and new.owner_user_id is distinct from old.owner_user_id then
      raise exception 'Personal owner cannot be changed' using errcode = '23514';
    end if;
  end if;
  if new.room_kind = 'personal' then
    new.idle_deadline_at := null;
    new.saved_by_guest_identity_id := null;
  end if;
  return new;
end $$;
create trigger guard_personal_room before insert or update on public.rooms
  for each row execute function private.guard_personal_room();

create function private.guard_personal_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.rooms;
begin
  if TG_OP = 'DELETE' then
    select * into r from public.rooms where id = old.room_id;
    if r.room_kind = 'personal' then
      raise exception 'Personal membership is permanent' using errcode = '23514';
    end if;
    return old;
  end if;
  if TG_OP = 'UPDATE' and old.room_id is distinct from new.room_id
     and exists(select 1 from public.rooms where id = old.room_id and room_kind = 'personal') then
    raise exception 'Personal membership cannot move' using errcode = '23514';
  end if;
  select * into r from public.rooms where id = new.room_id;
  if r.room_kind = 'personal' then
    if TG_TABLE_NAME = 'guest_identities' then
      raise exception 'Personal rooms do not accept guests' using errcode = '23514';
    elsif new.user_id is distinct from r.owner_user_id or new.guest_identity_id is not null then
      raise exception 'Personal rooms are owner-only' using errcode = '23514';
    elsif TG_TABLE_NAME = 'room_members' then
      if new.role <> 'host' then
        raise exception 'Personal member must be the owner host' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger guard_personal_membership before insert or update or delete on public.room_members
  for each row execute function private.guard_personal_membership();
create trigger guard_personal_guest before insert or update on public.guest_identities
  for each row execute function private.guard_personal_membership();
create trigger guard_personal_permissions before insert or update on public.member_permissions
  for each row execute function private.guard_personal_membership();

-- Delete only Personal before the existing ON DELETE SET NULL owner FK executes.
create function private.delete_owned_personal_room() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rooms where owner_user_id = old.id and room_kind = 'personal';
  return old;
end $$;
create trigger delete_owned_personal_room before delete on auth.users
  for each row execute function private.delete_owned_personal_room();

create function private.open_personal_room() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  account_id uuid := auth.uid();
  display text;
  r public.rooms;
begin
  if account_id is null then
    raise exception 'Sign in to open your Personal room' using errcode = '42501';
  end if;
  -- Lock the account row against deletion/status identity changes during creation.
  select p.display_name into display from auth.users u join public.profiles p on p.id = u.id
    where u.id = account_id and u.is_anonymous is false and p.account_status = 'active'
    for share of u, p;
  if not found then
    raise exception 'An active account is required' using errcode = '42501';
  end if;
  if not exists (select 1 from private.room_kind_features where room_kind = 'personal' and enabled) then
    raise exception 'Personal rooms are not enabled' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('personal-room:' || account_id::text, 0));
  select * into r from public.rooms where owner_user_id = account_id and room_kind = 'personal' for update;
  if not found then
    insert into public.rooms(owner_user_id, room_kind, name, invite_code, invite_token_hash,
      mode, privacy, status, last_active_at)
    values(account_id, 'personal', 'My Personal room', replace(gen_random_uuid()::text, '-', ''),
      gen_random_uuid()::text, 'listen', 'invite', 'open', now()) returning * into r;
    insert into public.room_members(room_id, user_id, display_name, role, last_seen_at)
      values(r.id, account_id, display, 'host', now());
    insert into public.room_settings(room_id, guest_can_add_queue) values(r.id, false);
  elsif r.status <> 'open' then
    if r.status = 'closed' and r.close_reason = 'idle_timeout' then
      update public.rooms set status = 'open', closed_at = null, close_reason = null where id = r.id;
    else
      raise exception 'Your Personal room is unavailable. Contact the site owner.' using errcode = '42501';
    end if;
  end if;
  -- Never reset mode, queue, timestamps or playback on an ordinary resume.
  return r.id;
end $$;
create function public.open_personal_room() returns uuid
language sql security invoker set search_path = '' as $$ select private.open_personal_room(); $$;
revoke all on function private.open_personal_room() from public, anon;
revoke all on function public.open_personal_room() from public, anon;
grant execute on function private.open_personal_room() to authenticated;
grant execute on function public.open_personal_room() to authenticated;
revoke all on function private.guard_personal_room(), private.guard_personal_membership(),
  private.delete_owned_personal_room() from public, anon, authenticated;

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
    and room.room_kind = 'legacy'
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
