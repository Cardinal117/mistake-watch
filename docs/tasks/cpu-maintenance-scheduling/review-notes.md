# Planning evidence — 2026-09-15

Verified current checkout: `codex/task-030-personal-music-catalogue`, with the
previous two CPU slices and unrelated recording-review work still local.
No existing changes were staged or overwritten.

Source inspection:

- `lib/recommendations/catalogue-service.ts`: every preparation runs reconciliation
  then maintenance; prune issues catalogue and shadow RPCs separately.
- `lib/recommendations/catalogue-worker-core.ts`: prune precedes disabled/idle
  provider handling; maintainBeforeRoomDrain preserves event drainage on failure.
- `app/api/recommendations/discover/route.ts`: authorized successful Personal read
  schedules preparation then pilot shadow work within an existing deadline.
- `app/api/recommendations/drain/route.ts`: current daily path maintains catalogue
  separately from shadow after-work, preserving event-delivery recovery.
- `vercel.json`: recommendation drain once daily at 01:00 UTC. No live scheduler
  execution or provider-plan limits were inspected in this planning turn.
- Migration `20260911055006`: catalogue prune takes storage transaction lock,
  deletes expired cache/decisions, and protects referenced or actively leased
  sources during 30-day orphan cleanup.
- Migration `20260911163915`: shadow cleanup deletes at most 512 expired-source
  jobs with row locks/skip-locked; reads independently check expiry/context.
- TASK-030 `design.md`, Retention section: 28-day expiry, 21-day proactive refresh,
  daily physical cleanup and a 30-day maximum. A five-minute cleanup opportunity
  is compatible with that existing policy, not a retention extension.

Rejected approaches: per-instance TTL (no fleet coordination), daily-only provider
dispatch (reduces stage throughput), suppressing cleanup when provider disabled,
and declaring a full 512-row batch as backlog cleared.

Implementation evidence:

- Test-first application contract failed because the new response parser did
  not exist, then passed after the fixed-shape parser was added.
- Test-first SQL contract failed on the absent state table/RPC, then passed all
  32 assertions after clean additive migration replays and reviewer corrections.
- The boundary suite exposed that the earlier `DELETE ... IN (SELECT ... LIMIT)`
  form did not reliably preserve the 512-row ceiling. The migration now uses a
  materialized locked batch; 0, 512, 513 and 4,096 cases pass.
- Eight independent database sessions produced one completed cleanup and seven
  prompt busy/not-due results. The expired fixture was deleted exactly once.
- A rollback-only maximum-capacity timing probe deleted 12,288 expired shadow
  rows in 163.704 ms on the local PostgreSQL 17.6 QA database. This is local
  evidence, not a production latency or CPU claim.
- Independent review caught that an in-function `statement_timeout` cannot bound
  its already-running command and that identity jobs can expand to tags plus
  audio, making reachable shadow capacity 12,288. The final SQL uses bounded
  catalogue deletes, 24 shadow batches, and stricter semantic response parsing.
- Existing catalogue and shadow suites pass 77 and 48 assertions respectively;
  all 248 recommendation tests pass. TypeScript, focused lint, lint excluding
  ignored `.tmp` snapshots, and the production build pass. Supabase advisors
  report no warnings and public/private function lint reports no errors.
- The file-length policy still reports the unrelated pre-existing
  `components/room/youtube-media-player.tsx` ceiling violation; this slice did
  not modify that file.

Memory: reused current Watch INDEX/Current-State retrieval, two files/4,556 chars;
repository/source evidence governs this implementation. No new vault checkpoint
was requested or applied. DeepSeek external review was attempted under the
owner's permission but automatic approval review rejected source export. An
internal Sol Medium reviewer found three defects; all three were corrected and
the final read-back confirmed them resolved with no new regression. The raw
`npm run lint` command still scans ignored
historical `.tmp` snapshots and fails on two generated bundles; current source
passes when that ignored directory is excluded.

Release follow-up: the hosted migration is recorded as
`20260915100111 catalogue_maintenance_scheduling`. The repository migration was
renamed to that exact receipt in `e526ca0` so future migration tooling does not
report a false pending change. Application deployment
`dpl_BnUxVRq9pebHuEX1c35JjMGzS4Sc` is Ready on the custom domain. Health and
readiness return 200; the excluded recording route returns 404 and the protected
drain route returns 401 without its secret. The initialized maintenance state
had no completed run at the release read-back. The first request/scheduled cleanup
receipt and matched Vercel CPU comparison remain operational evidence rather
than release claims. See [release.md](release.md).
