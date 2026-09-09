-- TASK-028.5. Durable direction only; automatic theme classification remains unavailable.
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
alter table public.rooms add constraint rooms_room_kind_enabled_check check(room_kind in ('legacy','personal','shared','themed'));
alter table public.rooms add constraint themed_requires_owner check(room_kind<>'themed' or owner_user_id is not null);
alter table private.room_kind_features drop constraint room_kind_features_room_kind_check;
alter table private.room_kind_features add constraint room_kind_features_room_kind_check check(room_kind in ('personal','shared','themed'));
insert into private.room_kind_features values ('themed',false);

create table private.room_theme_directions (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 direction text not null check(char_length(btrim(direction)) between 1 and 500),
 exclusions text not null default '' check(char_length(exclusions)<=500),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now()
);
create table private.themed_creation_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, room_id uuid not null references public.rooms(id) on delete cascade,
 primary key(user_id,request_id)
);
alter table private.room_theme_directions enable row level security;
alter table private.themed_creation_requests enable row level security;
revoke all on private.room_theme_directions,private.themed_creation_requests from public,anon,authenticated;
grant all on private.room_theme_directions,private.themed_creation_requests to service_role;

-- This is a kind restriction, ANDed with existing room membership/invitation RLS.
create or replace function private.can_access_room_kind(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and (
 r.room_kind in ('legacy','themed') or (r.room_kind='personal' and r.owner_user_id=private.active_room_account()) or
 (r.room_kind='shared' and exists(select 1 from private.shared_memberships s
 where s.room_id=r.id and s.user_id=private.active_room_account() and s.state='approved'))));
$$;

create function private.guard_themed_room() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.room_kind='themed' and new.owner_user_id is distinct from old.owner_user_id then
   raise exception 'Themed ownership cannot change' using errcode='23514'; end if;
 if new.room_kind='themed' then new.idle_deadline_at:=null; new.saved_by_guest_identity_id:=null; end if;
 return new;
end $$;
create trigger guard_themed_room before insert or update on public.rooms for each row execute function private.guard_themed_room();
create function private.delete_owned_themed_room() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.rooms where owner_user_id=old.id and room_kind='themed'; return old; end $$;
create trigger delete_owned_themed_room before delete on auth.users for each row execute function private.delete_owned_themed_room();
revoke all on function private.guard_themed_room(),private.delete_owned_themed_room() from public,anon,authenticated;

create function private.create_themed_room(room_name text,direction text,exclusions text,request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); result uuid;
begin
 if actor is null then raise exception 'An active signed-in account is required' using errcode='42501'; end if;
 if not exists(select 1 from private.room_kind_features where room_kind='themed' and enabled) then
   raise exception 'Themed rooms are not enabled' using errcode='42501'; end if;
 if request_id is null or room_name is null or char_length(btrim(room_name)) not between 1 and 60
   or direction is null or char_length(btrim(direction)) not between 1 and 500 or exclusions is null or char_length(exclusions)>500 then
   raise exception 'Use a room name of 1–60 and direction of 1–500 characters; exclusions at most 500' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('themed-create:'||actor::text||request_id::text,0));
 select c.room_id into result from private.themed_creation_requests c where c.user_id=actor and c.request_id=create_themed_room.request_id;
 if result is not null then return result; end if;
 insert into public.rooms(owner_user_id,room_kind,name,invite_code,invite_token_hash,mode,privacy,status)
 values(actor,'themed',btrim(room_name),upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),gen_random_uuid()::text,'listen','invite','open') returning id into result;
 insert into public.room_members(room_id,user_id,display_name,role) select result,actor,display_name,'host' from public.profiles where id=actor;
 insert into public.room_settings(room_id,guest_can_add_queue) values(result,true);
 insert into private.room_theme_directions(room_id,direction,exclusions) values(result,btrim(direction),btrim(exclusions));
 insert into private.themed_creation_requests values(actor,request_id,result);
 return result;
end $$;
create function public.create_themed_room(room_name text,direction text,exclusions text,request_id uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.create_themed_room(room_name,direction,exclusions,request_id); $$;

create function private.change_room_direction(target_room uuid,expected_version integer,direction text,exclusions text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); current_direction private.room_theme_directions;
begin
 -- Lock the room first to serialize closure/owner deletion with edits.
 perform 1 from public.rooms where id=target_room and room_kind='themed' and owner_user_id=actor and status='open' for update;
 if not found or actor is null then raise exception 'Only the active room owner can change direction' using errcode='42501'; end if;
 if expected_version is null or direction is null or char_length(btrim(direction)) not between 1 and 500
   or exclusions is null or char_length(exclusions)>500 then raise exception 'Invalid direction or version' using errcode='22023'; end if;
 select * into current_direction from private.room_theme_directions where room_id=target_room for update;
 if not found or current_direction.version<>expected_version then raise exception 'Direction changed on another device. Reload it before saving.' using errcode='PT409'; end if;
 if current_direction.direction<>btrim(direction) or current_direction.exclusions<>btrim(exclusions) then
   update private.room_theme_directions set direction=btrim(change_room_direction.direction),exclusions=btrim(change_room_direction.exclusions),
     version=version+1,updated_at=clock_timestamp() where room_id=target_room returning * into current_direction;
 end if;
 return to_jsonb(current_direction);
end $$;
create function public.change_room_direction(target_room uuid,expected_version integer,direction text,exclusions text) returns jsonb
language sql security invoker set search_path='' as $$ select private.change_room_direction(target_room,expected_version,direction,exclusions); $$;

create function private.read_owned_room_direction(target_room uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(d) from private.room_theme_directions d join public.rooms r on r.id=d.room_id
 where r.id=target_room and r.room_kind='themed' and r.status='open' and r.owner_user_id=private.active_room_account();
$$;
create function public.read_owned_room_direction(target_room uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.read_owned_room_direction(target_room); $$;

-- Read-only projection for an already-authorized server room context (including guests).
create function public.read_room_direction(target_room uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select to_jsonb(d) from private.room_theme_directions d join public.rooms r on r.id=d.room_id
 where r.id=target_room and r.room_kind='themed' and r.status='open';
$$;
revoke all on function public.read_room_direction(uuid) from public,anon,authenticated;
grant execute on function public.read_room_direction(uuid) to service_role;
do $$ declare f text; begin
 foreach f in array array['create_themed_room(text,text,text,uuid)','change_room_direction(uuid,integer,text,text)','read_owned_room_direction(uuid)'] loop
 execute 'revoke all on function private.'||f||',public.'||f||' from public,anon';
 execute 'grant execute on function private.'||f||',public.'||f||' to authenticated';
 end loop;
end $$;
