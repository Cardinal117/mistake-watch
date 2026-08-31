---
id: MW-QOL-008
type: qol
status: in-progress
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-020, MW-QOL-006]
created: 2026-08-18
updated: 2026-08-31
---

# Open TV settings without leaving TV mode

> [!qol] In progress - P2

- **Request:** Add a compact three-dot settings control inside TV mode so users
  can adjust TV presentation settings without exiting and returning.
- **Expected:** The control opens the established TV settings surface over the
  active TV presentation. Applying a setting updates the current view and keeps
  playback, queue state, position, and room synchronization unchanged.
- **Evidence:** Owner production feedback identifies leaving TV mode as an
  unnecessary interruption. Source inspection confirms the existing
  `ListenRoomSettingsDialog` and persistent `ListenTvSettings` state are exposed
  from the normal Listen header, while the TV-mode header currently exposes an
  Exit action but no settings entry point.
- **Constraints:** Reuse the existing settings dialog, state, and browser-local
  persistence. Do not create a second settings model or make presentation
  preferences room-authoritative. The control must remain reachable when idle
  UI hiding is enabled, support keyboard and touch input, restore focus after
  closing, and remain compact on mobile.
- **Unknowns:** Confirm the exact top-right control grouping, whether the button
  remains visible while other TV controls auto-hide, and whether opening the
  dialog temporarily suspends idle hiding.
- **Related work:** TASK-002.5G Listen/TV presentation work and
  [[MW-QOL-006-tv-mode-card-transitions|MW-QOL-006]]. This access improvement is
  independent from optional TV-mode transition animation.
- **Implementation:** TASK-020 reuses the existing TV settings dialog and
  browser-local persistent state inside TV mode.
- **Automated evidence:** Focused TV, preference, and direct-source tests pass
  alongside the 516-test suite, typecheck, lint, file-length policy, and
  production build on the refreshed TASK-020 branch.
- **Interaction evidence:** Desktop and 390 x 844 QA confirmed the dialog opens
  over TV mode, updates values immediately, preserves playback progression,
  closes before TV mode on Escape, restores focus to the trigger, remains free
  of horizontal overflow, and returns after idle hiding on keyboard activity.
- **Next action:** Confirm browser-restart persistence and repeat the flow with a
  genuinely separate second participant before resolving this item.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 10]].
