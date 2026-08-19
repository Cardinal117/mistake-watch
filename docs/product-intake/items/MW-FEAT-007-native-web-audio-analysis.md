---
id: MW-FEAT-007
type: feature
status: ready-for-planning
priority: P3
area: media-analysis
related: [TASK-015, TASK-018, MW-FEAT-006]
created: 2026-08-19
updated: 2026-08-19
---

# Native Web Audio analysis for accessible media

> [!idea] Deliberately deferred - P3

- **Requested:** Analyse direct, uploaded, and CORS-compatible media locally
  through Web Audio when Mistake Watch controls an accessible media element.
- **Reason for deferral:** Uploaded media currently serves owner-controlled
  movies and series rather than the music workflow driving visualizer demand.
  The extension path therefore has higher immediate value.
- **Architecture direction:** Reuse the focused first-party AudioWorklet rhythm
  contract and detector lessons from TASK-018 when this use case becomes
  relevant. Produce normalized rhythm and energy features without Essentia.js,
  an external BPM provider, or persistent audio storage.
- **Boundary:** This item does not authorize uploaded-media processing changes,
  CloudConvert work, server-side extraction, CORS bypasses, or production code.
- **Related work:** Reuse the rhythm contract and performance evidence developed
  by TASK-018 when direct or uploaded music becomes a product requirement.
- **Next action:** Leave unscheduled until extension research is complete and
  accessible-media music has a concrete use case.
