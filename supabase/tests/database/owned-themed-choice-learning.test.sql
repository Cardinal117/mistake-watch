begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
alter table public.rooms drop constraint rooms_room_kind_enabled_check;
insert into auth.users(id,is_anonymous,created_at,raw_user_meta_data) values
('310a0000-0000-4000-8000-000000000001',false,now()-interval '2 days','{"display_name":"Themed owner"}'),
('310a0000-0000-4000-8000-000000000002',false,now()-interval '2 days','{"display_name":"Other member"}');
insert into public.rooms(id,room_kind,owner_user_id,name,invite_code,invite_token_hash) values
('310a0000-0000-4000-8000-000000000011','themed','310a0000-0000-4000-8000-000000000001','Theme','QA310A','fixture310a');
insert into public.room_members(id,room_id,user_id,display_name,role,joined_at) values
('310a0000-0000-4000-8000-000000000021','310a0000-0000-4000-8000-000000000011','310a0000-0000-4000-8000-000000000001','Owner','host',now()-interval '1 day'),
('310a0000-0000-4000-8000-000000000022','310a0000-0000-4000-8000-000000000011','310a0000-0000-4000-8000-000000000002','Other','guest',now()-interval '1 day');
create function pg_temp.choice(ident text, action text default 'queue_added', why text default 'manual_add', member_n int default 1, at_time timestamptz default now()) returns jsonb language sql as $$
 select jsonb_build_array(jsonb_build_object('authority_event_id',ident,'idempotency_key',ident,'schema_version',1,
 'event_type',action,'reason',why,'room_id','310a0000-0000-4000-8000-000000000011','room_session_id','session310a',
 'queue_item_id',ident,'actor_member_id','310a0000-0000-4000-8000-00000000002'||member_n,
 'account_user_id','310a0000-0000-4000-8000-00000000000'||member_n,'source_type','youtube','media_id','qa310avideo',
 'occurred_at',at_time,'ingested_at',clock_timestamp())); $$;
create function pg_temp.allowed(ident text) returns boolean language sql as $$
 select l.account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where e.authority_event_id=ident; $$;
select public.ingest_recommendation_events(pg_temp.choice('310a-manual'));
select is(pg_temp.allowed('310a-manual'),true,'owned Themed manual add teaches the owner account');
select is((select l.room_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where e.authority_event_id='310a-manual'),false,'owner choices do not redefine the room theme');
select public.ingest_recommendation_events(pg_temp.choice('310a-next','queue_play_next','add_as_next'));
select is(pg_temp.allowed('310a-next'),true,'owned Themed add-as-next is a deliberate account choice');
select public.ingest_recommendation_events(pg_temp.choice('310a-other','queue_added','manual_add',2));
select is(pg_temp.allowed('310a-other'),false,'another member does not train owner or own account implicitly');
select public.ingest_recommendation_events(pg_temp.choice('310a-passive','playback_completed','natural_end'));
select is(pg_temp.allowed('310a-passive'),false,'room completion is not listener evidence');
select public.ingest_recommendation_events(pg_temp.choice('310a-automatic','queue_added','automatic'));
select is(pg_temp.allowed('310a-automatic'),false,'automatic queue additions are not explicit choices');
select public.ingest_recommendation_events(pg_temp.choice('310a-like','media_liked','explicit_like',2));
select is(pg_temp.allowed('310a-like'),true,'nonowner explicit Like remains account-wide');
select public.ingest_recommendation_events(pg_temp.choice('310a-before-policy','queue_added','manual_add',1,
 (select coalesce(max(activated_at) filter(where version=2),clock_timestamp())-interval '1 second' from private.recommendation_learning_versions)));
select is(pg_temp.allowed('310a-before-policy'),false,'delayed pre-activation event remains ineligible');
select is((select coalesce(sum((x->>'queue_added_count')::int+(x->>'play_next_count')::int),0)::int
 from jsonb_array_elements(public.read_room_learning_aggregates('310a0000-0000-4000-8000-000000000011','310a0000-0000-4000-8000-000000000001')) x where x->>'scope_type'='account'),2,'account projection consumes only two owner choices');
select is((select choice_count from private.catalogue_owner_evidence('310a0000-0000-4000-8000-000000000001') where media_id='qa310avideo'),2,'Personal catalogue can reuse eligible Themed owner choices');
select throws_ok($$update public.rooms set owner_user_id='310a0000-0000-4000-8000-000000000002' where id='310a0000-0000-4000-8000-000000000011'$$,'23514',null,'immutable ownership establishes occurrence-time ownership');
update public.profiles set account_status='disabled' where id='310a0000-0000-4000-8000-000000000001';
select public.ingest_recommendation_events(pg_temp.choice('310a-disabled'));
select is(pg_temp.allowed('310a-disabled'),false,'disabled owner cannot create taste evidence');
select is((select count(*)::int from private.catalogue_owner_evidence('310a0000-0000-4000-8000-000000000001')),0,'disabled owner evidence is excluded at read time');
select * from finish();
rollback;
