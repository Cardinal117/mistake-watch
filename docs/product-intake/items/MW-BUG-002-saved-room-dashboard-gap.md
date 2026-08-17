---
id: MW-BUG-002
type: bug
status: needs-reproduction
priority: P1
area: account-rooms
related: [TASK-002.10, MW-FEAT-003]
created: 2026-08-17
updated: 2026-08-17
---

# Account-saved room disappears from dashboard after sign-out

> [!bug] Needs reproduction - P1

- **Observed:** An attached room can disappear from saved/recent dashboard surfaces after sign-out.
- **Inference:** Guest-cookie and account room projections may diverge.
- **Next action:** Cover attach, sign-out, dashboard reload, and account sign-in with integration tests.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 5]]
