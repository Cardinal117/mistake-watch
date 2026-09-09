# TASK-029 commit review

Prepared 2026-09-09. **Ready for the reviewed Git step.** No files staged, no
branch created, no commit/push/merge/deployment performed by this preparation.

## Identity and scope

- Checkout: `C:/Users/Admin/.codex/worktrees/f21c/watch-together-platform`.
- Current HEAD: detached at `77c1943c3e712ccfec57054eee8d99254ddba205`.
- Remote: `origin`, `https://github.com/Cardinal117/mistake-watch.git`.
- Remote main was checked read-only and still matches that HEAD.
- Proposed branch: `codex/task-029-personal-discover`; absent on the remote at review.
- Scope: 12 tracked modified files and 31 untracked files, including these two
  preparation documents. The 43 exact paths are enumerated below.
- Staged: empty. No product-intake Quick Capture/index files changed. Other
  worktrees are outside this commit and remain untouched.
- `.env.local`, `.tmp`, test traces/results and dependency directories are ignored
  and excluded. Five curated PNGs are intentional reference/QA documentation
  (approximately 3.6 MB total), not generated application output or owner history.

## Atomic grouping and proposed message

One feature commit is recommended. The new Personal UI relies on its new API,
durable projection/feedback schema and ranking filters. Keeping these with their
tests and approved design/QA record gives reviewers one complete feature scope.
The deployment sequence still applies the database migration before the frontend.

```text
feat(listen): add personal discover regulars and feedback

Replace Personal Discover carousels with counted regulars, recommendation rows
and rediscovery while preserving the song-driven gradient and player controls.

Persist owner-only reversible suggestion feedback, filter Personal ranking,
and distinguish queue requests from confirmed queue presence. Add database,
concurrency and responsive browser coverage plus the approved design/QA record.
```

## Review summary

- Regulars, truthful 180-day completion counts and independent Likes; bounded
  liked/frequent/older supply and metadata hydration; no fabricated history.
- Flat recommendations, responsive Rediscover, keyboard/touch feedback menu,
  View all/Back focus restoration and updated Discover/Visualizer tabs.
- Existing SpacetimeDB queue/playback authority retained; add pending/confirmation,
  duplicate protection and timeout/retry; no automatic queue fill.
- Private feedback with 7-day snooze, video-specific exclusions and reversible
  revision-checked updates; untrusted observations never become learning evidence.
- Independent review corrected unsafe fallback, candidate starvation, focus/count
  accessibility, wrong recommendation seed and partial-Like-snapshot behavior.
- No dependency/lockfile change, new provider access, runtime secrets, SpacetimeDB
  publish, upload pipeline change or unrelated room redesign.

## Verification and chronology

The current local evidence was inspected, not rerun needlessly during report-only
preparation. No implementation source changed during this preparation.

| Check | Evidence |
| --- | --- |
| Node | 699 passed, zero failures/skips |
| Browser | 19 passed, including real local Personal route and existing mobile navigation; the 3 responsive cases also passed after adding final-row reachability checks |
| SQL | 39 rollback assertions passed in isolated schema-only clone |
| Concurrency |Two PostgreSQL sessions proved CAS winner/idempotent action retry |
| Static/build |Typecheck, lint, production build passed; diff whitespace check passed |
| Advisors |Isolated local schema security/performance checks had no warn/error issues |
| Visual |Desktop/mobile/landscape/tablet inspected, including lower content; dynamic gradient and original media-element preservation tested |

Testing chronology is mixed and explicitly documented: core suppression/UI/RPC
contracts had red-before-green evidence; candidate starvation regression cases
failed before the fix. Additional integration/responsive coverage was added
post-implementation and exercised by independent review and actual-route testing.
Documentation/reference images are exempt from behavior tests. This is local QA,
not a hosted CI pass or proof of physical-device/provider/listening quality.

Detailed evidence: [implementation](implementation.md),
[backend verification](backend-verification.md), [baseline](baseline.md).

## Risks and release conditions

One migration is required before the new frontend. Missing schema disables Personal
Discover/ranking honestly. It also wraps retention cleanup, so verify existing
cleanup behavior after migration. Metadata availability and recommendation quality
still need live evaluation; counts are retained completion occurrences, not lifetime
listens. The frontend rollback keeps the new private data but pauses the trial.
No known local acceptance blocker remains. See [release plan](release-plan.md).

## Proposed approval

Approve creating `codex/task-029-personal-discover`, staging only the exact paths
below, committing with the message above and pushing that branch to `origin`.
Merge, hosted migration and production deployment remain outside this approval.
At execution, recheck file content/status and remote main; any new unrelated work
must remain excluded. Do not use blanket `git add .`.

## Exact file scope

```text
app/api/recommendations/discover/route.ts
components/room/listen/discovery/discovery-panel.tsx
components/room/listen/discovery/personal-discovery-panel.tsx
components/room/listen/discovery/personal-discovery.css
components/room/listen/discovery/personal-track.tsx
components/room/listen/discovery/use-personal-discovery.ts
components/room/listen/stage/listen-content-stage.tsx
DESIGN.md
docs/HANDOFF.md
docs/tasks/TASK-029-recommendation-quality-baseline/acceptance-criteria.md
docs/tasks/TASK-029-recommendation-quality-baseline/backend-verification.md
docs/tasks/TASK-029-recommendation-quality-baseline/baseline.md
docs/tasks/TASK-029-recommendation-quality-baseline/commit-review.md
docs/tasks/TASK-029-recommendation-quality-baseline/design.md
docs/tasks/TASK-029-recommendation-quality-baseline/discover-actual-route.png
docs/tasks/TASK-029-recommendation-quality-baseline/discover-design-reference.md
docs/tasks/TASK-029-recommendation-quality-baseline/discover-implemented-desktop.png
docs/tasks/TASK-029-recommendation-quality-baseline/discover-implemented-mobile-lower.png
docs/tasks/TASK-029-recommendation-quality-baseline/discover-implemented-mobile.png
docs/tasks/TASK-029-recommendation-quality-baseline/discover-reference-v1.png
docs/tasks/TASK-029-recommendation-quality-baseline/implementation.md
docs/tasks/TASK-029-recommendation-quality-baseline/release-plan.md
docs/tasks/TASK-029-recommendation-quality-baseline/task.md
docs/tasks/TASK-029-recommendation-quality-baseline/tasks.md
lib/recommendations/discover-contracts.ts
lib/recommendations/discover-service-core.ts
lib/recommendations/discover-service.ts
lib/recommendations/personal-discovery-model.ts
lib/recommendations/request-budget.ts
lib/recommendations/room-service-core.ts
lib/recommendations/room-service.ts
lib/recommendations/use-media-preferences.ts
lib/supabase/database.types.ts
scripts/qa/discover-concurrency.mjs
supabase/migrations/20260909150143_personal_discover_feedback.sql
supabase/tests/database/personal-discover.test.sql
tests/e2e/listen-home-navigation.spec.ts
tests/e2e/personal-discover-live.spec.ts
tests/e2e/personal-discover.spec.ts
tests/fixtures/watch-design-fixture.tsx
tests/recommendations/discover-contracts.test.mjs
tests/recommendations/discover-service.test.mjs
tests/recommendations/room-service.test.mjs
```
