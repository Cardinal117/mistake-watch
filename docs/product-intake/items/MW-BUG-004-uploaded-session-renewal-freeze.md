---
id: MW-BUG-004
type: bug
status: needs-reproduction
priority: P1
area: uploaded-playback
related: [TASK-009, MW-BUG-015]
created: 2026-08-17
updated: 2026-08-22
---

# Uploaded playback can freeze after signed URL renewal

> [!bug] Needs reproduction - P1

- **Observed:** After roughly 30 minutes, an older client can freeze while room progress continues.
- **Production evidence:** Read-only owner QA on 2026-08-22 confirmed that
  `/api/media/room-sessions/[sessionId]/playback` issues a temporary R2 playback
  URL with an exact 1,800-second lifetime. The corresponding room-session and
  private R2 requests succeeded, a missing room id returned `400`, and an
  unrelated room id returned `403`. Expiry and renewal were not exercised, so
  this evidence confirms the reported timing boundary but not the freeze itself.
- **Security constraint:** Do not lengthen signatures or expose permanent R2 URLs.
- **Related security finding:** [[MW-BUG-015-uploaded-playback-response-cacheability|MW-BUG-015]]
  tracks the separately confirmed cacheability and bearer-link behavior of the
  playback resolver response. Any shorter signature lifetime must be coordinated
  with reliable renewal rather than used as an isolated mitigation.
- **Next action:** Trace room-session renewal and player source replacement with
  accelerated expiry. Cover an already-open client, a newly joined client,
  revoked room participation, an expired room session, signed-link expiry, and
  renewal without playback interruption.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 10]]
