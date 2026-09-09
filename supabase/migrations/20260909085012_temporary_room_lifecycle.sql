-- TASK-028.6: one hour without verified activity; purge eligibility 24h after closure.
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
alter table public.rooms add constraint rooms_room_kind_enabled_check check(room_kind in ('legacy','personal','shared','themed','temporary'));
alter table private.room_kind_features drop constraint room_kind_features_room_kind_check;
alter table private.room_kind_features add constraint room_kind_features_room_kind_check check(room_kind in ('personal','shared','themed','temporary'));
insert into private.room_kind_features values ('temporary',false);

create table private.temporary_room_lifecycle (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 last_activity_at timestamptz not null default now(),
 closed_at timestamptz,
 live_retired boolean not null default false
);
alter table private.temporary_room_lifecycle enable row level security;
revoke all on private.temporary_room_lifecycle from public,anon,authenticated;
grant all on private.temporary_room_lifecycle to service_role;

create function private.temporary_room_open(target_room uuid,at_time timestamptz default now())
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r join private.temporary_room_lifecycle l on l.room_id=r.id
 where r.id=target_room and r.room_kind='temporary' and r.status='open' and l.closed_at is null
 and l.last_activity_at>at_time-interval '1 hour');
$$;
revoke all on function private.temporary_room_open(uuid,timestamptz) from public,anon,authenticated;
create function public.is_temporary_room_open(target_room uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select private.temporary_room_open(target_room);
$$;
revoke all on function public.is_temporary_room_open(uuid) from public,anon,authenticated;
grant execute on function public.is_temporary_room_open(uuid) to service_role;

-- UUID-only receipt survives purge so old links can explain expiry without keeping room data.
create table private.ended_temporary_rooms(room_id uuid primary key);
alter table private.ended_temporary_rooms enable row level security;
revoke all on private.ended_temporary_rooms from public,anon,authenticated;
grant select,insert on private.ended_temporary_rooms to service_role;
create function public.has_temporary_room_ended(target_room uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from private.ended_temporary_rooms where room_id=target_room)
 or exists(select 1 from public.rooms where id=target_room and room_kind='temporary'
 and not private.temporary_room_open(target_room));
$$;
revoke all on function public.has_temporary_room_ended(uuid) from public,anon,authenticated;
grant execute on function public.has_temporary_room_ended(uuid) to service_role;

create or replace function private.can_access_room_kind(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and (
 r.room_kind in ('legacy','themed') or
 (r.room_kind='temporary' and private.temporary_room_open(r.id)) or
 (r.room_kind='personal' and r.owner_user_id=private.active_room_account()) or
 (r.room_kind='shared' and exists(select 1 from private.shared_memberships s
 where s.room_id=r.id and s.user_id=private.active_room_account() and s.state='approved'))));
$$;

create function private.guard_temporary_room() returns trigger language plpgsql set search_path='' as $$
begin
 if new.room_kind<>'temporary' then return new; end if;
 if current_user not in ('postgres','service_role') then raise exception 'Temporary rooms use verified server actions' using errcode='42501'; end if;
 if TG_OP='INSERT' and not exists(select 1 from private.room_kind_features where room_kind='temporary' and enabled) then
  raise exception 'Temporary rooms are not enabled' using errcode='42501'; end if;
 if new.is_saved then raise exception 'Temporary rooms cannot be saved' using errcode='23514'; end if;
 if TG_OP='UPDATE' and old.status<>'open' and new.status='open' then
  raise exception 'Temporary rooms cannot reopen' using errcode='23514'; end if;
 new.saved_by_user_id:=null; new.saved_by_guest_identity_id:=null;
 if new.status<>'open' then new.closed_at:=coalesce(new.closed_at,now()); end if;
 return new;
end $$;
create trigger guard_temporary_room before insert or update on public.rooms for each row execute function private.guard_temporary_room();
create function private.record_temporary_lifecycle() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.room_kind='temporary' then
  if TG_OP='INSERT' then insert into private.temporary_room_lifecycle(room_id) values(new.id);
  elsif new.status<>'open' then update private.temporary_room_lifecycle set closed_at=coalesce(closed_at,new.closed_at,now()) where room_id=new.id; end if;
  if new.status<>'open' then insert into private.ended_temporary_rooms(room_id) values(new.id) on conflict do nothing; end if;
 end if;
 return new;
end $$;
create trigger record_temporary_lifecycle after insert or update on public.rooms for each row execute function private.record_temporary_lifecycle();
revoke all on function private.guard_temporary_room(),private.record_temporary_lifecycle() from public,anon,authenticated;

-- Service-only creation; guest tokens/invites are generated and hashed by the server.
create function public.create_temporary_room(target_room uuid,room_name text,display_name text,room_mode text,invite_code text,invite_hash text,guest_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.rooms; g public.guest_identities; m public.room_members;
begin
 if target_room is null or room_name is null or char_length(btrim(room_name)) not between 1 and 60
 or display_name is null or char_length(btrim(display_name)) not between 1 and 32
 or room_mode is null or room_mode not in ('watch','listen') or invite_code is null or char_length(invite_code)<6
 or invite_hash is null or char_length(invite_hash)<>64 or guest_hash is null or char_length(guest_hash)<>64 then
  raise exception 'Invalid Temporary room details' using errcode='22023'; end if;
 insert into public.rooms(id,room_kind,name,mode,invite_code,invite_token_hash,privacy,status,last_active_at,idle_deadline_at)
 values(target_room,'temporary',btrim(room_name),room_mode,invite_code,invite_hash,'invite','open',now(),now()+interval '1 hour') returning * into r;
 insert into public.guest_identities(room_id,display_name,token_hash,last_seen_at)
 values(r.id,btrim(display_name),guest_hash,now()) returning * into g;
 insert into public.room_members(room_id,guest_identity_id,display_name,role,last_seen_at)
 values(r.id,g.id,btrim(display_name),'host',now()) returning * into m;
 insert into public.room_settings(room_id) values(r.id);
 return jsonb_build_object('room',to_jsonb(r),'guestIdentity',to_jsonb(g),'member',to_jsonb(m));
end $$;

create function private.close_expired_temporary_rooms(p_now timestamptz default now())
returns integer language plpgsql set search_path='' as $$
declare affected integer:=0; target uuid;
begin
 -- Re-read activity after acquiring the room lock, not in the initial scan's snapshot.
 for target in select id from public.rooms where room_kind='temporary' and status='open' order by id for update skip locked loop
  if exists(select 1 from private.temporary_room_lifecycle where room_id=target and last_activity_at<=p_now-interval '1 hour') then
   update public.rooms set status='closed',closed_at=p_now,close_reason='idle_timeout' where id=target;
   affected:=affected+1;
  end if;
 end loop;
 return affected;
end $$;

-- Invoked only after authenticated identity or the room-scoped guest token is verified.
-- Also verifies membership under the room lock. A read-only dashboard lookup never touches.
create function private.access_temporary_room(target_room uuid,member_id uuid,account_id uuid,guest_hash text,touch_activity boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.rooms;
begin
 select * into r from public.rooms where id=target_room and room_kind='temporary' for update;
 if not found or r.status<>'open' then return false; end if;
 if not private.temporary_room_open(target_room,clock_timestamp()) then
  update public.rooms set status='closed',closed_at=clock_timestamp(),close_reason='idle_timeout' where id=target_room; return false;
 end if;
 if not exists(select 1 from public.room_members m where m.id=member_id and m.room_id=target_room and (
  (account_id is not null and m.user_id=account_id and exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=account_id and p.account_status='active' and not u.is_anonymous)) or
  (guest_hash is not null and exists(select 1 from public.guest_identities g where g.id=m.guest_identity_id and g.room_id=target_room and g.token_hash=guest_hash)))) then return false; end if;
 if touch_activity then
  update private.temporary_room_lifecycle set last_activity_at=clock_timestamp() where room_id=target_room;
  update public.rooms set last_active_at=clock_timestamp(),idle_deadline_at=clock_timestamp()+interval '1 hour' where id=target_room;
  update public.room_members set last_seen_at=clock_timestamp() where id=member_id;
 end if;
 return true;
end $$;
create function public.access_temporary_room(target_room uuid,member_id uuid,account_id uuid,guest_hash text,touch_activity boolean)
returns boolean language sql security invoker set search_path='' as $$
 select private.access_temporary_room(target_room,member_id,account_id,guest_hash,touch_activity);
$$;
revoke all on function private.access_temporary_room(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function private.access_temporary_room(uuid,uuid,uuid,text,boolean) to service_role;


-- Prevent guest creation/account attachment from admitting an expired room between reads.
create function private.guard_temporary_member() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;
begin
 select room_kind into kind from public.rooms where id=new.room_id for update;
 if kind='temporary' and not private.temporary_room_open(new.room_id,clock_timestamp()) then
  raise exception 'Temporary room expired' using errcode='42501'; end if;
 return new;
end $$;
create trigger guard_temporary_member before insert or update on public.room_members for each row execute function private.guard_temporary_member();
revoke all on function private.guard_temporary_member() from public,anon,authenticated;

create function public.pending_temporary_room_cleanup()
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform private.close_expired_temporary_rooms();
 return coalesce((select jsonb_agg(j) from (select l.room_id, (l.live_retired and l.closed_at<=now()-interval '24 hours') as purge
 from private.temporary_room_lifecycle l where l.closed_at is not null
 and (not l.live_retired or l.closed_at<=now()-interval '24 hours') order by l.closed_at limit 20) j),'[]'::jsonb);
end $$;
create function public.finish_temporary_room_cleanup(target_room uuid,purge boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.rooms where id=target_room and room_kind='temporary' and status<>'open' for update;
 if not found then return false; end if;
 if purge then
  if not exists(select 1 from private.temporary_room_lifecycle where room_id=target_room and live_retired and closed_at<=now()-interval '24 hours') then return false; end if;
  delete from public.rooms where id=target_room and room_kind='temporary';
 else update private.temporary_room_lifecycle set live_retired=true where room_id=target_room and closed_at is not null;
 end if;
 return true;
end $$;
create function private.close_owned_temporary_rooms() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.rooms set status='closed',closed_at=now(),close_reason='manual_cleanup'
 where owner_user_id=old.id and room_kind='temporary' and status='open'; return old;
end $$;
create trigger close_owned_temporary_rooms before delete on auth.users for each row execute function private.close_owned_temporary_rooms();
revoke all on function private.close_owned_temporary_rooms(),private.close_expired_temporary_rooms(timestamptz) from public,anon,authenticated;
grant execute on function private.temporary_room_open(uuid,timestamptz),private.close_expired_temporary_rooms(timestamptz) to service_role;
do $$ declare f text; begin
 foreach f in array array['create_temporary_room(uuid,text,text,text,text,text,text)','access_temporary_room(uuid,uuid,uuid,text,boolean)','pending_temporary_room_cleanup()','finish_temporary_room_cleanup(uuid,boolean)'] loop
 execute 'revoke all on function public.'||f||' from public,anon,authenticated';
 execute 'grant execute on function public.'||f||' to service_role'; end loop;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('mistake-watch-close-temporary-rooms','*/10 * * * *',$cron$select private.close_expired_temporary_rooms();$cron$);
 end if;
end $$;
