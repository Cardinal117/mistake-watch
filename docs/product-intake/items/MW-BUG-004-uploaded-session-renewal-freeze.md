---
id: MW-BUG-004
type: bug
status: in-progress
priority: P1
area: uploaded-playback
related: [TASK-009, TASK-023, TASK-024]
created: 2026-08-17
updated: 2026-09-04
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
  cookie/range feasibility plus automated security and build gates passed, but
  Opera blocked the activated custom gateway hostnames. Provider state was
  rolled back.
- **Candidate C:** Approved on 2026-09-04 for a bounded same-origin Vercel
  external-rewrite experiment that retains the Worker/private-R2 boundary and
  uses a host-only credential. This does not authorize deployment.
- **Candidate C local evidence:** Test-first transport coverage, the full suite,
  typecheck, build, Worker dry-run, and changed-file quality gates pass. No
  provider or production state changed.
- **Next action:** Review and approve the local commit/PR refresh, then separately
  approve a preview Worker/Vercel feasibility test in Opera GX.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 10]]
