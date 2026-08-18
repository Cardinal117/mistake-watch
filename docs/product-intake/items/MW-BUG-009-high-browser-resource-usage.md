---
id: MW-BUG-009
type: bug
status: in-progress
priority: P1
area: performance
related: [TASK-002.5I, TASK-010]
created: 2026-08-18
updated: 2026-08-18
---

# Room playback consumes excessive browser resources

> [!bug] Confirmed and in progress - P1

- **Expected:** A normal room should sustain synchronized audio without
  periodic stalls and should remain usable on a laptop within a measured CPU,
  GPU, and memory budget.
- **Observed:** The site reportedly consumes substantial CPU, GPU, and memory;
  audio can alternate between playing and freezing roughly every 20 seconds.
- **Evidence:** Reducing the room from 186 queued and 330 history items to one
  active item, no queue, and 18 history items did not materially reduce the
  reported usage. Queue size is therefore not established as the cause.
- **Confirmed cause:** Active Listen mounts 96 independently animated center
  waveform bars with two large glow shadows per bar. A controlled 120-second
  active-playback run measured 17% median and 32% peak aggregate Chrome CPU,
  versus 0% median and 3% peak while paused. Reduced-motion testing lowered the
  Mistake Watch tab from approximately 26-32% to approximately 3.6% CPU.
- **Related work:** TASK-002.5I queue performance and TASK-010 Media Hub
  performance provide prior measurement patterns but do not cover sustained
  room rendering or playback-resource budgets.
- **Next action:** Implement and verify TASK-015. Replace the 96-bar renderer
  with bounded SVG modes, preserve reduced-motion behavior, and repeat the same
  active-playback measurement on the affected laptop before release approval.
- **Task:** [[../../tasks/TASK-015-listen-visualizer-performance/task|TASK-015]]
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 3]]
