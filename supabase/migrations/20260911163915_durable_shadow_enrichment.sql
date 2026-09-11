-- Durable automatic enrichment remains private shadow evidence. No accepted links,
-- recommendation ranks, listening counts or client-visible data are modified.
create table private.shadow_enrichment_jobs (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references auth.users on delete cascade,
 media_id text not null references private.music_catalogue_sources on delete cascade,
 stage text not null check(stage in ('identity','tags','audio')),
 context jsonb not null check(octet_length(context::text)<=8192),
 recording jsonb,
 status text not null default 'pending' check(status in ('pending','done','invalid')),
 attempts integer not null default 0 check(attempts between 0 and 3),
 due_at timestamptz not null default now(),
 token uuid, lease_until timestamptz, claimed_at timestamptz,
 completed_token uuid, outcome jsonb check(octet_length(outcome::text)<=65536),
 fetched_at timestamptz, expires_at timestamptz,
 created_at timestamptz not null default now(),
 unique(account_id,media_id,stage)
);
create index shadow_enrichment_due_idx on private.shadow_enrichment_jobs(stage,due_at,id) where status='pending';
create index shadow_enrichment_source_idx on private.shadow_enrichment_jobs(media_id);
create table private.shadow_enrichment_rate (
 provider text primary key check(provider in ('lastfm','acousticbrainz')),
 next_at timestamptz not null default now(),
 day date not null default (now() at time zone 'UTC')::date,
 used integer not null default 0 check(used between 0 and 200),
 token uuid, lease_until timestamptz
);
insert into private.shadow_enrichment_rate(provider) values('lastfm'),('acousticbrainz');
alter table private.shadow_enrichment_jobs enable row level security;
alter table private.shadow_enrichment_rate enable row level security;
revoke all on private.shadow_enrichment_jobs,private.shadow_enrichment_rate from public,anon,authenticated,service_role;

-- Source generation, provider snapshot, correction and current learning evidence
-- are part of the fence. A history clear / withdrawn preference cannot resurrect
-- older evidence by merely reusing a media ID.
create function private.shadow_enrichment_context(target_account uuid,source_id text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'snapshot',jsonb_build_object('mediaId',s.media_id,'title',m.title,'channel',m.channel_title,
   'durationSeconds',m.duration_seconds,'expiresAt',extract(epoch from m.expires_at)*1000),
  'sourceCreatedAt',s.created_at,'metadataFetchedAt',m.fetched_at,
  'correctionRevision',coalesce(l.revision,0),'historyGeneration',coalesce(h.generation,0),
  'preferenceEvent',(select jsonb_build_array(p.source_event_id,p.source_event_at,p.preference_state)
    from public.media_preferences p where p.user_id=target_account and p.source_type='youtube' and p.media_id=source_id),
  'choiceConsentGeneration',(select md5(coalesce(string_agg(jsonb_build_array(c.room_id,c.individual_epoch,c.revoked_at)::text,',' order by c.room_id),''))
    from private.room_learning_consents c where c.user_id=target_account))
 from private.catalogue_owner_evidence(target_account) e
 join private.music_catalogue_sources s on s.media_id=e.media_id
 join private.music_catalogue_metadata m on m.media_id=s.media_id
 left join private.recording_source_links l on l.account_id=target_account and l.media_id=s.media_id
 left join private.account_listening_history h on h.user_id=target_account
 where s.media_id=source_id and m.expires_at>clock_timestamp() and m.fetched_at<=clock_timestamp()
  and m.privacy_status='public' and m.playable and m.duration_seconds between 1 and 86400
  and char_length(m.title)<=300 and m.channel_title like '% - Topic'
$$;

create function public.enqueue_shadow_enrichment(target_account uuid,source_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare ctx jsonb; j private.shadow_enrichment_jobs; optional_stage text;
begin
 perform private.require_recording_account(target_account);
 perform pg_advisory_xact_lock(hashtextextended('shadow-enqueue',0));
 ctx:=private.shadow_enrichment_context(target_account,source_id);
 if ctx is null then raise exception 'Fresh eligible source required' using errcode='42501'; end if;
 select * into j from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id and stage='identity' for update;
 if found and j.context=ctx and (j.status='pending' or j.expires_at>clock_timestamp()) then
  if j.status='done' and j.outcome->>'status'='provisional' then
   foreach optional_stage in array array['tags','audio'] loop
    delete from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id and stage=optional_stage and status<>'pending' and expires_at<=clock_timestamp();
    insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,recording)
    values(target_account,source_id,optional_stage,ctx,j.outcome->'recording') on conflict(account_id,media_id,stage) do nothing;
   end loop;
  end if;
  return jsonb_build_object('status','existing','jobId',j.id);
 end if;
 -- Expired/ineligible data is bounded even when the source registry survives.
 delete from private.shadow_enrichment_jobs where coalesce(expires_at,to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000))<=clock_timestamp();
 if (select count(*) from private.shadow_enrichment_jobs where account_id=target_account and stage='identity' and media_id<>source_id)>=256 or
    (select count(*) from private.shadow_enrichment_jobs where stage='identity' and not(account_id=target_account and media_id=source_id))>=4096 then raise exception 'Shadow job capacity reached' using errcode='54000'; end if;
 delete from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id;
 insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context)
 values(target_account,source_id,'identity',ctx) returning * into j;
 return jsonb_build_object('status','pending','jobId',j.id);
end $$;

create function public.enqueue_shadow_enrichment_batch(target_account uuid,max_sources integer default 10) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r record; result jsonb; n integer:=0;
begin
 perform private.require_recording_account(target_account);
 if max_sources is null or max_sources not between 1 and 60 then raise exception 'Invalid admission bound' using errcode='22023'; end if;
 for r in select e.media_id from private.catalogue_owner_evidence(target_account) e
  cross join lateral (select private.shadow_enrichment_context(target_account,e.media_id) ctx) c
  left join private.shadow_enrichment_jobs j on j.account_id=target_account and j.media_id=e.media_id and j.stage='identity'
  where c.ctx is not null and (j.id is null or j.context<>c.ctx or (j.status<>'pending' and (j.expires_at is null or j.expires_at<=clock_timestamp())) or
   (j.status='done' and j.outcome->>'status'='provisional' and exists(select 1 from (values('tags'),('audio')) stages(stage)
    left join private.shadow_enrichment_jobs optional on optional.account_id=target_account and optional.media_id=e.media_id and optional.stage=stages.stage
    where optional.id is null or (optional.status<>'pending' and optional.expires_at<=clock_timestamp()))))
  order by e.media_id limit max_sources
 loop
  begin
   result:=public.enqueue_shadow_enrichment(target_account,r.media_id);
  exception when sqlstate '54000' then
   -- Admission backpressure must not prevent the caller draining existing jobs.
   exit;
  end;
  if result->>'status'='pending' then n:=n+1; end if;
 end loop;
 return jsonb_build_object('queued',n);
end $$;

create function public.claim_shadow_enrichment(target_account uuid,target_stage text default 'any') returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.shadow_enrichment_jobs; r record; choice record; result jsonb;
 provider_name text; units integer; cap integer; new_token uuid:=gen_random_uuid(); until_at timestamptz; ctx jsonb;
begin
 perform private.require_recording_account(target_account);
 if target_stage='any' then
  for choice in select stage,min(due_at) due from private.shadow_enrichment_jobs where account_id=target_account and status='pending' group by stage order by min(due_at),stage loop
   result:=public.claim_shadow_enrichment(target_account,choice.stage);
   if result<>'{}'::jsonb then return result; end if;
  end loop;
  return '{}'::jsonb;
 end if;
 if target_stage is null or target_stage not in ('identity','tags','audio') then raise exception 'Invalid enrichment stage' using errcode='22023'; end if;
 if target_stage='identity' then
  select * into r from private.musicbrainz_rate where id for update skip locked;
  units:=1; cap:=100;
 else
  provider_name:=case when target_stage='tags' then 'lastfm' else 'acousticbrainz' end;
  select * into r from private.shadow_enrichment_rate where provider=provider_name for update skip locked;
  units:=case when target_stage='audio' then 2 else 1 end; cap:=200;
 end if;
 if not found then return '{}'::jsonb; end if;
 if r.lease_until>clock_timestamp() or r.next_at>clock_timestamp() then return '{}'::jsonb; end if;
 if r.day<>(clock_timestamp() at time zone 'UTC')::date then r.used:=0; end if;
 if r.used+units>cap then return '{}'::jsonb; end if;
 -- Terminalize crashed final attempts, with a short cooldown before readmission.
 update private.shadow_enrichment_jobs set status='invalid',outcome='{"status":"invalid"}',expires_at=least(clock_timestamp()+interval '1 day',to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000)),token=null,lease_until=null
 where account_id=target_account and stage=target_stage and status='pending' and attempts>=3 and lease_until<=clock_timestamp();
 for j in select * from private.shadow_enrichment_jobs where account_id=target_account and stage=target_stage and status='pending' and attempts<3
   and due_at<=clock_timestamp() and (lease_until is null or lease_until<=clock_timestamp())
   order by due_at,id limit 32 for update skip locked
 loop
  ctx:=private.shadow_enrichment_context(j.account_id,j.media_id);
  if ctx is null or ctx<>j.context then
   update private.shadow_enrichment_jobs set status='invalid',outcome=null,expires_at=clock_timestamp(),token=null,lease_until=null where id=j.id;
   continue;
  end if;
  until_at:=clock_timestamp()+interval '30 seconds';
  update private.shadow_enrichment_jobs set attempts=attempts+1,token=new_token,lease_until=until_at,claimed_at=clock_timestamp() where id=j.id;
  if target_stage='identity' then
   update private.musicbrainz_rate set token=new_token,lease_until=until_at,next_at=until_at+interval '1 second',used=r.used+units,day=(clock_timestamp() at time zone 'UTC')::date where id;
  else
   update private.shadow_enrichment_rate set token=new_token,lease_until=until_at,next_at=until_at+interval '1 second',used=r.used+units,day=(clock_timestamp() at time zone 'UTC')::date where provider=provider_name;
  end if;
  return jsonb_build_object('jobId',j.id,'token',new_token,'leaseUntil',until_at,'stage',j.stage,'snapshot',j.context->'snapshot','recording',j.recording);
 end loop;
 return '{}'::jsonb;
end $$;

create function private.valid_shadow_audio(data jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare pair record; c jsonb; v jsonb; n numeric;
begin
 if jsonb_typeof(data) is distinct from 'object' or
  data-array['bpm','key','scale','version','classifiers','submission']<>'{}'::jsonb or
  data->'submission' is distinct from '0'::jsonb or
  not(data ?& array['bpm','key','scale','version','classifiers','submission']) then return false; end if;
 if jsonb_typeof(data->'bpm') not in ('number','null') then return false; end if;
 if data->'bpm'<>'null'::jsonb and (data->>'bpm')::numeric not between 0.000001 and 500 then return false; end if;
 if data->'key'<>'null'::jsonb and (jsonb_typeof(data->'key') is distinct from 'string' or data->>'key'!~'^[A-G](#|b)?$') then return false; end if;
 if data->'scale'<>'null'::jsonb and (jsonb_typeof(data->'scale') is distinct from 'string' or data->>'scale' not in ('major','minor')) then return false; end if;
 if jsonb_typeof(data->'version') is distinct from 'object' or (data->'version')-array['low','high']<>'{}'::jsonb then return false; end if;
 foreach v in array array[data->'version'->'low',data->'version'->'high'] loop
  if jsonb_typeof(v) is distinct from 'object' or v='{}'::jsonb or octet_length(v::text)>4096 then return false; end if;
 end loop;
 if jsonb_typeof(data->'classifiers') is distinct from 'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(data->'classifiers'))>64 then return false; end if;
 for pair in select * from jsonb_each(data->'classifiers') loop
  c:=pair.value;
  if pair.key!~'^(genre_[a-z_]+|mood_[a-z_]+|danceability|voice_instrumental|tonal_atonal|timbre)$' or
   jsonb_typeof(c) is distinct from 'object' or c-array['value','probability','all','version']<>'{}'::jsonb or
   jsonb_typeof(c->'value') is distinct from 'string' or char_length(c->>'value') not between 1 and 100 or
   jsonb_typeof(c->'probability') is distinct from 'number' or
   jsonb_typeof(c->'all') is distinct from 'object' or jsonb_typeof(c->'version') is distinct from 'object' or
   c->'version'='{}'::jsonb or octet_length((c->'version')::text)>4096 then return false; end if;
  n:=(c->>'probability')::numeric;
  if n not between 0 and 1 or not(c->'all' ? (c->>'value')) or (select count(*) from jsonb_object_keys(c->'all'))>64 then return false; end if;
  for v in select value from jsonb_each(c->'all') loop
   if jsonb_typeof(v) is distinct from 'number' then return false; end if;
   if (v#>>'{}')::numeric not between 0 and 1 or (v#>>'{}')::numeric>n+0.001 then return false; end if;
  end loop;
  if abs((c->'all'->>(c->>'value'))::numeric-n)>0.001 then return false; end if;
 end loop;
 return true;
end $$;

create function public.complete_shadow_enrichment(job_id uuid,claim_token uuid,outcome jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare j private.shadow_enrichment_jobs; r record; provider_name text; state text; expires timestamptz; pause integer; ctx jsonb; core jsonb; k text;
begin
 select * into j from private.shadow_enrichment_jobs where id=job_id;
 if not found then return false; end if;
 if j.stage='identity' then select * into r from private.musicbrainz_rate where id for update;
 else
  provider_name:=case when j.stage='tags' then 'lastfm' else 'acousticbrainz' end;
  select * into r from private.shadow_enrichment_rate where provider=provider_name for update;
 end if;
 -- The account correction lock uses the existing correction writer's order.
 perform pg_advisory_xact_lock(hashtextextended('recording:'||j.account_id::text,0));
 select * into j from private.shadow_enrichment_jobs where id=job_id for update;
 if not found then return false; end if;
 ctx:=private.shadow_enrichment_context(j.account_id,j.media_id);
 if ctx is null or ctx<>j.context then
  update private.shadow_enrichment_jobs set status='invalid',outcome=null,expires_at=clock_timestamp(),token=null,lease_until=null where id=j.id;
  -- Keep provider cooldown/lease until expiry: an already running request must
  -- not permit another request early merely because its source became stale.
  return false;
 end if;
 if j.completed_token=claim_token and j.outcome=outcome and j.status='done' and j.expires_at>clock_timestamp() then return true; end if;
 if claim_token is null or j.token is distinct from claim_token or r.token is distinct from claim_token or j.lease_until<=clock_timestamp() or r.lease_until<=clock_timestamp() then return false; end if;
 if jsonb_typeof(outcome) is distinct from 'object' or octet_length(outcome::text)>65536 then raise exception 'Invalid shadow outcome' using errcode='22023'; end if;
 state:=outcome->>'status';
 if state is null or (j.stage='identity' and state not in ('provisional','unresolved','retry','invalid')) or
   (j.stage<>'identity' and state not in ('ready','missing','invalid','disabled','retry')) then raise exception 'Invalid shadow status' using errcode='22023'; end if;
 if outcome-(case state when 'provisional' then array['status','rule','recording'] when 'unresolved' then array['status','rule','reason'] when 'ready' then array['status','data'] when 'retry' then array['status','retrySeconds'] else array['status'] end)<>'{}'::jsonb then raise exception 'Unexpected shadow fields' using errcode='22023'; end if;
 if state in ('provisional','unresolved') and (jsonb_typeof(outcome->'rule') is distinct from 'string' or char_length(outcome->>'rule') not between 1 and 100) then raise exception 'Identity rule required' using errcode='22023'; end if;
 if state='unresolved' and (jsonb_typeof(outcome->'reason') is distinct from 'string' or char_length(outcome->>'reason') not between 1 and 100) then raise exception 'Unresolved reason required' using errcode='22023'; end if;
 if state='provisional' then
  core:=outcome->'recording';
  if jsonb_typeof(core) is distinct from 'object' or core-array['mbid','title','artistCredit','disambiguation','lengthMs']<>'{}'::jsonb or
   coalesce(core->>'mbid','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or
   jsonb_typeof(core->'title') is distinct from 'string' or char_length(btrim(core->>'title')) not between 1 and 200 or
   jsonb_typeof(core->'artistCredit') is distinct from 'string' or char_length(btrim(core->>'artistCredit')) not between 1 and 500 or
   jsonb_typeof(core->'disambiguation') is distinct from 'string' or char_length(core->>'disambiguation')>200 or
   jsonb_typeof(core->'lengthMs') is distinct from 'number' or (core->>'lengthMs')::numeric not between 1 and 86400000 or
   (core->>'lengthMs')::numeric<>trunc((core->>'lengthMs')::numeric) then raise exception 'Invalid provisional recording' using errcode='22023'; end if;
 end if;
 if state='ready' and j.stage='tags' then
  if jsonb_typeof(outcome->'data') is distinct from 'array' then raise exception 'Invalid tags' using errcode='22023'; end if;
  if jsonb_array_length(outcome->'data')>20 or exists(select 1 from jsonb_array_elements(outcome->'data') v where jsonb_typeof(v) is distinct from 'string' or char_length(btrim(v#>>'{}')) not between 1 and 100) then raise exception 'Invalid tags' using errcode='22023'; end if;
 end if;
 if state='ready' and j.stage='audio' and not private.valid_shadow_audio(outcome->'data') then raise exception 'Invalid audio evidence' using errcode='22023'; end if;
 pause:=case when state='retry' then greatest(60,least(86400,coalesce((outcome->>'retrySeconds')::integer,60))) else 2 end;
 expires:=least(to_timestamp((ctx->'snapshot'->>'expiresAt')::double precision/1000),clock_timestamp()+case when state in ('invalid','disabled','retry') then interval '1 day' else interval '30 days' end);
 update private.shadow_enrichment_jobs set status=case when state='retry' and j.attempts<3 then 'pending' else 'done' end,
  outcome=complete_shadow_enrichment.outcome,completed_token=claim_token,fetched_at=j.claimed_at,expires_at=expires,due_at=clock_timestamp()+make_interval(secs=>pause),token=null,lease_until=null where id=j.id;
 if state='provisional' then
  foreach k in array array['tags','audio'] loop
   insert into private.shadow_enrichment_jobs(account_id,media_id,stage,context,recording)
   values(j.account_id,j.media_id,k,j.context,core) on conflict(account_id,media_id,stage) do nothing;
  end loop;
 end if;
 if j.stage='identity' then update private.musicbrainz_rate set token=null,lease_until=null,next_at=clock_timestamp()+make_interval(secs=>pause) where id;
 else update private.shadow_enrichment_rate set token=null,lease_until=null,next_at=clock_timestamp()+make_interval(secs=>pause) where provider=provider_name;
 end if;
 return true;
end $$;

create function public.read_shadow_enrichment(target_account uuid,source_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb; j private.shadow_enrichment_jobs; result jsonb:='{"mode":"shadow","provenance":{}}'::jsonb; expires timestamptz;
begin
 perform private.require_recording_account(target_account);
 ctx:=private.shadow_enrichment_context(target_account,source_id);
 if ctx is null then return '{}'::jsonb; end if;
 for j in select * from private.shadow_enrichment_jobs where account_id=target_account and media_id=source_id and context=ctx and status='done' and expires_at>clock_timestamp() and outcome is not null loop
  result:=result||jsonb_build_object(j.stage,j.outcome);
  result:=jsonb_set(result,array['provenance',j.stage],jsonb_build_object('provider',case j.stage when 'identity' then 'musicbrainz' when 'tags' then 'lastfm' else 'acousticbrainz' end,'fetchedAt',extract(epoch from j.fetched_at)*1000,'expiresAt',extract(epoch from j.expires_at)*1000));
  expires:=least(expires,j.expires_at);
 end loop;
 if not(result ? 'identity') then return '{}'::jsonb; end if;
 return result||jsonb_build_object('expiresAt',extract(epoch from expires)*1000);
end $$;

-- Maintenance is independent of pilot activation. Delete the source-bearing
-- payload at its provider metadata expiry, including incomplete/crashed jobs.
create function public.prune_shadow_enrichment() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from private.shadow_enrichment_jobs where id in (
  select id from private.shadow_enrichment_jobs
  where to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000)<=clock_timestamp()
  order by id limit 512 for update skip locked
 );
 get diagnostics n=row_count;
 return n;
end $$;

revoke all on function private.shadow_enrichment_context(uuid,text),private.valid_shadow_audio(jsonb),public.enqueue_shadow_enrichment(uuid,text),public.enqueue_shadow_enrichment_batch(uuid,integer),public.claim_shadow_enrichment(uuid,text),public.complete_shadow_enrichment(uuid,uuid,jsonb),public.read_shadow_enrichment(uuid,text),public.prune_shadow_enrichment() from public,anon,authenticated;
grant execute on function public.enqueue_shadow_enrichment(uuid,text),public.enqueue_shadow_enrichment_batch(uuid,integer),public.claim_shadow_enrichment(uuid,text),public.complete_shadow_enrichment(uuid,uuid,jsonb),public.read_shadow_enrichment(uuid,text),public.prune_shadow_enrichment() to service_role;
