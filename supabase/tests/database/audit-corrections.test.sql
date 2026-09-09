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

create function pg_temp.count_choices(scope text) returns int language sql as $$
 select coalesce(sum((x->>'queue_added_count')::int+(x->>'play_next_count')::int),0)::int from jsonb_array_elements(public.read_room_learning_aggregates('28300000-0000-4000-8000-000000000013','28300000-0000-4000-8000-000000000001')) x where x->>'scope_type'=scope;
$$;
select set_config('request.jwt.claim.sub','28300000-0000-4000-8000-000000000001',true);

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-0-0','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 0 to 0');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 0 to 0');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-0-1','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 0 to 1');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 0 to 1');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-0-2','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 0 to 2');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 0 to 2');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-0-3','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 0 to 3');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 0 to 3');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-1-0','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 1 to 0');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 1 to 0');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-1-1','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select is(pg_temp.count_choices('room_session'),1,'contribution survives only continuously enabled scope 1 to 1');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 1 to 1');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-1-2','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 1 to 2');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 1 to 2');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-1-3','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select is(pg_temp.count_choices('room_session'),1,'contribution survives only continuously enabled scope 1 to 3');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 1 to 3');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-2-0','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 2 to 0');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 2 to 0');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-2-1','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 2 to 1');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 2 to 1');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-2-2','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 2 to 2');
select is(pg_temp.count_choices('account'),1,'individual survives only continuously enabled scope 2 to 2');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-2-3','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 2 to 3');
select is(pg_temp.count_choices('account'),1,'individual survives only continuously enabled scope 2 to 3');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-3-0','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 3 to 0');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 3 to 0');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-3-1','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
select is(pg_temp.count_choices('room_session'),1,'contribution survives only continuously enabled scope 3 to 1');
select is(pg_temp.count_choices('account'),0,'individual survives only continuously enabled scope 3 to 1');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-3-2','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,true);
reset role;
select is(pg_temp.count_choices('room_session'),0,'contribution survives only continuously enabled scope 3 to 2');
select is(pg_temp.count_choices('account'),1,'individual survives only continuously enabled scope 3 to 2');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select public.ingest_recommendation_events(pg_temp.event(3,'audit-transition-3-3','queue_added'));
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select is(pg_temp.count_choices('room_session'),1,'contribution survives only continuously enabled scope 3 to 3');
select is(pg_temp.count_choices('account'),1,'individual survives only continuously enabled scope 3 to 3');

set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,false);
reset role;
create temp table delayed as select pg_temp.event(3,'audit-delayed','queue_added') payload;
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',true,true);
reset role;
select public.ingest_recommendation_events(payload) from delayed;
select is(pg_temp.count_choices('room_session'),1,'delayed choice retains uninterrupted contribution');
select is(pg_temp.count_choices('account'),0,'later individual opt-in is not retroactive');
select public.ingest_recommendation_events(payload) from delayed;
select is(pg_temp.count_choices('room_session'),1,'delayed replay counts once');
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(1,'audit-add-next','queue_play_next'),'{0,reason}','"add_as_next"'));
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on l.event_id=e.id where e.authority_event_id='audit-add-next'),true,'actual add-as-next producer event trains Personal');

create temp table next_choice as select jsonb_set(pg_temp.event(3,'audit-shared-add-next','queue_play_next'),'{0,reason}','"add_as_next"') payload;
select public.ingest_recommendation_events(payload) from next_choice;
select public.ingest_recommendation_events(payload) from next_choice;
select is((select count(*)::int from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where e.authority_event_id='audit-shared-add-next' and l.account_allowed and l.room_allowed),1,'Shared add-next records consenting actor once on replay');
set local role authenticated;
select public.set_room_learning_consent('28300000-0000-4000-8000-000000000013',false,false);
reset role;
select public.ingest_recommendation_events(jsonb_set(pg_temp.event(3,'audit-shared-no-consent','queue_play_next'),'{0,reason}','"add_as_next"'));
select is((select account_allowed or room_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on l.event_id=e.id where e.authority_event_id='audit-shared-no-consent'),false,'add-next does not imply Shared consent');
select public.ingest_recommendation_events(payload) from next_choice;
select is(pg_temp.count_choices('room_session'),0,'replaying add-next after withdrawal does not revive Shared learning');
select is(pg_temp.count_choices('account'),1,'Shared withdrawal preserves the separate Personal choice');
select * from finish();
rollback;
