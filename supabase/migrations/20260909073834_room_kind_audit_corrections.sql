-- TASK-028 audit F2/F4: independent consent epochs; no new room-kind activation.
-- Existing revoked evidence stays revoked. Preserve only each recorded epoch's
-- original eligibility; do not infer consent across historic revoked intervals.
alter table private.room_learning_consents
 add column contribution_epoch uuid,
 add column contribution_from timestamptz,
 add column individual_epoch uuid,
 add column individual_from timestamptz;
update private.room_learning_consents set
 contribution_epoch=case when contribute then id end,
 contribution_from=case when contribute then valid_from end,
 individual_epoch=case when individual then id end,
 individual_from=case when individual then valid_from end;
alter table private.room_learning_consents add constraint learning_scope_epochs_complete check (
 (contribute = (contribution_epoch is not null and contribution_from is not null)) and
 (individual = (individual_epoch is not null and individual_from is not null))
);
alter table private.recommendation_learning_eligibility
 add column contribution_epoch uuid, add column individual_epoch uuid;
update private.recommendation_learning_eligibility l set
 contribution_epoch=case when l.room_allowed then c.contribution_epoch end,
 individual_epoch=case when l.account_allowed then c.individual_epoch end
from private.room_learning_consents c where c.id=l.consent_id;

-- Existing table RLS/grants still apply. Epochs never enter public room state.
create or replace function private.set_room_learning_consent(target_room uuid, allow_contribution boolean, allow_individual boolean)
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); changed_at timestamptz; previous private.room_learning_consents;
begin
 perform pg_advisory_xact_lock(hashtextextended('learning-consent:'||target_room::text||':'||actor::text,0));
 if actor is null or allow_contribution is null or allow_individual is null or not exists (
   select 1 from public.rooms r join public.room_members m on m.room_id=r.id
   join auth.users u on u.id=m.user_id join public.profiles p on p.id=u.id
   where r.id=target_room and r.room_kind='shared' and r.status='open'
   and u.id=actor and u.is_anonymous is false and p.account_status='active'
 ) then raise exception 'Active Shared room membership is required' using errcode='42501'; end if;
 select * into previous from private.room_learning_consents where room_id=target_room and user_id=actor and revoked_at is null for update;
 if found and previous.contribute=allow_contribution and previous.individual=allow_individual then return; end if;
 changed_at:=clock_timestamp();
 update private.room_learning_consents set revoked_at=changed_at where room_id=target_room and user_id=actor and revoked_at is null;
 if allow_contribution or allow_individual then
   insert into private.room_learning_consents(room_id,user_id,contribute,individual,valid_from,contribution_epoch,contribution_from,individual_epoch,individual_from)
   values(target_room,actor,allow_contribution,allow_individual,changed_at,
     case when allow_contribution then coalesce(previous.contribution_epoch,gen_random_uuid()) end,
     case when allow_contribution then coalesce(previous.contribution_from,changed_at) end,
     case when allow_individual then coalesce(previous.individual_epoch,gen_random_uuid()) end,
     case when allow_individual then coalesce(previous.individual_from,changed_at) end);
 end if;
end $$;

create or replace function private.record_learning_eligibility(e public.recommendation_events, kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare c private.room_learning_consents; owner_id uuid; account_ok boolean := false;
 room_ok boolean := false; explicit_choice boolean; explicit_preference boolean; activation timestamptz; evidence_key text;
begin
 select activated_at into activation from private.recommendation_learning_versions where version=1;
 select owner_user_id into owner_id from public.rooms where id=e.room_id;
 explicit_preference := (e.event_type='media_liked' and e.reason='explicit_like') or (e.event_type='media_unliked' and e.reason='explicit_neutral');
 explicit_choice := (e.event_type='queue_added' and e.reason in ('manual_add','add_as_next'))
   or (e.event_type='queue_play_next' and e.reason in ('priority_play_next','add_as_next'));
 if e.account_user_id is not null and e.occurred_at >= activation and exists (
   select 1 from auth.users u join public.profiles p on p.id=u.id
   join public.room_members m on m.user_id=u.id and m.id::text=e.actor_member_id and m.room_id=e.room_id
   where u.id=e.account_user_id and u.is_anonymous is false and p.account_status='active'
   and coalesce(u.created_at, e.occurred_at) <= e.occurred_at and m.joined_at <= e.occurred_at
   and not exists(select 1 from public.account_guest_migrations g where g.room_member_id=m.id and g.created_at>e.occurred_at)
 ) then
   if explicit_preference then account_ok := kind <> 'personal' or owner_id=e.account_user_id;
   elsif explicit_choice then
     if kind='personal' and owner_id=e.account_user_id then account_ok:=true; room_ok:=true;
     elsif kind='shared' then
       select * into c from private.room_learning_consents where room_id=e.room_id and user_id=e.account_user_id
         and revoked_at is null for share;
       account_ok := coalesce(c.individual and c.individual_from <= e.occurred_at,false);
       room_ok := coalesce(c.contribute and c.contribution_from <= e.occurred_at,false);
     end if;
   end if;
 end if;
 -- Same occurrence/actor/item/action counts once across devices; preference revisions stay distinct.
 if (account_ok or room_ok) and not explicit_preference then
   evidence_key := jsonb_build_array(e.room_id,e.room_session_id,e.account_user_id,e.source_type,e.media_id,e.event_type,
     coalesce(e.playback_occurrence_id,e.queue_item_id,e.idempotency_key))::text;
 end if;
 insert into private.recommendation_learning_eligibility(event_id,room_kind,policy_version,consent_id,account_allowed,room_allowed,learning_key,contribution_epoch,individual_epoch)
 values(e.id,kind,1,c.id,account_ok,room_ok,evidence_key,case when room_ok then c.contribution_epoch end,case when account_ok then c.individual_epoch end) on conflict(learning_key) do nothing;
end $$;
revoke all on function private.record_learning_eligibility(public.recommendation_events,text) from public,anon,authenticated;
grant execute on function private.record_learning_eligibility(public.recommendation_events,text) to service_role;

create or replace function public.read_room_learning_aggregates(target_room uuid, target_account uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
with eligible as (
 select e.*, l.account_allowed and (l.room_kind<>'shared' or e.event_type in ('media_liked','media_unliked') or c.individual_epoch=l.individual_epoch) as account_ok,
 l.room_allowed and (l.room_kind<>'shared' or c.contribution_epoch=l.contribution_epoch) as room_ok
 from public.recommendation_events e
 join private.recommendation_learning_eligibility l on l.event_id=e.id
 join public.rooms r on r.id=e.room_id
 join auth.users u on u.id=e.account_user_id and u.is_anonymous is false
 join public.profiles p on p.id=u.id and p.account_status='active'
 join public.room_members m on m.room_id=e.room_id and m.user_id=u.id and m.id::text=e.actor_member_id
 left join private.room_learning_consents c on c.room_id=e.room_id and c.user_id=e.account_user_id and c.revoked_at is null
 where e.expires_at>now() and e.media_id is not null
 and (e.room_id=target_room or e.account_user_id=target_account)
 and (l.room_kind<>'personal' or r.owner_user_id=e.account_user_id)
), scoped as (
 select e.*, 'room_session'::text scope_type from eligible e where room_id=target_room and room_ok
 union all
 select e.*, 'account'::text scope_type from eligible e where account_user_id=target_account and account_ok
), grouped as (
 select scope_type, source_type,media_id,
 count(*) filter(where event_type='queue_added') queue_added_count,
 count(*) filter(where event_type='queue_play_next') play_next_count,
 0::bigint queue_removed_count,0::bigint completed_count,0::bigint skipped_count,0::bigint replayed_count,0::bigint source_failed_count,
 max(occurred_at) last_event_at
 from scoped group by scope_type,source_type,media_id order by max(occurred_at) desc limit 250
) select coalesce(jsonb_agg(to_jsonb(grouped)),'[]'::jsonb) from grouped;
$$;
revoke all on function public.read_room_learning_aggregates(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_room_learning_aggregates(uuid,uuid) to service_role;


-- F3: self-withdrawal shares the owner-removal lock order and retired ID contract.
-- Caller cannot select another account; owners must use room close instead.
create function private.leave_shared_room(target_room uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.active_room_account(); s private.shared_memberships;
begin
 if actor is null or not exists(select 1 from public.rooms where id=target_room and room_kind='shared' and owner_user_id<>actor) then
   raise exception 'An active non-owner Shared member is required' using errcode='42501'; end if;
 select * into s from private.shared_memberships where room_id=target_room and user_id=actor for update;
 if not found then raise exception 'Shared membership is required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-consent:'||target_room::text||':'||actor::text,0));
 update private.shared_memberships set state='removed',revocation_pending=(s.member_id is not null and (s.state<>'removed' or s.revocation_pending))
   where room_id=target_room and user_id=actor;
 update private.room_learning_consents set revoked_at=clock_timestamp() where room_id=target_room and user_id=actor and revoked_at is null;
 delete from public.member_permissions where room_id=target_room and user_id=actor;
 delete from public.room_members where room_id=target_room and user_id=actor;
 delete from public.account_guest_migrations where room_id=target_room and user_id=actor;
 return case when s.state<>'removed' or s.revocation_pending then s.member_id end;
end $$;
create function public.leave_shared_room(target_room uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.leave_shared_room(target_room); $$;
revoke all on function private.leave_shared_room(uuid),public.leave_shared_room(uuid) from public,anon;
grant execute on function private.leave_shared_room(uuid),public.leave_shared_room(uuid) to authenticated;
