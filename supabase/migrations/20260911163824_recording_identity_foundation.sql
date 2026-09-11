-- Stage 2a/b: private independently entered performance/version references.
-- No provider metadata, inferred tags, global publication or browser RPC access.
create table private.recording_references (
 account_id uuid not null references auth.users on delete cascade,
 id uuid not null,
 display_identity text not null check(char_length(btrim(display_identity)) between 1 and 200),
 evidence_reference text not null check(char_length(evidence_reference) between 7 and 256 and evidence_reference like 'owner:%' and substring(evidence_reference from 7) ~ '[^[:space:]]'),
 created_at timestamptz not null default now(),
 primary key(account_id,id)
);
-- Heads are also correction tombstones: no source FK so expiry/re-registration
-- cannot reset revisions. Reads require the current source registry separately.
create table private.recording_source_links (
 account_id uuid not null references auth.users on delete cascade,
 media_id text not null check(media_id ~ '^[A-Za-z0-9_-]{6,64}$'),
 recording_id uuid,
 status text not null check(status in ('accepted','disputed','unresolved')),
 revision bigint not null check(revision between 1 and 9007199254740991),
 evidence_reference text not null check(char_length(evidence_reference) between 7 and 256 and evidence_reference like 'owner:%' and substring(evidence_reference from 7) ~ '[^[:space:]]'),
 primary key(account_id,media_id),
 foreign key(account_id,recording_id) references private.recording_references(account_id,id),
 check((status='unresolved' and recording_id is null) or (status<>'unresolved' and recording_id is not null))
);
create index recording_source_links_recording_idx on private.recording_source_links(account_id,recording_id);
create table private.recording_link_revisions (
 account_id uuid not null references auth.users on delete cascade,
 operation_id uuid not null,
 media_id text not null,
 revision bigint not null,
 request jsonb not null check(octet_length(request::text)<=2048),
 created_at timestamptz not null default now(),
 primary key(account_id,operation_id),
 unique(account_id,media_id,revision)
);
create table private.recording_assertions (
 account_id uuid not null,
 recording_id uuid not null,
 id uuid not null,
 facet text not null check(facet in ('genre','mood','instrumentation','theme')),
 value text not null check(char_length(btrim(value)) between 1 and 64),
 polarity text not null check(polarity in ('supports','excludes')),
 status text not null check(status in ('accepted','disputed','withdrawn')),
 origin text not null check(origin='owner_reference'),
 evidence_reference text not null check(char_length(evidence_reference) between 7 and 256 and evidence_reference like 'owner:%' and substring(evidence_reference from 7) ~ '[^[:space:]]'),
 license text not null check(license='owner-authored-private'),
 reviewed_at timestamptz not null check(reviewed_at<=now()),
 expires_at timestamptz not null,
 revision bigint not null default 1 check(revision between 1 and 9007199254740991),
 primary key(account_id,id),
 foreign key(account_id,recording_id) references private.recording_references(account_id,id) on delete cascade,
 check(expires_at>reviewed_at and expires_at<=reviewed_at+interval '180 days')
);
create index recording_assertions_subject_idx on private.recording_assertions(account_id,recording_id);
alter table private.recording_references enable row level security;
alter table private.recording_source_links enable row level security;
alter table private.recording_link_revisions enable row level security;
alter table private.recording_assertions enable row level security;
revoke all on private.recording_references,private.recording_source_links,private.recording_link_revisions,private.recording_assertions from public,anon,authenticated,service_role;

create function private.require_recording_account(target_account uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=target_account and u.is_anonymous is false and p.account_status='active') then raise exception 'Active account required' using errcode='42501'; end if;
end $$;

create function public.enter_recording_reference(target_account uuid,recording_id uuid,display_identity text,evidence_reference text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.recording_references;
begin
 perform private.require_recording_account(target_account);
 insert into private.recording_references(account_id,id,display_identity,evidence_reference)
 values(target_account,recording_id,display_identity,evidence_reference) on conflict do nothing;
 select * into r from private.recording_references where account_id=target_account and id=recording_id;
 if r.display_identity is distinct from display_identity or r.evidence_reference is distinct from evidence_reference then raise exception 'Reference identity conflict' using errcode='22023'; end if;
 return jsonb_build_object('id',r.id);
end $$;

create function public.revise_recording_link(target_account uuid,source_id text,recording_id uuid,expected_revision bigint,operation_id uuid,link_status text,evidence_reference text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare h private.recording_source_links; prior private.recording_link_revisions; payload jsonb; next_revision bigint;
begin
 perform private.require_recording_account(target_account);
 if expected_revision is null or expected_revision<0 or expected_revision>=9007199254740991 or operation_id is null or source_id is null then raise exception 'Invalid revision request' using errcode='22023'; end if;
 -- Per-account serialization also fences request IDs reused across different sources.
 perform pg_advisory_xact_lock(hashtextextended('recording:'||target_account::text,0));
 payload:=jsonb_build_object('source',source_id,'recording',recording_id,'expected',expected_revision,'status',link_status,'reference',evidence_reference);
 select * into prior from private.recording_link_revisions r where r.account_id=target_account and r.operation_id=revise_recording_link.operation_id;
 if found then
  if prior.request<>payload then raise exception 'Operation payload conflict' using errcode='22023'; end if;
  return jsonb_build_object('revision',prior.revision,'replayed',true);
 end if;
 if not exists(select 1 from private.music_catalogue_sources where media_id=source_id) then raise exception 'Current catalogue source required' using errcode='22023'; end if;
 if recording_id is not null and not exists(select 1 from private.recording_references r where r.account_id=target_account and r.id=recording_id) then raise exception 'Private recording unavailable' using errcode='42501'; end if;
 if not exists(select 1 from private.catalogue_owner_evidence(target_account) e where e.media_id=source_id) then raise exception 'Eligible account source required' using errcode='42501'; end if;
 select * into h from private.recording_source_links where account_id=target_account and media_id=source_id;
 if coalesce(h.revision,0)<>expected_revision then raise exception 'Recording link revision changed' using errcode='40001'; end if;
 next_revision:=expected_revision+1;
 insert into private.recording_source_links as l(account_id,media_id,recording_id,status,revision,evidence_reference)
 values(target_account,source_id,recording_id,link_status,next_revision,evidence_reference)
 on conflict(account_id,media_id) do update set recording_id=excluded.recording_id,status=excluded.status,revision=excluded.revision,evidence_reference=excluded.evidence_reference;
 insert into private.recording_link_revisions values(target_account,operation_id,source_id,next_revision,payload,now());
 return jsonb_build_object('revision',next_revision,'replayed',false);
end $$;
revoke all on function private.require_recording_account(uuid), public.enter_recording_reference(uuid,uuid,text,text),public.revise_recording_link(uuid,text,uuid,bigint,uuid,text,text) from public,anon,authenticated;
grant execute on function public.enter_recording_reference(uuid,uuid,text,text),public.revise_recording_link(uuid,text,uuid,bigint,uuid,text,text) to service_role;

create function public.revise_recording_assertion(target_account uuid,assertion_id uuid,expected_revision bigint,assertion jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a private.recording_assertions; rid uuid; next_revision bigint;
begin
 perform private.require_recording_account(target_account);
 if assertion_id is null or expected_revision is null or expected_revision<0 or expected_revision>=9007199254740991 or jsonb_typeof(assertion) is distinct from 'object' or octet_length(assertion::text)>2048 or assertion - array['recordingId','facet','value','polarity','status','reference','reviewedAt','expiresAt']<>'{}'::jsonb then raise exception 'Invalid assertion' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('recording:'||target_account::text,0));
 rid:=(assertion->>'recordingId')::uuid;
 if not exists(select 1 from private.recording_references r where r.account_id=target_account and r.id=rid) then raise exception 'Private recording unavailable' using errcode='42501'; end if;
 select * into a from private.recording_assertions where account_id=target_account and id=assertion_id;
 if coalesce(a.revision,0)<>expected_revision then raise exception 'Assertion revision changed' using errcode='40001'; end if;
 if a.id is not null and a.recording_id<>rid then raise exception 'Assertion subject cannot change' using errcode='22023'; end if;
 if a.id is null and (select count(*) from private.recording_assertions where account_id=target_account and recording_id=rid)>=64 then raise exception 'Assertion capacity reached' using errcode='54000'; end if;
 next_revision:=expected_revision+1;
 insert into private.recording_assertions(account_id,recording_id,id,facet,value,polarity,status,origin,evidence_reference,license,reviewed_at,expires_at,revision)
 values(target_account,rid,assertion_id,assertion->>'facet',assertion->>'value',assertion->>'polarity',assertion->>'status','owner_reference',assertion->>'reference','owner-authored-private',(assertion->>'reviewedAt')::timestamptz,(assertion->>'expiresAt')::timestamptz,next_revision)
 on conflict(account_id,id) do update set facet=excluded.facet,value=excluded.value,polarity=excluded.polarity,status=excluded.status,evidence_reference=excluded.evidence_reference,reviewed_at=excluded.reviewed_at,expires_at=excluded.expires_at,revision=excluded.revision;
 return jsonb_build_object('revision',next_revision);
end $$;

create function public.read_recording_evidence(target_account uuid,source_ids text[]) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_recording_account(target_account);
 if source_ids is null or cardinality(source_ids)>96 then raise exception 'Invalid source window' using errcode='22023'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('sourceId',l.media_id,'recordingId',l.recording_id,'revision',l.revision,'status',l.status,
 'complete',ev.total<=64,'assertions',case when ev.total<=64 then ev.rows else '[]'::jsonb end) order by l.media_id),'[]'::jsonb) into result
 from private.recording_source_links l join private.music_catalogue_sources s on s.media_id=l.media_id
 join private.catalogue_owner_evidence(target_account) own on own.media_id=l.media_id
 cross join lateral (select count(*) total,coalesce(jsonb_agg(to_jsonb(a)-'account_id' order by a.id),'[]'::jsonb) rows from private.recording_assertions a where a.account_id=target_account and a.recording_id=l.recording_id) ev
 where l.account_id=target_account and l.media_id=any(source_ids);
 return jsonb_build_object('links',result);
end $$;
revoke all on function public.revise_recording_assertion(uuid,uuid,bigint,jsonb),public.read_recording_evidence(uuid,text[]) from public,anon,authenticated;
grant execute on function public.revise_recording_assertion(uuid,uuid,bigint,jsonb),public.read_recording_evidence(uuid,text[]) to service_role;
