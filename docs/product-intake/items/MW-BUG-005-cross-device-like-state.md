---
id: MW-BUG-005
type: bug
status: confirmed
priority: P1
area: recommendations
related: [TASK-011]
created: 2026-08-17
updated: 2026-08-17
---

# Like state remains stale on another active device

> [!bug] Confirmed - P1

- **Expected:** A Like made on one active device appears on another active device using the same account.
- **Observed:** The second device remains stale until refresh, then displays the
  Like recorded in the room/account test.
- **Confirmed boundary:** An already-open client does not reconcile the changed
  Like state. Refresh can retrieve the expected state in this test, but the
  separate TASK-011 durable Supabase persistence proof remains open.
- **Next action:** Create a compact TASK-011 follow-up with cross-device and stale-response tests.

## Evidence

Owner QA on 2026-08-17 confirmed the room was attached and the same Google
account was active on both devices. This evidence confirms the live UI gap; it
does not replace the scheduled durable-drain and fresh-session proof.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 13]]
