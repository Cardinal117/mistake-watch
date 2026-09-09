begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,is_anonymous,raw_user_meta_data) values
 ('28500000-0000-4000-8000-000000000001',false,'{"display_name":"Theme owner"}'),
 ('28500000-0000-4000-8000-000000000002',false,'{"display_name":"Other account"}'),
 ('28500000-0000-4000-8000-000000000003',true,'{"display_name":"Anonymous"}');
update private.room_kind_features set enabled=false where room_kind='themed';
set local role authenticated;
select set_config('request.jwt.claim.sub','28500000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.create_themed_room('Fantasy','Orchestral fantasy','No phonk','28500000-0000-4000-8000-000000000010')$$,'42501',null,'default-off gate blocks themed creation');
reset role;
update private.room_kind_features set enabled=true where room_kind='themed';
set local role authenticated;
select lives_ok($$select public.create_themed_room('Fantasy','Orchestral fantasy','No phonk','28500000-0000-4000-8000-000000000010')$$,'owner creates theme atomically');
select set_config('test.themed',public.create_themed_room('Fantasy','Orchestral fantasy','No phonk','28500000-0000-4000-8000-000000000010')::text,true);
select is((select count(*)::int from public.rooms where owner_user_id=auth.uid() and room_kind='themed'),1,'retry preserves one complete room');
select is((public.read_owned_room_direction(current_setting('test.themed')::uuid)->>'version')::int,1,'initial direction version');
select throws_ok($$select public.create_themed_room('Bad',repeat('x',501),'','28500000-0000-4000-8000-000000000011')$$,'22023',null,'overlong direction is denied');
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,1,'   ','')$$,'22023',null,'blank direction is denied');
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,1,'Fantasy',repeat('x',501))$$,'22023',null,'overlong exclusions are denied');
select is((public.change_room_direction(current_setting('test.themed')::uuid,1,'Orchestral fantasy','No phonk')->>'version')::int,1,'unchanged save keeps version');
select is((public.change_room_direction(current_setting('test.themed')::uuid,1,'Quiet fantasy','No phonk')->>'version')::int,2,'explicit owner change advances version');
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,1,'Stale edit','')$$,'PT409',null,'stale device cannot overwrite accepted direction');
select throws_ok($$update private.room_theme_directions set direction='Bypass' where room_id=current_setting('test.themed')::uuid$$,'42501',null,'direct client edits are denied');
select throws_ok($$select public.read_room_direction(current_setting('test.themed')::uuid)$$,'42501',null,'privileged projection is not directly callable by accounts');
select set_config('request.jwt.claim.sub','28500000-0000-4000-8000-000000000002',true);
select is(public.read_owned_room_direction(current_setting('test.themed')::uuid),null::jsonb,'outsider cannot read owner-only projection');
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,2,'Hijack','')$$,'42501',null,'outsider cannot edit');
reset role;
insert into public.room_members(room_id,user_id,display_name,role) values(current_setting('test.themed')::uuid,'28500000-0000-4000-8000-000000000002','Guest','guest');
set local role authenticated;
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,2,'Guest edit','')$$,'42501',null,'member playback role does not grant direction ownership');
select set_config('request.jwt.claim.sub','28500000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.create_themed_room('Anonymous','Fantasy','','28500000-0000-4000-8000-000000000012')$$,'42501',null,'anonymous auth is not an eligible creator');
reset role;
update public.rooms set mode='watch',name='Renamed',is_saved=false,idle_deadline_at=now()-interval '2 hours',last_active_at=now()-interval '2 hours' where id=current_setting('test.themed')::uuid;
select is((select idle_deadline_at from public.rooms where id=current_setting('test.themed')::uuid),null::timestamptz,'persistent theme has no idle deadline');
select is((public.read_room_direction(current_setting('test.themed')::uuid)->>'direction'),'Quiet fantasy','room mutations leave direction unchanged');
select is((public.read_room_direction(current_setting('test.themed')::uuid)->>'version')::int,2,'room mutations do not bump direction');
create function pg_temp.theme_event(ident text, event_type text) returns jsonb language sql as $$
 select jsonb_build_array(jsonb_build_object('authority_event_id',ident,'idempotency_key',ident,'schema_version',1,'event_type',event_type,
 'room_id',current_setting('test.themed'),'room_session_id','session-285','playback_occurrence_id','occurrence-'||ident,
 'actor_member_id',(select id::text from public.room_members where room_id=current_setting('test.themed')::uuid and role='host'),
 'account_user_id','28500000-0000-4000-8000-000000000001','source_type','youtube','media_id','offtheme285',
 'reason',case when event_type='media_liked' then 'explicit_like' else 'add_as_next' end,'occurred_at',clock_timestamp(),'ingested_at',clock_timestamp()));
$$;
select set_config('test.theme_event',pg_temp.theme_event('285-manual','queue_play_next')::text,true);
select public.ingest_recommendation_events(current_setting('test.theme_event')::jsonb);
select is((select room_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='285-manual'),false,'manual choice never trains theme');
select is((select account_allowed from private.recommendation_learning_eligibility l join public.recommendation_events e on e.id=l.event_id where authority_event_id='285-manual'),false,'unclassified choice does not train personal taste');
select public.ingest_recommendation_events(current_setting('test.theme_event')::jsonb);
select is(public.read_room_learning_aggregates(current_setting('test.themed')::uuid),'[]'::jsonb,'delayed/replayed manual choices have no theme aggregate');
select public.ingest_recommendation_events(pg_temp.theme_event('285-like','media_liked'));
select is((select preference_state from public.media_preferences where user_id='28500000-0000-4000-8000-000000000001' and media_id='offtheme285'),'liked','explicit Like remains personal');
select is((public.read_room_direction(current_setting('test.themed')::uuid)->>'direction'),'Quiet fantasy','manual choice and Like do not rewrite direction');
select throws_ok($$update public.rooms set owner_user_id='28500000-0000-4000-8000-000000000002' where id=current_setting('test.themed')::uuid$$,'23514',null,'ownership cannot be reassigned');
update public.profiles set account_status='disabled' where id='28500000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','28500000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.change_room_direction(current_setting('test.themed')::uuid,2,'Disabled','')$$,'42501',null,'disabled owner cannot edit with existing token');
reset role;
delete from auth.users where id='28500000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.rooms where id=current_setting('test.themed')::uuid),0,'owner deletion removes the room');
select is((select count(*)::int from private.room_theme_directions where room_id=current_setting('test.themed')::uuid),0,'direction cascades with room deletion');
select finish();
rollback;
