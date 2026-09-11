-- TASK-030.10a: independent Shared listening permission and account history clear.
-- Private RLS tables; public wrappers are service-role-only and require a server-
-- verified target account. Existing Shared action/contribution consent is separate.
create table private.room_listening_consents (
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 purpose_version integer not null check(purpose_version=1),
 epoch uuid not null,
 allowed boolean not null,
 activated_at timestamptz,
 revoked_at timestamptz,
 primary key(room_id,user_id),
 check((allowed and activated_at is not null and revoked_at is null) or
       (not allowed and revoked_at is not null))
);
create index room_listening_consents_user_idx on private.room_listening_consents(user_id);
create table private.account_listening_history (
 user_id uuid primary key references auth.users(id) on delete cascade,
 generation bigint not null check(generation>=0),
 cleared_at timestamptz not null
);
alter table private.room_listening_consents enable row level security;
alter table private.account_listening_history enable row level security;
revoke all on private.room_listening_consents,private.account_listening_history from public,anon,authenticated;
grant select,insert,update,delete on private.room_listening_consents,private.account_listening_history to service_role;

-- Current and event-time account/membership identity. Live admission and actual
-- playback interval validity are checked separately by SpacetimeDB.
create function private.listening_room_access(target_room uuid,target_account uuid)
returns table(room_kind text,member_id uuid,valid_from timestamptz)
language sql stable security definer set search_path='' as $$
 select r.room_kind,m.id,greatest(u.created_at,r.created_at,m.joined_at,
   (select max(g.created_at) from public.account_guest_migrations g where g.room_member_id=m.id))
 from public.rooms r join public.room_members m on m.room_id=r.id and m.user_id=target_account
 join auth.users u on u.id=m.user_id and u.is_anonymous is false
 join public.profiles p on p.id=u.id and p.account_status='active'
 where r.id=target_room and r.status='open' and u.created_at is not null
 and u.created_at<=now() and r.created_at<=now() and m.joined_at<=now()
 and ((r.room_kind in ('personal','themed') and r.owner_user_id=target_account)
   or (r.room_kind='shared' and exists(select 1 from private.shared_memberships sm
     where sm.room_id=r.id and sm.user_id=target_account and sm.state='approved'
     and sm.member_id=m.id and not sm.revocation_pending)));
$$;

create function private.read_listening_settings(target_room uuid,target_account uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a record; c private.room_listening_consents; h private.account_listening_history;
begin
 select * into a from private.listening_room_access(target_room,target_account);
 if not found then raise exception 'Active eligible room membership is required' using errcode='42501'; end if;
 select * into h from private.account_listening_history where user_id=target_account;
 select * into c from private.room_listening_consents where room_id=target_room and user_id=target_account;
 return jsonb_build_object('roomKind',a.room_kind,'allowed',case when a.room_kind='shared' then coalesce(c.allowed,false) else true end,
   'purposeVersion',1,'epoch',case when a.room_kind='shared' then c.epoch else target_room end,
   'activatedAt',case when a.room_kind='shared' then c.activated_at else a.valid_from end,
   'historyGeneration',coalesce(h.generation,0),'historyClearedAt',h.cleared_at,
   'memberId',a.member_id);
end $$;
create function public.read_listening_settings(target_room uuid,target_account uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.read_listening_settings(target_room,target_account);
$$;

create function private.set_room_listening_consent(target_room uuid,target_account uuid,allow_listening boolean,purpose_version integer,expected_epoch uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a record; c private.room_listening_consents; changed_at timestamptz;
begin
 if allow_listening is null or purpose_version is distinct from 1 then
   raise exception 'Explicit supported listening purpose is required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('listening-history:'||target_account::text,0));
 perform pg_advisory_xact_lock(hashtextextended('listening-consent:'||target_room::text||':'||target_account::text,0));
 select * into a from private.listening_room_access(target_room,target_account);
 if not found or a.room_kind<>'shared' then raise exception 'Active Shared membership is required' using errcode='42501'; end if;
 select * into c from private.room_listening_consents where room_id=target_room and user_id=target_account for update;
 if c.epoch is distinct from expected_epoch then raise exception 'Listening permission changed; refresh before saving' using errcode='40001'; end if;
 if c.epoch is not null and c.allowed=allow_listening then return private.read_listening_settings(target_room,target_account); end if;
 changed_at:=clock_timestamp();
 insert into private.room_listening_consents(room_id,user_id,purpose_version,epoch,allowed,activated_at,revoked_at)
 values(target_room,target_account,1,gen_random_uuid(),allow_listening,
   case when allow_listening then changed_at else c.activated_at end,case when not allow_listening then changed_at end)
 on conflict(room_id,user_id) do update set purpose_version=excluded.purpose_version,epoch=excluded.epoch,
   allowed=excluded.allowed,activated_at=excluded.activated_at,revoked_at=excluded.revoked_at;
 return private.read_listening_settings(target_room,target_account);
end $$;
create function public.set_room_listening_consent(target_room uuid,target_account uuid,allow_listening boolean,purpose_version integer,expected_epoch uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.set_room_listening_consent(target_room,target_account,allow_listening,purpose_version,expected_epoch);
$$;

create function private.clear_account_listening_history(target_account uuid,expected_generation bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare h private.account_listening_history; changed_at timestamptz;
begin
 if expected_generation is null or expected_generation<0 then raise exception 'Expected history generation is required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('listening-history:'||target_account::text,0));
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id
   where u.id=target_account and u.is_anonymous is false and p.account_status='active') then
   raise exception 'An active account is required' using errcode='42501'; end if;
 select * into h from private.account_listening_history where user_id=target_account for update;
 if coalesce(h.generation,0)<>expected_generation then raise exception 'Listening history changed; refresh before clearing' using errcode='40001'; end if;
 changed_at:=clock_timestamp();
 insert into private.account_listening_history(user_id,generation,cleared_at) values(target_account,expected_generation+1,changed_at)
 on conflict(user_id) do update set generation=excluded.generation,cleared_at=excluded.cleared_at;
 return jsonb_build_object('historyGeneration',expected_generation+1,'historyClearedAt',changed_at);
end $$;
create function public.clear_account_listening_history(target_account uuid,expected_generation bigint)
returns jsonb language sql security invoker set search_path='' as $$
 select private.clear_account_listening_history(target_account,expected_generation);
$$;

-- Call in the receipt ingestion transaction so revocation/clear cannot race
-- between eligibility validation and durable insertion. No network work here.
create function private.check_listener_learning_context(target_room uuid,target_member uuid,target_account uuid,observed_at timestamptz,expected_epoch uuid,expected_history_generation bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a record; c private.room_listening_consents; h private.account_listening_history; current_epoch uuid; starts_at timestamptz;
begin
 if target_room is null or target_member is null or target_account is null or observed_at is null
   or expected_epoch is null or expected_history_generation is null or observed_at>clock_timestamp() then
   return jsonb_build_object('allowed',false); end if;
 perform pg_advisory_xact_lock(hashtextextended('listening-history:'||target_account::text,0));
 perform pg_advisory_xact_lock(hashtextextended('listening-consent:'||target_room::text||':'||target_account::text,0));
 select * into a from private.listening_room_access(target_room,target_account);
 if not found or a.member_id<>target_member then return jsonb_build_object('allowed',false); end if;
 select * into h from private.account_listening_history where user_id=target_account;
 if coalesce(h.generation,0)<>expected_history_generation then return jsonb_build_object('allowed',false); end if;
 starts_at:=greatest(a.valid_from,h.cleared_at);
 if a.room_kind='shared' then
   select * into c from private.room_listening_consents where room_id=target_room and user_id=target_account;
   if not coalesce(c.allowed,false) or c.purpose_version<>1 then return jsonb_build_object('allowed',false); end if;
   current_epoch:=c.epoch; starts_at:=greatest(starts_at,c.activated_at);
 else current_epoch:=target_room;
 end if;
 if current_epoch<>expected_epoch or observed_at<starts_at then return jsonb_build_object('allowed',false); end if;
 return jsonb_build_object('allowed',true,'epoch',current_epoch,'historyGeneration',coalesce(h.generation,0),
   'validFrom',starts_at,'roomKind',a.room_kind,'accountId',target_account,'memberId',target_member);
end $$;
create function public.check_listener_learning_context(target_room uuid,target_member uuid,target_account uuid,observed_at timestamptz,expected_epoch uuid,expected_history_generation bigint)
returns jsonb language sql security invoker set search_path='' as $$
 select private.check_listener_learning_context(target_room,target_member,target_account,observed_at,expected_epoch,expected_history_generation);
$$;

-- Historical count reads may retain already accepted owned-room receipts after
-- closure. Never use this helper for grants or ingest: those require an open room.
-- Shared reads always retain the existing current-membership/consent checks.
create function private.check_listener_learning_history_context(target_room uuid,target_member uuid,target_account uuid,observed_at timestamptz,expected_epoch uuid,expected_history_generation bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare context jsonb; a record;
begin
 context:=private.check_listener_learning_context(target_room,target_member,target_account,observed_at,expected_epoch,expected_history_generation);
 if coalesce((context->>'allowed')::boolean,false) then return context; end if;
 -- The strict check above acquired the same account/consent locks used by clear.
 select r.room_kind,greatest(u.created_at,r.created_at,m.joined_at,h.cleared_at,
   (select max(g.created_at) from public.account_guest_migrations g where g.room_member_id=m.id)) starts_at,
   coalesce(h.generation,0) generation into a
 from public.rooms r join public.room_members m on m.room_id=r.id and m.user_id=target_account and m.id=target_member
 join auth.users u on u.id=m.user_id and u.is_anonymous is false
 join public.profiles p on p.id=u.id and p.account_status='active'
 left join private.account_listening_history h on h.user_id=u.id
 where r.id=target_room and r.status='closed' and r.room_kind in ('personal','themed')
 and r.owner_user_id=target_account and expected_epoch=r.id
 and u.created_at is not null and observed_at<=clock_timestamp()
 and r.closed_at is not null and observed_at<=r.closed_at;
 if not found or a.generation is distinct from expected_history_generation or observed_at<a.starts_at then
   return jsonb_build_object('allowed',false); end if;
 return jsonb_build_object('allowed',true,'epoch',expected_epoch,'historyGeneration',a.generation,
   'validFrom',a.starts_at,'roomKind',a.room_kind,'accountId',target_account,'memberId',target_member);
end $$;
revoke all on function private.check_listener_learning_history_context(uuid,uuid,uuid,timestamptz,uuid,bigint) from public,anon,authenticated;
grant execute on function private.check_listener_learning_history_context(uuid,uuid,uuid,timestamptz,uuid,bigint) to service_role;

-- All established Shared removal/leave paths delete the public membership.
-- Revoke under the same consent lock; no need to rewrite those lifecycle RPCs.
create function private.revoke_removed_listener_consent() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.id=new.id and old.room_id=new.room_id and old.user_id is not distinct from new.user_id then return new; end if;
 if old.user_id is not null then
   perform pg_advisory_xact_lock(hashtextextended('listening-consent:'||old.room_id::text||':'||old.user_id::text,0));
   update private.room_listening_consents set allowed=false,epoch=gen_random_uuid(),revoked_at=clock_timestamp()
     where room_id=old.room_id and user_id=old.user_id;
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
create trigger revoke_removed_listener_consent after delete or update of id,room_id,user_id on public.room_members
for each row execute function private.revoke_removed_listener_consent();

revoke all on function private.listening_room_access(uuid,uuid),private.revoke_removed_listener_consent() from public,anon,authenticated;
revoke all on function private.read_listening_settings(uuid,uuid),public.read_listening_settings(uuid,uuid),
 private.set_room_listening_consent(uuid,uuid,boolean,integer,uuid),public.set_room_listening_consent(uuid,uuid,boolean,integer,uuid),
 private.clear_account_listening_history(uuid,bigint),public.clear_account_listening_history(uuid,bigint),
 private.check_listener_learning_context(uuid,uuid,uuid,timestamptz,uuid,bigint),public.check_listener_learning_context(uuid,uuid,uuid,timestamptz,uuid,bigint)
 from public,anon,authenticated;
grant execute on function private.listening_room_access(uuid,uuid),private.read_listening_settings(uuid,uuid),public.read_listening_settings(uuid,uuid),
 private.set_room_listening_consent(uuid,uuid,boolean,integer,uuid),public.set_room_listening_consent(uuid,uuid,boolean,integer,uuid),
 private.clear_account_listening_history(uuid,bigint),public.clear_account_listening_history(uuid,bigint),
 private.check_listener_learning_context(uuid,uuid,uuid,timestamptz,uuid,bigint),public.check_listener_learning_context(uuid,uuid,uuid,timestamptz,uuid,bigint)
 to service_role;

-- Clearing listening history hides legacy Personal completions too; Likes and
-- explicit queue choices remain separate first-party preferences.
create or replace function private.catalogue_owner_evidence(target_account uuid,target_room uuid default null)
returns table(media_id text,liked boolean,choice_count integer,last_choice_at timestamptz,completed_count integer,last_completed_at timestamptz,last_used_at timestamptz)
language sql stable security definer set search_path='' as $$
 with account as (
  select u.id from auth.users u join public.profiles p on p.id=u.id
  where u.id=target_account and u.is_anonymous is false and p.account_status='active'
 ), likes as (
  select p.media_id,p.source_event_at used_at from public.media_preferences p join account a on a.id=p.user_id
  where p.source_type='youtube' and p.preference_state='liked'
 ), events as (
  select e.*,r.room_kind,r.owner_user_id from public.recommendation_events e
  join account a on a.id=e.account_user_id join public.rooms r on r.id=e.room_id
  join public.room_members m on m.room_id=e.room_id and m.user_id=a.id and m.id::text=e.actor_member_id
  where e.source_type='youtube' and e.expires_at>now() and e.occurred_at<=now()
   and (r.room_kind<>'personal' or r.owner_user_id=a.id)
 ), choices as (
  select e.media_id,count(*)::integer n,max(e.occurred_at) used_at
  from events e join private.recommendation_learning_eligibility l on l.event_id=e.id and l.account_allowed
  left join private.room_learning_consents c on c.room_id=e.room_id and c.user_id=e.account_user_id and c.revoked_at is null
  where ((e.event_type='queue_added' and e.reason in ('manual_add','add_as_next'))
    or (e.event_type='queue_play_next' and e.reason in ('priority_play_next','add_as_next')))
   and (l.room_kind<>'shared' or c.individual_epoch=l.individual_epoch)
  group by e.media_id
 ), history as (
  select e.media_id,count(distinct e.playback_occurrence_id)::integer n,max(e.occurred_at) used_at
  from events e where e.room_kind='personal' and e.owner_user_id=target_account
   and (target_room is null or e.room_id=target_room)
   and e.event_type='playback_completed' and e.playback_occurrence_id is not null
   and e.occurred_at>=now()-interval '180 days'
   and e.occurred_at>coalesce((select h.cleared_at from private.account_listening_history h where h.user_id=target_account),'-infinity'::timestamptz)
  group by e.media_id
 ), ids as (select media_id from likes union select media_id from choices union select media_id from history)
 select i.media_id,l.media_id is not null,coalesce(c.n,0),c.used_at,coalesce(h.n,0),h.used_at,
  greatest(l.used_at,c.used_at,h.used_at)
 from ids i left join likes l using(media_id) left join choices c using(media_id) left join history h using(media_id)
 where i.media_id ~ '^[A-Za-z0-9_-]{6,64}$' and not exists (
  select 1 from private.personal_discover_feedback f where f.user_id=target_account and f.media_id=i.media_id
   and (f.state in ('do_not_suggest','wrong_version') or (f.state='not_now' and f.expires_at>now()))
 );
$$;
