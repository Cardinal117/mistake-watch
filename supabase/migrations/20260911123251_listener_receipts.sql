-- Private account-subject listening receipts. No provider metadata or media bytes.
-- Only trusted runtime delivery may ingest; browser roles have no table/RPC access.
create table private.listener_receipts (
 account_id uuid not null references auth.users(id) on delete cascade,
 room_id uuid not null references public.rooms(id) on delete cascade,
 member_id uuid not null references public.room_members(id) on delete cascade,
 occurrence_id uuid not null, consent_epoch uuid not null, history_generation bigint not null check(history_generation>=0),
 source_type text not null check(source_type in('direct','hls','uploaded')),
 source_id text not null check(length(source_id) between 1 and 128),
 room_kind text not null check(room_kind in('personal','themed','shared')),
 duration_seconds integer not null check(duration_seconds between 1 and 21600),
 coverage jsonb not null check(jsonb_typeof(coverage)='array' and jsonb_array_length(coverage) between 1 and 128),
 coverage_ratio_bps integer not null check(coverage_ratio_bps between 9000 and 10000),
 first_observed_at timestamptz not null, last_observed_at timestamptz not null,
 methodology_version integer not null default 1 check(methodology_version=1),
 learning_policy_version integer not null default 2 check(learning_policy_version=2),
 created_at timestamptz not null default now(),
 primary key(account_id,occurrence_id,consent_epoch,history_generation),
 check(last_observed_at>=first_observed_at)
);
create index listener_receipts_account_source_time on private.listener_receipts(account_id,source_id,last_observed_at desc);
create index listener_receipts_expiry on private.listener_receipts(last_observed_at);
create index listener_receipts_room on private.listener_receipts(room_id);
create index listener_receipts_member on private.listener_receipts(member_id);
alter table private.listener_receipts enable row level security;
revoke all on private.listener_receipts from public,anon,authenticated;
grant select,insert,delete on private.listener_receipts to service_role;

create function private.listener_coverage_ratio(coverage jsonb,duration integer) returns integer
language plpgsql immutable set search_path='' as $$
declare pair jsonb; start_pos numeric; end_pos numeric; previous_end numeric:=-1; covered numeric:=0;
begin
 if duration is null or duration not between 1 and 21600 or jsonb_typeof(coverage)<>'array' or jsonb_array_length(coverage) not between 1 and 128 then return null;end if;
 for pair in select value from jsonb_array_elements(coverage) loop
  if jsonb_typeof(pair)<>'array' or jsonb_array_length(pair)<>2 or jsonb_typeof(pair->0)<>'number' or jsonb_typeof(pair->1)<>'number' then return null;end if;
  start_pos:=(pair->>0)::numeric;end_pos:=(pair->>1)::numeric;
  if start_pos<0 or end_pos>duration or end_pos<=start_pos or start_pos<previous_end then return null;end if;
  covered:=covered+end_pos-start_pos;previous_end:=end_pos;
 end loop;
 return floor(covered/duration*10000)::integer;
end $$;

create function private.ingest_listener_receipts(receipt_batch jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; subject uuid; room uuid; member uuid; occurrence uuid; epoch uuid; generation bigint;
 source_kind text; source text; duration integer; ratio integer; first_at timestamptz; last_at timestamptz;
 context jsonb; inserted_count integer:=0; rejected_count integer:=0; changed integer;
begin
 if jsonb_typeof(receipt_batch)<>'array' or jsonb_array_length(receipt_batch)>100 then raise exception 'Invalid listener receipt batch' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(receipt_batch) loop
  source_kind:=item->>'sourceType';source:=item->>'sourceId';
  -- Measurement-origin gate remains conservative; a future YouTube adapter needs separate review.
  if source_kind not in('direct','hls','uploaded') or source_kind is null or source is null or
   (source_kind in('direct','hls') and source !~ '^[a-f0-9]{64}$') or
   (source_kind='uploaded' and source !~ '^[a-fA-F0-9-]{36}$') then rejected_count:=rejected_count+1;continue;end if;
  begin
   subject:=(item->>'accountId')::uuid;room:=(item->>'roomId')::uuid;member:=(item->>'memberId')::uuid;
   occurrence:=(item->>'occurrenceId')::uuid;epoch:=(item->>'consentEpoch')::uuid;generation:=(item->>'historyGeneration')::bigint;
   duration:=(item->>'durationSeconds')::integer;first_at:=(item->>'firstObservedAt')::timestamptz;last_at:=(item->>'lastObservedAt')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
   rejected_count:=rejected_count+1;continue;
  end;
  ratio:=private.listener_coverage_ratio(item->'coverage',duration);
  if subject is null or room is null or member is null or occurrence is null or epoch is null or generation is null or generation<0 or
   ratio is null or ratio<9000 or first_at is null or last_at is null or first_at<now()-interval '7 days' or last_at>clock_timestamp()+interval '5 seconds' or
   last_at<first_at or extract(epoch from last_at-first_at)*4 < duration*ratio/10000.0 or
   item->>'methodologyVersion' is distinct from '1' then rejected_count:=rejected_count+1;continue;end if;
  -- Same transaction/locks as consent revoke and history clear. Check both interval bounds.
  context:=private.check_listener_learning_context(room,member,subject,first_at,epoch,generation);
  if not coalesce((context->>'allowed')::boolean,false) or
   not coalesce((private.check_listener_learning_context(room,member,subject,last_at,epoch,generation)->>'allowed')::boolean,false)
   then rejected_count:=rejected_count+1;continue;end if;
  insert into private.listener_receipts(account_id,room_id,member_id,occurrence_id,consent_epoch,history_generation,
   source_type,source_id,room_kind,duration_seconds,coverage,coverage_ratio_bps,first_observed_at,last_observed_at)
  values(subject,room,member,occurrence,epoch,generation,source_kind,source,context->>'roomKind',duration,item->'coverage',ratio,first_at,last_at)
  on conflict(account_id,occurrence_id,consent_epoch,history_generation) do nothing;
  get diagnostics changed=row_count;inserted_count:=inserted_count+changed;
 end loop;
 return jsonb_build_object('received',jsonb_array_length(receipt_batch),'inserted',inserted_count,'rejected',rejected_count);
end $$;
create function public.ingest_listener_receipts(receipt_batch jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.ingest_listener_receipts(receipt_batch)$$;

create function private.read_account_listening_counts(target_account uuid,source_ids text[] default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if source_ids is not null and cardinality(source_ids)>200 then raise exception 'At most 200 sources per count lookup' using errcode='22023';end if;
 with candidates as materialized (
  select r.* from private.listener_receipts r where r.account_id=target_account and r.last_observed_at>=now()-interval '180 days'
   and (source_ids is null or r.source_id=any(source_ids))
 ), scopes as materialized (
  select room_id,member_id,consent_epoch,history_generation,min(first_observed_at) first_at from candidates group by 1,2,3,4
 ), contexts as materialized (
  select s.*,private.check_listener_learning_history_context(s.room_id,s.member_id,target_account,s.first_at,s.consent_epoch,s.history_generation) context from scopes s
 ), eligible as materialized (
  select c.* from candidates c join contexts x using(room_id,member_id,consent_epoch,history_generation)
  where coalesce((x.context->>'allowed')::boolean,false) and c.first_observed_at>=(x.context->>'validFrom')::timestamptz
 ), occurrences as (
  select distinct on(occurrence_id) * from eligible order by occurrence_id,last_observed_at
 ), grouped as (
  select source_type,source_id,count(*) completed_count,max(last_observed_at) last_at,
   jsonb_build_object('personal',count(*) filter(where room_kind='personal'),'themed',count(*) filter(where room_kind='themed'),'shared',count(*) filter(where room_kind='shared')) room_counts
  from occurrences group by source_type,source_id
 ) select jsonb_build_object('methodologyVersion',1,'scope','account_listener','windowDays',180,
  'coverageStartedAt',(select min(first_observed_at) from eligible),
  'items',coalesce((select jsonb_agg(jsonb_build_object('sourceType',source_type,'sourceId',source_id,'completedPlayCount',completed_count,'lastCompletedAt',last_at,'roomCounts',room_counts) order by completed_count desc,source_id) from grouped),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.read_account_listening_counts(target_account uuid,source_ids text[] default null) returns jsonb
language sql security invoker set search_path='' as $$select private.read_account_listening_counts(target_account,source_ids)$$;

create function public.prune_listener_receipts() returns integer language plpgsql security invoker set search_path='' as $$
declare removed integer;begin delete from private.listener_receipts where last_observed_at<now()-interval '180 days';get diagnostics removed=row_count;return removed;end $$;
revoke all on function private.listener_coverage_ratio(jsonb,integer),private.ingest_listener_receipts(jsonb),public.ingest_listener_receipts(jsonb),
 private.read_account_listening_counts(uuid,text[]),public.read_account_listening_counts(uuid,text[]),public.prune_listener_receipts() from public,anon,authenticated;
grant execute on function private.listener_coverage_ratio(jsonb,integer),private.ingest_listener_receipts(jsonb),public.ingest_listener_receipts(jsonb),
 private.read_account_listening_counts(uuid,text[]),public.read_account_listening_counts(uuid,text[]),public.prune_listener_receipts() to service_role;
