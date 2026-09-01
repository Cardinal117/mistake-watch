---
id: MW-BUG-008
type: bug
status: complete
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-011, TASK-020]
created: 2026-08-18
updated: 2026-09-01
---

# Like control is missing from TV mode

> [!success] Complete - released with TASK-020

- **Expected:** When the active media supports the existing account Like
  action, TV mode exposes the established Like control.
- **Observed:** Before TASK-020, the owner could not find the Like button in TV
  mode.
- **Decision:** Reuse the canonical Listen preference controller and shared
  Like control instead of creating separate TV preference state.
- **Related work:** TASK-002.5G TV mode, TASK-011 first-party preferences, and
  [[../../tasks/TASK-020-tv-mode-control-parity/task|TASK-020]].
- **Completion evidence:** Focused TV, preference, and direct-source tests pass
  alongside the 516-test suite, typecheck, lint, file-length policy, and
  production build. Desktop, compact, idle-reveal, Escape/focus, and separate
  two-participant playback QA passed.
- **Release:** PR #4 merged as `a6747f8b8792987db06c0aee42969dc05dfe4e3a`;
  Vercel deployment `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`; released 2026-08-31.
- **Production acceptance:** Signed-in owner Like synchronized between TV and
  Listen, survived reload and tab close/reopen, and remained present in reopened
  TV mode. Unlike restored the original baseline and persisted after reload.
- **Original report:**
  [[quick-capture-2026-08-18#Capture 1]]
