---
id: MW-QOL-008
type: qol
status: complete
priority: P2
area: tv-mode
related: [TASK-002.5G, TASK-020, MW-QOL-006]
created: 2026-08-18
updated: 2026-09-01
---

# Open TV settings without leaving TV mode

> [!success] Complete - released with TASK-020

- **Request:** Add a compact settings control inside TV mode so users can adjust
  presentation settings without exiting and returning.
- **Decision:** Reuse the existing `ListenRoomSettingsDialog`, persistent
  browser-local TV settings, and Listen-owned settings state.
- **Constraints retained:** Settings remain browser-local and do not become
  room-authoritative. Optional MW-QOL-006 TV transitions remain separate.
- **Related work:** TASK-002.5G, MW-QOL-006, and
  [[../../tasks/TASK-020-tv-mode-control-parity/task|TASK-020]].
- **Completion evidence:** Desktop and 390 x 844 QA confirmed the dialog opens
  over TV mode, updates values immediately, preserves playback, closes before TV
  mode on Escape, restores focus, remains free of horizontal overflow, and
  returns after idle hiding on keyboard activity. Separate-participant QA kept
  both clients synchronized while the second participant used TV settings.
- **Release:** PR #4 merged as `a6747f8b8792987db06c0aee42969dc05dfe4e3a`;
  Vercel deployment `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`; released 2026-08-31.
- **Original report:**
  [[quick-capture-2026-08-18#Capture 10]]
