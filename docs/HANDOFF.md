# Mistake Watch Handoff

Updated: 2026-08-26

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
Ribbon. The feature branch is nine commits ahead of `origin/main`; production
release does not itself authorize merging that branch.

TASK-015C is the active work item. Commit `7951355` is deployed and replaces
Siri Ribbon's high-cost travelling lines with bounded five-lobe Bezier
geometry. Corrected production QA confirms the canvas and rhythm response, but
the ribbon is too faint behind the room composition and the laptop performance
matrix is incomplete. Static Artwork remains the safe default.

TASK-021 is now actively implemented in the feature worktree. Batches A-E and
the approved visual-refinement gate are user accepted and pass focused browser,
automated, type, lint, build, formatting, and file-length checks. The work is
not committed or deployed yet. Batch F still requires expanded-queue,
safe-area, large-queue, accessibility, and integrated release verification.

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

Create atomic checkpoints for the accepted TASK-021 implementation, then finish
Batch F without widening scope: preserve queue virtualization, verify the open
drawer and history at large scale, complete mobile safe-area and keyboard
coverage, and run the integrated production-candidate comparison.

TASK-015C's affected-laptop performance and shared-timing evidence remains a
separate visualizer gate. Static Artwork remains the safe default. Do not fold
account persistence, richer shared frequency events, GetSongBPM, or the future
Watch/Add Media overhauls into TASK-021 Batch F.
