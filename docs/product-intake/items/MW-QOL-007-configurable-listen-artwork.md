---
id: MW-QOL-007
type: qol
status: ready-for-planning
priority: P2
area: listen-personalization
related: [TASK-015, MW-BUG-009]
created: 2026-08-18
updated: 2026-08-18
---

# Make Listen artwork independently configurable

> [!qol] Ready for planning - P2

- **Request:** Let each compatible Listen visualization independently show or
  hide the current artwork. Add an Artwork Clarity control that makes the
  thumbnail more recognizable without overloading Visual Intensity or
  Background Dimming. Position artwork toward the right side of the room stage
  so it fills that surface rather than competing with the left now-playing
  rail.
- **Expected:** Personalization previews accurately represent whether a mode
  includes artwork. Users can choose an atmospheric blurred treatment or a
  clearer image while retaining readable controls and the selected
  visualization.
- **Evidence:** Owner production QA passed TASK-015A2 after selecting Static
  Artwork, but found the previews misleading because animated modes retain only
  a heavily dulled ambient image. The active YouTube thumbnail loaded
  successfully; the remaining concern is composition and treatment rather than
  provider delivery.
- **Constraints:** Keep these viewer-local presentation preferences out of room
  authority. Do not add continuous animation, duplicate artwork requests, or
  regress Static Artwork's approved CPU budget. `Off` should remain genuinely
  off unless explicitly reconsidered during planning.
- **Unknowns:** Define the compatible-mode matrix, per-mode default behavior,
  clarity bounds and its blur/opacity mapping, whether right alignment is fixed
  or user-adjustable, mobile cropping, and account-backed persistence timing.
- **Related work:** [[MW-BUG-009-high-browser-resource-usage|MW-BUG-009]] and
  TASK-015. This is a future composition improvement and does not reopen the
  accepted TASK-015A2 visibility correction.
- **Next action:** Create a compact design and implementation task when
  scheduled, with representative previews, desktop/mobile crop QA, and the same
  affected-laptop performance budget.
- **Original reports:**
  [[../archive/quick-capture-2026-08-18#Capture 8]] and
  [[../archive/quick-capture-2026-08-18#Capture 9]].
