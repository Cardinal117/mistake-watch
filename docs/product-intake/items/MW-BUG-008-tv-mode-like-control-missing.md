---
id: MW-BUG-008
type: bug
status: needs-verification
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-011]
created: 2026-08-18
updated: 2026-08-18
---

# Like control is missing from TV mode

> [!bug] Needs verification - P2

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
- **Next action:** Inspect the TV-mode interaction contract and reproduce with a
  signed-in liked and unliked YouTube item before planning a UI change.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 1]]
