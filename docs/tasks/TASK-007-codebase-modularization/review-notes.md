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
- Run owner-authenticated watch/listen switching and uploaded-media smoke QA on
  a preview deployment before merging to `main`.
- Do not push or deploy until explicit approval.

## Discovered issue register

See `discovered-issues.md` for the confirmed sync defects, permanent R2 URL
hardening concern, preview QA gap, remaining monoliths, static-loading boundary,
source-test brittleness, hydration observation, and multi-agent isolation note.

See `split-inventory.md` for the exact before/after line totals, every extracted
module, its responsibility, and the remaining Batch 2-3 targets.
