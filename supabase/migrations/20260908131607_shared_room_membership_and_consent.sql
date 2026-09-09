-- TASK-028.4: account-only Shared admission. Feature remains disabled by default.
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
alter table public.rooms add constraint rooms_room_kind_enabled_check check(room_kind in ('legacy','personal','shared'));
alter table public.rooms add constraint shared_requires_owner check(room_kind<>'shared' or owner_user_id is not null);
alter table private.room_kind_features drop constraint room_kind_features_room_kind_check;
alter table private.room_kind_features add constraint room_kind_features_room_kind_check check(room_kind in ('personal','shared'));
insert into private.room_kind_features values ('shared',false);
create table private.shared_memberships (
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 state text not null check(state in ('pending','approved','removed')),
 member_id uuid, revocation_pending boolean not null default false, requested_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table private.shared_creation_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, room_id uuid not null references public.rooms(id) on delete cascade,
 primary key(user_id,request_id)
);
alter table private.shared_memberships enable row level security;
alter table private.shared_creation_requests enable row level security;
revoke all on private.shared_memberships,private.shared_creation_requests from public,anon,authenticated;
grant all on private.shared_memberships,private.shared_creation_requests to service_role;

create function private.active_room_account() returns uuid language sql stable security definer set search_path='' as $$
 select u.id from auth.users u join public.profiles p on p.id=u.id
 where u.id=(select auth.uid()) and u.is_anonymous is false and p.account_status='active';
$$;
revoke all on function private.active_room_account() from public,anon;
grant execute on function private.active_room_account() to authenticated;

create or replace function private.can_access_room_kind(p_room_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rooms r where r.id=p_room_id and (
 r.room_kind='legacy' or (r.room_kind='personal' and r.owner_user_id=private.active_room_account()) or
 (r.room_kind='shared' and exists(select 1 from private.shared_memberships s
 where s.room_id=r.id and s.user_id=private.active_room_account() and s.state='approved'))));
$$;
-- Database writes cannot fabricate approved identities, move a member or promote a guest.
create function private.guard_shared_identity() returns trigger language plpgsql security definer set search_path='' as $$
declare r public.rooms;
begin
 if TG_OP='UPDATE' and old.room_id<>new.room_id and exists(select 1 from public.rooms where id=old.room_id and room_kind='shared') then
 raise exception 'Shared membership cannot move' using errcode='23514'; end if;
 select * into r from public.rooms where id=new.room_id;
 if r.room_kind='shared' then
   if TG_TABLE_NAME='guest_identities' then raise exception 'Shared rooms require approved accounts' using errcode='42501'; end if;
   if new.guest_identity_id is not null or not exists(select 1 from private.shared_memberships s where s.room_id=r.id and s.user_id=new.user_id and s.state='approved') then
     raise exception 'Approved Shared membership is required' using errcode='42501'; end if;
   if TG_TABLE_NAME='room_members' then
     if TG_OP='UPDATE' and old.id<>new.id then raise exception 'Shared membership ID cannot change' using errcode='42501'; end if;
     if new.role <> (case when new.user_id=r.owner_user_id then 'host' else 'guest' end) then
       raise exception 'Shared role is determined by ownership' using errcode='42501'; end if;
   end if;
 end if;
 return new;
end $$;
create trigger guard_shared_identity before insert or update on public.room_members for each row execute function private.guard_shared_identity();
create trigger guard_shared_guest before insert or update on public.guest_identities for each row execute function private.guard_shared_identity();
create trigger guard_shared_permission before insert or update on public.member_permissions for each row execute function private.guard_shared_identity();
-- Account deletion and permanent lifetime cannot create an ownerless room.
create function private.guard_shared_room() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.room_kind='shared' and new.owner_user_id is distinct from old.owner_user_id then raise exception 'Shared ownership cannot change' using errcode='23514'; end if;
 if new.room_kind='shared' then new.idle_deadline_at:=null; new.saved_by_guest_identity_id:=null; end if;
 return new;
end $$;
create trigger guard_shared_room before insert or update on public.rooms for each row execute function private.guard_shared_room();
create function private.delete_owned_shared_room() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.rooms where owner_user_id=old.id and room_kind='shared'; return old; end $$;
create trigger delete_owned_shared_room before delete on auth.users for each row execute function private.delete_owned_shared_room();

create function private.create_shared_room(room_name text,request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); result uuid; member uuid;
begin
 if actor is null then raise exception 'An active signed-in account is required' using errcode='42501'; end if;
 if not exists(select 1 from private.room_kind_features where room_kind='shared' and enabled) then raise exception 'Shared rooms are not enabled' using errcode='42501'; end if;
 if request_id is null or char_length(trim(room_name)) not between 1 and 60 then raise exception 'Use a room name of 1 to 60 characters' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('shared-create:'||actor::text||request_id::text,0));
 select c.room_id into result from private.shared_creation_requests c where c.user_id=actor and c.request_id=create_shared_room.request_id;
 if result is not null then return result; end if;
 insert into public.rooms(owner_user_id,room_kind,name,invite_code,invite_token_hash,mode,privacy,status)
 values(actor,'shared',trim(room_name),replace(gen_random_uuid()::text,'-',''),gen_random_uuid()::text,'listen','invite','open') returning id into result;
 insert into private.shared_memberships(room_id,user_id,state) values(result,actor,'approved');
 insert into public.room_members(room_id,user_id,display_name,role) select result,actor,display_name,'host' from public.profiles where id=actor returning id into member;
 update private.shared_memberships set member_id=member where room_id=result and user_id=actor;
 insert into public.room_settings(room_id,guest_can_add_queue) values(result,true);
 insert into private.shared_creation_requests values(actor,request_id,result);
 return result;
end $$;
create function public.create_shared_room(room_name text,request_id uuid) returns uuid language sql security invoker set search_path='' as $$ select private.create_shared_room(room_name,request_id); $$;

create function private.request_shared_membership(target_room uuid,invite text) returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); result text;
begin
 if actor is null or not exists(select 1 from public.rooms where id=target_room and room_kind='shared' and status='open' and invite_code=invite) then
 raise exception 'A valid invite and active account are required' using errcode='42501'; end if;
 insert into private.shared_memberships(room_id,user_id,state) values(target_room,actor,'pending') on conflict do nothing;
 select state into result from private.shared_memberships where room_id=target_room and user_id=actor;
 return result;
end $$;
create function public.request_shared_membership(target_room uuid,invite text) returns text language sql security invoker set search_path='' as $$ select private.request_shared_membership(target_room,invite); $$;

create function private.decide_shared_membership(target_room uuid,target_user uuid,approve boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); s private.shared_memberships; new_member uuid;
begin
 if actor is null or approve is null or target_user=actor or not exists(select 1 from public.rooms where id=target_room and room_kind='shared' and owner_user_id=actor and status='open') then raise exception 'Only the Shared room owner can decide membership' using errcode='42501'; end if;
 select * into s from private.shared_memberships where room_id=target_room and user_id=target_user for update;
 if not found then raise exception 'Request not found' using errcode='22023'; end if;
 if approve then
   if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=target_user and u.is_anonymous is false and p.account_status='active') then raise exception 'An active account is required' using errcode='42501'; end if;
   if s.state='approved' then return s.member_id; end if;
   if s.revocation_pending then raise exception 'Retry live removal before approving again' using errcode='55000'; end if;
   update private.shared_memberships set state='approved' where room_id=target_room and user_id=target_user;
   insert into public.room_members(room_id,user_id,display_name,role) select target_room,target_user,display_name,'guest' from public.profiles where id=target_user returning id into new_member;
   update private.shared_memberships set member_id=new_member where room_id=target_room and user_id=target_user;
   return new_member;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-consent:'||target_room::text||':'||target_user::text,0));
 update private.shared_memberships set state='removed',revocation_pending=(s.member_id is not null) where room_id=target_room and user_id=target_user;
 update private.room_learning_consents set revoked_at=clock_timestamp() where room_id=target_room and user_id=target_user and revoked_at is null;
 delete from public.member_permissions where room_id=target_room and user_id=target_user;
 delete from public.room_members where room_id=target_room and user_id=target_user;
 return s.member_id;
end $$;
create function public.decide_shared_membership(target_room uuid,target_user uuid,approve boolean) returns uuid language sql security invoker set search_path='' as $$ select private.decide_shared_membership(target_room,target_user,approve); $$;

create function private.shared_room_context(target_room uuid,invite text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); r public.rooms; s private.shared_memberships; c private.room_learning_consents; members jsonb:='[]';
begin
 select * into r from public.rooms where id=target_room and room_kind='shared' and status='open';
 if not found then return null; end if;
 select * into s from private.shared_memberships where room_id=target_room and user_id=actor;
 if s.user_id is null and (invite is null or invite<>r.invite_code) then return null; end if;
 if s.state='approved' then select * into c from private.room_learning_consents where room_id=target_room and user_id=actor and revoked_at is null; end if;
 if actor=r.owner_user_id then select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'name',p.display_name,'state',m.state,'memberId',m.member_id,'revocationPending',m.revocation_pending) order by m.requested_at),'[]') into members from private.shared_memberships m join public.profiles p on p.id=m.user_id where m.room_id=target_room and m.user_id<>actor; end if;
 return jsonb_build_object('name',r.name,'state',coalesce(s.state,'invited'),'owner',actor=r.owner_user_id,'contribute',coalesce(c.contribute,false),'individual',coalesce(c.individual,false),'members',members);
end $$;
create function public.shared_room_context(target_room uuid,invite text default '') returns jsonb language sql security invoker set search_path='' as $$ select private.shared_room_context(target_room,invite); $$;
-- Anonymous users can only read a valid invite's minimal entry state, never room content.
revoke all on function private.shared_room_context(uuid,text),public.shared_room_context(uuid,text) from public;
grant execute on function private.shared_room_context(uuid,text),public.shared_room_context(uuid,text) to authenticated,service_role;
do $$ declare f text; begin
 foreach f in array array['create_shared_room(text,uuid)','request_shared_membership(uuid,text)','decide_shared_membership(uuid,uuid,boolean)'] loop
 execute 'revoke all on function private.'||f||',public.'||f||' from public,anon';
 execute 'grant execute on function private.'||f||',public.'||f||' to authenticated';
 end loop;
end $$;
revoke all on function private.guard_shared_identity(),private.guard_shared_room(),private.delete_owned_shared_room() from public,anon,authenticated;

create function public.ack_shared_revocation(target_room uuid,target_member uuid) returns void language sql security definer set search_path='' as $$
 update private.shared_memberships set revocation_pending=false where room_id=target_room and member_id=target_member and state='removed';
$$;
revoke all on function public.ack_shared_revocation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.ack_shared_revocation(uuid,uuid) to service_role;

-- Leave is a live presence action; durable access changes only through owner decisions.
create policy shared_membership_delete on public.room_members as restrictive for delete to authenticated
using (not exists(select 1 from public.rooms r where r.id=room_id and r.room_kind='shared'));

-- Serialize consent validation with removal; a waiting save must recheck membership.
create or replace function private.set_room_learning_consent(target_room uuid, allow_contribution boolean, allow_individual boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); changed_at timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('learning-consent:'||target_room::text||':'||actor::text,0));
 if actor is null or allow_contribution is null or allow_individual is null or not exists (
   select 1 from public.rooms r join public.room_members m on m.room_id=r.id
   join auth.users u on u.id=m.user_id join public.profiles p on p.id=u.id
   where r.id=target_room and r.room_kind='shared' and r.status='open'
     and u.id=actor and u.is_anonymous is false and p.account_status='active'
 ) then raise exception 'Active Shared room membership is required' using errcode='42501'; end if;
 if exists(select 1 from private.room_learning_consents where room_id=target_room and user_id=actor and revoked_at is null
   and contribute=allow_contribution and individual=allow_individual) then return; end if;
 changed_at:=clock_timestamp();
 update private.room_learning_consents set revoked_at=changed_at where room_id=target_room and user_id=actor and revoked_at is null;
 if allow_contribution or allow_individual then
   insert into private.room_learning_consents(room_id,user_id,contribute,individual,valid_from)
    values(target_room,actor,allow_contribution,allow_individual,changed_at);
 end if;
end $$;
