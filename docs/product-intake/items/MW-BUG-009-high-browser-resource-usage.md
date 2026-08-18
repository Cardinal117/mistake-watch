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
- **Confirmed cause:** Continuous Listen animation is the dominant incremental
  cost. The former 96-bar waveform measured 17% median aggregate Chrome CPU.
  The replacement Dynamic Horizon also measured 17% median because its three
  continuously translated SVG-mask surfaces remained very large. Static
  Artwork and Off both measured 5% median and 9% peak, while every animated
  variant exceeded the approved budget.
- **Related work:** TASK-002.5I queue performance and TASK-010 Media Hub
  performance provide prior measurement patterns but do not cover sustained
  room rendering or playback-resource budgets.
- **Current remediation:** TASK-015A2 has representative previews plus bounded
  browser-local intensity and dimming controls without new continuous motion.
  Production QA exposed two visibility defects after the static-alpha
  calibration: the artwork fade animation permanently overrode the selected
  opacity with `0.38`, and Static Artwork's `64px` blur removed recognizable
  image detail. The second correction binds the fade endpoint to the selected
  intensity and uses an `8px` Static Artwork blur without adding motion.
- **Owner QA:** Commit `0fa7fc4`, deployed as
  `dpl_Fqi6ndY3BzbC6gYJAW9EXkoLJQiw`, passed production visibility QA. Future
  per-mode artwork controls and framing are tracked separately as
  [[MW-QOL-007-configurable-listen-artwork|MW-QOL-007]].
- **Next action:** Treat TASK-015B as a separate pre-rasterized/throttled
  rendering experiment before any BPM integration.
- **Task:** [[../../tasks/TASK-015-listen-visualizer-performance/task|TASK-015]]
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 3]]
