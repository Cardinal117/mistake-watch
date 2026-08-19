---
id: MW-FEAT-005
type: feature
status: ready-for-planning
priority: P1
area: ai-dj
related: [TASK-002.10B, TASK-011]
created: 2026-08-19
updated: 2026-08-19
---

# Local AI DJ intent router

> [!idea] Ready for planning - P1 strategic priority

- **Requested:** Prototype a small local intent-and-tool-routing model for AI DJ
  commands. High-confidence routine requests should map to bounded Watch tools;
  uncertain or complex requests may escalate to a separately controlled larger
  model.
- **Architecture boundary:** The model may propose structured intent, tools, and
  arguments. Existing server and Spacetime authority must authenticate,
  authorize, validate, rate-limit, and execute every action. The recommendation
  engine remains responsible for musical ranking and taste.
- **Evidence:** The owner supplied a detailed Needle and NeMo Switchyard design
  discussion and marked the direction as the highest-importance item in this
  capture.
- **Unknowns:** Independently verify current model licensing, browser/Node
  support, model size, performance, tool-call accuracy, confidence calibration,
  caching, CSP implications, accessibility, and low-end-device impact. Determine
  whether a deterministic router is sufficient before adopting a model.
- **Related work:** TASK-002.10B AI DJ/session intelligence, TASK-011 first-party
  recommendation intelligence, and the existing server-authoritative room tool
  boundary.
- **Next action:** Create a full research/prototype packet. Benchmark an isolated
  browser worker with read-only tools first; do not connect it to production
  mutations or make the app depend on an experimental model router.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
