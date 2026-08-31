---
id: TASK-022
status: qa-ready
type: compact-task
related: [MW-QOL-010, TASK-002, TASK-011]
created: 2026-08-27
updated: 2026-08-31
---

# Direct Play Action Parity

## Objective

Give a directly loaded YouTube source the same account Like identity and pasted
URL Play Next action available to queue-backed media, without redesigning Add
Media or changing queue authority.

## Scope

- Derive the active YouTube preference target from the canonical session source.
- Reuse the real queue row when it matches the active source.
- Keep discovery and queue operations tied to real queue rows.
- Add Play Next to pasted single-URL previews in both established Add Media
  surfaces.
- Use the existing one-shot `isPlayNext` queue contract, duplicate confirmation,
  permissions, feedback, and server-authoritative transition path.

## Exclusions

- No database, Supabase policy, SpacetimeDB reducer, or public API change.
- No recommendation-ranking, preference-storage, or queue-ordering change.
- No playlist Play Next behavior or Add Media redesign.
- No synthetic item may enter room, queue, history, or discovery state.
- No Git publication or production deployment is part of this implementation
  checkpoint.

## Decisions

- The session's active YouTube URL is canonical for Like identity because direct
  Play Now media may not own a queue row.
- A view-only synthetic item is allowed only at the preference-control boundary.
- Non-YouTube media keeps its existing queue-backed preference behavior.
- Pasted Play Next sets `isPlayNext: true` before duplicate confirmation so the
  confirmed item retains the requested action.

## Risks

- A stale queue row must not make the Like control target the previous video.
- The synthetic preference target must not leak into discovery or queue actions.
- Duplicate confirmation must not downgrade Play Next into an ordinary append.
- Permission-denied users must see a disabled action and perform no mutation.

## Acceptance Criteria

- A directly loaded YouTube source exposes Like against its canonical video ID.
- A matching active queue row remains the preference target when available.
- A stale queue row cannot override the active session source.
- Both pasted-link Add Media surfaces expose Play Next.
- Play Next uses the existing permission, duplicate, feedback, and one-shot queue
  behavior.
- Existing Add to Queue, Play Now, playlist, discovery, and non-YouTube behavior
  remain unchanged.
- Focused tests, full tests, typecheck, lint, build, formatting, file-length, and
  diff checks pass before release consideration.
- Production interaction QA confirms Like persistence and Play Next ordering
  before the task is marked complete.

## Evidence

- Tests were added before implementation and initially failed four assertions:
  three canonical active-media cases and the two-surface Play Next contract.
- The focused post-implementation suite passes 18/18 tests, including the
  queue-backed fallback while session source metadata is hydrating.
- After merging the current `main` dependency-security release, the focused
  suite still passes 18/18 tests and full `npm test` passes 512/512 tests.
- TypeScript, ESLint, the Next.js 16.3.3 production build, changed-file Prettier,
  file-length policy, and `git diff --check` pass on the refreshed worktree.
- ESLint reports one pre-existing warning in `room-experience.tsx` and zero
  errors. The file-length policy reports 17 review warnings and zero violations.
- A credential-safe Playwright rerun loaded the existing ignored local
  environment in memory without copying it. Account personalization,
  health/readiness sanitation, and visualizer startup passed; one application
  shell case remained fixture-skipped. The runner did not terminate its local
  web-server wrapper after the tests completed and was stopped manually.
- The unrelated private extension bridge check passed once and failed once in a
  separate persistent Chromium profile, so it is not claimed as TASK-022
  evidence and remains an independent harness follow-up.
- Three touched components remain above the 500-line architecture-review
  threshold, including one newly warned 511-line Add Media component. The
  repository policy reports zero violations; decomposition remains follow-up
  work outside this compact behavior change.
- Production interaction QA remains pending.
