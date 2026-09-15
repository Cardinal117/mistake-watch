-- Coordinate physical retention work across request-triggered and scheduled
-- workers. Reads continue to enforce expiry independently of this schedule.
create table private.catalogue_maintenance_state (
 singleton boolean primary key default true check(singleton),
 next_due_at timestamptz not null default '-infinity',
 last_completed_at timestamptz,
 last_catalogue_deleted integer not null default 0 check(last_catalogue_deleted>=0),
 last_shadow_deleted integer not null default 0 check(last_shadow_deleted>=0),
 updated_at timestamptz not null default clock_timestamp()
);
insert into private.catalogue_maintenance_state(singleton) values(true);
alter table private.catalogue_maintenance_state enable row level security;
revoke all on private.catalogue_maintenance_state from public,anon,authenticated,service_role;
grant select,update on private.catalogue_maintenance_state to service_role;

-- Keep the existing shadow cleanup's 512-row contract stable under planner
-- changes by materializing the locked IDs before the delete joins them.
create or replace function public.prune_shadow_enrichment() returns integer
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 with doomed as materialized (
  select id from private.shadow_enrichment_jobs
  where to_timestamp((context->'snapshot'->>'expiresAt')::double precision/1000)<=clock_timestamp()
  order by id limit 512 for update skip locked
 )
 delete from private.shadow_enrichment_jobs jobs using doomed
 where jobs.id=doomed.id;
 get diagnostics n=row_count;
 return n;
end $$;

-- Bound each catalogue category independently. The coordinated wrapper can
-- repeat these small batches without allowing one unbounded delete statement.
create or replace function public.prune_music_catalogue(prune_at timestamptz default now())
returns jsonb language plpgsql security invoker set search_path='' as $$
declare metadata_count integer; source_count integer; budget_count integer; decision_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('music-catalogue-storage',0));
 with doomed as materialized (
  select id from private.personal_catalogue_decisions where expires_at<=prune_at
  order by expires_at,id limit 512 for update skip locked
 )
 delete from private.personal_catalogue_decisions decisions using doomed where decisions.id=doomed.id;
 get diagnostics decision_count=row_count;
 with doomed as materialized (
  select media_id from private.music_catalogue_metadata where expires_at<=prune_at
  order by expires_at,media_id limit 512 for update skip locked
 )
 delete from private.music_catalogue_metadata metadata using doomed where metadata.media_id=doomed.media_id;
 get diagnostics metadata_count=row_count;
 with doomed as materialized (
  select s.media_id from private.music_catalogue_sources s
  where s.last_used_at<prune_at-interval '30 days'
   and not private.catalogue_has_reference(s.media_id)
   and not exists(select 1 from private.music_catalogue_jobs j where j.media_id=s.media_id and j.lease_until>prune_at)
  order by s.last_used_at,s.media_id limit 512 for update of s skip locked
 )
 delete from private.music_catalogue_sources sources using doomed where sources.media_id=doomed.media_id;
 get diagnostics source_count=row_count;
 with doomed as materialized (
  select budget_day from private.music_catalogue_budget
  where budget_day<(prune_at at time zone 'UTC')::date-7
  order by budget_day limit 512 for update skip locked
 )
 delete from private.music_catalogue_budget budget using doomed where budget.budget_day=doomed.budget_day;
 get diagnostics budget_count=row_count;
 return jsonb_build_object(
  'decisionDeleted',decision_count,'metadataDeleted',metadata_count,
  'sourcesDeleted',source_count,'budgetDeleted',budget_count
 );
end $$;

revoke all on function public.prune_shadow_enrichment(),public.prune_music_catalogue(timestamptz) from public,anon,authenticated;
grant execute on function public.prune_shadow_enrichment(),public.prune_music_catalogue(timestamptz) to service_role;

create function public.run_catalogue_retention_maintenance() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 state private.catalogue_maintenance_state;
 catalogue_result jsonb;
 run_at timestamptz:=clock_timestamp();
 next_run timestamptz;
 catalogue_deleted integer:=0;
 shadow_deleted integer:=0;
 shadow_batch integer:=0;
 shadow_batches integer:=0;
 catalogue_calls integer:=0;
 catalogue_batch integer:=0;
 catalogue_full boolean:=false;
 backlog_possible boolean:=false;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('music-catalogue-storage',0)) then
  return jsonb_build_object(
   'status','busy','catalogueDeleted',0,'shadowDeleted',0,
   'shadowBatches',0,'backlogPossible',false,'nextDueAt',null
  );
 end if;

 select * into state from private.catalogue_maintenance_state where singleton for update;
 if not found then raise exception 'Catalogue maintenance state unavailable'; end if;
 if state.next_due_at>run_at then
  return jsonb_build_object(
   'status','not_due','catalogueDeleted',0,'shadowDeleted',0,
   'shadowBatches',0,'backlogPossible',false,'nextDueAt',state.next_due_at
  );
 end if;

 loop
  catalogue_result:=public.prune_music_catalogue(run_at);
  catalogue_calls:=catalogue_calls+1;
  catalogue_batch:=
   coalesce((catalogue_result->>'decisionDeleted')::integer,0)+
   coalesce((catalogue_result->>'metadataDeleted')::integer,0)+
   coalesce((catalogue_result->>'sourcesDeleted')::integer,0)+
   coalesce((catalogue_result->>'budgetDeleted')::integer,0);
  catalogue_deleted:=catalogue_deleted+catalogue_batch;
  catalogue_full:=
   coalesce((catalogue_result->>'decisionDeleted')::integer,0)=512 or
   coalesce((catalogue_result->>'metadataDeleted')::integer,0)=512 or
   coalesce((catalogue_result->>'sourcesDeleted')::integer,0)=512 or
   coalesce((catalogue_result->>'budgetDeleted')::integer,0)=512;
  exit when not catalogue_full;
  if catalogue_calls>=8 then
   backlog_possible:=true;
   exit;
  end if;
 end loop;

 loop
  shadow_batch:=public.prune_shadow_enrichment();
  if shadow_batch>0 then
   shadow_deleted:=shadow_deleted+shadow_batch;
   shadow_batches:=shadow_batches+1;
  end if;
  exit when shadow_batch<512;
  if shadow_batches>=24 then
   backlog_possible:=true;
   exit;
  end if;
 end loop;

 next_run:=case when backlog_possible then clock_timestamp()
                else clock_timestamp()+interval '5 minutes' end;
 update private.catalogue_maintenance_state set
  next_due_at=next_run,last_completed_at=clock_timestamp(),
  last_catalogue_deleted=catalogue_deleted,last_shadow_deleted=shadow_deleted,
  updated_at=clock_timestamp()
 where singleton;

 return jsonb_build_object(
  'status','completed','catalogueDeleted',catalogue_deleted,
  'shadowDeleted',shadow_deleted,'shadowBatches',shadow_batches,
  'backlogPossible',backlog_possible,'nextDueAt',next_run
 );
end $$;

revoke all on function public.run_catalogue_retention_maintenance() from public,anon,authenticated;
grant execute on function public.run_catalogue_retention_maintenance() to service_role;
