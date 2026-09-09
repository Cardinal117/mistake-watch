# 028.6 — Temporary room lifecycle

Status: approved implementation, 2026-09-09; implemented locally; final verification recorded below. High effort.

## Approved lifetime

The owner selected one hour of reconnect grace after the last verified room
activity, then closure; room-specific queue/chat/session data becomes eligible
for deletion 24 hours after closure. No absolute limit while the room is active.
Explicit account Likes and uploaded catalogue files survive room cleanup.

## Implementation contract

- Guest and active-account creation, behind application/database gates defaulting
  off. Existing invitation, account attachment and catalogue permissions apply.
- Temporary rooms cannot be saved, converted or reopened after expiry. They can
  be rejoined before expiry. The dashboard must not refresh their lifetime merely
  because an old guest cookie is present.
- Authoritative SQL checks serialize activity, expiry and cleanup on the room
  row. Deadline checks apply to admission, not only a scheduled cleanup run.
  Heartbeats from verified members extend the window; expired heartbeats cannot
  revive a room. Existing Legacy cleanup is left intact.
- Closure denies durable access and queues trusted live retirement. Purge waits
  until 24 hours after closure and successful live cleanup, then deletes durable
  room-owned records through existing foreign keys. Failed live cleanup stays
  retryable; it cannot be reported as complete. Minimal replay-protection markers
  may remain without queue/chat/media or identity content.
- No durable implicit learning or account-history-based automatic suggestions.
  Manual search, queue, catalogue and explicit attributable Likes remain. Existing
  Temporary learning suppression/replay coverage must pass with real creation.
- Explain the lifetime in creation and existing Room settings, not a permanent
  toolbar. Reuse Watch/Listen layouts. Account deletion closes owned Temporary
  rooms and follows the same cleanup path; shared catalogue assets are untouched.

- Expired links and suspended tabs return home with an explicit Temporary expiry
  message, including after purge. Network failures must not be treated as expiry.
  Retain only a private room UUID receipt for that explanation.
- Pending explicit Like/unlike events must be durably acknowledged before purge;
  failed persistence leaves cleanup retryable.

## Inspection findings

The existing application and SQL idle cleanup both target Legacy explicitly.
Guest reclaim currently touches activity, including dashboard cookie enumeration;
that must not keep a Temporary room alive. Durable heartbeat is once per minute;
live heartbeat is every 15 seconds. Existing live grants expire but admitted
sessions have no room-expiry enforcement, so durable closure alone is insufficient.
Recommendation preferences have account ownership independent of rooms; room
events, members, queue and media-session records cascade from room deletion.

## Test-first plan

Observe missing Temporary creation/expiry capability in SQL before implementation.
Cover one-hour boundary, authorized rejoin, stale heartbeat, cleanup concurrency,
no save/reopen, other-kind isolation, guest/account rights, replay suppression and
Like/catalogue survival. Test trusted live retirement and retryable purge at the
nearest deterministic layer, then actual local browser guest/account flow,
expiry notification, Watch/Listen and mobile. Run full Node/SQL regression,
typecheck, lint, build, Spacetime build/generation and database checks.

## Boundaries

Local only. No Git or hosted publication/changes. No 028.7 release, ranker, Autoplay or
home hub implementation. Physical devices and hosted scheduling remain release QA.

## Evidence

- SQL test-first failure: missing creation/expiry functions. Temporary recommendation
  test first reproduced unwanted suggestions. Service-role integration exposed an
  `auth.users` permission error, fixed using a private definer and restricted public
  invoker wrapper. No broad Auth table grant was introduced.
- A failing live-retirement test proved pending Likes could be deleted. Purge now
  attempts durable outbox drain and independently refuses removal while explicit
  Like/unlike events remain. SQL verifies a captured Like ingested after closure
  survives the subsequent purge.
- **683 Node tests passed**. The first concurrent run passed 682 and failed one
  timing benchmark (70.60ms versus 50ms budget); the full standalone rerun passed
  without changing the benchmark or ranking implementation.
- **267 SQL assertions in nine files passed**, both on the upgraded local database
  and a fresh scratch replay of every migration. Synthetic Legacy snapshots are
  identical before/after all seven TASK-028 migrations. Fresh replay uses the
  verified Supabase bootstrap service-role defaults, Auth schema and pgTAP;
  Windows SQL transport must explicitly use UTF-8. Earlier scratch bootstrap
  attempts were incomplete and are not counted as passing replay evidence.
- Concurrency checks pass: expiry does not invalidate an in-flight verified touch;
  a late touch cannot revive a closed room; four purge acknowledgements produce
  one deletion. Account deletion closes owned Temporary rooms and preserves the
  cleanup job. Other-room records, account Likes and catalogue assets survive.
- Six combined browser tests passed: desktop/mobile Legacy grouping, Personal
  multi-device access, Shared membership/consent/removal, Themed direction and
  Temporary guest/account creation. Temporary also covers real local direct media,
  Watch/Listen, mobile portrait/landscape, no Save action, dashboard not extending
  grace, rejoin refresh, focus return after expiry and links before/after purge.
  A focused follow-up passed for the final expiry banner position and dismissal.
  It caught and fixed the old URL cleanup clearing the notice prematurely.
- Typecheck, Spacetime typecheck/build, generated bindings, local publish, lint and
  production build passed. Local database security/performance advisors report no
  issues; error-level SQL lint is clear. The unchanged inherited
  `private.shared_room_context` text-to-jsonb initialization warning remains.

## Files and architecture

- Migration `20260909085012_temporary_room_lifecycle.sql`: service-only atomic
  creation/activity/cleanup, private lifecycle and UUID-only ended receipts,
  no-save/no-reopen/member guards, access deadline and owner-deletion closure.
- `lib/rooms/temporary*.ts`, `lib/identity/temporary-room.ts`, existing actions,
  membership/projections and media-session validation: preserve identity/catalogue
  authority, add explicit Temporary lifecycle checks.
- `spacetime/src/room-retirement.ts`, private table/schema and grant guards:
  trusted closure/purge, no stale-grant resurrection; generated bindings updated.
- Dashboard entry, room settings and save controls: compact lifetime explanation,
  no save option. Existing room layout and playback controls are reused.
- Room route/connection hook and dashboard notice: check initial entry, minute
  heartbeat, focus, pageshow, visibility, connectivity recovery and failed live
  membership recovery. Expired links work after purge through UUID receipts.
  Network errors alone never prove expiry. The notice stays until dismissal and
  is displayed below the navbar, not in the old generic error block.
- Temporary recommendations expose factual session history/manual choices only;
  account-history-derived automatic picks are suppressed.

## Scheduling, rollout and limits

Deadline admission checks enforce the one-hour cutoff independently of cron.
The migration schedules SQL closure every ten minutes if pg_cron is available.
Live cleanup also runs opportunistically after server responses; its failures
remain pending so it cannot block returning home. A protected Vercel cleanup
endpoint has a daily 03:00 UTC fallback schedule. **24 hours is purge eligibility,
not an exact execution promise**: actual purge is the next successful maintenance
run; the daily fallback can add up to another day without site traffic, and outages
or pending Like persistence can delay it further. No implicit training is retained
while cleanup is pending. Minimal UUID-only durable/live replay receipts survive.

The app and database creation gates default off; enabled only in this isolated
local QA environment. Apply reviewed migrations and deploy trusted live retirement
before enabling Temporary in a release. Preserve new-kind guards when rolling back;
do not drop metadata or restore old unrestricted access while new rooms exist.
The active local database was not reset during fresh replay; disposable databases
were separate and contained schema plus synthetic fixtures only.

Local app: <http://127.0.0.1:5384/>. Evidence logs/screenshots remain in ignored
`.tmp/task028-6-*` and `.tmp/temporary-*.png`; SQL tests and the concurrency/browser
scripts are tracked candidates. Reproduce with `supabase test db --local`,
`node scripts/qa/temporary-concurrency.mjs`, and the room-kind Playwright tests with
`PERSONAL_ROOM_QA=1`, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5384`.

No commit, push, hosted migration, production activation or physical-device test
was performed. Next is **028.7 integration/release review**, retaining High effort.
Recommendation quality, Autoplay and the Rooms Hub remain separate milestones.
