---
id: MW-QOL-010
type: qol
status: in-progress
priority: P1
area: add-media
related: [TASK-002, TASK-011, TASK-022]
created: 2026-08-19
updated: 2026-08-27
---

# Direct Play Now action parity

> [!todo] Implementation QA ready - P1 owner priority

- **Expected:** A YouTube item loaded directly from Add Media should expose Like
  while active and offer Play Next before playback, even when it was not first
  appended to the normal queue.
- **Observed:** Loading a YouTube URL with Play Now produces active media that
  cannot be liked because no queue item owns the preference control. Add Media
  also has no Play Next action for that URL flow.
- **Evidence:** Owner production observation.
- **Decision:** Like binds to canonical active YouTube source identity without
  adding a synthetic row to room state. Play Next uses the existing one-shot
  queue contract.
- **Related work:** [[../../tasks/TASK-022-direct-play-action-parity/task|TASK-022]],
  TASK-011 media preferences, and TASK-002 Add Media behavior.
- **Current state:** The refreshed current-main implementation and focused tests
  pass. Full gates and production interaction QA remain before completion.
- **Next action:** Complete TASK-022 release gates, then verify direct-source
  Like persistence and pasted-link Play Next ordering in production.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
