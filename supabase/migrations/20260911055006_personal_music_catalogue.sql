-- TASK-030: service-only source registry and expiring public YouTube display cache.
-- No user association, provider payload, media bytes or inferred classification.
create table private.music_catalogue_sources (
 media_id text primary key check(media_id ~ '^[A-Za-z0-9_-]{6,64}$'),
 created_at timestamptz not null default now(),
 last_used_at timestamptz not null
);
create table private.music_catalogue_metadata (
 media_id text primary key references private.music_catalogue_sources on delete cascade,
 title text not null check(char_length(title) between 1 and 500),
 channel_title text check(char_length(channel_title)<=200),
 duration_seconds integer check(duration_seconds between 0 and 2147483647),
 thumbnail_url text check(char_length(thumbnail_url)<=2048 and thumbnail_url ~ '^https://i[0-9]*[.]ytimg[.]com/'),
 view_count bigint check(view_count between 0 and 9007199254740991),
 like_count bigint check(like_count between 0 and 9007199254740991),
 privacy_status text not null default 'public' check(privacy_status='public'),
 playable boolean not null default true check(playable),
 fetched_at timestamptz not null,
 expires_at timestamptz not null,
 check(expires_at>fetched_at and expires_at<=fetched_at+interval '28 days')
);
create index music_catalogue_metadata_expiry_idx on private.music_catalogue_metadata(expires_at);
create table private.music_catalogue_jobs (
 media_id text primary key references private.music_catalogue_sources on delete cascade,
 due_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 20),
 lease_token uuid, leased_at timestamptz, lease_until timestamptz,
 last_status text check(last_status in ('public','unavailable','transient_failure')),
 check((lease_token is null and leased_at is null and lease_until is null)
   or (lease_token is not null and leased_at is not null and lease_until=leased_at+interval '5 minutes'))
);
create index music_catalogue_jobs_due_idx on private.music_catalogue_jobs(due_at,lease_until);
create index music_catalogue_jobs_lease_idx on private.music_catalogue_jobs(lease_token) where lease_token is not null;
create table private.music_catalogue_budget (
 budget_day date primary key,
 reserved_count integer not null default 0 check(reserved_count between 0 and 100)
);
alter table private.music_catalogue_sources enable row level security;
alter table private.music_catalogue_metadata enable row level security;
alter table private.music_catalogue_jobs enable row level security;
alter table private.music_catalogue_budget enable row level security;
revoke all on private.music_catalogue_sources,private.music_catalogue_metadata,private.music_catalogue_jobs,private.music_catalogue_budget from public,anon,authenticated;
grant select,insert,update,delete on private.music_catalogue_sources,private.music_catalogue_metadata,private.music_catalogue_jobs,private.music_catalogue_budget to service_role;

-- Canonical current owner evidence. A null room is maintenance-only and includes
-- that owner's retained Personal histories. No materialized taste state to revoke.
-- Definer is limited to this service-only helper because auth.users is not
-- readable by service_role; callers recheck the requested Personal owner.
create function private.catalogue_owner_evidence(target_account uuid,target_room uuid default null)
returns table(media_id text,liked boolean,choice_count integer,last_choice_at timestamptz,completed_count integer,last_completed_at timestamptz,last_used_at timestamptz)
language sql stable security definer set search_path='' as $$
 with account as (
  select u.id from auth.users u join public.profiles p on p.id=u.id
  where u.id=target_account and u.is_anonymous is false and p.account_status='active'
 ), likes as (
  select p.media_id,p.source_event_at used_at from public.media_preferences p join account a on a.id=p.user_id
  where p.source_type='youtube' and p.preference_state='liked'
 ), events as (
  select e.*,r.room_kind,r.owner_user_id from public.recommendation_events e
  join account a on a.id=e.account_user_id join public.rooms r on r.id=e.room_id
  join public.room_members m on m.room_id=e.room_id and m.user_id=a.id and m.id::text=e.actor_member_id
  where e.source_type='youtube' and e.expires_at>now() and e.occurred_at<=now()
   and (r.room_kind<>'personal' or r.owner_user_id=a.id)
 ), choices as (
  select e.media_id,count(*)::integer n,max(e.occurred_at) used_at
  from events e join private.recommendation_learning_eligibility l on l.event_id=e.id and l.account_allowed
  left join private.room_learning_consents c on c.room_id=e.room_id and c.user_id=e.account_user_id and c.revoked_at is null
  where ((e.event_type='queue_added' and e.reason in ('manual_add','add_as_next'))
    or (e.event_type='queue_play_next' and e.reason in ('priority_play_next','add_as_next')))
   and (l.room_kind<>'shared' or c.individual_epoch=l.individual_epoch)
  group by e.media_id
 ), history as (
  select e.media_id,count(distinct e.playback_occurrence_id)::integer n,max(e.occurred_at) used_at
  from events e where e.room_kind='personal' and e.owner_user_id=target_account
   and (target_room is null or e.room_id=target_room)
   and e.event_type='playback_completed' and e.playback_occurrence_id is not null
   and e.occurred_at>=now()-interval '180 days'
  group by e.media_id
 ), ids as (select media_id from likes union select media_id from choices union select media_id from history)
 select i.media_id,l.media_id is not null,coalesce(c.n,0),c.used_at,coalesce(h.n,0),h.used_at,
  greatest(l.used_at,c.used_at,h.used_at)
 from ids i left join likes l using(media_id) left join choices c using(media_id) left join history h using(media_id)
 where i.media_id ~ '^[A-Za-z0-9_-]{6,64}$' and not exists (
  select 1 from private.personal_discover_feedback f where f.user_id=target_account and f.media_id=i.media_id
   and (f.state in ('do_not_suggest','wrong_version') or (f.state='not_now' and f.expires_at>now()))
 );
$$;

create function private.catalogue_has_reference(target_media text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists (
  select 1 from (
   select user_id from public.media_preferences where source_type='youtube' and media_id=target_media and preference_state='liked'
   union select account_user_id from public.recommendation_events where source_type='youtube' and media_id=target_media and expires_at>now() and account_user_id is not null
  ) a where exists(select 1 from private.catalogue_owner_evidence(a.user_id) e where e.media_id=target_media)
 );
$$;

create function private.register_catalogue_source(target_media text,used_at timestamptz) returns boolean
language plpgsql security invoker set search_path='' as $$
declare inserted_count integer;
begin
 if target_media is null or target_media !~ '^[A-Za-z0-9_-]{6,64}$' or used_at is null or used_at>clock_timestamp() then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 insert into private.music_catalogue_sources(media_id,last_used_at) values(target_media,used_at) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 update private.music_catalogue_sources set last_used_at=used_at where media_id=target_media and last_used_at<used_at;
 insert into private.music_catalogue_jobs(media_id) values(target_media) on conflict do nothing;
 return inserted_count=1;
end $$;

create function private.register_catalogue_like() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.source_type='youtube' and new.preference_state='liked' and exists(
   select 1 from private.catalogue_owner_evidence(new.user_id) e where e.media_id=new.media_id
 ) then perform private.register_catalogue_source(new.media_id,new.source_event_at); end if;
 return new;
end $$;
create trigger register_catalogue_like after insert or update on public.media_preferences
 for each row execute function private.register_catalogue_like();

create function private.register_catalogue_choice() returns trigger language plpgsql security definer set search_path='' as $$
declare e public.recommendation_events;
begin
 if new.account_allowed then
  select * into e from public.recommendation_events where id=new.event_id;
  if e.source_type='youtube' and e.event_type in ('queue_added','queue_play_next') and exists(
    select 1 from private.catalogue_owner_evidence(e.account_user_id) x where x.media_id=e.media_id
  ) then perform private.register_catalogue_source(e.media_id,e.occurred_at); end if;
 end if;
 return new;
end $$;
create trigger register_catalogue_choice after insert on private.recommendation_learning_eligibility
 for each row execute function private.register_catalogue_choice();

create function public.reconcile_personal_catalogue(target_room uuid,target_account uuid,preview_ids text[] default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; reference record; registered integer:=0; considered integer:=0;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 if preview_ids is null then
  with evidence as materialized (select * from private.catalogue_owner_evidence(target_account,target_room)),
  selected as (select e.media_id from evidence e left join private.music_catalogue_sources s using(media_id)
    order by s.media_id is null desc,e.last_used_at desc,e.media_id limit 128)
  select jsonb_build_object('mediaIds',coalesce((select jsonb_agg(media_id) from selected),'[]'::jsonb),
    'eligibleCount',(select count(*) from evidence)) into result;
  return result;
 end if;
 if cardinality(preview_ids)>128 or array_ndims(preview_ids)>1 or exists(select 1 from unnest(preview_ids) id where id is null or id !~ '^[A-Za-z0-9_-]{6,64}$') then
  raise exception 'Invalid catalogue preview IDs' using errcode='22023';
 end if;
 for reference in select * from private.catalogue_owner_evidence(target_account,target_room) e where e.media_id=any(preview_ids) order by e.media_id loop
  considered:=considered+1;
  if private.register_catalogue_source(reference.media_id,reference.last_used_at) then registered:=registered+1; end if;
 end loop;
 return jsonb_build_object('registeredCount',registered,'skippedCount',(select count(distinct id) from unnest(preview_ids) id)-considered);
end $$;

create function public.read_personal_catalogue(target_room uuid,target_account uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 with evidence as materialized (select * from private.catalogue_owner_evidence(target_account,target_room)),
 fresh as materialized (select e.* from evidence e join private.music_catalogue_metadata m using(media_id)
   where m.privacy_status='public' and m.playable and m.expires_at>statement_timestamp() and m.fetched_at<=statement_timestamp()),
 regulars as (
  (select * from fresh where liked order by completed_count desc,last_completed_at desc nulls last,media_id limit 8)
  union (select * from fresh where completed_count>0 order by completed_count desc,last_completed_at desc,media_id limit 8)
  union (select * from fresh where last_completed_at<now()-interval '7 days' order by last_completed_at,media_id limit 8)
 ), candidates as (
  (select * from fresh where liked order by completed_count desc,last_used_at desc,media_id limit 32)
  union (select * from fresh where choice_count>0 order by choice_count desc,last_choice_at desc,media_id limit 32)
  union (select * from fresh where completed_count>0 order by last_completed_at,media_id limit 32)
 ), selected_ids as (select media_id from regulars union select media_id from candidates)
 select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'sourceType','youtube','liked',liked,
    'completedPlayCount',completed_count,'lastCompletedAt',last_completed_at)
    order by liked desc,completed_count desc,last_completed_at desc nulls last,media_id) from regulars),'[]'::jsonb),
  'feedback',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'state',state,'revision',revision,'expiresAt',expires_at) order by media_id)
    from private.personal_discover_feedback where user_id=target_account),'[]'::jsonb),
  'countWindowDays',180,
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('mediaId',media_id,'sourceType','youtube','liked',liked,
    'completedPlayCount',completed_count,'lastCompletedAt',last_completed_at,'choiceCount',choice_count,'lastChoiceAt',last_choice_at)
    order by liked desc,choice_count desc,last_used_at desc,media_id) from candidates),'[]'::jsonb),
  'metadata',coalesce((select jsonb_agg(jsonb_build_object('mediaId',m.media_id,'title',m.title,'channelTitle',m.channel_title,
    'durationSeconds',m.duration_seconds,'thumbnailUrl',m.thumbnail_url,'fetchedAt',m.fetched_at,'expiresAt',m.expires_at) order by m.media_id)
    from private.music_catalogue_metadata m join selected_ids s using(media_id)),'[]'::jsonb),
  'catalogue',jsonb_build_object('readyCount',(select count(*) from fresh),'pendingCount',(
   select count(*) from evidence e left join private.music_catalogue_jobs j using(media_id)
   where not exists(select 1 from fresh f where f.media_id=e.media_id)
    and not (coalesce(j.last_status='unavailable',false) and j.due_at>statement_timestamp() and j.lease_token is null)
  ))
 ) into result;
 return result;
end $$;

create function public.claim_music_catalogue_jobs(request_limit integer default 100)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare day_key date:=(clock_timestamp() at time zone 'UTC')::date; cap integer:=least(greatest(coalesce(request_limit,0),0),100);
 token uuid:=gen_random_uuid(); claim_at timestamptz:=clock_timestamp(); ids text[]; spent integer;
begin
 -- One short lock serializes reservation/claim; provider I/O is outside SQL.
 -- A shared storage lock also prevents cleanup/register/completion lock inversion.
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-budget:'||day_key::text,0));
 select reserved_count into spent from private.music_catalogue_budget where budget_day=day_key;
 if cap=0 or coalesce(spent,0)>=cap then
  return jsonb_build_object('leaseToken',null,'videoIds','[]'::jsonb,'retryAt',(day_key+1)::timestamp at time zone 'UTC','budgetExhausted',true);
 end if;
 select array_agg(media_id) into ids from (
  select j.media_id from private.music_catalogue_jobs j
  where j.due_at<=claim_at and (j.lease_until is null or j.lease_until<=claim_at)
   and private.catalogue_has_reference(j.media_id)
  order by j.due_at,j.media_id for update of j skip locked limit 50
 ) selected;
 if coalesce(cardinality(ids),0)=0 then
  return jsonb_build_object('leaseToken',null,'videoIds','[]'::jsonb,'retryAt',null,'budgetExhausted',false);
 end if;
 insert into private.music_catalogue_budget(budget_day,reserved_count) values(day_key,1)
 on conflict(budget_day) do update set reserved_count=music_catalogue_budget.reserved_count+1;
 update private.music_catalogue_jobs set lease_token=token,leased_at=claim_at,lease_until=claim_at+interval '5 minutes' where media_id=any(ids);
 return jsonb_build_object('leaseToken',token,'videoIds',to_jsonb(ids),'retryAt',null,'budgetExhausted',false);
end $$;

create function public.complete_music_catalogue_jobs(lease_token uuid,results jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; job private.music_catalogue_jobs; accepted integer:=0; discarded integer:=0; state text; field text;
begin
 if lease_token is null or jsonb_typeof(results) is distinct from 'array' or jsonb_array_length(results)>50 then
  raise exception 'Invalid catalogue completion' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 if (select count(*) from jsonb_array_elements(results))<>(select count(distinct x->>'mediaId') from jsonb_array_elements(results) x) then
  raise exception 'Duplicate or missing catalogue result IDs' using errcode='22023';
 end if;
 for item in select value from jsonb_array_elements(results) order by value->>'mediaId' loop
  state:=item->>'status';
  if jsonb_typeof(item)<>'object' or item->>'mediaId' !~ '^[A-Za-z0-9_-]{6,64}$'
    or state is null or state not in ('public','unavailable','transient_failure')
    or exists(select 1 from jsonb_object_keys(item) k where k<>all(case when state='public'
      then array['mediaId','status','title','channelTitle','durationSeconds','thumbnailUrl','viewCount','likeCount']
      else array['mediaId','status'] end)) then
   raise exception 'Invalid catalogue result fields' using errcode='22023';
  end if;
  if state='public' then
   if jsonb_typeof(item->'title') is distinct from 'string' or char_length(btrim(item->>'title')) not between 1 and 500
    or (item->'channelTitle' is not null and item->'channelTitle'<>'null'::jsonb and (jsonb_typeof(item->'channelTitle')<>'string' or char_length(item->>'channelTitle')>200))
    or (item->'thumbnailUrl' is not null and item->'thumbnailUrl'<>'null'::jsonb and (jsonb_typeof(item->'thumbnailUrl')<>'string' or char_length(item->>'thumbnailUrl')>2048 or item->>'thumbnailUrl' !~ '^https://i[0-9]*[.]ytimg[.]com/')) then
    raise exception 'Invalid public metadata' using errcode='22023';
   end if;
   foreach field in array array['durationSeconds','viewCount','likeCount'] loop
    if item->field is not null and item->field<>'null'::jsonb and
     (jsonb_typeof(item->field)<>'number' or item->>field !~ '^[0-9]+$' or (item->>field)::numeric>case when field='durationSeconds' then 2147483647 else 9007199254740991 end) then
     raise exception 'Invalid metadata number' using errcode='22023';
    end if;
   end loop;
  end if;
  select * into job from private.music_catalogue_jobs j where j.media_id=item->>'mediaId' for update;
  if not found or job.lease_token is distinct from complete_music_catalogue_jobs.lease_token or job.lease_until<=clock_timestamp() then
   discarded:=discarded+1; continue;
  end if;
  if state='public' and private.catalogue_has_reference(job.media_id) then
   insert into private.music_catalogue_metadata(media_id,title,channel_title,duration_seconds,thumbnail_url,view_count,like_count,fetched_at,expires_at)
   values(job.media_id,item->>'title',item->>'channelTitle',(item->>'durationSeconds')::integer,item->>'thumbnailUrl',
    (item->>'viewCount')::bigint,(item->>'likeCount')::bigint,job.leased_at,job.leased_at+interval '28 days')
   on conflict(media_id) do update set title=excluded.title,channel_title=excluded.channel_title,duration_seconds=excluded.duration_seconds,
    thumbnail_url=excluded.thumbnail_url,view_count=excluded.view_count,like_count=excluded.like_count,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at
   where music_catalogue_metadata.fetched_at<=excluded.fetched_at;
  elsif state='unavailable' or (state='public' and not private.catalogue_has_reference(job.media_id)) then
   delete from private.music_catalogue_metadata where media_id=job.media_id;
  end if;
  update private.music_catalogue_jobs set lease_token=null,leased_at=null,lease_until=null,last_status=state,
   attempts=case when state='public' then 0 else least(attempts+1,20) end,
   due_at=case when state='public' then job.leased_at+interval '21 days'
    when state='unavailable' then clock_timestamp()+interval '7 days'
    else clock_timestamp()+least(interval '1 day',interval '5 minutes'*power(2,least(job.attempts,9))) end
  where media_id=job.media_id;
  accepted:=accepted+1;
 end loop;
 return jsonb_build_object('acceptedCount',accepted,'discardedCount',discarded);
end $$;

create function public.prune_music_catalogue(prune_at timestamptz default now())
returns jsonb language plpgsql security invoker set search_path='' as $$
declare metadata_count integer; source_count integer; budget_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 delete from private.personal_catalogue_decisions where expires_at<=prune_at;
 delete from private.music_catalogue_metadata where expires_at<=prune_at;
 get diagnostics metadata_count=row_count;
 delete from private.music_catalogue_sources s where s.last_used_at<prune_at-interval '30 days'
  and not private.catalogue_has_reference(s.media_id)
  and not exists(select 1 from private.music_catalogue_jobs j where j.media_id=s.media_id and j.lease_until>prune_at);
 get diagnostics source_count=row_count;
 delete from private.music_catalogue_budget where budget_day<(prune_at at time zone 'UTC')::date-7;
 get diagnostics budget_count=row_count;
 return jsonb_build_object('metadataDeleted',metadata_count,'sourcesDeleted',source_count,'budgetDeleted',budget_count);
end $$;

revoke all on function private.catalogue_owner_evidence(uuid,uuid),private.catalogue_has_reference(text),private.register_catalogue_source(text,timestamptz),private.register_catalogue_like(),private.register_catalogue_choice(),
 public.read_personal_catalogue(uuid,uuid),public.reconcile_personal_catalogue(uuid,uuid,text[]),public.claim_music_catalogue_jobs(integer),public.complete_music_catalogue_jobs(uuid,jsonb),public.prune_music_catalogue(timestamptz) from public,anon,authenticated;
grant execute on function private.catalogue_owner_evidence(uuid,uuid),private.catalogue_has_reference(text),private.register_catalogue_source(text,timestamptz),
 public.read_personal_catalogue(uuid,uuid),public.reconcile_personal_catalogue(uuid,uuid,text[]),public.claim_music_catalogue_jobs(integer),public.complete_music_catalogue_jobs(uuid,jsonb),public.prune_music_catalogue(timestamptz) to service_role;

-- Small first-party decision trace; no provider payload and no implicit training.
create table private.personal_catalogue_decisions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null references public.rooms(id) on delete cascade,
 algorithm_version text not null default 'personal-catalogue-v1' check(algorithm_version='personal-catalogue-v1'),
 candidates jsonb not null check(jsonb_typeof(candidates)='array' and jsonb_array_length(candidates) between 1 and 96),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 check(expires_at>created_at and expires_at<=created_at+interval '7 days')
);
create index personal_catalogue_decisions_owner_idx on private.personal_catalogue_decisions(user_id,created_at desc);
create index personal_catalogue_decisions_room_idx on private.personal_catalogue_decisions(room_id);
create index personal_catalogue_decisions_expiry_idx on private.personal_catalogue_decisions(expires_at);
alter table private.personal_catalogue_decisions enable row level security;
revoke all on private.personal_catalogue_decisions from public,anon,authenticated;
grant select,insert,update,delete on private.personal_catalogue_decisions to service_role;
-- Opaque ID outlives the short decision snapshot so exact action retries stay
-- idempotent. No FK: expiry/cap must not rewrite historical observation identity.
alter table private.personal_discover_interactions add column decision_id uuid;
create index personal_discover_interactions_decision_idx on private.personal_discover_interactions(decision_id) where decision_id is not null;

create function public.issue_personal_catalogue_decision(target_room uuid,target_account uuid,selected_ids text[])
returns jsonb language plpgsql security invoker set search_path='' as $$
declare payload jsonb; decision private.personal_catalogue_decisions; expected_count integer;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 if selected_ids is null or cardinality(selected_ids) not between 1 and 96 or array_ndims(selected_ids)>1
  or exists(select 1 from unnest(selected_ids) id where id is null or id !~ '^[A-Za-z0-9_-]{6,64}$') then
  raise exception 'Invalid catalogue decision IDs' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('personal-discover:'||target_account::text,0));
 with ids as (select id,min(position) position from unnest(selected_ids) with ordinality as x(id,position) group by id)
 select jsonb_agg(jsonb_build_object('mediaId',e.media_id,'reason',case when e.liked then 'liked' when e.choice_count>0 then 'chosen' else 'history' end) order by ids.position)
 into payload from ids join private.catalogue_owner_evidence(target_account,target_room) e on e.media_id=ids.id
 join private.music_catalogue_metadata m on m.media_id=e.media_id
 where m.privacy_status='public' and m.playable and m.expires_at>statement_timestamp() and m.fetched_at<=statement_timestamp();
 select count(distinct id) into expected_count from unnest(selected_ids) id;
 if coalesce(jsonb_array_length(payload),0)<>expected_count then
  raise exception 'Catalogue decision no longer matches eligible music' using errcode='42501';
 end if;
 select * into decision from private.personal_catalogue_decisions d
 where d.user_id=target_account and d.room_id=target_room and d.candidates=payload
  and d.created_at>=statement_timestamp()-interval '1 hour' and d.expires_at>statement_timestamp()
 order by d.created_at desc limit 1;
 if found then return jsonb_build_object('decisionId',decision.id,'expiresAt',decision.expires_at,'candidates',decision.candidates); end if;
 delete from private.personal_catalogue_decisions where user_id=target_account and expires_at<=statement_timestamp();
 delete from private.personal_catalogue_decisions where id in (
  select id from private.personal_catalogue_decisions where user_id=target_account order by created_at desc,id offset 99
 );
 insert into private.personal_catalogue_decisions(user_id,room_id,candidates) values(target_account,target_room,payload) returning * into decision;
 return jsonb_build_object('decisionId',decision.id,'expiresAt',decision.expires_at,'candidates',decision.candidates);
end $$;

-- The existing private function remains the validation/CAS authority. The wrapper
-- verifies optional decision context but does not turn observations into events.
create or replace function public.record_personal_discover(target_room uuid,target_account uuid,observation jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare decision uuid; existing private.personal_discover_interactions; response jsonb; valid_context boolean;
begin
 perform private.require_personal_discover_owner(target_room,target_account);
 if observation ? 'decisionId' then
  if jsonb_typeof(observation->'decisionId') is distinct from 'string'
   or observation->>'surface' is distinct from 'recommended'
   or observation->>'decisionId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   raise exception 'Invalid catalogue decision ID' using errcode='22023';
  end if;
  decision:=(observation->>'decisionId')::uuid;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('personal-discover:'||target_account::text,0));
 select * into existing from private.personal_discover_interactions where user_id=target_account and action_id=observation->>'actionId';
 if found and existing.decision_id is not distinct from decision then
  return private.record_personal_discover(target_room,target_account,observation-'decisionId');
 end if;
 if existing.action_id is not null and existing.decision_id is not null then
  raise exception 'Discover action was already used with different decision' using errcode='23505';
 end if;
 if decision is not null then
  select exists(select 1 from private.personal_catalogue_decisions d
  where d.id=decision and d.user_id=target_account and d.room_id=target_room and d.expires_at>statement_timestamp()
   and exists(select 1 from jsonb_array_elements(d.candidates) x where x->>'mediaId'=observation->>'mediaId')) into valid_context;
  if not valid_context then
   if observation->>'kind'='feedback' then decision:=null;
   else raise exception 'Catalogue decision context is unavailable' using errcode='22023'; end if;
  end if;
 end if;
 if existing.action_id is not null and existing.decision_id is distinct from decision then
  raise exception 'Discover action was already used with different decision' using errcode='23505';
 end if;
 response:=private.record_personal_discover(target_room,target_account,observation-'decisionId');
 if decision is not null then
  update private.personal_discover_interactions set decision_id=decision
   where user_id=target_account and action_id=observation->>'actionId' and decision_id is null;
 end if;
 return response;
end $$;
revoke all on function public.issue_personal_catalogue_decision(uuid,uuid,text[]),public.record_personal_discover(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.issue_personal_catalogue_decision(uuid,uuid,text[]),public.record_personal_discover(uuid,uuid,jsonb) to service_role;
