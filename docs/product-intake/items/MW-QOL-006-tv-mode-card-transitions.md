---
id: MW-QOL-006
type: qol
status: ready-for-planning
priority: P3
area: tv-mode
related: [TASK-002.5G]
created: 2026-08-18
updated: 2026-08-18
---

# Add restrained TV-mode card transitions

> [!qol] Ready for planning - P3

- **Request:** Add a card-deck-inspired transition when entering or leaving TV
  mode and when active media changes.
- **Expected:** Motion should make state changes feel deliberate without
  delaying playback, obscuring controls, or increasing resource usage.
- **Unknowns:** Exact transition duration, artwork treatment, interruption
  behavior, and reduced-motion fallback need design review.
- **Related work:** TASK-002.5G TV mode. This must follow resolution of
  [[MW-BUG-009-high-browser-resource-usage|MW-BUG-009]].
- **Next action:** Create a small motion specification only after the resource
  investigation establishes an acceptable GPU and CPU budget.
- **Original report:**
  [[../archive/quick-capture-2026-08-18#Capture 2]]
