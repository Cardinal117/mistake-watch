# Mistake Watch Handoff

## Active: TASK-030 Personal music catalogue — 2026-09-11

Approved delivery, catalogue admission, account Like consistency and compact
Discover follow-ups are complete and live. Source `4d6d515` is published on main
and deployed as `dpl_7MoZvQqUPzXKBcQ48RdVYSoUFthi`; the custom alias and protected
health200 were verified. See the
[follow-up release receipt](tasks/TASK-030-personal-music-catalogue/follow-up-release-2026-09-11.md)
for the final deployment pointer and evidence.

Normal activity cleared the 4,503-event backlog. Country-aware admission fixed
both supplied uploads; batching canonical evidence once per account fixed the
subsequent claim timeout. Latest ZA catalogue projection: 308 ready, zero pending.
Both supplied tracks are liked; recorded Personal completions are one and zero,
respectively. No historical plays or remembered Likes were fabricated.

Like reads now respect durable timestamps, complete pagination and account scope;
the additive trusted Spacetime intent reducer repairs same-state reassertion.
Personal regulars use compact expandable cards, visible Add to queue/Add next,
and preserved song accents. The feedback Undo notice dismisses after ten seconds
of unpaused visible time, without changing seven-day exclusion.
164 Node, 127 catalogue SQL and 25 browser assertions passed, plus concurrency,
real isolated reducer checks, typecheck, lint and build. Original remembered-Like
history remains unproven. Evaluate natural listening next; classification,
time-of-day habits and community similarity require separate approved slices.

## Historical Stage 1 rollout

Stage 1 is deployed under the owner's full rollout approval. Feature `76a0b10`
merged through PR #18 as `d4b2b89`; production alias points to
`dpl_GXKN6uiWS7Cgvsb1Xhmasnk6j57d` with that exact source SHA. Migration history
matches `20260911055006`. Existing 131 rooms and 2 accounts are preserved.
See [live rollout](tasks/TASK-030-personal-music-catalogue/live-rollout-2026-09-11.md)
for migration, deployment, private-access and maintenance receipts.

Bounded owner reconciliation registered 24 references. One metadata batch admitted
6 tracks; 18 were held back by conservative eligibility checks. Live Personal
Discover shows cached suggestions with "You liked this" reasons. The observed
request sample contains no automatic YouTube search/recommendation calls.
Maintenance returned 200 with no additional batch; cached rows expire in 28 days.
Natural-use usefulness and rejected-track coverage remain evaluation work.

Local QA passed: 133 Node tests, 316 SQL assertions and 18 browser tests;
typecheck/lint/build and file-length gate passed. Independent reviews are resolved.
Hosted CI checks were absent; production build, HTTP and desktop checks passed.
The [full packet](tasks/TASK-030-personal-music-catalogue/proposal.md) covers
reusable public-source metadata, bounded background refresh/expiry and replacing
Personal's seed-triggered YouTube search with owner-evidence catalogue selection.
See [ordered work](tasks/TASK-030-personal-music-catalogue/tasks.md) and
[review evidence](tasks/TASK-030-personal-music-catalogue/review-notes.md).
Classification/provider enrichment and consented community similarity are later
stages. No SpacetimeDB publication or queue/playback/feedback test mutation was
performed. TASK-029 entries below preserve earlier release history; its former
Personal search supply is superseded by this catalogue release.

## Personal Discover — deployed 2026-09-09

Follow-up: the owner's empty-player bottom-clipping report is fixed and deployed
as `23da9d2` / `dpl_EfDVumjycp5QqTfBhvEcj29A1FQp`. Ten Personal browser checks,
typecheck, source lint and build pass; live health/readiness pass. See
[scroll correction](tasks/TASK-029-recommendation-quality-baseline/scroll-boundary-fix.md).

Historical pre-TASK-030 limitation confirmed by source review: Personal candidates
come from a YouTube search using the current track or first regular's artist/title,
then first-party reranking. This is not the requested catalogue-driven taste
engine. Completion counts power regulars/Rediscover, but current new-kind ranking
uses explicit Likes and eligible queue/play-next choices, not completion/skip
learning or time-of-day habits. Reusable metadata/candidate storage and bounded
exploration are proposed next work, not implemented by the UI or clipping releases.

The owner approved implementing TASK-029's accepted reference with the existing
per-song gradient retained. Local work now includes the regulars grid, recorded
play counts, recommendation rows, Rediscover, underline stage controls and private
reversible feedback. SpacetimeDB still owns playback/queue; additions are confirmed
from its projection. No automatic enqueue is introduced. The additive migration
was tested locally and subsequently applied to production under owner approval.

See [implementation and QA](tasks/TASK-029-recommendation-quality-baseline/implementation.md)
and [backend evidence](tasks/TASK-029-recommendation-quality-baseline/backend-verification.md).
PR #17 merged as `14f8f6c`; production deployment
`dpl_2fGQVj3WQDuqCkqYz61XpuupEufz` serves that exact source. Migration history is
aligned to `20260909150143`; existing rooms/accounts were preserved. Health,
readiness, private API access and signed-in Personal UI checks passed. See
[live rollout](tasks/TASK-029-recommendation-quality-baseline/live-rollout-2026-09-09.md)
for proof and limits. Personal listening-quality evaluation, strict
Fantasy/orchestral eligibility and Autoplay remain later work.
The [exact commit review](tasks/TASK-029-recommendation-quality-baseline/commit-review.md)
and [release plan](tasks/TASK-029-recommendation-quality-baseline/release-plan.md)
record the reviewed scope and executed sequence. Earlier approval-pending statements
in historical checkpoints are superseded by the owner's full rollout authorization.

## Recommendation baseline and proposed evaluation — historical planning

[TASK-029](tasks/TASK-029-recommendation-quality-baseline/task.md) records the
owner-approved read-only baseline/specification work at main `77c1943`.
43 existing recommendation checks passed; synthetic 500-candidate ranker p95
was 8.83 ms. Candidate supply, recording identity, cache behavior and evaluation
gaps are documented separately from live listening quality and provider quota,
which were not measured. Owner selected Personal favorites/rediscovery first,
Fantasy/orchestral for the strict-theme trial, and classical/phonk boundary cases.
Evaluation should use agent-run offline checks followed by ordinary live listening
in a bounded approved trial, not mandatory listening homework. The subsequent
Personal improvement and feedback contract are implemented locally as described
above; this baseline did not itself measure live recommendation usefulness.

## Desktop membership access - deployed follow-up

Owner-reported live QA passed except desktop Shared approvals. Both room headers
now expose the existing Shared membership/learning panel through the members icon
beside account settings. Local browser integration, responsive checks, 690 tests,
typecheck and build pass. Commit `de25e89` is pushed and live as
`dpl_54qR6ftS6vEan9pJ3vTV5yJdQzMn`; health/readiness pass. PR #16 merged as `8186d0a`; main matches the deployed
application code. See
[scope and evidence](tasks/TASK-028-room-kinds-foundation/desktop-membership-access.md).
Broader desktop settings redesign remains deferred.

## TASK-028 live release — 2026-09-09

PR #15 is merged into main as `6fc445a`; the verified production application matches main.
See the TASK-028 live rollout record for the full release receipt.

All eight reviewed durable migrations, the compatible Maincloud module and the matching Vercel frontend are deployed. Personal, Shared, Themed and Temporary creation are enabled. All 127 original rooms were preserved as Legacy; all 114 non-purge retirement receipts completed. Current source is bfe898a; follow-on documentation does not change the application. The owner authorized main live; earlier pending/approval statements below are historical. See [live rollout](tasks/TASK-028-room-kinds-foundation/live-rollout-2026-09-09.md) for exact evidence, advisor follow-ups and remaining physical QA.

## TASK-028 approved Git handoff - 2026-09-09

The user approved the reviewed three commits and branch push. Recommendation
planning is `d36323f`; the guarded foundation, eight migrations and tests are
`17242f7`. This documentation commit records the review and execution. Push target
is `origin/codex/task-028-room-kinds`; verify its final SHA after publishing.
Production/main, hosted migrations and kind activation remain unchanged by these
Git operations. See [commit review](tasks/TASK-028-room-kinds-foundation/commit-review-2026-09-09.md).
The independent SpacetimeDB performance capture remains uncommitted.

## TASK-028.7 R3 correction verified locally - 2026-09-09

[Persistent retirement evidence](tasks/TASK-028-room-kinds-foundation/implementation-028.7-R3.md)
supersedes the earlier closure release blocker. Account Close and synthetic owner
deletion stop connected sessions and return clients home with an explanation.
Transactional private jobs survive deletion, retry failures and deny stale grants;
explicit Likes must drain before deleted-room live data is purged.

690 Node tests, 290 SQL assertions, seven combined browser tests plus separate
owner-deletion QA, concurrency, replay, generated RPC parity, typecheck, lint,
build and database advisors passed. Migration eight was replayed on the verified
seven-migration scratch baseline. High remains appropriate for the hosted rollout.
Next: user local acceptance, then atomic commit preparation when requested and the
separately approved migration/live/app acceptance sequence in the .7 report.
No Git, hosted schema or production changes occurred. Production remains unchanged.
SpacetimeDB performance notifications are captured separately in the product inbox;
deployed index/planner behavior and transition-reducer latency need investigation.

## TASK-028.1 through 028.6 local foundation and audit corrections - 2026-09-09

Legacy compatibility, Personal creation/access/resume, trusted learning policy,
and Shared persistent membership/independent consent are implemented in
`.worktrees/task-028-room-kinds`, branch `codex/task-028-room-kinds`, based on main
`c64196e`. [028.4 evidence](tasks/TASK-028-room-kinds-foundation/implementation-028.4.md)
records authorization, live revocation, race fixes, verification and rollout limits.
The [five audit corrections](tasks/TASK-028-room-kinds-foundation/fixes-2026-09-09.md)
are implemented and verified locally: Shared listing visibility, independent consent
epochs, account self-withdrawal/live revocation, Play Next eligibility and automatic
Listen catalogue exclusion. Through 028.6, **683 Node tests, 267 SQL assertions and six combined browser tests**,
fresh migration replay with unchanged Legacy fixtures, concurrency, database
advisors, typecheck, lint and build passed locally. See [Temporary evidence](tasks/TASK-028-room-kinds-foundation/implementation-028.6.md).

Dashboard: <http://127.0.0.1:5384/>. Supabase project `mistake-watch-task028` uses
API 55421 / DB 55422; isolated Spacetime module on 5376 includes trusted retirement.
QA uses synthetic local Auth accounts. Personal, Shared, Themed and Temporary
creation gates are locally enabled but default off in source/migrations.
Use installed Supabase CLI 2.84.2 for local checks. All seven room-kind migrations
were replayed in a separate scratch database with real Supabase bootstrap defaults
and a schema-only Auth copy; Legacy fixtures loaded before migration one retain
identical IDs and fields. All 267 SQL assertions pass on that replay too.
The active QA database was preserved. Error-level DB lint/advisors are clear;
the inherited Shared text-to-jsonb warning remains.

Temporary rooms close after one hour without verified activity, cannot be saved
or reopened, and become purge-eligible after 24h closed. Cleanup acknowledges live
retirement before durable deletion, waits for pending explicit Likes, and retries
failures. Account Likes and catalogue assets stay. The protected daily cleanup
fallback and opportunistic work after responses mean deletion happens at the next
successful maintenance run, not exactly at 24h. UUID-only receipts explain old
expired links; returning tabs also go home with a notice retained until dismissal.
No network failure alone is interpreted as expiry.

Shared invitations request owner approval. Approved members return independently
of presence/star state. Owner removal closes consent and revokes every live session;
failed live removal is reported as pending with retry, never false success.
Consent saves and removal serialize on the same lock. Reapproval uses a fresh ID
and starts consent off. Social and Settings > People expose the controls.

A future rollout must apply reviewed durable policy/membership migrations and
publish trusted live revocation before enabling Shared. Keep the 028.3
pre-existing-history reconciliation guard; do not bypass it or roll back to weaker
access/learning rules while new-kind rooms exist. No production credentials,
hosted migration, Git publication or deployment occurred. Accepted production
remains live. Root checkout unrelated work was preserved; only the task packet
is mirrored there.

028.6 checkpoint next step was 028.7; see the newer release hold above. Hosted migration,
trusted retirement publication, scheduling/secret setup and physical-device QA
remain release gates. No Git/deployment was performed. Theme-safe recommendation
quality, continuous Autoplay and Rooms Hub remain follow-on work.

## Account compact playback live QA — 2026-09-08

Production now runs `2dadc20`, including `dc3ba38` (membership alignment) and
`f84c287` (minimized Watch dragging). Deployment:
`dpl_9ud5VPgopYH3SKJewBuyTEgPCWDH`;
https://mistake-watch-lkenmzwyt-cardinal117s-projects.vercel.app.
https://watch.mistakestudios.com resolves to this Ready candidate.

The exact two-account server-only allowlist is configured in Vercel production;
no IDs or credentials are committed. Clean tracked archive deployed; unrelated
worktree changes excluded. Production Turbopack build, health/readiness (200),
development design-route protection (404) and public dashboard browser smoke
passed. No Supabase schema or Spacetime module deployment was required.

Owner confirmed compact playback live QA and authorized push/merge. The specific
friend multi-device sign-in/removal scenario remains under observation; do not
infer that it was separately reproduced and accepted. Final pre-merge checks:
111 identity/realtime tests, typecheck and diff whitespace passed. Earlier six
browser checks and production Turbopack build passed. See [scope and evidence](tasks/TASK-027-room-flow-and-queue-response/account-compact-playback.md).

Rollback remains `dpl_2szjneG7xb5SpDtdaKjC1ijGkrGL` at
https://mistake-watch-ixh1ei4jz-cardinal117s-projects.vercel.app.
Keep this accepted release live. Push and merge of `codex/task-027-room-flow`
are authorized; the PR records the final merge result. Subsequent documentation
commits do not change the deployed application. Earlier release entries below
are historical; preserve unrelated dirty files in the worktree.

## Final release accepted and merged - 2026-09-07

Owner accepted live QA and approved the local/browser/production-build gate with no GitHub CI checks configured. PR #13 merged into main as `5411449ee80ab7d0da382154a5916474d567f1fc`, preserving the atomic commits. Production `dpl_2szjneG7xb5SpDtdaKjC1ijGkrGL` is Ready and its application code matches main; only README/release documentation differs, so no redundant deployment is needed. Earlier draft/pending statements below are historical. The unreproduced token report remains a documented follow-up.

## Free-position player deployment — 2026-09-07

Watch free positioning is live at https://watch.mistakestudios.com from `1cc7832`
(application commit `1485718`), deployment `dpl_2szjneG7xb5SpDtdaKjC1ijGkrGL`.
Immutable URL: https://mistake-watch-ixh1ei4jz-cardinal117s-projects.vercel.app.
The clean 1,149-file archive passed the production Turbopack build. Production
alias verified; health/readiness 200; Watch design route 404. These are smoke
checks; owner live QA is now accepted and merge is authorized subject to green checks.
Rollback target is the prior fine-tuning release `dpl_AEkhfVx3PikrQ4e1YPe9HR4SztgE`.
No backend changes. Code, design contract, README and focused QA are committed and
pushed. Keep this release live for requested QA.


## Previous checkpoint — TASK-027 fine-tuning live (2026-09-07)

Owner passed three-device live QA on Opera, Opera GX and Huawei Chrome. The
follow-up application at `fe7b28c` is now deployed as
`dpl_AEkhfVx3PikrQ4e1YPe9HR4SztgE` on https://watch.mistakestudios.com.
Clean Vercel Turbopack build passed; health/readiness return 200, development
routes return 404, and the dashboard was browser-verified.

Atomic fixes: `eacaad4` connection lifetime, `6342bc0` player/UI fine tuning;
`fe7b28c` records local QA. Branch `codex/task-027-room-flow` is pushed; draft
PR #13 remains unmerged for targeted rename/permission YouTube, volume switching,
fullscreen and Huawei timing acceptance. The token error remains unreproduced.

The immediately previous working frontend `dpl_2rG6qaf8oMmzbSWm453DTUQqfX8X`
is retained for rollback. Backend is unchanged by fine tuning; no new Supabase,
SpacetimeDB or Worker deployment was needed. Keep this release live pending
acceptance; do not automatically restore an older release.

[Fine-tuning scope and QA](tasks/TASK-027-room-flow-and-queue-response/live-qa-fine-tuning.md)
and [release record](tasks/TASK-027-room-flow-and-queue-response/release-candidate.md)
are canonical. Local previews remain on port 5383. Preserve separate owner
Media Session work and other unrelated checkout changes.

## Previous accepted baseline (superseded during the TASK-027 QA window)

TASK-026 Watch redesign is owner-accepted after the final Huawei production QA
on 2026-09-05. PR #12 merged as
662597a1bda7ec458017303644874353d672d462 with atomic commits c4f58a6, c98b8da
and f337792. Production was verified after merge; its application code matches
main, so the accepted deployment remains live: dpl_8ayFXZG5sE2fUoR2W2iZk2z5MmuG, application tree
0fb144fd9569146eb808f477180c5835249508cc. The prepared-YouTube additive backend
is also live; prior temporary restore instructions are superseded by acceptance.
[Release status and exact integration evidence](tasks/TASK-026-watch-room-redesign/release.md)
are canonical. [Bug reconciliation](tasks/TASK-026-watch-room-redesign/bug-reconciliation.md)
separates accepted fixes from still-open affected-profile/Listen/security work.

The release preserves the merged TASK-024 R2 gateway and all its authorization,
expiry, replay and reconnect fixes. No Worker/Supabase schema update is included.
Do not import the original checkout's unfinished Media Session/Listen work,
untracked TASK-025 packet or new personal/global-room Quick Capture into this
release. Those owner changes and the redesign safety stash are preserved.

## Earlier release evidence

TASK-024's uploaded Range gateway, reconnect/replay repairs and private
authorization logging are deployed from aa54354 as Vercel
dpl_1hQwBD9otKqAL4ouYrb4irogFShy. Telemetry commit 517766a is deployed as
Worker c801d51a at 100%, with persisted Worker logs disabled.
All 572 tests and local gates pass. Real Opera playback, background switch-away,
room/session denial and separate Chromium guest-removal checks passed.
The bounded operational sample passed: 13 authorized ranges, median 784 ms,
sample p95 895 ms and zero R2 attempts on denial. Existing budget alerts were
verified; this is not a load/SLO or notification-delivery test.
TASK-024 is complete and MW-BUG-004 is resolved/archived. The owner approved PR #11 integration on 2026-09-05. See the [closure checkpoint](tasks/TASK-024-uploaded-playback-range-gateway/review-notes.md#2026-09-05-final-review-and-task-closure).
The deployment entries below are historical milestones, not current aliases.

The production application includes guest and Google identity, Watch/Listen
rooms, SpacetimeDB live authority, YouTube and uploaded-media playback,
large-queue performance work, media uploads/processing, and Media Session
integration.

TASK-009 is complete on `main`. Its batches cover private object delivery,
playlist-selection correctness, room startup/readiness, database integrity,
test infrastructure, and documentation reconciliation. Merge commit `5c5ab4b`
passed the complete release gate and was deployed to production as
`dpl_4TGx7PqWASe2kFbHMYKtFr4kdKTx`.

TASK-010 Watch Media Hub Performance is also complete on `main`. Commit
`b365b00` was deployed as `dpl_Es7z7LZd1AwwSyqtFagfXbAokgBm`; automated
performance gates, production health/readiness, and user acceptance passed.
TASK-011 First-Party Recommendation Intelligence is live. Commits through
`a163a4b` are on `main` and production deployment
`dpl_AFfECQewb4i9m6F5QwABLp3FzpvW` is active. Functional QA, attached-account
provider search, playback, queue continuity, recommendation refresh, and
private uploaded-media boundaries passed. Two post-attachment account Likes are
now represented by durable Supabase preference state; a 2026-08-17 read-only
check found four liked rows for one account. The local `MW-BUG-005` follow-up
adds bounded active-client reconciliation. Commit `444b78f` is deployed as
`dpl_3Z6mYK4tyqLtowcppLK6e2tSSz8t`; production health/readiness passed, and
owner two-device QA measured four-second no-refresh convergence. TASK-011 is
complete.

TASK-014 Account Rooms Projection is on `main` as `d415362` and deployed to
Vercel production as `dpl_C2A6j4qFrEkoa82hocq7wiyCLXJX`. It fixes the confirmed
dashboard dependency on guest cookies, adds a private account-room API and
Account Rooms surface, and requires no migration. All 334 tests, typecheck,
ESLint, formatting, file-length policy, production build, desktop/mobile visual
checks, production health/readiness, and guest API denial passed. Signed-in
owner QA found that signed-in create/save could remain browser-scoped.
TASK-014B now implements automatic account attachment for signed-in create,
invite join, and save, plus explicit Unsave, Leave, Close, and Archive controls.
Its 341-test, typecheck, ESLint, formatting, file-length, build, and local visual
gates pass. Commit `a0cf709` is on `origin/main` and deployed to production as
`dpl_2kBX4Eg2iS7R6ve46RBhNfQVSjWd`; both public aliases passed health and
readiness checks. Signed-in owner QA remains required.

TASK-018 private local audio analysis and TASK-019 shared rhythm publication
are complete. TASK-019 passed production with extension `0.6.2`, website commit
`75f33ef`, and an extension-free participant receiving synchronized Siri
Ribbon. Its implementation and follow-up visualizer commits are now included in
`main` through the TASK-021 release line.

TASK-021 Listen Room Experience Overhaul is complete on `main`. Its responsive
shell, player rail, multi-shelf Discover surface, Visualizer stage, artwork
palette, participant entry point, Up Next preview, floating queue, and browser
preferences passed focused and integrated QA. The release is included in commit
`a1f6b1c` and Vercel deployment `dpl_8Qfx6zZ8rLeiDZbT9TAGPnpt8Gwr`.

MW-BUG-003 bounded YouTube startup recovery is also live in `a1f6b1c`. A stalled
player receives one automatic clean recreation after 12 seconds; a second
failure exposes a cooldown-protected manual reload action. All 507 tests and
the build gates passed, production health/readiness is green, and the item
remains in progress only until the affected participant completes live QA.

TASK-015C remains the next visualizer evidence item. Siri Ribbon's bounded
five-lobe presentation is part of the released Listen composition, but the
affected-laptop active/paused/hidden performance and shared-timing matrix is
still incomplete. Static Artwork remains the safe default.

TASK-022 Direct Play Action Parity is complete on `main`. PR #3 merged as
`bbe77e605dcbeed8aabe156da6f6d5b3c5f188cb` and was deployed to production as
`dpl_DNQVK18gyshf5AiPZ7oJoTCFLBn4`. Both production aliases passed health and
readiness with Supabase and SpacetimeDB ready. Opera desktop and 390x844 Add
Media QA, guest catalogue denial, pasted-link Play Next ordering,
two-participant queue/playback continuity, and guest room/session Like refresh
persistence passed before release. Signed-in owner production QA then confirmed
that a direct-source Like persisted through refresh after seven seconds and an
Unlike persisted through a second refresh. No rollback was required.

TASK-020 TV Mode Control Parity is complete on `main`. PR #4 merged as
`a6747f8b8792987db06c0aee42969dc05dfe4e3a` and was deployed to production as
`dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`. Signed-in owner QA confirmed TV mode Like
and Unlike persistence across normal Listen, reload, tab close/reopen, and TV
re-entry. The existing display settings, Escape ordering, focus restoration,
idle-control reveal, direct-source identity, and two-participant continuity
passed their release gates. Closure documentation is on `main` as `eeb456c`.

MW-BUG-004's original P1 defect led to TASK-023's rejected Candidate A.
With a 1.2-second lease, Playwright Chromium
149.0.7827.55 and Opera GX 150.0.7871.187 each requested the stable URL once,
then sent later Range requests directly to the redirected object. The first
post-expiry request (`bytes=524288-`) received `403`; neither browser revisited
the stable route, and both media elements entered network error state. The
result reproduced twice. TASK-024 supersedes that experiment; do not restore
redirect renewal, lengthen signatures, expose permanent R2 URLs, remount the
player, use a hidden second player, or publish renewal as canonical room state.

TASK-024 delivers a stable same-origin media URL through a Vercel external
rewrite to the private R2 Worker. Direct custom Worker hostnames were rejected
by Opera. A path-scoped HttpOnly credential and Worker-origin secret require
current room, membership, session and asset authorization before each R2 read.
The Worker fetch failure was a native fetch receiver-binding error, corrected
with a wrapper and verified in workerd. No schema or R2 privacy change was
needed. The owner approved the existing opaque media-session reference in
canonical state; credentials and object addresses remain excluded. Playback
and revocation evidence passed, as did the bounded latency/operation sample and
monitoring review. Final task review and intake closure are complete; PR #11
has explicit owner approval for undrafting and merging.

## Required Reading

1. `AGENTS.md`
2. `DESIGN.md`
3. `docs/product-intake/README.md`
4. `docs/product-intake/INBOX.md`
5. `docs/product-intake/INDEX.md`
6. `docs/ROADMAP.md`
7. `docs/tasks/TASK-011-first-party-recommendation-intelligence/`
8. `docs/tasks/TASK-014-account-rooms-projection/`
9. `docs/tasks/TASK-014B-account-room-lifecycle/`
10. `docs/tasks/TASK-010-watch-media-hub-performance/`
11. `docs/tasks/TASK-009-project-integrity/`
12. `supabase/MIGRATION_HISTORY.md`
13. `docs/tasks/TASK-023-uploaded-playback-url-renewal/task.md`
14. `docs/tasks/TASK-024-uploaded-playback-range-gateway/`
15. `docs/tasks/TASK-002-incomplete-work-recovery/` for historical detail

TASK-001 is historical MVP context. TASK-007 records completed modularization
work and discovered issues. TASK-008 Spatial Cinema is an unapproved draft.

## Runtime Boundaries

- Supabase: durable product and authorization records.
- SpacetimeDB: active room authority and synchronized state.
- R2: private media objects.
- CloudConvert: optional, costed conversion jobs.
- Vercel: Next.js hosting and Speed Insights.

Permanent R2 URLs must not enter catalogue responses, queue/live state, or
player props. Catalogue access and room playback are separate authorization
paths.

## Local Gate

```powershell
npm install
npm run dev
npm run dev:check
npm test
npm run test:e2e
npm run typecheck
npm run lint
npm run build
npm run check:file-lengths
```

Local browser QA cannot prove Google OAuth callback behavior, multi-participant
sync, cloud R2 delivery, or provider playback. Record those as production/manual
checks.

## TASK-009 Release Evidence

- Supabase migration `20260714153348 task009_database_integrity_indexes` is live.
- The three missing-foreign-key advisor findings are resolved.
- `r2.mistakestudios.com` is disabled and its hostname cache was purged.
- Retained permanent R2 URLs return `401`.
- Owner poster delivery redirects to private R2 with a five-minute signature;
  unauthenticated access returns `403`.
- `/api/health`, `/api/ready`, owner/guest catalogue authority, uploaded
  playback, and shared room playback passed live QA.

Do not repair migration-history rows by guesswork. The CloudConvert uniqueness
index is live while its local migration is absent from remote history; the
verified discrepancy is documented rather than silently rewritten.

## Next Product Direction

Owner approved [TASK-027 room flow and responsive queue](tasks/TASK-027-room-flow-and-queue-response/proposal.md)
on 2026-09-07, explicitly requiring documentation before implementation. The
isolated `codex/task-027-room-flow` worktree starts at refreshed main `c0b8247`.
Documentation is prepared; application work remains pending. Follow its ordered
queue/playlist, Watch browsing/header, then mobile Listen compact-bar/drag-up
batches and acceptance matrix. No additional approval is needed for scoped
local implementation; Git/production release remains separate.

The original checkout's dirty Listen/transport/Media Session work and untracked
TASK-025 draft remain untouched. Reconcile those overlaps before Listen edits.
The new compact bar direction replaces the earlier floating Listen dock proposal
for TASK-027, while TASK-025's broader performance investigation stays separate.

TASK-026 Watch browsing/touch flow is accepted. Recommendation shelves and
provider-account signals remain follow-ups; Watch completion does not close the
full TASK-002.10F Add/Discover/recommendation direction.

TASK-024 is closed with its deployed QA evidence retained. The owner approved PR #11
integration; do not redeploy older main over the verified candidate. Candidate A remains rejected.

The next existing backlog priority is to verify MW-BUG-003 in the affected
participant profile. Later evidence work covers TASK-015C performance/shared
timing and reconciliation of the already-released Account Rooms owner QA. TASK-020 and TASK-022
are complete and no longer block the release order.

### TASK-027 first local candidate

Queue responsiveness/virtualization and playlist repair are implemented locally.
[QA links, results and remaining acceptance](tasks/TASK-027-room-flow-and-queue-response/local-qa.md).
This earlier checkpoint preceded 027.3 below; mobile Listen 027.4 remains pending.
No production release or Git publication is included in this checkpoint.


### TASK-027.3 local Watch review

The browse-first Watch shell and shared header are implemented locally in the
TASK-027 worktree. [027.3 behavior, QA and review routes](tasks/TASK-027-room-flow-and-queue-response/watch-local-qa.md)
separate fixture checks from real-room/device acceptance. No release was made;
027.4 mobile Listen expansion remains the next implementation slice.

Owner QA refinements are documented in [027.3 follow-up](tasks/TASK-027-room-flow-and-queue-response/watch-refinements.md): Cinema/paused player, body dragging, compact mode controls and continuous browsing surfaces. Local only.
