-- TASK-030.10a: prospective owned-Themed explicit account choices only.
-- Existing policy-v1 evidence, Shared consent epochs and room-theme rules stay
-- intact. No listener observations, consent expansion or historical backfill.
-- Existing private-table RLS and service-only function grants are preserved.
alter table private.recommendation_learning_versions
 drop constraint recommendation_learning_versions_version_check;
alter table private.recommendation_learning_versions
 add constraint recommendation_learning_versions_version_check check(version in (1,2));
insert into private.recommendation_learning_versions(version,activated_at)
 values(2,clock_timestamp()) on conflict(version) do nothing;

create or replace function private.record_learning_eligibility(e public.recommendation_events, kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare c private.room_learning_consents; owner_id uuid; account_ok boolean := false;
 room_ok boolean := false; explicit_choice boolean; explicit_preference boolean; activation timestamptz; themed_activation timestamptz; applied_version smallint := 1; evidence_key text;
begin
 select activated_at into activation from private.recommendation_learning_versions where version=1;
 select activated_at into themed_activation from private.recommendation_learning_versions where version=2;
 if kind='themed' and e.occurred_at >= themed_activation then applied_version:=2; end if;
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
     elsif kind='themed' and owner_id=e.account_user_id and applied_version=2 then
       -- Ownership and room kind are immutable. Only this owner's deliberate
       -- choice teaches their account; the fixed room theme is not retrained.
       account_ok:=true;
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
 values(e.id,kind,applied_version,c.id,account_ok,room_ok,evidence_key,case when room_ok then c.contribution_epoch end,case when account_ok then c.individual_epoch end) on conflict(learning_key) do nothing;
end $$;
revoke all on function private.record_learning_eligibility(public.recommendation_events,text) from public,anon,authenticated;
grant execute on function private.record_learning_eligibility(public.recommendation_events,text) to service_role;
