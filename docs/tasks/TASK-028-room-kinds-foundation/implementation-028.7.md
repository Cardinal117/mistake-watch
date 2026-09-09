# 028.7 - Integration and release review

> Superseded R3 status: [persistent retirement correction](implementation-028.7-R3.md) now passes local closure/deletion and combined regression checks. The findings below preserve the original review evidence; hosted acceptance and release remain pending.

Status: local integration review completed; release held for reproduced R3 closure/live-authority defect, 2026-09-09. High effort.

## Scope and approach

Review the cumulative 028.1 through 028.6 candidate in the isolated worktree.
Preserve unrelated root work. Validate the five kinds with Watch/Listen and
account/guest boundaries; supplement existing acceptance tests where evidence is
missing. Reuse the completed fresh-migration replay and test-first records; new
integration tests are post-hoc verification, not invented red/green history.
Reproduce any newly discovered behavioral defect before changing production code.

## Focused plan

1. Check current base/main drift, changed-file scope and release configuration.
2. Review access, learning, retirement and durable/live authority boundaries.
3. Extend actual two-participant direct playback checks to Shared and verify
   permission changes, seek, queue navigation and mode changes. Existing Personal
   tests already cover same-account playback, pause, volume and mode transfer.
4. Run combined browser and risk-proportional database/Node/type/lint/build checks;
   verify generated contracts and default-off feature switches.
5. Record an acceptance matrix, honest remaining device/provider/hosted gates,
   migration order, rollback conditions and proposed atomic release boundaries.

Local app: http://127.0.0.1:5384/. Supabase API 55421 / DB 55422; local Spacetime
5376. Only synthetic QA accounts/data may be changed. No Git publication, hosted
migration or deployment is part of this approval. Do not activate recommendations,
Autoplay, Rooms Hub or additional design work.

## Findings and evidence

### Release blocker R3: durable closure does not retire existing live clients

Reproduced locally using the actual account Rooms > Close > Confirm Close flow on
an open Shared room with an owner and another account connected on two devices.
The database becomes `closed`, but the admitted participant remains on the room
route after 75 seconds (longer than the 60-second durable activity heartbeat).
The opt-in `ROOM_CLOSE_QA=1` branch in `tests/e2e/shared-rooms.spec.ts` is a red
regression diagnostic, not an accepted failure or proof of passing lifecycle QA.
A second run confirmed that, after this wait, the old host could still press Play
and the other account's media resumed. This is a live-authority defect, not merely
a missing redirect. Both runs fail the required closure behavior. Evidence:
`.tmp/task028-7-close-probe-confirmed.log`,
`.tmp/task028-7-close-confirmed-trace.zip` and
`.tmp/task028-7-close-participant.png`.

Source explains the missing boundary: `lib/account/actions.ts` updates durable
status without live retirement; non-Temporary `use-room-connection.ts` ignores the
activity action's unsuccessful result. Spacetime heartbeat validates its admitted
session independently. Temporary already has a trusted retirement/receipt workflow.
Personal/Shared/Themed owner-deletion triggers also delete durable rooms without
that workflow; this related path is a source-based risk, not browser-reproduced here.

Next scoped correction should provide reliable server-side retirement for persistent
room closure/deletion, retry it safely, reject stale admission after retirement,
and show connected clients an appropriate closed/unavailable-room home notice.
Do not rely on hiding controls or a client redirect as authorization enforcement.
Preserve Temporary pending-Like safeguards and Legacy saved/idle semantics. Include
owner closure, owner deletion, multiple devices, reconnect, stale grants, failed
retirement retry and untouched open-room playback in the regression plan.
This correction needs a reviewed implementation slice before release; 028.7 remains
review/test/documentation work and does not silently change the lifecycle architecture.

### Additional observations

- Legacy create-form inputs use placeholders as accessible names; their visible
  Room name / Your display name labels are not associated with their inputs.
  Existing usability/accessibility follow-up, not introduced by TASK-028. The new
  browser test uses observed placeholder names rather than changing form scope.
- One expanded Shared run timed out at re-entry after self-withdrawal/reapproval;
  the earlier expanded run passed. The final combined run also passed Shared,
  including self-withdrawal/reapproval. No application change or automatic retry
  masked this observation; repeat it during R3 lifecycle correction QA.

### Current technical verification

- Read-only remote main equals candidate base `c64196e6d70b40643d5926073b89a902fd13a128`.
- All 683 Node tests and 267 SQL assertions in nine files pass again.
- Typecheck, lint and optimized Next build pass. Initial lint included 16 warnings
  from disposable regenerated bindings under `.tmp`; deleting only that verified
  diagnostic directory and rerunning lint produced no warnings/errors.
- Regenerated 55 Spacetime binding files match checked-in candidate text exactly.
  Nineteen room-kind RPC argument-name/return contracts match local generated DB
  types; nullable SQL input types retain the documented explicit client annotation.
- Production-build smoke on isolated port 5385: home 200, all four new-kind entries
  hidden with creation switches false, `/dev/room-kinds` 404, unauthenticated cleanup
  endpoint 401. This is local production-mode execution, not a hosted deployment.
- The 028.6 fresh seven-migration replay, unchanged populated Legacy fixture,
  concurrency and DB advisor results remain applicable; no migration changed here.


## Coverage matrix and remaining acceptance

| Kind / boundary | Local evidence | Remaining gap |
| --- | --- | --- |
| Legacy | Populated fixture survives migration replay unchanged; desktop/mobile grouping; two guest sessions, save, host-only direct playback, fullscreen entry/exit and Watch/Listen/reload | Existing input label association; hosted regression |
| Personal | Concurrent canonical creation, owner-only durable/live access and denial matrix; same-account desktop/mobile media, pause, volume and Watch/Listen; closed-room resume denial | Active-session retirement on owner deletion/closure needs the R3 correction review |
| Shared | Owner-approved membership, independent consent, permission grant/revoke, direct playback/pause/seek across three sessions, player persistence through navigation, reconnect and mode/volume transfer | Confirmed R3 closure defect; reapproval timing observation; hosted distinct-account QA |
| Themed | Versioned owner direction, stale-save conflict, guest view/no-edit, manual off-theme policy and suppressed unclassified suggestions; responsive settings and mode change | Theme quality/classification is deliberately absent; actual media under a Themed room not re-proven by this slice |
| Temporary | Guest/account creation, rejoin within grace, controlled expiry, trusted retirement, 24h purge eligibility, reopened/purged link notice, mobile dismiss; SQL Like preservation/replay and concurrency | Physical suspended-tab return and hosted maintenance cadence; real provider playback in Temporary not certified |
| Common release | 683 Node tests, 267 SQL assertions, generated contracts, typecheck/lint/build and local production-mode disabled-gate smoke | New closed-room red regression; physical phone, OAuth, YouTube and private R2 QA still required |

These tests use Chromium desktop/mobile viewports and a local WebM fixture where
media is played. They do not certify real-phone timing, Google OAuth, YouTube
embeds, R2 credentials/30-minute renewal, or recommendation quality. Previous
physical-device acceptance for earlier releases is not reused as TASK-028 acceptance.
Seven normal-flow browser checks passed: six in the combined run and Temporary
separately with required local Docker access. The initial combined Temporary failure
was the sandbox denying the Docker pipe, not an application assertion. The separate
R3 closure diagnostic remains red on two reproductions. Do not summarize this as
"all checks green" or ready to deploy.

## Conditional rollout plan - not executed or approved here

1. Fix R3 through a scoped lifecycle correction; reproduce owner closure and
   deletion with connected clients, replay/stale grants and retry failures. Resolve
   the Shared reapproval timing observation. Re-run affected tests and this gate.
2. Refresh remote main and review the cumulative diff/dirty-file inventory. After
   user-requested commit preparation, keep security guards and their migrations
   together; do not create a deployable intermediate that enables a kind without
   its complete access/learning/lifecycle protections.
3. With separate hosted approval, inspect migration history and existing non-Legacy
   data. The learning-policy reconciliation guard must pass or receive a reviewed
   data plan; never bypass it. Take the established database recovery checkpoint.
4. Keep all four application and database creation gates disabled. Apply the seven
   reviewed migrations in timestamp order (Legacy, Personal, learning policy,
   Shared, audit corrections, Themed, Temporary), then the reviewed R3 correction.
   Rehearse generated-client/live-module compatibility and deployment ordering in
   preview before publishing any breaking Spacetime schema. Do not infer that
   additive durable SQL makes a live-client contract safe to hot-swap.
5. Publish compatible trusted live revocation/retirement and deploy matching app
   bindings. Verify the configured maintenance secret, cron availability and
   scheduled/opportunistic cleanup retries; default-off is not a maintenance setup.
6. Enable only an explicitly accepted kind in the approved QA environment. Use
   distinct accounts plus duplicate-account devices, unauthorized invite/session
   attempts, closure/deletion/rejoin, mode/volume transfer, YouTube, private R2
   playback beyond expiry, and physical mobile portrait/landscape/fullscreen.
7. Final user acceptance, PR/merge and production activation remain separate gates.
   Confirm post-deploy health, live clients, cleanup outcome and disabled later
   features before describing the foundation as released.

Rollback must disable new creation while retaining kind-aware privacy, learning,
cleanup and stale-admission protections. Do not relabel new rooms Legacy, drop
kind/consent/lifecycle data, restore unrestricted old learning ingestion, or deploy
an older server that treats private rooms as generic invitations. Disabling a
creation switch is not a mechanism for ejecting an existing unsafe live session.

## Scope and handoff

This review adds only two existing browser-test extensions, one shared-playback
helper, and documentation. No production application source, migration, dependency,
Git index/commit, hosted data or deployment changed. The temporary production-mode
smoke server on 5385 is stopped; the local QA app on 5384 remains available.
Root checkout receives only matching TASK-028 Markdown documentation, never the
candidate source or unrelated root README/HANDOFF changes. High effort is advised
for the R3 durable/live lifecycle correction; recommendation-engine quality remains
the later milestone after this foundation is safe.

## Reproduction and final evidence

Run in this worktree with the isolated local stack and ignored local environment:

```powershell
npm test
supabase test db --local
npm run typecheck
npm run lint
npm run build
$env:PERSONAL_ROOM_QA = '1'
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5384'
npx playwright test tests/e2e/legacy-rooms.spec.ts tests/e2e/personal-rooms.spec.ts tests/e2e/shared-rooms.spec.ts tests/e2e/themed-rooms.spec.ts tests/e2e/temporary-rooms.spec.ts --workers=1
# Expected red until R3 is fixed; uses only synthetic local accounts/rooms:
$env:ROOM_CLOSE_QA = '1'
npx playwright test tests/e2e/shared-rooms.spec.ts --workers=1
```

The Temporary browser test requires local Docker access for its controlled clock.
The R3 environment switch is only test-runner diagnostic selection, not an
application feature gate or an excuse to omit closure from release acceptance.
The tracked regression will be promoted into the ordinary lifecycle gate after
its scoped fix. No test fabricates a failing-before-implementation chronology:
these are post-hoc integration checks on the cumulative local candidate.

Ignored evidence: `.tmp/task028-7-{node,sql,typecheck,lint,build}.log`,
`.tmp/task028-7-combined-browser.log`, `.tmp/task028-7-temporary-browser.log`,
`.tmp/task028-7-production-smoke.log`, binding/type parity outputs and the R3
recordings above. These logs/screenshots are local QA artifacts, not release assets.
