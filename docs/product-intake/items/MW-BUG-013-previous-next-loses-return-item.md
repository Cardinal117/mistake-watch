---
id: MW-BUG-013
type: bug
status: in-progress
priority: P1
area: playback-history
related: [TASK-017, TASK-002, TASK-004, MW-QOL-004]
created: 2026-08-19
updated: 2026-08-19
---

# Previous then Next loses the return item

> [!bug] Local correction verified - P1

- **Expected:** After Previous returns to the prior played item, Next should
  return to the item that was active before Previous, unless an explicit queue
  mutation removed it.
- **Observed:** Previous loads the prior item, but pressing Next then causes the
  formerly active item to disappear instead of becoming the next playable item.
- **Evidence:** Owner production report.
- **Confirmed cause:** Manual playback of a played row marks the formerly active
  row played. Both Next projections select only queued rows, so the former item
  is no longer reachable through the forward path.
- **Local verification:** Repeated Previous/Next state calculations, unchanged
  loop behavior, server authority wiring, the full 377-test suite, typecheck,
  lint, SpacetimeDB build, production build, formatting, and file-length policy
  all pass.
- **Unknowns:** Verify natural completion, Play Next, multi-participant behavior,
  and uploaded media against the published reducer.
- **Related work:** TASK-017 owns the correction; TASK-002 and TASK-004 retain
  the broader queue/playback history, while MW-QOL-004 owns later restart-versus-
  previous interaction semantics.
- **Next action:** Publish TASK-017 through the normal SpacetimeDB and Vercel
  release order, then complete two-participant production QA before closure.
- **Original report:**
  [[../archive/quick-capture-2026-08-19#Raw Quick Capture]]
