# Cleanup coordination design

## Transaction boundary

Add a private singleton state row containing the next due time, last successful
cleanup time and bounded numeric deletion counts. No account identifiers or
provider payloads belong in this row. RLS enabled, no anon/authenticated access;
service-role privileges explicitly declared. Expose one invoker RPC with an empty
search path and service-role-only execution, following existing catalogue RPCs.

The RPC uses database time, not client-supplied timestamps:

1. Try a dedicated transaction advisory lock. Busy returns a fixed busy result.
2. Load durable state and return not-due if its due time is in the future.
3. Run catalogue cleanup in 512-row batches per retention category, at most
   eight nonempty rounds, preserving its storage lock, references and active
   job protection. Do not reverse any existing lock ordering.
4. Run shadow cleanup in bounded 512-row batches, at most 24 nonempty batches.
   Stop when a batch is smaller than 512. A full final batch means possible
   backlog, never proof of completion; leave next due time immediate.
5. Commit cleanup counts and next due time atomically. Set five-minute cooldown
   only when the bounded shadow work did not exhaust its batch allowance.

Use nonblocking acquisition of the existing catalogue storage advisory lock so
the wrapper does not wait behind provider completion. Every delete operates on
a materialized, locked batch. PostgreSQL arms `statement_timeout` when the
client command begins, so setting it inside this RPC cannot bound the same
command and is intentionally not presented as a database safeguard. The server
client retains a 10-second request deadline; bounded SQL work and prompt lock
contention are the database-side controls. A request failure remains visible.

Failure/connection loss rolls back deletions and due-state advancement together.
Transaction locks release automatically; no renewable cross-request lease/token
or separate finish call is necessary. A retry remains eligible after rollback.
If a client loses the reply after commit, the next request sees the persisted
cooldown and does not rerun successful work.

## Application integration

Replace the two prune RPCs in `pruneMusicCatalogue` with the new coordination RPC.
Parse its fixed result shape. Missing/malformed RPC must raise the existing
sanitized cleanup failure, never masquerade as a successful skip. Keep the old
RPCs for compatibility and reviewed rollback; old frontend instances can bypass
the new gate until retired, so do not claim savings during mixed-version rollout.

`runCatalogueWorker` still calls prune before provider-disabled/idle handling.
Busy/not-due is a successful no-op and processing proceeds. The daily drain
retains `maintainBeforeRoomDrain`: cleanup failure cannot drop event delivery.
The Discover callback retains its current enrichment wake-up structure. This
slice does not redesign the existing error coupling between preparation and
shadow dispatch or invent background processing while nobody is active.

## Retention and privacy

Reads and claims must continue to enforce expiry, consent, room context and
account state independently of physical deletion. Never extend fetched_at,
expires_at or last_used_at as a scheduling shortcut. Source deletion keeps
retained Like/event references and active metadata leases; shadow expired-source
deletion keeps its existing semantics including crashed/incomplete jobs.

The normal five-minute opportunity plus daily fallback preserves the documented
daily physical cleanup policy. A completed identity can create tags and audio
jobs, so no-traffic shadow cleanup covers the reachable 12,288-row ceiling in
at most 24 nonempty 512-row batches. A full final batch or failure keeps cleanup
immediately eligible rather than recording a normal cooldown. Alert/read-back procedure
must flag last successful cleanup older than the expected daily cadence before
the 30-day maximum is threatened. Do not add an external monitor automatically.

## Rollout

Create migration with Supabase CLI; test only isolated synthetic database.
Apply schema before application promotion when release is authorized. Verify
service-only grants and advisors. Reuse existing cron, whose deployment presence
is not proof of execution: require a real successful cleanup receipt after rollout.
Rollback may restore old direct cleanup calls; retain maintenance until payloads
are expired/deleted. Never drop state/functions while new clients still use them.
