# TASK-030 commit and release preparation

Prepared 2026-09-11. **Ready for the scoped Git action below.** No source or test
changes were made during preparation. Nothing staged, committed, pushed or
deployed by this preparation step.

Owner approval received on 2026-09-11: create the proposed TASK-030 branch,
commit the reviewed manifest with the message below, and push that branch to
origin. This supersedes the pending Git approval wording in the preparation
record. Production migration, merge and deployment remain separate.

## Exact Git scope

- Current branch: `codex/task-029-personal-discover`.
- Base: `e8fa1f9c44fc200f56c43aaf24d82c4910a8b560`.
- Remote: `origin`, `https://github.com/Cardinal117/mistake-watch.git`.
- Remote main was checked with `git ls-remote` and matches the base above.
- The old TASK-029 remote branch remains at `3563b73184220128fdf858e0918ab19f758ff3f0`.
  Its four-commit difference is already on main; do not present it as new TASK-030
  work. Prefer a new branch for this completed task.
- Proposed branch: `codex/task-030-personal-music-catalogue`, from current HEAD.
- Proposed grouping: **one atomic feature commit**, including implementation,
  additive migration, tests and its specification/QA/release documentation.
  The server expects the new RPCs, so splitting these into independently
  deployable application and schema changes would misrepresent their dependency.

Proposed commit message:

```text
feat(recommendations): serve personal discovery from cached catalogue

Replace automatic Personal title/artist searches with owner-evidence catalogue
candidates. Add public metadata caching, bounded refresh and expiry, plus
server decision records while preserving explicit queue and feedback actions.

Document the Stage 1 contracts, isolated database QA and staged release plan.
```

On approval: create the proposed branch, stage only the manifest below, inspect
the staged diff, commit with this message and push to the same branch at origin.
Use a normal push, never force. Recheck remote main before starting; report any
new divergence rather than silently folding unrelated work into this candidate.
Git approval does not apply the production migration or merge/deploy main.

## Manifest and exclusions

At inspection: zero staged files, 19 modified tracked files and 19 new files.
This report adds one new documentation file: **39 files total** in the proposed
commit. The handoff/proposal links added during preparation are in existing
manifest files. All paths below are relative to the repository root.

```text
.env.example
app/api/recommendations/discover/route.ts
app/api/recommendations/drain/route.ts
components/room/listen/discovery/personal-discovery-panel.tsx
components/room/listen/discovery/personal-track.tsx
components/room/listen/discovery/use-personal-discovery.ts
lib/recommendations/catalogue-contracts.ts
lib/recommendations/catalogue-discovery.ts
lib/recommendations/catalogue-service.ts
lib/recommendations/catalogue-worker-core.ts
lib/recommendations/discover-contracts.ts
lib/recommendations/discover-service-core.ts
lib/recommendations/discover-service.ts
lib/supabase/database.types.ts
supabase/migrations/20260911055006_personal_music_catalogue.sql
supabase/tests/database/music-catalogue.test.sql
scripts/qa/catalogue-concurrency.mjs
tests/e2e/personal-discover.spec.ts
tests/fixtures/personal-discover-fixture.ts
tests/recommendations/catalogue-discover.test.mjs
tests/recommendations/catalogue-worker.test.mjs
tests/recommendations/discover-contracts.test.mjs
tests/recommendations/discover-service.test.mjs
docs/COMMANDS.md
docs/HANDOFF.md
docs/product-intake/INDEX.md
docs/recommendation-engine-direction.md
docs/tasks/TASK-002-incomplete-work-recovery/tasks.md
docs/tasks/TASK-029-recommendation-quality-baseline/task.md
docs/tasks/TASK-030-personal-music-catalogue/acceptance-criteria.md
docs/tasks/TASK-030-personal-music-catalogue/brain-dump.md
docs/tasks/TASK-030-personal-music-catalogue/commit-review.md
docs/tasks/TASK-030-personal-music-catalogue/database.md
docs/tasks/TASK-030-personal-music-catalogue/design.md
docs/tasks/TASK-030-personal-music-catalogue/local-database-qa.md
docs/tasks/TASK-030-personal-music-catalogue/proposal.md
docs/tasks/TASK-030-personal-music-catalogue/release-plan.md
docs/tasks/TASK-030-personal-music-catalogue/review-notes.md
docs/tasks/TASK-030-personal-music-catalogue/tasks.md
```

The intake index diff only adds TASK-030's current-focus pointer. INBOX/Quick
Capture and unrelated item statuses are unchanged. No `.env` credentials,
ignored QA output, caches, generated client bindings, package changes or media
files are included. A bounded obvious-key/private-key pattern check found no
matches; this is not a claim of an exhaustive credential/security audit.

## Change review and QA

Personal GET uses the cache-aware owner RPC and schedules bounded preparation
after the response. The panel no longer seeds automatic provider search. The
worker batches IDs and independently prunes expiry before room persistence.
The migration adds private catalogue storage and server-only RPCs, preserves
preferences/consent, and records diagnostic decisions without granting browser
observations authority over learning or the live queue.

The [QA record](review-notes.md) contains the reviewed behavior and test evidence:
133 Node tests, 77 new plus 239 existing SQL assertions, and 18 browser tests pass;
typecheck, lint, build, concurrency, clean migration replay, database advisors and
file-length gate passed. Existing lint/advisory warnings are documented there.

Testing is mixed and recorded honestly: behavioral red/green for no-search,
cached reading and specific worker/decision corrections; existing UI
characterization; post-hoc SQL/worker/expiry coverage supplemented by independent
review and real concurrency. Documentation is exempt from artificial tests.
Preparation changes documentation only, so it does not justify repeating the
unchanged application/database suites. Whitespace and manifest checks are rerun.

## Release readiness and boundaries

Ready for commit and branch publication. Production readiness still requires
the [release sequence](release-plan.md): hosted parity preflight, additive
migration and advisors, bounded pilot reconciliation, application deployment,
then signed-in and natural-listening checks. No real provider calls or live
recommendation usefulness have been measured by local synthetic QA.

The cache's 28-day expiry needs working physical cleanup. A disabled worker must
retain cleanup, and an application rollback must preserve maintenance or purge
the cache. The short global write lock favors pilot correctness; monitor actual
contention before redesigning it. Stage 1 selects familiar owner references;
genre enrichment, cross-user recommendations and automatic queue refill remain
outside this commit.

Approval choices: commit only; or create the proposed branch, commit and push
that branch. Production migration, merge and deployment remain separate actions.
