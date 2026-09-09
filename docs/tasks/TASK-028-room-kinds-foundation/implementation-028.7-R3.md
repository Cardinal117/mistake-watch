# 028.7 R3 - Persistent room retirement

Status: implemented and verified locally, 2026-09-09. High effort. Hosted/device acceptance and Git/release remain separate.

## Contract and plan

Fix the reproduced Account > Rooms > Close gap and the related owner-deletion
path. No Git/deployment, recommendation work or unrelated UI redesign.

1. Preserve the existing red browser closure diagnostic. Add SQL contract tests
   for transactional close/delete receipts, owner deletion, grants, idempotent
   acknowledgement, close/delete races, open-room preservation and stale reopen.
2. Add a private, RLS-protected retirement outbox/receipt with no cascading room
   FK. Non-Temporary room close/archive and deletion write it transactionally;
   owner deletion already deletes Personal/Shared/Themed rooms. Legacy save/idle
   policies remain unchanged; its actual closure also ends live authority.
3. Reuse trusted live retirement and cleanup retry core. Closure retains saved
   queue/history; deletion may purge live data only after pending explicit Likes
   drain. A deletion supersedes a closure job; stale acknowledgement cannot mark
   the stronger purge job finished. Keep UUID-only receipts to reject ID reuse.
4. Account close tries retirement immediately and reports pending failure honestly.
   Existing heartbeat/focus and scheduled/opportunistic maintenance retry durable
   jobs. A confirmed closed/deleted room redirects home with a retained dismissible
   explanation; network failure alone is not proof of closure. Live reducer/session
   checks, not the redirect, enforce authorization.
5. Terminal closed/deleted identities cannot reopen. Preserve the existing Personal
   RPC exception that recovers erroneous idle_timeout closure; that state creates
   no retirement receipt. Administrative closure/deletion remains terminal. Do not
   restore a retired UUID. Update the old Personal QA fixture that temporarily
   closed/reopened one identity to test retry without resurrecting a retired room.
6. Verify actual multi-device closure, owner deletion, stale grants and retry;
   rerun SQL/reducer/Node, browser, type/lint/build and database advisors.

Private table has no anon/authenticated access. Service-only invoker RPC wrappers
use private SECURITY DEFINER helpers with empty search_path and narrowly scoped
jobs. No user-supplied live room retirement operation; only confirmed durable jobs.
Read-only status exposes only ended/not-ended to the already room-scoped app.
Pending jobs are bounded and ordered by last attempt to avoid starvation.

## Test chronology

Baseline: cumulative local .1-.6 candidate on c64196e, no R3 production fix.
Existing red: ROOM_CLOSE_QA=1 shared browser diagnostic failed twice in .7; after
75 seconds the closed room still propagated host Play. The corrected SQL baseline
then failed on missing retirement RPCs before the migration. An earlier missing
invite-token fixture error was corrected and is not counted as behavioral red.
The first migrated run exposed the existing Personal idle-timeout recovery contract;
it remains supported. A Themed test also needed its generated room ID rather than
its request ID. Shared Leave and clock tests needed new dependency/DOM mocks.
These fixture corrections are distinct from production behavior fixes.

The unchanged original closure diagnostic now passes (33 seconds). Closure is also
part of the normal Shared browser test after consent, withdrawal and reapproval.
A separate synthetic owner-deletion run passed (1.2 minutes), including all three
connected sessions returning home without manually triggering focus.

## Verification

- 690 Node tests passed, including seven new worker/reducer tests: failed live
  retirement, pending explicit Likes, stale acknowledgements, duplicate jobs,
  stale admission grants and retired-room grant issuance.
- 290 SQL assertions across ten files passed on the active local database and
  the separate replay database. The final eighth migration was applied on the
  previously verified seven-migration replay with unchanged Legacy fixtures.
- Seven combined browser tests passed across Legacy, Personal, Shared, Themed
  and Temporary (2.7 minutes). Owner deletion additionally passed separately.
- The database concurrency probe passed: a delayed close acknowledgement cannot
  clear a newer deletion job; duplicate purge acknowledgements are idempotent.
- Typecheck, lint, optimized build, error-level database lint and database advisors
  passed. All 22 declared room-kind RPC argument/return contracts match fresh
  local generated types. No Spacetime contract change was needed in this correction.
- Mobile screenshots for closure and owner deletion were inspected: the existing
  notice is readable below the header, dismissible and does not clip horizontally.
  Browser assertions confirm no media element remains after returning home.

## Implementation map

- `20260909102917_persistent_room_retirement.sql`: transactional private receipts,
  service-only claim/acknowledgement/status RPCs, owner-delete capture and stale-ID denial.
- `lib/rooms/persistent-retirement.ts` and `cleanup-core.ts`: bounded retry worker,
  live authority retirement before optional purge, preference-drain protection.
- Account Close, room activity/focus/heartbeat, lifecycle maintenance and the
  protected cleanup route integrate the worker. Room entry and dashboard notices
  explain confirmed ended rooms without treating network errors as closure.
- Personal/Shared browser fixtures, SQL tests, worker/reducer tests and
  `scripts/qa/persistent-retirement-concurrency.mjs` cover the changed contract.

## Limits and next gate

This corrects R3 locally; it does not certify hosted schema, physical-device or
real-provider acceptance. No commit, push, hosted migration or deployment occurred.
Review the cumulative candidate for atomic commits only when requested, then follow
028.7's separately approved migration/live/app rollout and acceptance sequence.
Creation gates remain off by default.

Retirement spans two systems. A live-service outage leaves a durable retry job;
Account Close reports that ending connected sessions is pending. Owner deletion
is detected by the next healthy activity/focus check (normally within the existing
60-second interval); it is not an instantaneous notification guarantee. Live
retirement acknowledgement, not the UI redirect, proves authority was removed.
Closed persistent rooms retain queue/history. Deleted-room purge waits for explicit
Likes to drain; UUID-only receipts remain to reject stale identities and explain links.
The existing Personal erroneous idle_timeout recovery exception remains intact.

SpacetimeDB dashboard scan/latency notifications were captured separately in the
product inbox. Source already has room-leading compound indexes; deployed schema,
planner use and reducer profiling remain unverified. No performance change or
causal claim is included in R3.

Ignored evidence: `.tmp/task028-r3-{node,sql,replay,replay-tests,typecheck,lint,build}.log`,
`combined-browser`, `close-browser`, `delete-browser`, `worker`, `concurrency`,
`db-lint`, `advisors` logs and `closed-mobile`/`deleted-mobile` PNGs. The type-parity
script uses the R3 generated snapshot (the older .7 snapshot predates these RPCs).
