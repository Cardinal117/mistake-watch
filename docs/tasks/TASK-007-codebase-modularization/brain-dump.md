# TASK-007 Brain Dump

## User intent

- Keep Mistake Watch understandable for human and AI maintainers as features accumulate.
- Use file length as an architecture warning, not a reason to create arbitrary fragments.
- Use two parallel agents only where file ownership is disjoint.
- Inspect and integrate every agent patch centrally.
- Run local tests and browser QA before calling any batch successful.
- Preserve all current behavior, permissions, security boundaries, playback synchronization, uploaded-media access, and visual design.

## Verified baseline

- Safety commit: `b3ba03a`.
- Safety tag: `pre-modularization-2026-07-13`.
- Integration branch: `refactor/codebase-modularization`.
- Largest handwritten files:
  - `components/room/listen-mode-layout.tsx`: 6,046 lines.
  - `components/room/watch-mode-layout.tsx`: 4,418 lines.
  - `components/room/queue-panel.tsx`: 2,205 lines.
  - `spacetime/src/index.ts`: 2,193 lines.
  - `lib/media/assets.ts`: 1,939 lines.
  - `lib/spacetime/use-live-room.ts`: 1,559 lines.
- Existing room entry baseline: 588.4 KB raw / 150.4 KB gzip JavaScript and 157.8 KB raw / 22.3 KB gzip CSS in the latest local production build.
- Existing `npm run test:sync` baseline is 62 passing and 2 pre-existing failures.
- Untracked screenshot directories are unrelated and must remain untouched.

## Working rule

Split because responsibilities have diverged. Move behavior first, deduplicate second, and optimize loading only after module boundaries are stable.
