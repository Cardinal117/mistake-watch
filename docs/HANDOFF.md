# Mistake Watch Handoff

Updated: 2026-08-31

## Current State

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
13. `docs/tasks/TASK-002-incomplete-work-recovery/` for historical detail

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

First, verify MW-BUG-003 in the affected participant profile on production.
Normal playback should remain unchanged; if startup stalls, prove one automatic
recovery or the bounded manual reload state without queue, authority, or
canonical-position mutation.

After that, complete TASK-015C's affected-laptop performance and shared-timing
evidence. TASK-022 is complete and no longer blocks the release order. Refresh
and review PR #4 against current `main`, then reconcile the already-released
Account Rooms work before choosing the next independent item.
