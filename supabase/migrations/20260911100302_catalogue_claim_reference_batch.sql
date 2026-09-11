-- TASK-030: preserve claim authority and leases while bounding repeated evidence work.
create or replace function public.claim_music_catalogue_jobs(request_limit integer default 100)
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
 -- Materialize each relevant owner's canonical evidence once per batch instead
 -- of recomputing it for every due job. No prefix limit: orphaned older jobs
 -- must not starve later referenced media. Current evidence still governs all
 -- consent, account status, suppression and retained-history eligibility.
 with due as materialized (
  select j.media_id from private.music_catalogue_jobs j
  where j.due_at<=claim_at and (j.lease_until is null or j.lease_until<=claim_at)
 ), accounts as materialized (
  select p.user_id from public.media_preferences p join due d on d.media_id=p.media_id
  where p.source_type='youtube' and p.preference_state='liked'
  union
  select e.account_user_id from public.recommendation_events e join due d on d.media_id=e.media_id
  where e.source_type='youtube' and e.expires_at>now() and e.account_user_id is not null
 ), evidence as materialized (
  select e.media_id from accounts a
  cross join lateral private.catalogue_owner_evidence(a.user_id) e
 ), eligible as materialized (
  select distinct e.media_id from evidence e join due d using(media_id)
 )
 select array_agg(media_id) into ids from (
  select j.media_id from private.music_catalogue_jobs j join eligible e using(media_id)
  where j.due_at<=claim_at and (j.lease_until is null or j.lease_until<=claim_at)
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

