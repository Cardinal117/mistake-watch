---
id: MW-BUG-005
type: bug
status: in-progress
priority: P1
area: recommendations
related: [TASK-011]
created: 2026-08-17
updated: 2026-08-17
---

# Like state remains stale on another active device

> [!warning] In progress - P1

- **Expected:** A Like made on one active device appears on another active device using the same account.
- **Observed:** The second device remains stale until refresh, then displays the
  Like recorded in the room/account test.
- **Confirmed boundary:** An already-open client does not reconcile the changed
  Like state. Refresh retrieves the expected room/account state.
- **Implementation:** Revalidate the existing private preference endpoint every
  ten seconds while visible and on focus, visibility return, or network
  reconnect. Reject stale responses and preserve pending optimistic mutations.
- **Next action:** Commit, deploy, and complete same-account two-device QA
  without manually refreshing the second client.

## Evidence

Owner QA on 2026-08-17 confirmed the room was attached and the same Google
account was active on both devices. This evidence confirms the live UI gap; it
does not by itself distinguish the live room overlay from durable account state.

A read-only production Supabase check on 2026-08-17 separately confirmed four
durable `liked` preference rows for one account. Local implementation QA passed
329 tests, TypeScript, ESLint, Prettier, file-length policy, diff checks, and a
production build. The item remains open until deployed two-device QA passes.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 13]]
