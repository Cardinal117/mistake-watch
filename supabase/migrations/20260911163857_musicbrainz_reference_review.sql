-- Non-commercial, explicit recording-reference pilot. No title search or tags.
alter table private.recording_references add column musicbrainz_recording_id uuid;
create table private.musicbrainz_jobs (
 mbid uuid primary key, status text not null default 'pending' check(status in ('pending','ready','invalid','not_found')),
 attempts int not null default 0 check(attempts between 0 and 3), due_at timestamptz not null default now(),
 token uuid, lease_until timestamptz, core jsonb, fetched_at timestamptz, expires_at timestamptz,
 requested_at timestamptz not null default now(),
 check(core is null or octet_length(core::text)<=4096)
);
create table private.musicbrainz_selections (
 account_id uuid not null references auth.users on delete cascade,
 media_id text not null references private.music_catalogue_sources on delete cascade,
 mbid uuid not null references private.musicbrainz_jobs,
 selection_id uuid not null default gen_random_uuid(), created_at timestamptz not null default now(),
 primary key(account_id,media_id)
);
create index musicbrainz_jobs_pending_idx on private.musicbrainz_jobs(due_at,mbid) where status='pending' and attempts<3;
create index musicbrainz_selections_media_idx on private.musicbrainz_selections(media_id);
create index musicbrainz_selections_mbid_idx on private.musicbrainz_selections(mbid);
create table private.musicbrainz_rate (
 id boolean primary key default true check(id), next_at timestamptz not null default now(),
 day date not null default (now() at time zone 'UTC')::date, used int not null default 0 check(used between 0 and 100),
 token uuid, lease_until timestamptz
);
insert into private.musicbrainz_rate(id) values(true);
alter table private.musicbrainz_jobs enable row level security;
alter table private.musicbrainz_selections enable row level security;
alter table private.musicbrainz_rate enable row level security;
revoke all on private.musicbrainz_jobs,private.musicbrainz_selections,private.musicbrainz_rate from public,anon,authenticated,service_role;

create function public.queue_musicbrainz_reference(target_account uuid,source_id text,recording_mbid uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.musicbrainz_jobs;
begin
 perform private.require_recording_account(target_account);
 if recording_mbid is null or not exists(select 1 from private.catalogue_owner_evidence(target_account) e join private.music_catalogue_sources s on s.media_id=e.media_id where e.media_id=source_id) then raise exception 'Eligible source required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('musicbrainz-queue',0));
 delete from private.musicbrainz_selections where created_at<now()-interval '90 days';
 delete from private.musicbrainz_jobs old_job where old_job.requested_at<now()-interval '90 days' and not exists(select 1 from private.musicbrainz_selections selection where selection.mbid=old_job.mbid);
 if not exists(select 1 from private.musicbrainz_selections where account_id=target_account and media_id=source_id) and (select count(*) from private.musicbrainz_selections where account_id=target_account)>=128 then raise exception 'Reference capacity reached' using errcode='54000'; end if;
 if not exists(select 1 from private.musicbrainz_jobs where mbid=recording_mbid) and (select count(*) from private.musicbrainz_jobs)>=4096 then raise exception 'Lookup capacity reached' using errcode='54000'; end if;
 insert into private.musicbrainz_jobs(mbid) values(recording_mbid) on conflict do nothing;
 select * into j from private.musicbrainz_jobs where mbid=recording_mbid for update;
 if (j.status='ready' and j.expires_at<=now()) or (j.status<>'ready' and (j.attempts>=3 or j.status in ('invalid','not_found')) and j.requested_at<now()-interval '1 day') then
  update private.musicbrainz_jobs set status='pending',attempts=0,due_at=now(),core=null,token=null,lease_until=null,requested_at=now() where mbid=recording_mbid;
  j.status:='pending';
 end if;
 insert into private.musicbrainz_selections(account_id,media_id,mbid) values(target_account,source_id,recording_mbid)
 on conflict(account_id,media_id) do update set mbid=excluded.mbid,selection_id=gen_random_uuid(),created_at=now() where musicbrainz_selections.mbid<>excluded.mbid;
 return jsonb_build_object('status',j.status);
end $$;

create function public.claim_musicbrainz_lookup() returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.musicbrainz_rate; j private.musicbrainz_jobs; claim_token uuid:=gen_random_uuid();
begin
 select * into r from private.musicbrainz_rate where id for update;
 update private.musicbrainz_jobs set status='invalid',token=null,lease_until=null where status='pending' and attempts>=3 and lease_until<=clock_timestamp();
 if r.lease_until>clock_timestamp() or r.next_at>clock_timestamp() then return '{}'::jsonb; end if;
 if r.day<>(now() at time zone 'UTC')::date then r.used:=0; end if;
 if r.used>=100 then return '{}'::jsonb; end if;
 select * into j from private.musicbrainz_jobs candidate where candidate.status='pending' and candidate.attempts<3 and candidate.due_at<=now() and (candidate.lease_until is null or candidate.lease_until<=clock_timestamp())
 and exists(select 1 from private.musicbrainz_selections s cross join lateral private.catalogue_owner_evidence(s.account_id) e where s.mbid=candidate.mbid and e.media_id=s.media_id)
 order by candidate.due_at,candidate.mbid limit 1 for update skip locked;
 if not found then return '{}'::jsonb; end if;
 update private.musicbrainz_jobs set token=claim_token,lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1 where mbid=j.mbid;
 update private.musicbrainz_rate set token=claim_token,lease_until=clock_timestamp()+interval '30 seconds',next_at=clock_timestamp()+interval '31 seconds',day=(now() at time zone 'UTC')::date,used=r.used+1 where id;
 return jsonb_build_object('mbid',j.mbid,'token',claim_token,'leaseUntil',clock_timestamp()+interval '30 seconds');
end $$;

create function public.complete_musicbrainz_lookup(claim_token uuid,recording_mbid uuid,outcome jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare r private.musicbrainz_rate; j private.musicbrainz_jobs; c jsonb; state text; pause int;
begin
 select * into r from private.musicbrainz_rate where id for update;
 if claim_token is null or r.token is distinct from claim_token or r.lease_until<=clock_timestamp() then return false; end if;
 select * into j from private.musicbrainz_jobs where mbid=recording_mbid for update;
 if not found or j.token is distinct from claim_token or j.lease_until<=clock_timestamp() then return false; end if;
 state:=outcome->>'status'; c:=outcome->'core';
 if state='ready' and (jsonb_typeof(c->'title') is distinct from 'string' or jsonb_typeof(c->'artistCredit') is distinct from 'string' or jsonb_typeof(c->'disambiguation') is distinct from 'string' or jsonb_typeof(c->'lengthMs') not in ('number','null')) then raise exception 'Invalid core field types' using errcode='22023'; end if;
 if state not in ('ready','retry','not_found','invalid') or state is null then raise exception 'Invalid outcome' using errcode='22023'; end if;
 if state='ready' and (jsonb_typeof(c) is distinct from 'object' or c-array['mbid','title','artistCredit','disambiguation','lengthMs']<>'{}'::jsonb or c->>'mbid' is distinct from recording_mbid::text or coalesce(char_length(btrim(c->>'title')),0) not between 1 and 200 or coalesce(char_length(c->>'artistCredit'),501)>500 or coalesce(char_length(c->>'disambiguation'),201)>200 or (c->>'lengthMs' is not null and (c->>'lengthMs')::bigint not between 0 and 86400000)) then raise exception 'Invalid core data' using errcode='22023'; end if;
 pause:=case when state='retry' then greatest(60,least(86400,coalesce((outcome->>'retrySeconds')::int,60))) else 2 end;
 update private.musicbrainz_jobs set status=case when state='retry' then case when j.attempts>=3 then 'invalid' else 'pending' end else state end,
 core=case when state='ready' then c else null end,fetched_at=case when state='ready' then now() else null end,expires_at=case when state='ready' then now()+interval '30 days' else null end,
 due_at=clock_timestamp()+make_interval(secs=>pause),token=null,lease_until=null where mbid=recording_mbid;
 update private.musicbrainz_rate set token=null,lease_until=null,next_at=clock_timestamp()+make_interval(secs=>pause) where id;
 return true;
end $$;

create function public.read_musicbrainz_review(target_account uuid,source_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_recording_account(target_account);
 if not exists(select 1 from private.catalogue_owner_evidence(target_account) e where e.media_id=source_id) then raise exception 'Eligible source required' using errcode='42501'; end if;
 select jsonb_build_object('selectionId',s.selection_id,'mbid',j.mbid,'status',case when j.status='ready' and j.expires_at<=now() then 'expired' when j.status='pending' and j.attempts>=3 and j.lease_until<=now() then 'invalid' else j.status end,
 'core',case when j.expires_at>now() then j.core else null end,'fetchedAt',j.fetched_at,'expiresAt',j.expires_at,'revision',coalesce(l.revision,0),'linkStatus',coalesce(l.status,'unresolved'),'currentSelectionLinked',coalesce(l.recording_id=s.selection_id and l.status='accepted',false)) into result
 from private.musicbrainz_selections s join private.musicbrainz_jobs j on j.mbid=s.mbid left join private.recording_source_links l on l.account_id=s.account_id and l.media_id=s.media_id where s.account_id=target_account and s.media_id=source_id;
 if result is null then select jsonb_build_object('status','none','revision',coalesce((select revision from private.recording_source_links where account_id=target_account and media_id=source_id),0),'linkStatus',coalesce((select status from private.recording_source_links where account_id=target_account and media_id=source_id),'unresolved')) into result; end if;
 return result;
end $$;

create function public.confirm_musicbrainz_reference(target_account uuid,source_id text,selection uuid,expected_revision bigint,operation_id uuid,exact_version boolean,expected_fetched_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s private.musicbrainz_selections; j private.musicbrainz_jobs; result jsonb;
begin
 perform private.require_recording_account(target_account);
 if exact_version is distinct from true then raise exception 'Exact version confirmation required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('musicbrainz-queue',0));
 select * into s from private.musicbrainz_selections where account_id=target_account and media_id=source_id and selection_id=selection;
 if not found then raise exception 'Reference changed' using errcode='40001'; end if;
 select * into j from private.musicbrainz_jobs where mbid=s.mbid;
 if j.status<>'ready' or j.expires_at<=now() or j.core is null or j.fetched_at is distinct from expected_fetched_at then raise exception 'Fresh recording evidence required' using errcode='40001'; end if;
 perform public.enter_recording_reference(target_account,s.selection_id,'Owner-confirmed MusicBrainz recording','owner:musicbrainz-recording/'||j.mbid::text);
 update private.recording_references set musicbrainz_recording_id=j.mbid where account_id=target_account and id=s.selection_id;
 result:=public.revise_recording_link(target_account,source_id,s.selection_id,expected_revision,operation_id,'accepted','owner:musicbrainz-recording/'||j.mbid::text);
 return result;
end $$;
revoke all on function public.queue_musicbrainz_reference(uuid,text,uuid),public.claim_musicbrainz_lookup(),public.complete_musicbrainz_lookup(uuid,uuid,jsonb),public.read_musicbrainz_review(uuid,text),public.confirm_musicbrainz_reference(uuid,text,uuid,bigint,uuid,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.queue_musicbrainz_reference(uuid,text,uuid),public.claim_musicbrainz_lookup(),public.complete_musicbrainz_lookup(uuid,uuid,jsonb),public.read_musicbrainz_review(uuid,text),public.confirm_musicbrainz_reference(uuid,text,uuid,bigint,uuid,boolean,timestamptz) to service_role;
