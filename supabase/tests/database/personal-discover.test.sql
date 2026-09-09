begin;
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions,private to authenticated,anon;
set local search_path = public, extensions;
select no_plan();
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into auth.users(id,is_anonymous,raw_user_meta_data) values
 ('02900000-0000-4000-8000-000000000001',false,'{"display_name":"Discover owner"}'),
 ('02900000-0000-4000-8000-000000000002',false,'{"display_name":"Other owner"}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values
 ('02900000-0000-4000-8000-000000000011','personal','02900000-0000-4000-8000-000000000001','Personal','QA029P','fixture029p'),
 ('02900000-0000-4000-8000-000000000012','personal','02900000-0000-4000-8000-000000000002','Other','QA029O','fixture029o');
insert into public.room_members(id,room_id,user_id,display_name,role) values
 ('02900000-0000-4000-8000-000000000021','02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001','Owner','host'),
 ('02900000-0000-4000-8000-000000000022','02900000-0000-4000-8000-000000000012','02900000-0000-4000-8000-000000000002','Other','host');
create function pg_temp.discover() returns jsonb language sql as $$
 select public.read_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001'); $$;
create function pg_temp.observe(action text, kind text default 'shown', state text default null, revision bigint default null) returns jsonb language sql as $$
 select public.record_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001',
 jsonb_strip_nulls(jsonb_build_object('mediaId','track029abc','actionId',action,'kind',kind,'surface','recommended','state',state,'expectedRevision',revision))); $$;

select is(pg_temp.discover()->'items','[]'::jsonb,'cold start has no fabricated regulars');
select throws_ok($$select public.read_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000002')$$,'42501',null,'another account cannot read Personal history');
select throws_ok($$select public.record_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000002','{}')$$,'42501',null,'another account cannot submit Personal feedback');

insert into public.recommendation_events(authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,
 actor_member_id,account_user_id,source_type,media_id,playback_occurrence_id,occurred_at,ingested_at,expires_at)
select '029-event-'||n,'029-event-'||n,1,
 case when n=5 then 'playback_skipped' else 'playback_completed' end,
 '02900000-0000-4000-8000-000000000011','session029','02900000-0000-4000-8000-000000000021',
 case when n=6 then '02900000-0000-4000-8000-000000000002'::uuid else '02900000-0000-4000-8000-000000000001'::uuid end,
 'youtube','track029abc',case when n=2 then 'occurrence-1' else 'occurrence-'||n end,
 case when n=4 then now()-interval '181 days' else now()-interval '10 days' end,
 now()-interval '1 day', case when n=3 then now()-interval '1 hour' else now()+interval '179 days' end
from generate_series(1,6) n;
select is(pg_temp.discover()->'items'->0->>'completedPlayCount','1','counts distinct completed occurrences, excluding expired, old, skipped and foreign-account events');
select is(pg_temp.discover()->'items'->0->>'liked','false','completion never fabricates a Like');
insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
values ('02900000-0000-4000-8000-000000000001','youtube','liked029abc','liked',1,'liked-event029',now());
select is(pg_temp.discover()->'items'->0->>'mediaId','liked029abc','explicit Likes remain independent from completed counts');
select is(pg_temp.discover()->'items'->0->>'completedPlayCount','0','liked unplayed music has zero recorded completions');

select is(pg_temp.observe('shown029')->>'ok','true','observation accepted');
select is(pg_temp.observe('shown029')->>'ok','true','retry idempotent');
select is((select count(*)::int from private.personal_discover_interactions where action_id='shown029'),1,'retry creates one observation');
select throws_ok($$select pg_temp.observe('shown029','add_requested')$$,'23505',null,'conflicting replay does not overwrite observation');
select is((select count(*)::int from private.personal_discover_feedback),0,'shown is not inferred negative preference');
select is(pg_temp.observe('snooze029','feedback','not_now',0)->'item'->>'revision','1','first explicit feedback starts revision');
select ok((pg_temp.discover()->'feedback'->0->>'expiresAt')::timestamptz between now()+interval '6 days 23 hours' and now()+interval '7 days 1 hour','not-now expires after seven days');
select ok(not jsonb_path_exists(pg_temp.discover(),'$.items[*] ? (@.mediaId == "track029abc")'),'active snooze removes candidate');
update private.personal_discover_feedback set expires_at=now()-interval '1 second' where media_id='track029abc';
select ok(jsonb_path_exists(pg_temp.discover(),'$.items[*] ? (@.mediaId == "track029abc")'),'expired snooze restores eligibility without changing its revision');
select is(pg_temp.observe('stale029','feedback','neutral',0)->>'status','conflict','stale undo cannot overwrite new feedback');
select is(pg_temp.observe('undo029','feedback','neutral',1)->'item'->>'revision','2','undo advances revision');
select is(pg_temp.observe('exclude029','feedback','do_not_suggest',2)->'item'->>'state','do_not_suggest','explicit exclusion persists');
select is(pg_temp.discover()->'feedback'->0->'expiresAt','null'::jsonb,'permanent video exclusion has no expiry');
select is(pg_temp.observe('version029','feedback','wrong_version',3)->'item'->>'state','wrong_version','wrong version is distinct from taste');
select is((select preference_state from public.media_preferences where media_id='liked029abc'),'liked','feedback never changes Likes');
select is((select count(*)::int from public.recommendation_events),6,'client observations never become trusted learning events');
update private.personal_discover_interactions set occurred_at=now()-interval '31 days' where action_id='shown029';
select is((public.prune_recommendation_data(now())->>'discover_interactions')::int,1,'existing retention job clears dormant observations after thirty days');
select is(pg_temp.discover()->'feedback'->0->>'state','wrong_version','retention preserves explicit video feedback');
select ok((select relrowsecurity from pg_class where oid='private.personal_discover_feedback'::regclass),'feedback has RLS enabled');
select ok((select relrowsecurity from pg_class where oid='private.personal_discover_interactions'::regclass),'telemetry has RLS enabled');
insert into public.media_preferences(user_id,source_type,media_id,preference_state,revision,source_event_id,source_event_at)
select '02900000-0000-4000-8000-000000000001','youtube','bulk029'||lpad(n::text,4,'0'),'liked',1,'bulk-event-'||n,now()
from generate_series(1,26) n;
insert into public.recommendation_events(authority_event_id,idempotency_key,schema_version,event_type,room_id,room_session_id,
 actor_member_id,account_user_id,source_type,media_id,playback_occurrence_id,occurred_at,ingested_at,expires_at)
values ('029-other','029-other',1,'playback_completed','02900000-0000-4000-8000-000000000011','session029',
 '02900000-0000-4000-8000-000000000021','02900000-0000-4000-8000-000000000001','youtube','other029abc','other-occurrence029',
 now()-interval '10 days',now(),now()+interval '180 days');
select ok(jsonb_path_exists(pg_temp.discover(),'$.items[*] ? (@.mediaId == "other029abc")'),'many Likes do not crowd out known completed history');
insert into private.personal_discover_feedback(user_id,media_id,state,revision)
select '02900000-0000-4000-8000-000000000001','bulk029'||lpad(n::text,4,'0'),'do_not_suggest',1 from generate_series(1,26) n;
select ok(jsonb_path_exists(pg_temp.discover(),'$.items[*] ? (@.mediaId == "liked029abc")'),'blocked higher-priority tracks do not consume candidate capacity');
select ok(not jsonb_path_exists(pg_temp.discover(),'$.items[*] ? (@.mediaId like_regex "^bulk029")'),'active exclusions are removed before hydration');
select throws_ok($$select public.record_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001','{"mediaId":"track029abc","actionId":"bad","kind":"shown","surface":"regulars","userId":"forged"}')$$,'22023',null,'RPC rejects unknown fields independently of route');

set local role authenticated;
select throws_ok($$select * from private.personal_discover_feedback$$,'42501',null,'feedback table inaccessible to authenticated');
select throws_ok($$select public.read_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001')$$,'42501',null,'read RPC service-only');
select throws_ok($$select public.record_personal_discover('02900000-0000-4000-8000-000000000011','02900000-0000-4000-8000-000000000001','{}')$$,'42501',null,'write RPC service-only');
reset role;
set local role anon;
select throws_ok($$select * from private.personal_discover_interactions$$,'42501',null,'guest cannot read observations');
reset role;
update public.profiles set account_status='disabled' where id='02900000-0000-4000-8000-000000000001';
select throws_ok($$select pg_temp.discover()$$,'42501',null,'disabled account loses access');
update public.profiles set account_status='active' where id='02900000-0000-4000-8000-000000000001';
update public.rooms set status='closed' where id='02900000-0000-4000-8000-000000000011';
select throws_ok($$select pg_temp.observe('closed029')$$,'42501',null,'closed room cannot accept observations');
delete from auth.users where id='02900000-0000-4000-8000-000000000001';
select is((select count(*)::int from private.personal_discover_feedback),0,'account deletion clears feedback');
select is((select count(*)::int from private.personal_discover_interactions),0,'account deletion clears telemetry');
select * from finish();
rollback;
