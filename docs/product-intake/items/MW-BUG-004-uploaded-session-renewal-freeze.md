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
- **Candidate C canary:** The Vercel rewrite forwarded Range and Cookie headers,
  and Opera DevTools proved that the playback bootstrap set the exact
  `__Secure-mw_media_access` cookie and the gateway request sent it. The gateway
  returned the Worker's fail-closed `503` response, while neither the canary nor
  rollback Vercel deployment recorded the internal authorization callback. The
  remaining boundary is the Worker's outbound authorization fetch or its
  normalized upstream response, not browser cookie handling. Production was
  restored to the prior known-good deployment; health and readiness passed
  after rollback. PR #11 remains draft and unmerged.
- **Diagnostic patch:** Test-first local coverage now distinguishes a fetch
  exception, exact upstream HTTP status, and malformed success response while
  proving that credentials, identifiers, and response bodies stay out of the
  diagnostic. All local gates passed and commit `fb87908` updated draft PR #11.
- **Diagnostic canary:** Worker version `9e84161a-88e7-413f-928f-5d8c7f6ce858`
  classified the failure as `fetch_exception`: the Worker could not complete
  its outbound request to the Vercel authorization route. The canary was then
  rolled back on both providers.
- **Fetch classifier:** A test-first local patch now maps only documented fetch
  exception families to fixed categories and defaults to `unknown`. It never
  logs the raw exception. The full suite and local quality gates passed; commit
  `4f6622a` updated draft PR #11.
- **Classifier canary:** Worker version `51607b57-9905-419c-85ba-17bb23c0f02f`
  reproduced the Opera failure and reported `unknown` / `fetch_exception`.
  Vercel again received no internal authorization callback. Both providers were
  restored and the ordinary Opera player returned.
- **Next action:** Design one bounded differential probe that distinguishes a
  host-wide outbound fetch failure from an authorization-route-specific failure.
  Do not merge, rotate secrets, expose raw errors, rename the route, or apply a
  speculative compatibility flag.

## Original Report

![[archive/legacy-notes-2026-08-17#Item 10]]
