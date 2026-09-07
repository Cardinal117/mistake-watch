# TASK-027 release candidate

Status: owner local QA accepted on 2026-09-07. Scoped commit, branch push and live QA deployment are authorized. Final PR merge waits for live two-participant acceptance.

## Scope and review

Branch `codex/task-027-room-flow`, based on `c0b8247`. Fresh origin read-back shows no newer main commits; no open PR overlaps. The original checkout's uncommitted Media Session changes and TASK-025 draft remain excluded. No Supabase schema, R2 Worker, provider authentication or recommendation ranking changes are included.

The first five atomic commits contain relative queue placement, optimistic virtualized gestures, playlist review, browse-first Watch and their records. The final slice adds responsive Listen with one retained provider, compact/expanded presentation, mobile Discover, integrated toolbar, category settings, Social parity and queue release-layer polish. Tests include explicitly post-hoc regressions; earlier red/green evidence remains in the individual QA records.

## Current verification

- 608 Node tests passed; final TypeScript and production webpack build passed. Development fixture routes are production-gated. Final diff check passed.
- Lint: zero errors, one inherited room navigation warning. File policy: zero violations, 18 existing warnings.
- 42 current Listen/shared UI browser tests passed, including direct-audio transport, fixture YouTube identity/geometry, responsive navigation, swipe cancellation, finger-following during unrelated room updates, queue drop, settings and Social.
- All 106 broader Watch/queue/playlist checks have passing results: 100 passed in the broad rerun, then all 32 tests in the three affected files passed after six outdated toolbar/settings/return-label expectations were corrected. The earlier interrupted run is not counted as a pass. Assertions for authority, source denial, focus and navigation are retained.
- Disposable local real Spacetime module: four independent clients, four concurrent rounds passed. Same/different item convergence, contiguous positions, pin preservation, rejection and legacy numeric moves passed. Confirmation samples after rollback/reapply: 37/50/50/44 ms. These are local samples, not an internet latency claim or a complete performance distribution.
- Exact retained previous program was restored locally, then candidate reapplied, with `--delete-data=never`; verification passed again.

## Deployment plan and baseline

Publish the additive relative queue reducer before exposing the new client. No table changes; legacy numeric reducer remains. Create the Vercel candidate from committed tracked files, using existing production environment on Vercel without downloading credentials. Build without automatic domain promotion, inspect it, then expose the approved QA candidate when ready.

Current production baseline verified: `dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG`, https://mistake-watch-i1g3rr084-cardinal117s-projects.vercel.app. Current backend hash: `0x7d8b24e21730a7e9a31bb3b3d76c147a722cb391a523334a156085096e723e63`. Retained exact program SHA256: `52490d77b3e874a8eb23e95ea6b0276f82c3e84be8f0720c493f1017a9d6b9ed`. Rollback artifact stays ignored at `.tmp/task027-backend-rollback.js`; sourced from the already retained TASK-026 verification artifact and matched to the live hash. No new production program download was performed. Restore frontend before backend if rollback is required; prohibit data deletion.

## Still required before final merge

Real two-participant Watch/Listen navigation, source retention, permission changes, simultaneous queue edits, reconnect and autoplay; real YouTube/R2 playback; physical phone rotation/fullscreen and gestures. The full performance distributions and prior early convergence diagnostic stay open until measured in integrated QA. No intake item is closed on fixture results alone.
