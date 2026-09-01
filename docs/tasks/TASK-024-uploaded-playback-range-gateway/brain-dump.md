# TASK-024: Uploaded Playback Range Gateway

Status: Feasibility passed; implementation in release QA
Documentation level: Full packet
Updated: 2026-09-01
Related: MW-BUG-004, TASK-009, TASK-023

## Why This Exists

TASK-023 tested the least invasive renewal design: one stable application URL
redirecting to a short-lived signed R2 URL. Chromium and Opera GX followed the
redirect once, then sent later byte-range requests directly to the signed object
URL. After accelerated expiry those requests failed with `403`; the stable route
was not revisited. Candidate A therefore cannot renew playback without replacing
the media source.

Candidate B keeps one stable media URL but makes every media request reach an
authorized Cloudflare Worker. The Worker may read the private R2 object only
after Vercel confirms current room-session access.

## Constraints

- Keep R2 private. Do not restore the disabled public bucket domain.
- Do not proxy media bytes through Vercel.
- Do not lengthen R2 signatures, remount the player, or add a hidden player.
- Do not mutate canonical playback merely to renew transport access.
- Preserve host-authoritative playback and two-participant synchronization.
- Revalidate participant and room-media-session authorization on every request.
- Keep object keys, provider credentials, grants, cookies, and origin secrets out
  of client-visible JSON, logs, analytics, and canonical room state.
- Do not move `watch.mistakestudios.com` behind Cloudflare as part of this task.
- No application, provider, database, deployment, or production change is
  authorized by this planning packet.

## Current Topology

- `watch.mistakestudios.com` resolves directly to Vercel.
- Existing room participation is resolved on Vercel from signed-in account state
  or a host-only guest cookie.
- The existing playback route authorizes the participant and active media
  session, then returns a time-limited R2 URL.
- A media element can retain that object URL for later seeks and range requests.
- Cloudflare Worker Routes require proxied DNS; a Worker Custom Domain can make a
  dedicated subdomain the Worker origin without changing the app hostname.

## Proposed Boundary

- App/auth authority: Vercel and the existing Supabase-backed room checks.
- Byte-serving boundary: a dedicated Worker Custom Domain such as
  `media.watch.mistakestudios.com` with a private R2 bucket binding.
- Browser credential: a dedicated signed, session-scoped, HttpOnly cookie; never
  the existing account or guest cookie.
- Origin credential: a separate Worker-to-Vercel secret stored only in provider
  secret stores.
- Stable media path: `/room-sessions/{sessionId}/content`.

## Unknowns To Prove First

1. Do supported Chromium and Opera GX send the dedicated cookie on repeated
   cross-origin media range requests to the media subdomain?
2. Does a path-scoped cookie allow two room-media sessions in separate tabs
   without overwriting one another?
3. Which request forms do the browsers emit for load, seek, resume, and replay
   (`GET`, `HEAD`, single range, suffix range, conditional request)?
4. Can the Worker stream correct `200`, `206`, and `416` responses without
   buffering the object or exposing the object key?
5. What range-request count and authorization latency occur in a representative
   full playback and seek session?

If the cookie is not reliably sent, stop and request a scope revision. Do not
silently place a long-lived grant in the stable URL.

## Sources

- Cloudflare R2 Workers API:
  <https://developers.cloudflare.com/r2/api/workers/workers-api-reference/>
- Cloudflare Worker Custom Domains:
  <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>
- Cloudflare Worker Routes:
  <https://developers.cloudflare.com/workers/configuration/routing/routes/>
- Cloudflare Workers limits and pricing:
  <https://developers.cloudflare.com/workers/platform/limits/>
  and <https://developers.cloudflare.com/workers/platform/pricing/>
- Cloudflare R2 pricing:
  <https://developers.cloudflare.com/r2/pricing/>
