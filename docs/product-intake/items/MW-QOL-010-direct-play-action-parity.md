---
id: MW-QOL-010
type: qol
status: ready-for-planning
priority: P1
area: add-media
related: [TASK-002, TASK-011]
created: 2026-08-19
updated: 2026-08-19
---

# Direct Play Now action parity

> [!idea] Ready for planning - P1 owner priority

- **Expected:** A YouTube item loaded directly from Add Media should expose Like
  while active and offer Play Next before playback, even when it was not first
  appended to the normal queue.
- **Observed:** Loading a YouTube URL with Play Now produces active media that
  cannot be liked because no queue item owns the preference control. Add Media
  also has no Play Next action for that URL flow.
- **Evidence:** Owner production observation.
- **Unknowns:** Confirm whether Like should bind to canonical source identity
  independently from queue-row identity and whether Play Next should create a
  normal one-shot priority row using the existing reducer contract.
- **Related work:** TASK-011 media preferences, TASK-002 Add Media behavior, and
  the later Add Media interface overhaul.
- **Next action:** Create a compact task covering canonical active-media Like
  identity and Play Next parity without redesigning Add Media.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
