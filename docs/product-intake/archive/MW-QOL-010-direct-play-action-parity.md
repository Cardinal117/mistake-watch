---
id: MW-QOL-010
type: qol
status: complete
priority: P1
area: add-media
related: [TASK-002, TASK-011, TASK-022]
created: 2026-08-19
updated: 2026-08-31
---

# Direct Play Now action parity

> [!success] Complete - released with TASK-022

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
- **Completion evidence:** Focused tests pass 18/18 and the refreshed full suite
  passes 512/512 alongside typecheck, lint, build, formatting, file-length, and
  diff gates. Opera desktop and compact Add Media QA, guest catalogue denial,
  pasted-link Play Next ordering, and two-participant continuity passed.
- **Release:** PR #3 merged as
  `bbe77e605dcbeed8aabe156da6f6d5b3c5f188cb`; Vercel deployment
  `dpl_DNQVK18gyshf5AiPZ7oJoTCFLBn4`; released 2026-08-31.
- **Production acceptance:** Signed-in owner direct-source Like persisted after
  refresh and seven-second reconciliation. Unlike then persisted through a
  second refresh without changing the active source or title.
- **Original report:**
  [[quick-capture-2026-08-19#Raw Quick Capture]]
