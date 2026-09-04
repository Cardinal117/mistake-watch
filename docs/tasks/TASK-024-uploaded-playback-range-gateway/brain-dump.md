# TASK-024: Uploaded Playback Range Gateway

Status: Candidate C locally complete; preview QA pending
Documentation level: Full packet
Updated: 2026-09-04
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

The production hostname gate later failed: Opera GX blocked every activated
Worker custom-domain candidate. Provider test configuration was rolled back and
Candidate B is not approved for release.

On 2026-09-04 the owner approved Candidate C: retain the Worker/R2 authorization
boundary, but expose playback only through a same-origin path on
`watch.mistakestudios.com`. A Vercel external rewrite may forward that path to a
Worker upstream. This is a bounded transport revision, not release approval.

## Constraints

- Keep R2 private. Do not restore the disabled public bucket domain.
- Do not proxy media bytes through a Vercel Function. Candidate C may use a
  reviewed external rewrite/CDN proxy only after Range and timeout evidence.
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
- Browser-visible boundary: `/media-gateway/room-sessions/{sessionId}/content`
  on the existing Vercel app origin.
- Byte-serving boundary: a Worker upstream behind a Vercel external rewrite,
  with a private R2 bucket binding.
- Browser credential: a dedicated signed, host-only, session-scoped, HttpOnly
  cookie; never the existing account or guest cookie.
- Origin credential: a separate Worker-to-Vercel secret stored only in provider
  secret stores.
- Stable browser media path:
  `/media-gateway/room-sessions/{sessionId}/content`.

## Unknowns To Prove First

1. Does the Vercel rewrite preserve the host-only cookie and repeated Range
   headers when proxying real Opera GX media requests?
2. Does it preserve `200`, `206`, `416`, content headers, and private no-store
   responses without buffering or exposing the Worker origin?
3. Do representative playback ranges complete within Vercel's external-proxy
   duration limits?
4. Does the session-specific path allow two room-media sessions in separate
   tabs without overwriting credentials?
5. What Vercel transfer, edge request, Worker, authorization, and R2 request
   volume occurs in a representative playback and seek session?

If the rewrite contract is unreliable, stop and request a scope revision. Do
not silently place a long-lived grant in the stable URL.

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
