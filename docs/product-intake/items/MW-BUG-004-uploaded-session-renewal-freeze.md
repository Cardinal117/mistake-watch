---
id: MW-BUG-004
type: bug
status: in-progress
priority: P1
area: uploaded-playback
related: [TASK-009, TASK-023, TASK-024]
created: 2026-08-17
updated: 2026-09-01
---

# Uploaded playback can freeze after signed URL expiry

> [!bug] In progress - P1

- **Observed:** After roughly 30 minutes, an older client can freeze while room progress continues.
- **Security constraint:** Do not lengthen signatures or expose permanent R2 URLs.
- **Confirmed cause:** Room playback issues one 30-minute presigned R2 URL when
  the source mounts. The client discards the returned expiry metadata and has no
  renewal delivery path, so later Range requests can fail after expiry while
  already buffered media and canonical room progress remain valid.
- **Approved experience:** Buffered media continues while future and previous
  byte ranges receive fresh authorization. Renewal must not refresh the page,
  remount the visible media element, replace the room source, duplicate audio,
  or publish canonical playback state.
- **Candidate A verdict:** [[../../tasks/TASK-023-uploaded-playback-url-renewal/task|TASK-023]]
  rejected stable redirect delivery. Chromium and Opera GX reused the redirected
  object URL for later Range requests, received `403` after accelerated expiry,
  and did not revisit the stable route. The result reproduced twice.
- **Implementation state:** No production route, player, provider, queue,
  canonical playback, or authorization code changed.
- **Candidate B:** TASK-024 implements a stable Cloudflare Worker Range gateway
  with a private R2 binding and per-request Vercel authorization. Local Chromium
  and Opera GX cookie/range feasibility plus automated security and build gates
  pass.
- **Next action:** Complete the reviewed PR, controlled provider configuration,
  production deployment, long-play/seek, revocation, and two-participant QA.
  Retain the excluded Vercel proxy, longer signature, remount, and dual-player
  boundaries.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 10]]
