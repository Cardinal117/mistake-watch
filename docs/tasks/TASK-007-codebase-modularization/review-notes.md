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
