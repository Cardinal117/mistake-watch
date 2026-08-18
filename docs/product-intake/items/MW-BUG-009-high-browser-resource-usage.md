---
id: MW-BUG-009
type: bug
status: needs-reproduction
priority: P1
area: performance
related: [TASK-002.5I, TASK-010]
created: 2026-08-18
updated: 2026-08-18
---

# Room playback consumes excessive browser resources

> [!bug] Needs reproduction - P1

- **Expected:** A normal room should sustain synchronized audio without
  periodic stalls and should remain usable on a laptop within a measured CPU,
  GPU, and memory budget.
- **Observed:** The site reportedly consumes substantial CPU, GPU, and memory;
  audio can alternate between playing and freezing roughly every 20 seconds.
- **Evidence:** Reducing the room from 186 queued and 330 history items to one
  active item, no queue, and 18 history items did not materially reduce the
  reported usage. Queue size is therefore not established as the cause.
- **Unknowns:** Browser/device profile, foreground/background behavior,
  YouTube iframe cost, listen visualizer cost, TV mode, Account Rooms polling,
  recommendation polling, React render frequency, and extension influence all
  require controlled isolation.
- **Related work:** TASK-002.5I queue performance and TASK-010 Media Hub
  performance provide prior measurement patterns but do not cover sustained
  room rendering or playback-resource budgets.
- **Next action:** Run a read-only performance characterization matrix before
  changing code: idle room, paused media, YouTube playing, visualizer disabled,
  queue closed/open, Account panel closed/open, one participant, and multiple
  participants. Capture browser task-manager usage and performance traces over
  several minutes.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 3]]
