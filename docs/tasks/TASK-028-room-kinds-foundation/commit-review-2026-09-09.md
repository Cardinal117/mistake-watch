# TASK-028 commit and release preparation

Date: 2026-09-09. Review prepared before Git approval; execution update below. Hosted rollout remains separately gated.
Scope: cumulative 028.1-028.6, audit corrections and verified 028.7 R3 retirement.

## Review result

No new release-code blocker found in the reviewed local candidate. The previously
reproduced R3 authority gap is corrected and verified. Remaining hosted schema,
provider and physical-device checks are release gates, not claimed local coverage.
The SpacetimeDB dashboard performance capture is a separate investigation and is
excluded from these implementation commits; its deployed query plans are unverified.

Remote was refreshed during this review. HEAD and origin/main both equal
`c64196e6d70b40643d5926073b89a902fd13a128`; divergence is 0/0. Candidate branch:
`codex/task-028-room-kinds`, remote `https://github.com/Cardinal117/mistake-watch.git`.
The real Git index is empty. No commit, push, PR, merge or hosted mutation occurred.

There are 65 tracked files with substantive diffs and 80 untracked files at review
start. Tracked diff alone is 1,668 insertions / 214 deletions, excluding the substantial
new migrations/tests/components. Raw status also lists line-ending-only generated
files and next-env.d.ts; they have no substantive diff and are excluded. The two
new review documents are additional documentation. Exact scope is in
[the manifest](commit-scope-2026-09-09.md).

## Proposed commits

1. `docs(recommendations): record approved engine direction`
   - One existing untracked direction document. Preserves research decisions;
     does not claim a new ranker, blending or continuous Autoplay implementation.
2. `feat(rooms): add guarded room kinds and reliable lifecycle retirement`
   - 125 application, live-module, generated-client, migration and test files.
   - Includes all eight ordered SQL migrations, Personal/Shared/Themed/Temporary
     access/learning/lifecycle protections, Legacy compatibility, frontend entry,
     cleanup route/cron and default-off creation switches.
   - Keep tests with implementation. Splitting this cumulative code by historical
     slice would produce intermediate imports/guards that were never verified.
     A single functional commit is larger but preserves the complete invariant.
3. `docs(rooms): record foundation verification and rollout boundaries`
   - 20 README/handoff, task packet and review files. Includes historical red evidence
     with an explicit superseding R3 correction; no rewriting of test chronology.

The product inbox remains unstaged. It contains a separate owner performance report.
Ignored environments, .tmp output, build caches, local credentials, Supabase runtime
state and browser screenshots are excluded. Local QA scripts/fixtures/config are
intentional source and use synthetic data/local service guards. Checked changed
files for private-key/GitHub-token/AWS-key/JWT literals: no matches. This is a
bounded scan, not a claim of comprehensive security certification.

## Verification and testing chronology

- Existing Legacy behavior was characterized before introducing new-kind behavior.
- Per-slice test-first and correction chronology is retained in the implementation
  reports. Cumulative integration extensions are post-hoc, not recast as test-first.
- R3 had two browser red reproductions; corrected SQL baseline failed before its
  migration. Closure is now part of the normal Shared test; owner deletion has
  separate actual multi-session coverage. Fixture errors are identified separately.
- Latest unchanged-code results: 690 Node tests; 290 SQL assertions across ten files;
  seven combined browser tests; separate owner-deletion, concurrency and replay passes.
- Typecheck, lint, build and database advisors passed. Eight migrations have been
  verified on the replay baseline; generated RPC parity covers 22 declarations.
  Existing Spacetime generation/build evidence remains applicable: no subsequent
  live-source edits. Review checks introduced documentation only, so the suites
  were not repeated without a new code change or unresolved test failure.
- Reviewed default-off entry/action checks, local-only QA route, service-only
  retirement, pending-Like purge protection, generated changes and deployment config.
- Local production-mode evidence from .7: disabled new-kind entry, QA route 404,
  unauthenticated cleanup 401. R3 build passes; hosted runtime has not been checked.

## Concrete next operations

After approval of the three commits and branch push:

1. Revalidate the manifest, secret exclusions, diff and empty index. Stage each
   group exactly, inspect staged diff, create its specified commit and record SHAs.
2. Verify the resulting source matches the reviewed candidate, then push
   `codex/task-028-room-kinds` to origin. Do not push main or merge automatically.
3. A branch push may trigger the repository's configured Vercel preview. Keep new
   creation gates off and do not describe an automatic preview as operational QA:
   the matching hosted schema/live contract are still prerequisite.

Hosted preparation requires its own approved environment and scope. Before changes:
inspect migration history and existing non-Legacy data, verify backup/recovery,
run the reconciliation precondition, and determine safe live-client compatibility.
Do not bypass migration guards or publish --break-clients to production by default.
Use an isolated hosted database/live module for preview rehearsal when available;
otherwise agree a controlled QA window before touching the shared authorities.

Apply eight migrations in timestamp order, publish the compatible trusted live
module, deploy matching app bindings from a clean Git export, and verify CRON_SECRET,
cleanup scheduling/retries and health. Confirm all creation switches remain off
until the selected kind's QA activation is approved. Ignored files must not enter
the upload manifest. Rehearse this sequence before considering production activation.

Hosted acceptance still needs distinct accounts and duplicate-account devices,
permissions/invite denial, closure/deletion/rejoin, Watch/Listen/volume continuity,
real YouTube, R2 playback beyond expiry, and physical mobile rotation/fullscreen.
Then obtain user acceptance before PR/merge and final production activation.

Rollback disables new creation while retaining kind-aware privacy, learning,
retirement and stale-grant protection. Do not revert to unrestricted old room
semantics or drop/relabel new-kind data. See the original
[rollout review](implementation-028.7.md) and [R3 evidence](implementation-028.7-R3.md).

## Effort

Medium is sufficient for the bounded approved commit/push operation. Use High for
hosted migration/live compatibility, rollout and any performance-causality diagnosis.

## Approved Git execution

The user explicitly approved the three commits and branch push, then asked to
verify the next step after interruption. No partial commit/index change had occurred;
all 146 reviewed files matched the recorded SHA-256 snapshot before staging.

- `d36323f` - recommendation-engine direction (one file).
- `17242f7` - complete guarded room foundation and tests (125 files).
- This documentation commit records the approved execution and prior review.

Staged checks caught one extra trailing blank line in the Personal migration.
It was removed; SQL behavior is unchanged. Exact staged groups and whitespace
checks passed. No test suite was repeated solely for documentation/EOF whitespace.
The earlier local verification remains applicable to the committed code.

Push target: `origin/codex/task-028-room-kinds`. The next operation is the approved
branch push followed by remote-SHA verification. No main merge or hosted migration
is authorized by this Git step. The separate performance capture stays unstaged.
