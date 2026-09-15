# Catalogue cleanup scheduling

Updated: 2026-09-15
Status: released on 2026-09-15; hosted migration and Vercel deployment verified.
Documentation: full packet because this changes database coordination and retention.

## Objective

Reduce repeated physical cleanup during Personal Discover traffic while retaining
metadata expiry, daily retention maintenance and current enrichment progress.

The owner approved proceeding with the scheduling design after the two local
CPU slices. The additive migration and application integration passed local
synthetic QA, were published to the feature branch, and are live. See the
[release receipt](release.md) for the hosted version, deployment and smoke
checks.

## Scope

One database-coordinated cleanup operation for catalogue and shadow payloads.
Keep the existing Discover and daily drain entry points, metadata provider job
claims, reconciliation and shadow enrichment triggers. Change only how often
physical cleanup actually runs.

## Decisions

- A durable due timestamp plus a transaction-scoped, nonblocking advisory lock
  gates cleanup across Vercel instances. No process-local TTL or cross-request
  permission cache.
- Successful cleanup sets the next normal due time five minutes later.
- Existing daily `/api/recommendations/drain` remains the no-traffic fallback;
  no new Vercel cron or external service is required for this slice.
- Read-time expiry remains immediate. The existing 28-day cache expiry and
  30-day maximum are unchanged. Physical cleanup remains asynchronous and its
  success/overdue state must be observable.
- Cleanup skip/busy must not skip metadata claims, reconciliation, shadow
  admission or provider work. No throughput improvement is claimed.

## Exclusions

Auth and Discover changes already implemented locally, event-delivery leases,
provider scheduling redesign, reconciliation revision caching, new provider calls,
accepted recording links/ranking activation, frontend UI, hosting migration.

## Value and limits

Eligible repeated calls within five minutes do one small coordination RPC instead
of repeated deletion/reference scans and a second shadow RPC. Actual Vercel CPU
savings require matched production measurement after a separately reviewed release.
This reduces cleanup work; it does not eliminate the remaining reconciliation,
provider-claim or auth cost. A daily scheduler outage still needs operational
attention; do not promise a retention guarantee through an unbounded outage.

See [design](design.md), [ordered work](tasks.md), [acceptance](acceptance-criteria.md)
and [source evidence](review-notes.md).
