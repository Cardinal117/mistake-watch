# TASK-007 Review Notes

## Approved direction

- Two agents may work in parallel only with disjoint file ownership.
- The main agent remains integrator and reviewer.
- Batch 1 is move-only and intentionally avoids deduplication or lazy loading until the module seams compile and pass QA.
- Three sequential waves are preferred over one broad rewrite.

## Known baseline

- `npm run test:sync`: 62 pass / 2 pre-existing failures.
- `npm run test:identity`: 2 pass / 0 failures.
- `npm run test:queue`: 52 pass / 0 failures.
- `npm run test:spacetime`: 16 pass / 0 failures.
- `npm run test:youtube`: 3 pass / 0 failures.
- `node --test tests/media/*.test.mjs`: 44 pass / 0 failures.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Current room entry: 588.4 KB raw / 150.4 KB gzip JavaScript.
- Current global CSS entry: 157.8 KB raw / 22.3 KB gzip.
- Current safety commit: `b3ba03a`.

## Review risks

- Accidental omission while moving JSX or helper functions.
- circular imports from poorly chosen feature boundaries;
- client/server boundary drift;
- duplicated state after partial extraction;
- visual drift from class-name or portal movement;
- dynamic imports changing first-paint or mode-switch behavior;
- reducer or upload behavior changes hidden inside structural work.

## Decision

Proceed with Gate 0, then parallel Batch 1 listen/watch move-only decomposition.

## Batch 1 implementation result

- Safety tag: `pre-modularization-2026-07-13` at `b3ba03a`.
- Integration branch: `refactor/codebase-modularization`.
- Listen extraction commit: `1b3dfda`.
- Watch extraction commit: `77ff3b3`.
- `listen-mode-layout.tsx` is now a compatibility export backed by 18 modules;
  the largest is 637 lines.
- `watch-mode-layout.tsx` is now a compatibility export backed by 20 modules;
  the largest is 678 lines.
- The extracted listen/watch graph has 38 modules, 61 relative import edges,
  and no cycles after integration review.
- Source-inspection tests now read the responsible module trees instead of
  relying on the former monoliths or compatibility-file comments.
- No schema, API, reducer, permission, storage-key, dependency, or visible UI
  changes were introduced.

## Batch 1 verification

- Typecheck, lint, production build, diff check: passed.
- Identity: 2/2; dev environment: 8/8; queue: 52/52; SpacetimeDB:
  16/16; YouTube: 3/3; media/security: 44/44.
- Sync/player: 62/64 with the same two pre-existing baseline failures.
- Local browser QA: 331-item listen room, open queue virtualization, Add Media,
  desktop layout, and 390px mobile layout passed with no captured console errors
  and no horizontal mobile overflow.
- Local watch-mode interaction was unavailable because the QA guest cannot
  change room mode and Google owner authentication is live-only.

## Bundle checkpoint

- Room JavaScript: 592.8 KB raw / 151.7 KB gzip after Batch 1, compared with
  588.4 KB / 150.4 KB at baseline (about 0.7% raw and 0.9% gzip overhead).
- Global CSS remains 157.8 KB raw / 22.3 KB gzip.
- The small JavaScript increase is recorded as module-boundary overhead. Loading
  reduction remains Batch 3 scope, where watch/listen and hidden workflows can
  be split dynamically after the seams have production confidence.

## Remaining Batch 1 release checks

- Review the implementation report and integration diff.
- Re-run owner-authenticated watch/listen switching after the direct-player
  continuity fix. The first temporary-production QA exposed a direct-player
  remount race that reset canonical position to `0:00`; the production baseline
  did not reproduce it.
- Verify paused and playing YouTube, direct, and uploaded media in both switch
  directions before merging to `main`.
- Do not push or deploy until explicit approval.

## Production release result

- Batch 1 plus the direct-player continuity fix was merged as `4ed5597` and
  deployed as `dpl_66VjmChNK5DshiR6mPbXG7ji18ki`.
- The user confirmed live YouTube and uploaded media retain elapsed playback
  position across Listen and Watch modes.
- `MW-BUG-002` is closed.
- `MW-BUG-001` was released as commit `02210bf`, published additively to
  SpacetimeDB, and deployed as `dpl_5cQfwRQC5hJXHkAwqx9xHpdSmeNg`.
- Production owner/guest QA confirmed single-step uploaded autoplay,
  second-participant playback, hidden guest catalogue access, session-scoped
  playback URLs, no permanent R2 URL exposure, and stale-next rejection.

## Discovered issue register

See `discovered-issues.md` for the confirmed sync defects, permanent R2 URL
hardening concern, preview QA gap, remaining monoliths, static-loading boundary,
source-test brittleness, hydration observation, and multi-agent isolation note.

See `split-inventory.md` for the exact before/after line totals, every extracted
module, its responsibility, and the remaining Batch 2-3 targets.

## Batch 2 implementation result

- Queue extraction commit: `4e82018`; shared controller follow-up: `5f6b312`.
- Media service extraction commit: `c33f644`.
- `queue-panel.tsx` fell from 2,205 to 195 lines. Queue and shared Add Media are
  now 13 bounded files totaling 2,500 lines; the largest is 525 lines.
- `lib/media/assets.ts` fell from 1,939 to 49 lines. Media asset behavior is now
  13 domain files totaling 2,136 lines; the largest is 321 lines.
- Shared duplicate handling, preference storage, YouTube normalization,
  playlist mapping, and notification behavior now serve Listen and Watch.
- Three confirmed runtime-unreferenced mock modules were removed (328 lines),
  and stale room fallback copy now describes current SpacetimeDB authority.
- A file-length ratchet fails new handwritten files above 700 lines, warns above
  500, and records explicit ceilings for five existing legacy exceptions.
- No schema, reducer, API payload, permission, storage-key, dependency, or
  visual-design changes were introduced.

## Batch 2 verification

- Typecheck, full lint, production build, scoped format, diff check: passed.
- Import graph: 144 files processed with zero circular dependencies.
- Automated suites: sync 65/65; queue 53/53; media/security 44/44;
  SpacetimeDB 17/17; identity 2/2; dev 10/10; YouTube 3/3;
  recommendations 5/5 (199 tests total).
- File-length ratchet: zero violations and 14 warnings, all below the failure
  ceiling or covered by recorded legacy ceilings.
- Local browser reached stale-room recovery and the dashboard. Fresh-room QA is
  blocked before queue rendering by the local SpacetimeDB connection
  environment, which surfaces the inactive connection object as a server error.
- Preview owner/member/guest queue, Add Media, uploaded catalogue, and playback
  smoke QA remains required before release.
- `npm audit` reports three moderate dependency advisories. No dependency
  changes are included in this structural batch.

## Batch 2 temporary-production QA

- Deployment `dpl_23SFSjYuWJQ4XdEfRtCENcz6Gxy3` passed root, health, guest-room,
  queue drawer, Add Media, desktop/mobile overflow, and 5xx-log smoke checks.
- Owner QA found `MW-BUG-003`: an activated uploaded Play Next item retained
  its NEXT badge and one-shot priority state.
- Root cause is reducer state transition, not the Batch 2 presentation split:
  item promotion wrote `status: "playing"` without clearing `is_play_next`.
- The narrow fix consumes Play Next in atomic autoplay, explicit play, and
  failure-recovery advancement without changing reducer schemas or payloads.
- Updated focused counts: sync/player 66/66; SpacetimeDB 17/17; queue 53/53.
- Fix commit `867e7b0` was pushed to `task-007-batch2`.
- Production SpacetimeDB accepted the behavior-only update with an empty
  migration plan and unchanged database identity. No client-breaking flag was
  required.
- Follow-up QA confirmed natural uploaded advancement consumes NEXT, but manual
  Next loaded the uploaded source without promoting its queue row. The stale
  queued row also caused Previous to resolve back to the same uploaded item.
- The follow-up replaces manual uploaded playback's separate source and
  playback writes with additive `play_uploaded_queue_item`, reusing the atomic
  queue commit helper and opaque uploaded-session validation.
- Follow-up automated gates pass: sync/player 67/67, SpacetimeDB 17/17,
  typecheck, lint, SpacetimeDB build/codegen, and production build.
- Follow-up commit `f286cb9` was pushed, then additive
  `play_uploaded_queue_item` was published with an empty migration plan before
  frontend deployment `dpl_CXo1Ed9BPqvJFD5hWfAQmuA3Pusy`.
- Both production aliases and `/api/health` returned HTTP 200 after deployment.
- Owner QA passed manual Next, natural uploaded advancement, NEXT badge/state
  consumption, and Previous leaving the uploaded item. Batch 2 is approved for
  merge to `main`.

## Batch 3 implementation result

- Three disjoint agent scopes handled client realtime extraction, server pure
  helpers, and dynamic loading; the main integration branch reviewed and
  verified the combined diff.
- `lib/spacetime/use-live-room.ts` fell from 1,541 to 918 lines. Snapshot
  derivation and public client contracts now live in two focused modules while
  `LiveRoomState` and hook behavior remain compatible.
- `spacetime/src/index.ts` fell from 2,327 to 2,205 lines. Normalization, media
  reference, and queue calculation helpers moved to three pure modules without
  schema, reducer name, payload, or generated-binding changes.
- Watch and Listen layouts now load by active mode. Watch queue/media, audience
  panels, and Listen TV mode load only when opened.
- Initial `/rooms/[roomId]` JavaScript fell from 1,065,471 to 838,180 raw bytes:
  227,291 bytes or 21.3%. Global CSS remained exactly 161,547 bytes.
- No dependencies, database migrations, permission rules, storage references,
  reducer contracts, or intentional visual behavior changed.
- The file-length ratchet now uses the reduced 918-line and 2,205-line totals,
  so either realtime entry regrowing by one line fails policy checks.

## Batch 3 verification

- Typecheck, full lint, production build, SpacetimeDB build/codegen, formatting,
  diff check, and the file-length ratchet passed.
- Complete automated suite: 211/211. Focused suites include sync 70/70, queue
  53/53, and SpacetimeDB 23/23.
- File-length ratchet: zero violations and 14 warnings.
- Local guest QA passed existing Listen-room initialization, deferred TV mode
  open/exit, and queue drawer open with no captured console warnings or errors.
- A newly created local Watch room fails before the Watch layout mounts because
  the local Spacetime connection is inactive and its connection object reaches
  the server error boundary. Reload reproduces it. This matches the tracked
  environment/readiness issue and is not attributed to the loading split.
- Preview QA remains required for owner-authenticated Watch/Listen switching,
  deferred Watch queue/media and audience panels, upload permissions, and
  desktop/mobile layout stability.

## Batch 3 live QA and release approval

- Temporary production deployment `dpl_JD7pLdewZqbsWpB8mtC1Fi4YibRT` was built
  from the isolated Batch 3 worktree and labeled for temporary production QA.
- Both production aliases and `/api/health` returned HTTP 200 after deployment.
- The user confirmed the application works correctly across the requested live
  QA surface, including the deferred room-mode and hidden-workflow paths.
- TASK-007 Batch 3 is approved for an atomic commit, task-branch push,
  fast-forward of `main`, and a clean committed production deployment.
- Rollback remains `dpl_CXo1Ed9BPqvJFD5hWfAQmuA3Pusy` until the committed
  deployment passes final health checks.
