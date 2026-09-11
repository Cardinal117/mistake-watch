begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into auth.users(id,is_anonymous,created_at,raw_user_meta_data) values
('310b0000-0000-4000-8000-000000000001',false,now()-interval '3 days','{"display_name":"Listener owner"}'),
('310b0000-0000-4000-8000-000000000002',false,now()-interval '3 days','{"display_name":"Listener member"}'),
('310b0000-0000-4000-8000-000000000003',true,now()-interval '3 days','{}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash,created_at) values
('310b0000-0000-4000-8000-000000000011','personal','310b0000-0000-4000-8000-000000000001','Personal','QALP','fixtureLP',now()-interval '2 days'),
('310b0000-0000-4000-8000-000000000012','themed','310b0000-0000-4000-8000-000000000001','Themed','QALT','fixtureLT',now()-interval '2 days'),
('310b0000-0000-4000-8000-000000000013','shared','310b0000-0000-4000-8000-000000000001','Shared','QALS','fixtureLS',now()-interval '2 days');
insert into private.shared_memberships(room_id,user_id,state) values
('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000001','approved'),
('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002','approved');
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at) select
('310b0000-0000-4000-8000-00000000002'||n)::uuid,('310b0000-0000-4000-8000-00000000001'||n)::uuid,
'310b0000-0000-4000-8000-000000000001','Owner','host',now()-interval '2 days' from generate_series(1,3) n;
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at) values
('310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002','Member','guest',now()-interval '2 days');
update private.shared_memberships s set member_id=m.id from public.room_members m where s.room_id=m.room_id and s.user_id=m.user_id;
-- Missing new APIs return null only during the pre-implementation red run;
-- every implemented API error otherwise propagates normally.
create function pg_temp.invoke(statement text) returns jsonb language plpgsql as $$
declare result jsonb; begin execute statement into result; return result;
exception when undefined_function then return null; end $$;
set local role service_role;
select is((pg_temp.invoke($$select public.read_listening_settings('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000001')$$)->>'allowed')::boolean,true,'Personal owner learning is available without Shared opt-in');
select is((pg_temp.invoke($$select public.read_listening_settings('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000001')$$)->>'allowed')::boolean,true,'owned Themed learning is available');
select is((pg_temp.invoke($$select public.read_listening_settings('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002')$$)->>'allowed')::boolean,false,'Shared listening defaults off independently');
select is((pg_temp.invoke($$select public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true,1,null)$$)->>'allowed')::boolean,true,'explicit subject listening consent enables only its scope');
select is((pg_temp.invoke($$select public.clear_account_listening_history('310b0000-0000-4000-8000-000000000001',0)$$)->>'historyGeneration')::bigint,1::bigint,'clearing advances the account history generation');
reset role;
-- Additional security/lifecycle cases exercise the implemented contract.
set local role service_role;
select set_config('test.listener.epoch',(public.read_listening_settings('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002')->>'epoch'),true);
select is((public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true,1,current_setting('test.listener.epoch')::uuid)->>'epoch'),current_setting('test.listener.epoch'),'identical permission retry keeps epoch stable');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',clock_timestamp(),current_setting('test.listener.epoch')::uuid,0)->>'allowed')::boolean,true,'permitted Shared subject can supply listening evidence');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',now()-interval '1 hour',current_setting('test.listener.epoch')::uuid,0)->>'allowed')::boolean,false,'new permission never authorizes earlier playback');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',1)->>'allowed')::boolean,true,'Personal current generation and stable owner epoch qualify');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000012',1)->>'allowed')::boolean,true,'owned Themed current generation qualifies');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',0)->>'allowed')::boolean,false,'clear generation excludes delayed old receipts');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',now()-interval '1 hour','310b0000-0000-4000-8000-000000000011',1)->>'allowed')::boolean,false,'new generation cannot relabel pre-clear playback');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour','310b0000-0000-4000-8000-000000000011',1)->>'allowed')::boolean,false,'future observation is rejected');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',1)->>'allowed')::boolean,false,'foreign member cannot impersonate listener');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000002',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',0)->>'allowed')::boolean,false,'foreign account cannot inherit owner playback');
select throws_ok($$select public.read_listening_settings('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000002')$$,'42501',null,'private Personal settings require actual owner');
select throws_ok($$select public.clear_account_listening_history('310b0000-0000-4000-8000-000000000003',0)$$,'42501',null,'anonymous Auth cannot clear account history');
select throws_ok($$select public.clear_account_listening_history('310b0000-0000-4000-8000-000000000001',0)$$,'40001',null,'stale clear retry cannot clear newly collected history');
select throws_ok($$select public.set_room_listening_consent('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000001',true,1,null)$$,'42501',null,'Shared opt-in API cannot mutate own-room implicit policy');
select throws_ok($$select public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true,2,null)$$,'22023',null,'unknown purpose cannot silently expand consent');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','310b0000-0000-4000-8000-000000000002',true);
select public.set_room_learning_consent('310b0000-0000-4000-8000-000000000013',true,true);
select throws_ok($$select public.read_listening_settings('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002')$$,'42501',null,'browser role cannot select a target account through service RPC');
select throws_ok($$select * from private.room_listening_consents$$,'42501',null,'browser cannot read private listening consent table');
select throws_ok($$select * from private.account_listening_history$$,'42501',null,'browser cannot read private account history generations');
reset role;
set local role service_role;
select is((public.read_listening_settings('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002')->>'epoch'),current_setting('test.listener.epoch'),'unrelated action/contribution changes preserve listening epoch');
select set_config('test.listener.off_epoch',(public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',false,1,current_setting('test.listener.epoch')::uuid)->>'epoch'),true);
select isnt(current_setting('test.listener.off_epoch'),current_setting('test.listener.epoch'),'withdrawal rotates CAS epoch');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',clock_timestamp(),current_setting('test.listener.epoch')::uuid,0)->>'allowed')::boolean,false,'withdrawal excludes old receipts immediately');
select throws_ok($$select public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true,1,current_setting('test.listener.epoch')::uuid)$$,'40001',null,'stale grant request cannot undo withdrawal');
select set_config('test.listener.new_epoch',(public.set_room_listening_consent('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true,1,current_setting('test.listener.off_epoch')::uuid)->>'epoch'),true);
select isnt(current_setting('test.listener.new_epoch'),current_setting('test.listener.epoch'),'regrant creates fresh epoch');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',clock_timestamp(),current_setting('test.listener.epoch')::uuid,0)->>'allowed')::boolean,false,'regrant never revives old epoch evidence');
reset role;
select is((select individual and contribute from private.room_learning_consents where room_id='310b0000-0000-4000-8000-000000000013' and user_id='310b0000-0000-4000-8000-000000000002' and revoked_at is null),true,'listening withdrawal preserves separate explicit-choice permissions');
set local role authenticated;
select public.leave_shared_room('310b0000-0000-4000-8000-000000000013');
reset role;
select is((select allowed from private.room_listening_consents where room_id='310b0000-0000-4000-8000-000000000013' and user_id='310b0000-0000-4000-8000-000000000002'),false,'existing Shared leave revokes new listening scope');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',clock_timestamp(),current_setting('test.listener.new_epoch')::uuid,0)->>'allowed')::boolean,false,'removed membership cannot submit delayed listening');
-- Rejoin through established owner approval/ack path requires a fresh epoch.
set local role service_role;
select public.ack_shared_revocation('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','310b0000-0000-4000-8000-000000000001',true);
select public.decide_shared_membership('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002',true);
reset role;
select is((public.read_listening_settings('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000002')->>'allowed')::boolean,false,'rejoining does not revive listening opt-in');
-- Simulate an earlier clear so legacy completions can exist after that marker.
update private.account_listening_history set cleared_at=now()-interval '1 day' where user_id='310b0000-0000-4000-8000-000000000001';
create function pg_temp.history_event(ident text,event_type text,event_time timestamptz) returns jsonb language sql as $$
 select jsonb_build_array(jsonb_build_object('authority_event_id',ident,'idempotency_key',ident,'schema_version',1,
 'event_type',event_type,'reason',case when event_type='media_liked' then 'explicit_like' else 'natural_end' end,
 'room_id','310b0000-0000-4000-8000-000000000011','room_session_id','history310b','playback_occurrence_id',ident,
 'actor_member_id','310b0000-0000-4000-8000-000000000021','account_user_id','310b0000-0000-4000-8000-000000000001',
 'source_type','youtube','media_id','qa310bvideo','occurred_at',event_time,'ingested_at',clock_timestamp())); $$;
select public.ingest_recommendation_events(pg_temp.history_event('310b-completion','playback_completed',now()-interval '1 hour'));
select public.ingest_recommendation_events(pg_temp.history_event('310b-like','media_liked',now()-interval '1 hour'));
select is((select completed_count from private.catalogue_owner_evidence('310b0000-0000-4000-8000-000000000001') where media_id='qa310bvideo'),1,'legacy Personal completion is visible before clear');
select is((public.clear_account_listening_history('310b0000-0000-4000-8000-000000000001',1)->>'historyGeneration')::bigint,2::bigint,'second explicit clear advances generation once');
select is((select completed_count from private.catalogue_owner_evidence('310b0000-0000-4000-8000-000000000001') where media_id='qa310bvideo'),0,'clear removes old Personal count and completion-based ranking evidence');
select is((select liked from private.catalogue_owner_evidence('310b0000-0000-4000-8000-000000000001') where media_id='qa310bvideo'),true,'clear retains independent account Likes');
select public.ingest_recommendation_events(pg_temp.history_event('310b-delayed-completion','playback_completed',now()-interval '30 minutes'));
select is((select completed_count from private.catalogue_owner_evidence('310b0000-0000-4000-8000-000000000001') where media_id='qa310bvideo'),0,'delayed pre-clear completion cannot restore legacy totals');
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',2)->>'allowed')::boolean,true,'active account can start fresh learning after clear');
-- Room closure ends new admission, not already verified owned-room history.
select set_config('test.listener.closed_observed_at',clock_timestamp()::text,true);
update public.rooms set status='closed',closed_at=clock_timestamp(),close_reason='host_closed' where id='310b0000-0000-4000-8000-000000000012';
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000001',current_setting('test.listener.closed_observed_at')::timestamptz,'310b0000-0000-4000-8000-000000000012',2)->>'allowed')::boolean,false,'closed owned room denies new admission and delayed ingestion');
select is((pg_temp.invoke($$select private.check_listener_learning_history_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000001',current_setting('test.listener.closed_observed_at')::timestamptz,'310b0000-0000-4000-8000-000000000012',2)$$)->>'allowed')::boolean,true,'closed owned room preserves qualified historical scope');
select is((pg_temp.invoke($$select private.check_listener_learning_history_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000001',current_setting('test.listener.closed_observed_at')::timestamptz,'310b0000-0000-4000-8000-000000000012',1)$$)->>'allowed')::boolean,false,'closed-room history still obeys account clear generation');
select is((pg_temp.invoke($$select private.check_listener_learning_history_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000002',current_setting('test.listener.closed_observed_at')::timestamptz,'310b0000-0000-4000-8000-000000000012',0)$$)->>'allowed')::boolean,false,'closed-room historical scope remains owner-only');
select is((pg_temp.invoke($$select private.check_listener_learning_history_context('310b0000-0000-4000-8000-000000000012','310b0000-0000-4000-8000-000000000022','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000012',2)$$)->>'allowed')::boolean,false,'post-closure observation cannot become historical evidence');
select is((pg_temp.invoke($$select private.check_listener_learning_history_context('310b0000-0000-4000-8000-000000000013','310b0000-0000-4000-8000-000000000024','310b0000-0000-4000-8000-000000000002',clock_timestamp(),current_setting('test.listener.new_epoch')::uuid,0)$$)->>'allowed')::boolean,false,'historical reader does not revive withdrawn Shared consent');
-- Read-time account status remains authoritative.
update public.profiles set account_status='disabled' where id='310b0000-0000-4000-8000-000000000001';
select is((public.check_listener_learning_context('310b0000-0000-4000-8000-000000000011','310b0000-0000-4000-8000-000000000021','310b0000-0000-4000-8000-000000000001',clock_timestamp(),'310b0000-0000-4000-8000-000000000011',2)->>'allowed')::boolean,false,'disabled account loses listener eligibility');
select * from finish();
rollback;
