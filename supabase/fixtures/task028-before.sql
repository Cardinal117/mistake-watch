-- Local-only synthetic migration fixtures. Run on a fresh QA database before migration.
insert into auth.users(id, raw_user_meta_data) values
 ('28000000-0000-4000-8000-000000000001', '{"display_name":"QA owner"}'),
 ('28000000-0000-4000-8000-000000000002', '{"display_name":"QA unrelated"}');
insert into public.rooms(id, name, invite_code, invite_token_hash, owner_user_id,
 is_saved, saved_by_user_id, mode, status, idle_deadline_at) values
 ('28000000-0000-4000-8000-000000000011','QA saved','QA28S','fixture-saved','28000000-0000-4000-8000-000000000001',true,'28000000-0000-4000-8000-000000000001','listen','open',null),
 ('28000000-0000-4000-8000-000000000012','QA guest','QA28G','fixture-guest',null,false,null,'watch','open',now()+interval '1 day'),
 ('28000000-0000-4000-8000-000000000013','QA closed','QA28C','fixture-closed',null,false,null,'watch','closed',now()-interval '1 day'),
 ('28000000-0000-4000-8000-000000000014','QA archived','QA28A','fixture-archived',null,false,null,'listen','archived',null);
insert into public.guest_identities(id,room_id,display_name,token_hash) values
 ('28000000-0000-4000-8000-000000000021','28000000-0000-4000-8000-000000000012','QA guest','fixture-token');
insert into public.room_members(id,room_id,user_id,guest_identity_id,display_name,role) values
 ('28000000-0000-4000-8000-000000000031','28000000-0000-4000-8000-000000000011','28000000-0000-4000-8000-000000000001',null,'QA owner','host'),
 ('28000000-0000-4000-8000-000000000032','28000000-0000-4000-8000-000000000012',null,'28000000-0000-4000-8000-000000000021','QA guest','host');
insert into public.room_settings(room_id) select id from public.rooms where invite_code like 'QA28%';
insert into public.member_permissions(room_id,user_id,can_control_playback) values
 ('28000000-0000-4000-8000-000000000011','28000000-0000-4000-8000-000000000001',true);
insert into public.queue_items(room_id,source_type,source_url,title,position,added_by_user_id) values
 ('28000000-0000-4000-8000-000000000011','direct','https://example.invalid/fixture.mp4','Synthetic fixture',0,'28000000-0000-4000-8000-000000000001');
