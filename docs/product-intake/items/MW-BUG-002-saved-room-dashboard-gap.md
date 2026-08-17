---
id: MW-BUG-002
type: bug
status: in-progress
priority: P1
area: account-rooms
related: [TASK-002.10, TASK-014B, MW-FEAT-003, MW-BUG-007]
created: 2026-08-17
updated: 2026-08-17
---

# Account-saved room disappears from dashboard after sign-out

> [!bug] In progress - P1

- **Observed:** An attached room can disappear from saved/recent dashboard surfaces after sign-out.
- **Confirmed cause:** The dashboard discovered rooms only from `mw_guest_*`
  cookies. It did not include rooms connected through signed-in ownership,
  saved attribution, or membership.
- **Implementation:** `TASK-014` merges the authenticated account projection
  with guest-cookie rooms while preserving the richer active guest snapshot.
- **Release:** Commit `d415362` is deployed to production with owner QA still
  pending.
- **Owner QA:** Attached-room cross-browser recovery passed. A separate
  signed-in create/save path can still remain browser-scoped and is tracked as
  `MW-BUG-007` under `TASK-014B`.
- **Next action:** Repeat the persistence matrix after `TASK-014B` is released.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 5]]
