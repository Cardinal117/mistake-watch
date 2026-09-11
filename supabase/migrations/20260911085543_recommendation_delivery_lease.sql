-- Shared server-only lease. No user identifiers, provider data or event payloads.
create table private.recommendation_delivery (
 id boolean primary key default true check(id),
 lease_token uuid,
 lease_until timestamptz,
 next_run_at timestamptz not null default '-infinity',
 last_started_at timestamptz,
 last_finished_at timestamptz,
 last_status text check(last_status in ('running','empty','partial','failed')),
 last_processed integer not null default 0 check(last_processed between 0 and 2000),
 oldest_pending_ms bigint,
 check((lease_token is null) = (lease_until is null))
);
insert into private.recommendation_delivery(id) values(true);
alter table private.recommendation_delivery enable row level security;
revoke all on private.recommendation_delivery from public, anon, authenticated;
grant select,update on private.recommendation_delivery to service_role;

create function public.claim_recommendation_delivery()
returns uuid language plpgsql security invoker set search_path='' as $$
declare token uuid;
begin
 update private.recommendation_delivery
 set lease_token=gen_random_uuid(), lease_until=clock_timestamp()+interval '120 seconds',
     last_started_at=clock_timestamp(), last_status='running'
 where id and next_run_at<=clock_timestamp()
   and (lease_until is null or lease_until<=clock_timestamp())
 returning lease_token into token;
 return token;
end;
$$;

create function public.finish_recommendation_delivery(
 claim_token uuid, outcome text, processed integer, oldest_pending_ms bigint default null
) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if outcome is null or outcome not in ('empty','partial','failed')
    or processed is null or processed<0 or processed>2000
    or (oldest_pending_ms is not null and oldest_pending_ms<0) then
   raise exception 'Invalid delivery result' using errcode='22023';
 end if;
 update private.recommendation_delivery d set
  lease_token=null, lease_until=null, last_finished_at=clock_timestamp(),
  next_run_at=clock_timestamp()+case when outcome='failed' then interval '30 seconds' else interval '10 seconds' end,
  last_status=outcome, last_processed=processed,
  oldest_pending_ms=finish_recommendation_delivery.oldest_pending_ms
 where d.id and d.lease_token=claim_token and d.lease_until>clock_timestamp();
 return found;
end;
$$;
revoke all on function public.claim_recommendation_delivery() from public,anon,authenticated;
revoke all on function public.finish_recommendation_delivery(uuid,text,integer,bigint) from public,anon,authenticated;
grant execute on function public.claim_recommendation_delivery() to service_role;
grant execute on function public.finish_recommendation_delivery(uuid,text,integer,bigint) to service_role;
