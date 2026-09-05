# Mistake Watch Handoff

Updated: 2026-09-05

## Current State

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

TASK-026 Watch browsing/touch flow is accepted. Recommendation shelves and
provider-account signals remain follow-ups; Watch completion does not close the
full TASK-002.10F Add/Discover/recommendation direction.

TASK-024 is closed with its deployed QA evidence retained. The owner approved PR #11
integration; do not redeploy older main over the verified candidate. Candidate A remains rejected.

The next existing backlog priority is to verify MW-BUG-003 in the affected
participant profile. Later evidence work covers TASK-015C performance/shared
timing and reconciliation of the already-released Account Rooms owner QA. TASK-020 and TASK-022
are complete and no longer block the release order.
