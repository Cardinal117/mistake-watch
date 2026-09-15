# CPU efficiency release — 2026-09-15

## Released behavior

- Personal Discover stops scheduled reads while Visualizer is active, permits
  one read in flight and retains one necessary invalidation for return.
- Recommendation authorization reuses one verified request-local user/account
  context while continuing to read current room and membership authority.
- Physical catalogue and shadow cleanup is coordinated by durable database state
  and a nonblocking advisory lock. Read-time expiry remains immediate; the daily
  drain remains the no-traffic fallback.

## Source and database receipts

- Discover: `6a2c893 perf(discover): coalesce inactive personal refreshes`
- Authorization: `f35c1b0 perf(auth): reuse verified recommendation context`
- Maintenance: `2c6c64d perf(catalogue): coordinate retention maintenance`
- Hosted receipt alignment: `e526ca0 chore(db): align maintenance migration receipt`
- Branch: `codex/task-030-personal-music-catalogue`
- Hosted Supabase migration:
  `20260915100111 catalogue_maintenance_scheduling`

The hosted migration list was clean through `20260911184825` before apply. The
new state table was initialized with no completed cleanup receipt. A production
cleanup was not forced during release verification; the first eligible Personal
Discover preparation or protected scheduled drain performs it.

## Deployment

- Vercel deployment: `dpl_BnUxVRq9pebHuEX1c35JjMGzS4Sc`
- Immutable URL:
  `https://mistake-watch-ksin8xcrw-cardinal117s-projects.vercel.app`
- Production aliases: `https://watch.mistakestudios.com` and
  `https://mistake-watch.vercel.app`
- Source commit: `e526ca0f223f515000ea4f6094335d6e28a9bdf6`
- State: Ready

The deployment was created from an isolated `git archive` of the source commit.
The archive excluded the local recording-review route and other unrelated dirty
work. Its clean production build passed before upload, and Vercel's production
build passed again.

## Verification

- Recommendation regression: 248 passed.
- Catalogue SQL: 77 assertions passed.
- Shadow-enrichment SQL: 48 assertions passed.
- Maintenance scheduling SQL: 32 assertions passed.
- Eight-session concurrency test: one cleanup completed; seven callers returned
  promptly as busy/not due; the fixture was deleted once.
- Rollback-only 12,288-row local cleanup probe: 163.704 ms on PostgreSQL 17.6.
- Typecheck, focused lint, source lint excluding ignored `.tmp`, formatting,
  diff whitespace and production build passed.
- Production custom domain: health 200, readiness 200.
- Excluded `/api/recommendations/recording`: 404.
- Protected `/api/recommendations/drain` without its secret: 401.

Supabase advisors show the project's existing informational private-table RLS
and index findings plus the known leaked-password-protection warning. The new
private maintenance table has RLS, no user policy, revoked anon/authenticated
access and service-role-only function execution by design.

## Remaining evidence

Compare matched route/method traffic and Fluid Active CPU after enough production
usage has accumulated. Do not infer savings from a raw day total. Confirm the
first completed hosted maintenance receipt and watch backlog age. The unchanged
preferences polling, delivery empty-work, heartbeat/readiness cadence and upload
polling findings remain later optimization candidates.
