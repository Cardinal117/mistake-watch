---
id: MW-BUG-008
type: bug
status: in-progress
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-011, TASK-020]
created: 2026-08-18
updated: 2026-08-27
---

# Like control is missing from TV mode

> [!bug] In progress - P2

- **Expected:** When the active media supports the existing account Like
  action, TV mode should expose an appropriately placed Like control or clearly
  document why that action is intentionally unavailable.
- **Observed:** The owner could not find the Like button anywhere in TV mode.
- **Evidence:** Owner production observation after TASK-011 Like support was
  released.
- **Unknowns:** Confirm whether the omission is intentional in the approved TV
  mode scope and whether the shared active-media preference controller is
  already available to the TV layout.
- **Related work:** TASK-002.5G TV mode and TASK-011 first-party preference UI.
- **Implementation:** TASK-020 reuses the established Listen preference
  controller and Like control inside the existing TV presentation.
- **Automated evidence:** Focused TV, preference, and direct-source tests pass
  alongside the 516-test suite, typecheck, lint, file-length policy, and
  production build on the refreshed TASK-020 branch.
- **Next action:** Complete signed-in/guest browser QA before resolving this
  item; interaction QA remains a draft-PR gate.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 1]]
