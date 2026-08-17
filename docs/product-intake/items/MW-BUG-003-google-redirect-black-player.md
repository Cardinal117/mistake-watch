---
id: MW-BUG-003
type: bug
status: needs-reproduction
priority: P1
area: auth-playback
created: 2026-08-17
updated: 2026-08-17
---

# Google redirect failure can leave a black player

> [!bug] Needs reproduction - P1

- **Observed:** After a Google redirect failure, controls can remain active while media is black and silent.
- **Evidence limit:** Reported Spacetime, YouTube, and ad CORS logs are not yet proven causal.
- **Next action:** Separate OAuth recovery failures from ordinary iframe console noise.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 7]]
