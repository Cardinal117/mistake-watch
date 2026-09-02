# Review Notes: Authorized Uploaded Playback Range Gateway

Status: Release blocked; provider rollback complete
Updated: 2026-09-02

## Evidence Dependency

This packet depends on the unmerged TASK-023 Candidate A evidence. TASK-023 must
be reviewed and checkpointed before implementation begins. The implementation
branch must then be created or refreshed from the resulting `origin/main`.

## Decisions Made

- Candidate A is rejected: later browser ranges do not revisit a stable redirect.
- Keep the app hostname directly on Vercel.
- Candidate B provisionally preferred a dedicated Worker Custom Domain over a
  Worker Route on the app host; its Opera GX production hostname gate failed.
- Keep Vercel/Supabase as the authorization authority and the Worker as the
  byte-serving boundary.
- Revalidate on every request; do not optimize with an authorization cache yet.
- Prefer one path-scoped media cookie per session so concurrent tabs can coexist.
- Keep the first design schema-free and use current room/session/member rows for
  revocation.
- Stop if browser credential delivery is unreliable; URL credentials are not an
  automatic fallback.
- Treat durable membership removal, room closure, and media-session end/expiry as
  gateway revocation. The existing live-only Kick behavior remains separate.

## Why A Full Packet Is Proportional

Although the user-facing fix is narrow, it introduces a new provider runtime,
custom hostname, cross-origin credential boundary, private-object delivery path,
per-range authorization hop, and metered request flow. Separate design, security,
test, release, and rollback gates are necessary; the packet intentionally avoids
unrelated product documentation.

## Assumptions To Validate

- The Cloudflare account controls a zone suitable for the proposed custom domain.
- The existing R2 bucket can be bound privately to a Worker without enabling a
  public domain.
- A Vercel response on `watch.mistakestudios.com` can set a candidate domain and
  path-scoped cookie, but the supported Opera GX profile must first be able to
  reach that gateway hostname.
- Current `room_members`, `room_media_sessions`, and `media_assets` state is
  sufficient for per-request revocation without a new grant table.
- Browser request patterns can be supported with single-range R2 reads.

## Review Decisions And Open Questions

1. A neutral first-level hostname and the corresponding
   `Domain=mistakestudios.com` cookie scope were approved on 2026-09-02.
2. The Cloudflare Worker/custom-domain/R2 production test was approved for this
   personal deployment.
3. Confirm whether the preferred no-schema signed credential is acceptable after
   security review; a persisted opaque-grant table would be a separate scope
   revision.
4. Define acceptable per-range authorization latency and monthly request budget
   after the spike supplies real counts.

## Opera GX Hostname Evidence

- The original `media.watch.mistakestudios.com` certificate was recovered and
  reached `Active`; the Worker then returned the expected fail-closed HTTP 401.
- Opera GX blocked `media.watch.mistakestudios.com`,
  `playback.watch.mistakestudios.com`,
  `mw-gateway.watch.mistakestudios.com`, and
  `mw-playback.mistakestudios.com` with `ERR_BLOCKED_BY_CLIENT` before the
  Worker received a request.
- Public DNS, TLS, and the Worker 401 response passed for
  `mw-gateway.mistakestudios.com`, but the final Opera GX VPN test showed that
  the gateway-labelled hostname is also blocked. `watch.mistakestudios.com`
  passed as the same-session control.
- `mw.mistakestudios.com` was the final bounded minimal candidate. After public
  DNS and TLS activation, a complete Opera restart, and an active Opera VPN,
  both its root and exact gateway path returned `ERR_BLOCKED_BY_CLIENT`.
- `watch.mistakestudios.com` loaded normally in the same restarted Opera session,
  isolating the failure to the Worker custom-domain path rather than Opera or
  the VPN generally.
- Verdict: Candidate B is not releasable for the supported Opera GX profile.
  Further hostname guessing, blocker allowlisting, or privacy-setting changes
  require a separately approved design revision.

## Implementation Evidence

- Candidate B feasibility passed in Playwright Chromium 149.0.7827.55 and Opera
  GX 150.0.7871.187. Two session-path cookies remained isolated; every observed
  cross-origin media request carried its correct cookie and returned `206` from
  the unchanged stable URL.
- Test-first baseline `d718286`: seven credential, authorization, and Worker
  tests initially failed with the production gateway absent. The same tests now
  pass, including deny-before-R2 and bounded `416` behavior.
- The focused media set passes 12/12 and full `npm test` passes 524/524.
- TypeScript, the Next.js production build, Worker dry-run compilation,
  file-length policy, and ESLint pass. ESLint retains one unrelated existing
  `room-experience.tsx` navigation warning and reports no errors.
- The private Worker binding targets existing bucket `watch2bucket`; no public
  bucket domain or Vercel media-body proxy is introduced.
- No schema or RLS change is required. After the failed Opera gate, Cloudflare
  was rolled back to no Worker custom domains and the two Vercel production
  variables were restored to their previous values. No application merge or
  deployment occurred.
- Cloudflare certificate read-back shows only the zone's baseline Universal and
  Backup certificates; the failed gateway certificates were removed.
- Review found that Kick is not a durable membership mutation. The gateway does
  not claim otherwise; changing that room-lifecycle contract is deferred rather
  than folded into this playback fix.

## Required Handoff Order

1. Review/checkpoint TASK-023 evidence.
2. Review and approve or revise TASK-024 architecture.
3. Authorize the isolated provider feasibility spike.
4. Continue only if the spike passes.
5. Approve implementation on a fresh dedicated branch.
6. Review a draft, unmerged PR after all non-production gates pass.
7. Treat merge and production deployment as separate approvals.
