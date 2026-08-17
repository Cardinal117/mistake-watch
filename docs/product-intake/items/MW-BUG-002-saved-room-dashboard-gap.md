---
id: MW-BUG-002
type: bug
status: in-progress
priority: P1
area: account-rooms
related: [TASK-002.10, MW-FEAT-003]
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
- **Next action:** Production QA must cover attach, guest-cookie loss/sign-out,
  dashboard reload, account sign-in, and re-entry before resolution.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 5]]
