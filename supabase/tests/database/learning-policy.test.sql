begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
-- Fixture creation is independent of the local application feature switches.
update private.room_kind_features set enabled=true where room_kind='temporary';
insert into auth.users(id,is_anonymous,raw_user_meta_data) values ('28300000-0000-4000-8000-000000000001',false,'{"display_name":"Learning owner"}');
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values
('28300000-0000-4000-8000-000000000011','personal','28300000-0000-4000-8000-000000000001','Personal','QA283P','fixture-283P'),
('28300000-0000-4000-8000-000000000012','temporary','28300000-0000-4000-8000-000000000001','Temporary','QA283T','fixture-283T'),
('28300000-0000-4000-8000-000000000013','shared','28300000-0000-4000-8000-000000000001','Shared','QA283S','fixture-283S'),
('28300000-0000-4000-8000-000000000014','legacy','28300000-0000-4000-8000-000000000001','Legacy','QA283L','fixture-283L');
insert into private.shared_memberships(room_id,user_id,state) values ('28300000-0000-4000-8000-000000000013','28300000-0000-4000-8000-000000000001','approved');
insert into public.room_members(id,room_id,user_id,display_name,role) select
('28300000-0000-4000-8000-00000000002'||n)::uuid,('28300000-0000-4000-8000-00000000001'||n)::uuid,'28300000-0000-4000-8000-000000000001','Owner','host' from generate_series(1,4) n;
create function pg_temp.event(n int, ident text, kind text) returns jsonb language sql as $$
select jsonb_build_array(jsonb_build_object('authority_event_id',ident,'idempotency_key',ident,'schema_version',1,'event_type',kind,
'room_id','28300000-0000-4000-8000-00000000001'||n,'room_session_id','session-283','playback_occurrence_id','occurrence-'||ident,
'actor_member_id','28300000-0000-4000-8000-00000000002'||n,'account_user_id','28300000-0000-4000-8000-000000000001',
'source_type','youtube','media_id','qa283video','reason',case when kind='media_liked' then 'explicit_like' else 'manual_add' end,
'occurred_at',clock_timestamp(),'ingested_at',clock_timestamp())); $$;
select public.ingest_recommendation_events(pg_temp.event(1,'283-failure','source_failed'));
select is((select count(*)::int from public.recommendation_media_aggregates where account_user_id='28300000-0000-4000-8000-000000000001'),0,'Personal failure must not update account taste');
select public.ingest_recommendation_events(pg_temp.event(2,'283-temporary','queue_added'));
select is((select count(*)::int from public.recommendation_events where authority_event_id='283-temporary'),0,'Temporary implicit activity has no durable learning event');
select is((select count(*)::int from public.recommendation_media_aggregates where room_id='28300000-0000-4000-8000-000000000012'),0,'Temporary implicit activity has no room aggregate');
select public.ingest_recommendation_events(pg_temp.event(3,'283-shared','queue_added'));
select is((select count(*)::int from public.recommendation_media_aggregates where room_id='28300000-0000-4000-8000-000000000013'),0,'Shared joining does not grant taste consent');
select public.ingest_recommendation_events(pg_temp.event(2,'283-like','media_liked'));
select is((select preference_state from public.media_preferences where user_id='28300000-0000-4000-8000-000000000001' and media_id='qa283video'),'liked','Temporary explicit personal Like survives');
select public.ingest_recommendation_events(pg_temp.event(4,'283-legacy','queue_added'));
select is((select queue_added_count::int from public.recommendation_media_aggregates where room_id='28300000-0000-4000-8000-000000000014'),1,'Legacy aggregation remains unchanged');

create function pg_temp.room_choices(n int) returns int language sql as $$
 select coalesce(sum((x->>'queue_added_count')::int),0)::int from jsonb_array_elements(public.read_room_learning_aggregates(('28300000-0000-4000-8000-00000000001'||n)::uuid)) x;
$$;
select public.ingest_recommendation_events(pg_temp.event(1,'283-personal-choice','queue_added'));
select is(pg_temp.room_choices(1),1,'Personal explicit owner choice contributes');
select is(pg_temp.room_choices(3),0,'Shared no consent has no readable contribution');
set local role authenticated;
select set_config('request.jwt.claim.sub','28300000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.read_room_learning_aggregates('28300000-0000-4000-8000-000000000011')$$,'42501',null,'raw learning reads are service-only');
select throws_ok($$select * from private.room_learning_consents$$,'42501',null,'consent history is not directly exposed');
select throws_ok($$select public.set_room_learning_consent('28300000-0000-4000-8000-000000000011',true,true)$$,'42501',null,'Personal cannot be treated as Shared consent');
select lives_ok($$select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false)$$,'member opts into room contribution only');
reset role;
select is(pg_temp.room_choices(3),0,'later consent does not retroactively train old events');
select public.ingest_recommendation_events(pg_temp.event(3,'283-shared-choice','queue_added'));
select is(pg_temp.room_choices(3),1,'opted-in Shared choice contributes to room');
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='283-shared-choice'),false,'room contribution does not imply individual learning');
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select is(pg_temp.room_choices(3),0,'withdrawal removes existing contributions at read time');
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select is(pg_temp.room_choices(3),0,'regrant does not revive old consent epoch');
select public.ingest_recommendation_events(pg_temp.event(3,'283-shared-new','queue_added'));
select is(pg_temp.room_choices(3),1,'fresh consenting event contributes');
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='283-shared-new'),true,'separate individual opt-in is respected');
-- Two transport IDs reporting the same actor/action/occurrence count only once.
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(3,'283-device-two','queue_added'),'{0,playback_occurrence_id}','"occurrence-283-shared-new"'));
select is(pg_temp.room_choices(3),1,'duplicate device occurrence does not multiply room taste');
-- Exact replay must use the captured timestamp, not manufacture a different event payload.
create temp table captured as select pg_temp.event(3,'283-replay','queue_added') payload;
select public.ingest_recommendation_events(payload) from captured;
select public.ingest_recommendation_events(payload) from captured;
select is(pg_temp.room_choices(3),2,'identical outbox replay is idempotent');
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(payload) from captured;
select is(pg_temp.room_choices(3),0,'replay after withdrawal cannot restore training');
-- Time and identity uncertainty are neutral, even if the actor currently owns the room.
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(1,'283-old-policy','queue_added'),'{0,occurred_at}',to_jsonb((now()-interval '1 day')::text)));
select is(pg_temp.room_choices(1),1,'pre-policy event does not acquire new permission');
update public.room_members set joined_at=clock_timestamp()+interval '1 hour' where id='28300000-0000-4000-8000-000000000021';
select public.ingest_recommendation_events(pg_temp.event(1,'283-before-member','queue_added'));
select is(pg_temp.room_choices(1),1,'pre-membership event cannot train the current account');
update public.room_members set joined_at=now() where id='28300000-0000-4000-8000-000000000021';
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(1,'283-forged-account','queue_added'),'{0,account_user_id}','"28300000-0000-4000-8000-000000000099"'));
select is(pg_temp.room_choices(1),1,'supplied account cannot replace verified actor attribution');
select public.ingest_recommendation_events(pg_temp.event(1,'283-skip','playback_skipped'));
select public.ingest_recommendation_events(pg_temp.event(1,'283-remove','queue_removed'));
select is(pg_temp.room_choices(1),1,'skip and duplicate/removal remain neutral');
select is((select count(*)::int from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id in ('283-skip','283-remove','283-failure') and (account_allowed or room_allowed)),0,'failure, removal and uncertain skip cannot affect either training scope');
update public.profiles set account_status='disabled' where id='28300000-0000-4000-8000-000000000001';
select is(pg_temp.room_choices(1),0,'disabled account contributes no current evidence');
update public.profiles set account_status='active' where id='28300000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','28300000-0000-4000-8000-000000000099',true);
select throws_ok($$select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true)$$,'42501',null,'unrelated identity cannot set room consent');
reset role;

insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values ('28300000-0000-4000-8000-000000000015','themed','28300000-0000-4000-8000-000000000001','Theme','QA283TH','fixture-283TH');
insert into public.room_members(id,room_id,user_id,display_name,role) values ('28300000-0000-4000-8000-000000000025','28300000-0000-4000-8000-000000000015','28300000-0000-4000-8000-000000000001','Owner','host');
select public.ingest_recommendation_events(pg_temp.event(5,'283-theme-manual','queue_added'));
select is(pg_temp.room_choices(5),0,'manual Themed item cannot retrain an unspecified direction');
update auth.users set is_anonymous=true where id='28300000-0000-4000-8000-000000000001';
select public.ingest_recommendation_events(pg_temp.event(1,'283-anonymous','queue_added'));
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='283-anonymous'),false,'anonymous Auth role is not an account taste owner');
update auth.users set is_anonymous=false where id='28300000-0000-4000-8000-000000000001';
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(1,'283-missing-actor','queue_added'),'{0,actor_member_id}','null'));
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='283-missing-actor'),false,'missing actor stays neutral');
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(2,'283-forged-policy','queue_added'),'{0,account_allowed}','true'));
select is((select count(*)::int from public.recommendation_events where authority_event_id='283-forged-policy'),0,'forged policy flag cannot persist Temporary implicit activity');
-- Exercise the actual HTTP caller role, including its restricted auth.users access.
set local role service_role;
select lives_ok($$select public.ingest_recommendation_events(pg_temp.event(1,'283-service-role','queue_added'))$$,'service role can ingest through the restricted eligibility helper');
select lives_ok($$select public.read_room_learning_aggregates('28300000-0000-4000-8000-000000000011','28300000-0000-4000-8000-000000000001')$$,'service role can read only the granted aggregate projection');
select is(pg_temp.room_choices(1),2,'real service-role ingestion produces eligible evidence');
reset role;
select public.prune_recommendation_data(clock_timestamp()+interval '181 days');
select is((select count(*)::int from private.recommendation_learning_eligibility),0,'event retention also prunes eligibility evidence');
select * from finish();
rollback;
