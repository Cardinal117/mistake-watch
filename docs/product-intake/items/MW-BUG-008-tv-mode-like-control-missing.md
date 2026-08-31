---
id: MW-BUG-008
type: bug
status: in-progress
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-011, TASK-020]
created: 2026-08-18
updated: 2026-08-31
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
- **Interaction evidence:** A fresh local throwaway room confirmed that a direct
  YouTube source exposes the Like control in TV mode and that changing the state
  is reflected immediately by the normal Listen control. The test restored the
  source to unliked.
- **Next action:** Repeat Like/Unlike with a signed-in account and verify the
  state after a full browser restart before resolving this item.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 1]]
