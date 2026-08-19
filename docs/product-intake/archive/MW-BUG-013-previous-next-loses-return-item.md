---
id: MW-BUG-013
type: bug
status: resolved
priority: P1
area: playback-history
related: [TASK-017, TASK-002, TASK-004, MW-QOL-004]
created: 2026-08-19
updated: 2026-08-19
---

# Previous then Next loses the return item

> [!success] Resolved - P1

- **Expected:** After Previous returns to the prior played item, Next should
  return to the item that was active before Previous, unless an explicit queue
  mutation removed it.
- **Observed:** Previous loaded the prior item, but pressing Next then caused the
  formerly active item to disappear instead of becoming the next playable item.
- **Confirmed cause:** Manual playback of a played row marked the formerly
  active row played. Both Next projections selected only queued rows, so the
  former item was no longer reachable through the forward path.
- **Correction:** TASK-017 preserves the formerly active item as the first
  queued forward item when manual history navigation selects a played row.
- **Automated verification:** Commit `5792328` passed repeated Previous/Next
  state calculations, unchanged loop behavior, server-authority coverage, the
  full 377-test suite, typecheck, lint, SpacetimeDB build, production build,
  formatting, and the file-length policy.
- **Production verification:** Deployment
  `dpl_4UZdgUmuWQfY8APy3mkvd5pPuoy9` included the correction. On 2026-08-19,
  the owner completed two-participant production QA and confirmed that Previous
  followed by Next works correctly without losing the return item.
- **Related work:** TASK-017 owns this resolved correction. MW-QOL-004 remains a
  separate future interaction change for restart-versus-previous semantics.
- **Original report:**
  [[quick-capture-2026-08-19#Raw Quick Capture]]
