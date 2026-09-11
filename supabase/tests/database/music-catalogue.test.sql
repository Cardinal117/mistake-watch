-- TASK-030. Synthetic fixtures only; every change rolls back.
begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to service_role,anon,authenticated;
set local search_path = public, extensions;
select no_plan();
select has_function('public','read_personal_catalogue',array['uuid','uuid'],'Personal catalogue capability exists');
select has_function('public','reconcile_personal_catalogue',array['uuid','uuid','text[]'],'bounded reconciliation capability exists');
select has_function('public','claim_music_catalogue_jobs',array['integer'],'global batch budget and lease capability exists');
select ok(not has_table_privilege('anon','private.music_catalogue_sources','SELECT'),'anonymous cannot enumerate catalogue');
select ok(not has_table_privilege('authenticated','private.music_catalogue_metadata','SELECT'),'authenticated cannot enumerate metadata');
select ok(not has_function_privilege('authenticated','public.read_personal_catalogue(uuid,uuid)','EXECUTE'),'browser cannot select another owner through RPC');
select ok(not has_function_privilege('anon','public.complete_music_catalogue_jobs(uuid,jsonb)','EXECUTE'),'browser cannot author public metadata');
select is(public.claim_music_catalogue_jobs()->'videoIds','[]'::jsonb,'empty worker returns no IDs');
select is((select count(*)::integer from private.music_catalogue_budget),0,'empty work spends no budget');

alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into private.room_kind_features(room_kind,enabled) values('personal',true),('shared',true),('temporary',true) on conflict(room_kind) do update set enabled=true;
insert into private.recommendation_learning_versions values(1,now()-interval '1 year') on conflict do nothing;
insert into auth.users(id,is_anonymous,raw_user_meta_data) values
 ('03000000-0000-4000-8000-000000000001',false,'{"display_name":"Catalogue owner"}'),
 ('03000000-0000-4000-8000-000000000002',false,'{"display_name":"Other owner"}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values
 ('03000000-0000-4000-8000-000000000011','personal','03000000-0000-4000-8000-000000000001','Personal','QA030P','fixture030p'),
 ('03000000-0000-4000-8000-000000000012','personal','03000000-0000-4000-8000-000000000002','Other','QA030O','fixture030o'),
 ('03000000-0000-4000-8000-000000000013','shared','03000000-0000-4000-8000-000000000001','Shared','QA030S','fixture030s'),
 ('03000000-0000-4000-8000-000000000014','temporary','03000000-0000-4000-8000-000000000001','Temporary','QA030T','fixture030t');
insert into private.shared_memberships(room_id,user_id,state) values('03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001','approved');
insert into public.room_members(id,room_id,user_id,display_name,role) values
 ('03000000-0000-4000-8000-000000000021','03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001','Owner','host'),
 ('03000000-0000-4000-8000-000000000022','03000000-0000-4000-8000-000000000012','03000000-0000-4000-8000-000000000002','Other','host'),
 ('03000000-0000-4000-8000-000000000023','03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001','Owner','host'),
 ('03000000-0000-4000-8000-000000000024','03000000-0000-4000-8000-000000000014','03000000-0000-4000-8000-000000000001','Owner','host');
create function pg_temp.read_catalogue() returns jsonb language sql as $$
 select public.read_personal_catalogue('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001'); $$;
create function pg_temp.reconcile(ids text[] default null) returns jsonb language sql as $$
 select public.reconcile_personal_catalogue('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',ids); $$;
create function pg_temp.cache(media text) returns void language sql as $$
 insert into private.music_catalogue_sources(media_id,last_used_at) values(media,now()) on conflict do nothing;
 insert into private.music_catalogue_metadata(media_id,title,fetched_at,expires_at) values(media,'Verified fixture',now()-interval '1 hour',now()+interval '27 days')
 on conflict(media_id) do update set fetched_at=excluded.fetched_at,expires_at=excluded.expires_at; $$;
select is(pg_temp.read_catalogue()->'items','[]'::jsonb,'cold start has no fabricated regulars');
select throws_ok($$select public.read_personal_catalogue('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000002')$$,'42501',null,'other account cannot read this Personal room');
select throws_ok($$select public.reconcile_personal_catalogue('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000002')$$,'42501',null,'other account cannot reconcile this Personal room');

insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at) values
 ('03000000-0000-4000-8000-000000000001','youtube','own030video','liked',1,'030-like-own',now()-interval '1 day'),
 ('03000000-0000-4000-8000-000000000002','youtube','other030vid','liked',1,'030-like-other',now()-interval '1 day');
select is((select count(*)::integer from private.music_catalogue_sources),2,'trusted Likes register distinct sources without provider I/O');
select is((pg_temp.reconcile(array['own030video'])->>'registeredCount')::integer,0,'reconciliation replay does not duplicate source');
select is((select count(*)::integer from private.music_catalogue_jobs),2,'reconciliation replay does not duplicate work');
select is((pg_temp.reconcile(array['other030vid'])->>'skippedCount')::integer,1,'arbitrary other-account ID is not registered by owner');
select is((pg_temp.read_catalogue()->'catalogue'->>'pendingCount')::integer,1,'pending count does not expose other account');
create temporary table claims(payload jsonb);
insert into claims select public.claim_music_catalogue_jobs();
select is(jsonb_array_length((select payload->'videoIds' from claims)),2,'single claim batches both independent referenced IDs');
select is(public.claim_music_catalogue_jobs()->'videoIds','[]'::jsonb,'current leases cannot be claimed again');
select is((select reserved_count from private.music_catalogue_budget),1,'empty second claim spends no budget');
select throws_ok($$select public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),'[{"mediaId":"own030video","status":"unknown"}]')$$,'22023',null,'unknown privacy status cannot admit metadata');
select throws_ok($$select public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),'[{"mediaId":"own030video","status":"unavailable","title":"Unlisted private title"}]')$$,'22023',null,'nonpublic result cannot carry cached fields');
select is((public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),
 '[{"mediaId":"own030video","status":"unavailable"},{"mediaId":"other030vid","status":"public","title":"Public other track","thumbnailUrl":"https://i.ytimg.com/vi/other030vid/hqdefault.jpg"}]')->>'acceptedCount')::integer,2,'only verified-public worker result admits metadata');
select is((select count(*)::integer from private.music_catalogue_metadata),1,'unavailable source stores no provider metadata');
select is((pg_temp.read_catalogue()->'catalogue'->>'pendingCount')::integer,0,'known unavailable with future retry is not permanently preparing');
select is(pg_temp.read_catalogue()->'candidates','[]'::jsonb,'another owner public cache is not recommendation evidence');
select is((public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),'[{"mediaId":"own030video","status":"public","title":"Late result"}]')->>'discardedCount')::integer,1,'already completed lease cannot write late result');

update private.music_catalogue_jobs set due_at=now()-interval '1 minute' where media_id='own030video';
delete from claims;
insert into claims select public.claim_music_catalogue_jobs();
select public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),'[{"mediaId":"own030video","status":"public","title":"Owner public track","durationSeconds":180,"viewCount":123}]');
select is(jsonb_array_length(pg_temp.read_catalogue()->'items'),1,'fresh regulars resolve owner cache');
select is(pg_temp.read_catalogue()->'candidates'->0->>'mediaId','own030video','fresh candidate is owner evidence only');
select is(pg_temp.read_catalogue()->'candidates'->0->>'liked','true','reason evidence comes from app Like');
select ok(not (pg_temp.read_catalogue()->'metadata'->0 ? 'viewCount'),'provider statistics are not recommendation rank evidence');
set local role service_role;
select is(jsonb_array_length(pg_temp.read_catalogue()->'items'),1,'service role can read through restricted catalogue RPC');
reset role;

-- Server reason snapshots remain distinct from browser observations.
create function pg_temp.issue(ids text[]) returns jsonb language sql as $$
 select public.issue_personal_catalogue_decision('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',ids); $$;
create temporary table decisions as select pg_temp.issue(array['own030video']) payload;
select is((select payload->'candidates'->0->>'reason' from decisions),'liked','server decision derives exact Like reason');
select is(pg_temp.issue(array['own030video'])->>'decisionId',(select payload->>'decisionId' from decisions),'identical decision deduplicates within hour');
select is((select algorithm_version from private.personal_catalogue_decisions),'personal-catalogue-v1','decision records algorithm version');
select throws_ok($$select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 jsonb_build_object('mediaId','own030video','actionId','030-wrong-surface','kind','shown','surface','regulars','decisionId',(select payload->>'decisionId' from decisions)))$$,'22023',null,'decision context belongs only to recommended surface');
select throws_ok($$select pg_temp.issue(array['other030vid'])$$,'42501',null,'decision cannot include another owner source');
select ok(not has_table_privilege('authenticated','private.personal_catalogue_decisions','SELECT'),'browser cannot read private reason history');
select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 jsonb_build_object('mediaId','own030video','actionId','030-shown','kind','shown','surface','recommended','decisionId',(select payload->>'decisionId' from decisions)));
select is((select decision_id::text from private.personal_discover_interactions where action_id='030-shown'),(select payload->>'decisionId' from decisions),'observation links to verified server decision');
select throws_ok($$select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 '{"mediaId":"own030video","actionId":"030-shown","kind":"shown","surface":"recommended"}')$$,'23505',null,'retry cannot replace decision linkage');
select throws_ok($$select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 jsonb_build_object('mediaId','other030vid','actionId','030-forged','kind','shown','surface','recommended','decisionId',(select payload->>'decisionId' from decisions)))$$,'22023',null,'decision cannot authorize another media ID');
select is((select count(*)::integer from public.recommendation_events),0,'linked shown observation does not create trusted learning event');
delete from private.personal_catalogue_decisions where id=(select (payload->>'decisionId')::uuid from decisions);
select is((select decision_id::text from private.personal_discover_interactions where action_id='030-shown'),(select payload->>'decisionId' from decisions),'snapshot deletion preserves immutable opaque action context');
select lives_ok($$select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 jsonb_build_object('mediaId','own030video','actionId','030-shown','kind','shown','surface','recommended','decisionId',(select payload->>'decisionId' from decisions)))$$,'exact shown retry succeeds after trace eviction');
create function pg_temp.expired_feedback() returns jsonb language sql as $$
 select public.record_personal_discover('03000000-0000-4000-8000-000000000011','03000000-0000-4000-8000-000000000001',
 jsonb_build_object('mediaId','own030video','actionId','030-expired-feedback','kind','feedback','surface','recommended','state','not_now','expectedRevision',0,'decisionId',(select payload->>'decisionId' from decisions))); $$;
select is(pg_temp.expired_feedback()->'item'->>'state','not_now','explicit feedback survives an evicted decision context');
select is(pg_temp.expired_feedback()->'item'->>'revision','1','expired-context feedback retry remains idempotent');
select ok((select decision_id is null from private.personal_discover_interactions where action_id='030-expired-feedback'),'unusable trace context is not attached to new feedback');
delete from private.personal_discover_feedback where media_id='own030video';

-- Freshness precedes balanced limits: stale/unhydrated high-priority rows cannot starve fresh rows.
alter table public.media_preferences disable trigger register_catalogue_like;
insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
 select '03000000-0000-4000-8000-000000000001','youtube','pool030'||lpad(n::text,4,'0'),'liked',1,'030-pool-'||n,now()-interval '2 days'
 from generate_series(1,140) n;
alter table public.media_preferences enable trigger register_catalogue_like;
select is(jsonb_array_length(pg_temp.reconcile()->'mediaIds'),128,'preview is bounded at 128');
select is((select count(*)::integer from private.music_catalogue_sources),2,'preview performs no registration');
create temporary table preview as select array(select jsonb_array_elements_text(pg_temp.reconcile()->'mediaIds')) ids;
select is((pg_temp.reconcile((select ids from preview))->>'registeredCount')::integer,128,'apply uses exact previewed references');
select is((pg_temp.reconcile((select ids from preview))->>'registeredCount')::integer,0,'preview apply is idempotent');
select is((pg_temp.reconcile(array(select jsonb_array_elements_text(pg_temp.reconcile()->'mediaIds')))->>'registeredCount')::integer,12,'second preview progresses beyond first 128');
do $$ begin
 for i in 1..101 loop
  perform pg_temp.cache('pool030'||lpad(i::text,4,'0'));
  perform pg_temp.issue(array['pool030'||lpad(i::text,4,'0')]);
 end loop;
end $$;
select is((select count(*)::integer from private.personal_catalogue_decisions),100,'decision retention is capped per account');
delete from private.music_catalogue_metadata where media_id like 'pool030%';
select pg_temp.cache('pool0300140');
select ok(exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'items') x where x->>'mediaId'='pool0300140'),'fresh regular beyond stale prefix is visible');

insert into private.personal_discover_feedback(user_id,media_id,state,revision) values('03000000-0000-4000-8000-000000000001','pool0300140','do_not_suggest',1);
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'items') x where x->>'mediaId'='pool0300140'),'permanent suppression applies before regular limits');
select ok(not private.catalogue_has_reference('pool0300140'),'excluded Like alone is not a refresh reason');
insert into private.personal_discover_feedback(user_id,media_id,state,revision,expires_at) values('03000000-0000-4000-8000-000000000001','own030video','not_now',1,now()+interval '7 days');
select is(pg_temp.read_catalogue()->'items','[]'::jsonb,'snoozed track is absent');
update private.personal_discover_feedback set expires_at=now()-interval '1 second' where media_id='own030video';
select is(jsonb_array_length(pg_temp.read_catalogue()->'items'),1,'expired snooze restores eligible item');

-- Current consent epochs and actual event actors remain the authority.
insert into private.room_learning_consents(id,room_id,user_id,contribute,individual,valid_from,individual_epoch,individual_from)
 values('03000000-0000-4000-8000-000000000031','03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001',false,true,now()-interval '1 day','03000000-0000-4000-8000-000000000032',now()-interval '1 day');
insert into public.recommendation_events(id,authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,actor_member_id,account_user_id,source_type,media_id,reason,occurred_at,expires_at)
 values('03000000-0000-4000-8000-000000000041','030-shared','030-shared',1,'queue_added','03000000-0000-4000-8000-000000000013','session030','03000000-0000-4000-8000-000000000023','03000000-0000-4000-8000-000000000001','youtube','shared030vid','manual_add',now()-interval '1 hour',now()+interval '180 days');
insert into private.recommendation_learning_eligibility(event_id,room_kind,policy_version,consent_id,account_allowed,room_allowed,learning_key,individual_epoch)
 values('03000000-0000-4000-8000-000000000041','shared',1,'03000000-0000-4000-8000-000000000031',true,false,'030-shared','03000000-0000-4000-8000-000000000032');
select ok(exists(select 1 from private.music_catalogue_sources where media_id='shared030vid'),'eligibility trigger registers valid deliberate choice');
select pg_temp.cache('shared030vid');
select ok(exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'candidates') x where x->>'mediaId'='shared030vid'),'current individual Shared consent supplies owner choice');
update private.room_learning_consents set revoked_at=now() where id='03000000-0000-4000-8000-000000000031';
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'candidates') x where x->>'mediaId'='shared030vid'),'withdrawal immediately removes old choice');
select ok(not private.catalogue_has_reference('shared030vid'),'withdrawn choice cannot keep worker refreshing');
insert into private.room_learning_consents(id,room_id,user_id,contribute,individual,valid_from,individual_epoch,individual_from)
 values('03000000-0000-4000-8000-000000000033','03000000-0000-4000-8000-000000000013','03000000-0000-4000-8000-000000000001',false,true,now(),'03000000-0000-4000-8000-000000000034',now());
select ok(not private.catalogue_has_reference('shared030vid'),'new consent epoch does not revive historic contribution');

insert into public.recommendation_events(authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,actor_member_id,account_user_id,source_type,media_id,playback_occurrence_id,occurred_at,expires_at)
 select '030-history-'||n,'030-history-'||n,1,'playback_completed',
 case when n=3 then '03000000-0000-4000-8000-000000000014'::uuid else '03000000-0000-4000-8000-000000000011'::uuid end,'session030',
 case when n=3 then '03000000-0000-4000-8000-000000000024' else '03000000-0000-4000-8000-000000000021' end,
 '03000000-0000-4000-8000-000000000001','youtube',case when n=3 then 'temporary030' else 'history030vid' end,'same-occurrence',now()-interval '10 days',now()+interval '180 days'
 from generate_series(1,3) n;
select pg_temp.cache('history030vid');
select pg_temp.cache('temporary030');
select is((select (x->>'completedPlayCount')::integer from jsonb_array_elements(pg_temp.read_catalogue()->'candidates') x where x->>'mediaId'='history030vid'),1,'history counts distinct trusted occurrences, not deliveries');
select ok(not private.catalogue_has_reference('temporary030'),'Temporary implicit history does not seed catalogue evidence');
delete from public.recommendation_events where media_id='history030vid';
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'candidates') x where x->>'mediaId'='history030vid'),'history deletion immediately removes its recommendation effect');

-- Transient failure cannot renew expiry; physical cleanup preserves first-party Likes.
update private.music_catalogue_jobs set due_at=now()+interval '30 days';
update private.music_catalogue_jobs set due_at=now()-interval '1 minute' where media_id='own030video';
delete from claims;
insert into claims select public.claim_music_catalogue_jobs();
create temporary table old_metadata as select expires_at from private.music_catalogue_metadata where media_id='own030video';
select public.complete_music_catalogue_jobs((select (payload->>'leaseToken')::uuid from claims),'[{"mediaId":"own030video","status":"transient_failure"}]');
select is((select expires_at from private.music_catalogue_metadata where media_id='own030video'),(select expires_at from old_metadata),'transient failure retains original expiry');
update private.music_catalogue_metadata set fetched_at=now()-interval '29 days',expires_at=now()-interval '1 day' where media_id='own030video';
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.read_catalogue()->'metadata') x where x->>'mediaId'='own030video'),'expired metadata cannot be served before maintenance');
select is((public.prune_music_catalogue()->>'metadataDeleted')::integer,1,'independent cleanup physically deletes expired metadata');
select is((select preference_state from public.media_preferences where media_id='own030video'),'liked','cache cleanup preserves Like');
select is((select state from private.personal_discover_feedback where media_id='pool0300140'),'do_not_suggest','cache cleanup preserves explicit exclusion');
update private.music_catalogue_budget set reserved_count=100;
select is(public.claim_music_catalogue_jobs()->>'budgetExhausted','true','global DB ceiling prevents extra requests');
select is(public.claim_music_catalogue_jobs(0)->'videoIds','[]'::jsonb,'worker disable cannot claim work');
update private.personal_catalogue_decisions set created_at=now()-interval '8 days',expires_at=now()-interval '1 day';
select public.prune_music_catalogue();
select is((select count(*)::integer from private.personal_catalogue_decisions),0,'independent maintenance expires decision history');

update public.profiles set account_status='disabled' where id='03000000-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.read_catalogue()$$,'42501',null,'inactive account cannot read cached results');
select ok(not private.catalogue_has_reference('own030video'),'inactive account Like cannot drive maintenance');
delete from auth.users where id='03000000-0000-4000-8000-000000000002';
select ok(not private.catalogue_has_reference('other030vid'),'account deletion removes reusable preference evidence');
select * from finish();
rollback;
