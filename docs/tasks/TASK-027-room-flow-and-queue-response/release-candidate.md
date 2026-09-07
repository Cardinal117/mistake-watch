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

## Live QA checkpoint — 2026-09-07

The reviewed branch was pushed and [draft PR #13](https://github.com/Cardinal117/mistake-watch/pull/13) opened. New atomic commits: `0031277` Listen/shared interface, `979b84a` queue drop layer, `5da8158` accepted QA documentation. They follow the five earlier TASK-027 commits. Main is not merged.

Vercel candidate `dpl_2rG6qaf8oMmzbSWm453DTUQqfX8X` built successfully from the clean tracked-file archive at `5da8158` (1,145 audited files, no private environment/cache/log artifacts). Its production Turbopack build passed. It was first built with domain assignment disabled, then promoted for the authorized QA round to https://watch.mistakestudios.com. Immutable candidate URL: https://mistake-watch-c4ee9k0i6-cardinal117s-projects.vercel.app. The unpromoted hostname's access-screen responses were not counted as application health.

Before promotion, the exact locally tested backend bundle was published with `--delete-data=never`; migration plan was empty. Live `st_module` program hash equals the disposable local candidate: `0xa67969406235cdd885d8008cc4690cc9f036508910bd3cff1f671f4fde274759`. Legacy clients remain compatible. The earlier baseline above remains the rollback target.

Public read-back after promotion: health 200/ok, readiness 200/ready with Supabase and Spacetime ready; `/dev/listen-design` and `/dev/watch-design` both 404. Public domain resolves to the intended Ready deployment. Browser dashboard load verified. These are deployment smoke checks, not two-participant or real-provider acceptance. Owner has been asked to test the Huawei and a second device in the same room; PR remains draft while that acceptance is pending.

Local dev was restarted on port 5383 after the clean build. The original checkout and unrelated work remain untouched. Remaining local diff consists of generated line-ending/reference noise, excluded from the committed archive. This follow-up record changes documentation only and does not require rebuilding identical application code.


### Post-live-QA fine tuning

Owner reported successful three-device live playback/queue/mode QA and requested that this working production remain live. The remaining fullscreen, volume, display timing, Listen video, metadata-reconnect and one-off token findings are tracked with local evidence and unresolved boundaries in [live-qa-fine-tuning.md](live-qa-fine-tuning.md). These follow-up changes are not deployed or merged and require the targeted next acceptance round.


## Fine-tuning deployment — 2026-09-07

User authorized Git, deployment and documentation updates. Commits `eacaad4`,
`6342bc0` and `fe7b28c` are pushed on `codex/task-027-room-flow`; PR #13's
scope/evidence description is updated and remains draft/unmerged. A clean
1,147-file tracked archive at `fe7b28c` excluded environment files, caches and
uncommitted/generated noise. Vercel's production Turbopack build passed.

Deployment `dpl_AEkhfVx3PikrQ4e1YPe9HR4SztgE`:
https://mistake-watch-3h9qude29-cardinal117s-projects.vercel.app
was promoted and verified at https://watch.mistakestudios.com. Health/readiness
return 200 (readiness ready); both design-preview routes return 404; dashboard
browser smoke passed. This is smoke evidence, not new multi-device acceptance.

Rollback frontend: `dpl_2rG6qaf8oMmzbSWm453DTUQqfX8X`. No backend, database,
Worker or authorization changes were deployed. Keep the new release live while
targeted owner acceptance is pending. README, handoff and roadmap were reconciled;
subsequent documentation-only commits do not change the deployed application.
This checkpoint supersedes the earlier local-only/uncommitted status above.


## Free-position player deployment � 2026-09-07

Watch free positioning is live at https://watch.mistakestudios.com from `1cc7832`
(application commit `1485718`), deployment `dpl_2szjneG7xb5SpDtdaKjC1ijGkrGL`.
Immutable URL: https://mistake-watch-ixh1ei4jz-cardinal117s-projects.vercel.app.
The clean 1,149-file archive passed the production Turbopack build. Production
alias verified; health/readiness 200; Watch design route 404. These are smoke
checks; owner live movement/rotation acceptance is pending. PR #13 remains draft.
Rollback target is the prior fine-tuning release `dpl_AEkhfVx3PikrQ4e1YPe9HR4SztgE`.
No backend changes. Code, design contract, README and focused QA are committed and
pushed. Keep this release live for requested QA.
