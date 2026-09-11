-- Preserve completion, lease and context fences; extend only bounded tag diagnostics.
create or replace function public.complete_shadow_enrichment(job_id uuid,claim_token uuid,outcome jsonb) returns boolean
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
 if outcome-(case state when 'provisional' then array['status','rule','recording'] when 'unresolved' then array['status','rule','reason'] when 'ready' then array['status','data'] when 'retry' then array['status','retrySeconds'] when 'invalid' then array['status','reason'] when 'missing' then array['status','reason'] else array['status'] end)<>'{}'::jsonb then raise exception 'Unexpected shadow fields' using errcode='22023'; end if;
 -- Only fixed Last.fm diagnostic codes; never raw provider messages or payloads.
 if state in ('invalid','missing') and outcome ? 'reason' and (
  j.stage<>'tags' or jsonb_typeof(outcome->'reason') is distinct from 'string' or
  (state='invalid' and outcome->>'reason' not in ('malformed-track','title-mismatch','artist-mismatch','mbid-mismatch','malformed-duration','duration-mismatch','malformed-tags','http-error','malformed-response')) or
  (state='missing' and outcome->>'reason' not in ('no-tags','track-not-found'))
 ) then raise exception 'Invalid tag diagnostic' using errcode='22023'; end if;
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
