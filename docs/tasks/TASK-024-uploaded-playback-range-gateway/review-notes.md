# Review Notes: Authorized Uploaded Playback Range Gateway

Status: Candidate C Opera canary failed; production rolled back
Updated: 2026-09-04

## Evidence Dependency

This packet depends on the unmerged TASK-023 Candidate A evidence. TASK-023 must
be reviewed and checkpointed before implementation begins. The implementation
branch must then be created or refreshed from the resulting `origin/main`.

## Decisions Made

- Candidate A is rejected: later browser ranges do not revisit a stable redirect.
- Keep the app hostname directly on Vercel.
- Candidate B provisionally preferred a dedicated Worker Custom Domain over a
  Worker Route on the app host; its Opera GX production hostname gate failed.
- Candidate C retains the Worker but places a Vercel external rewrite in front
  so Opera sees only the existing app hostname. The owner approved this bounded
  revision on 2026-09-04.
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
external media proxy, private-object delivery path, per-range authorization hop,
and metered request flow. Separate design, security, test, release, and rollback
gates are necessary; the packet intentionally avoids unrelated product
documentation.

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

## Candidate C Gate

- The existing provider rollback remains untouched during local implementation.
- The browser-visible route must be same-origin and the credential host-only.
- A preview must prove Vercel forwards Cookie and Range headers and preserves
  streamed media statuses before any production approval.
- The Worker upstream, secrets, and object identifiers must remain absent from
  browser JSON, canonical room state, and logs.

## Candidate C Local Evidence

- Baseline: clean `f81aa3f` on the dedicated TASK-024 branch; no Candidate C
  transport implementation was present.
- Test-first red: focused gateway tests failed 2/9 because bootstrap still
  required a cross-origin URL and `next.config.mjs` had no rewrite.
- Green: focused gateway/reference tests pass 13/13; the full suite passes
  525/525; typecheck and production build pass.
- The production build manifest contains the exact same-origin rewrite to the
  configured server-side Worker origin.
- Worker dry-run, file-length policy, targeted Prettier, and `git diff --check`
  pass. ESLint has zero errors and one unrelated existing navigation warning.
- The repository-wide format script reports 214 pre-existing formatting files;
  no unrelated formatting rewrite was performed.
- No commit, push, Worker deployment, Vercel deployment, environment mutation,
  DNS change, R2 change, merge, or production change was performed.
- Refreshed `origin/main` contains one TASK-023 merge commit not in this branch's
  ancestry, but its tree matches the branch's TASK-023 base. Reconcile that
  ancestry after commit approval and before refreshing the draft PR.

## Candidate C Canary Evidence

- Cloudflare Worker version `8637e61a-0d98-49ab-a217-af3252c969c3` deployed on
  the correct account with the private `watch2bucket` binding and existing
  origin-secret binding. Its exact route failed closed with `401`.
- Preview deployment `dpl_6KL6qdqXiLF81NfuYkmfeG8h7Vqs` proved the external
  rewrite preserved an ordinary Range request (`401` without a credential), an
  unsupported multi-range request (`416`), and a fake non-secret cookie (`503`
  after the Worker attempted upstream authorization). No persistent Preview
  variables were created.
- Because Opera GX could not use the protected Vercel preview hostname, the
  owner approved a rollback-ready production canary at exact branch commit
  `96d66ff899d32db68b1ab745cb4637179f041a9c`.
- Canary deployment `dpl_GhvNQkgHHaXJkdjFwAEwMEsjn8gy` passed health and
  readiness. The exact same-origin gateway path reached the Worker and failed
  closed when probed without a credential.
- In the normal Opera GX profile, a fresh uploaded-media session returned the
  same-origin gateway URL, but the video failed when Play was pressed and the UI
  reported that the browser could not load the source.
- A repeated canary with sanitized Worker tails initially left the exact cookie
  boundary unresolved. A subsequent preserved Opera DevTools capture proved
  that the `200` playback bootstrap set `__Secure-mw_media_access` without a
  browser warning and that Opera included it in the gateway request. The request
  reached the Cloudflare-backed Worker through Vercel and returned `503` with
  the Worker's 35-byte fail-closed authorization-unavailable response.
- Direct log reads of both the pinned canary deployment and the rollback
  deployment found no internal authorization callback. The current Worker
  deliberately normalizes fetch exceptions, non-authorization upstream errors,
  and malformed successful payloads to the same `503`, so the remaining boundary
  cannot be narrowed safely without sanitized Worker-side classification.
- The release gate therefore failed. Vercel was immediately rolled back to
  `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7`. Both public aliases, health, readiness,
  and the prior gateway-path `404` were verified after rollback. R2 remained
  private, the Worker remained inert, and PR #11 remained draft and unmerged.
- Verdict: Candidate C is not release-ready. Add test-covered Worker diagnostics
  that record only `fetch_exception`, upstream status class, or
  `malformed_success`; never log request URLs, identifiers, cookies, secrets,
  object keys, or response bodies. Obtain separate approval before deploying
  that Worker revision or repeating the canary. Do not rotate secrets, rename
  paths, merge, or redeploy speculatively.
- Diagnostic test-first evidence at baseline `f97cf1f`: the focused test failed
  because the Worker emitted no classification, then passed after adding only
  `fetch_exception`, `upstream_status` with numeric status, and
  `malformed_success` diagnostics. The full suite passes 526/526; typecheck,
  production build, Worker dry-run, Prettier, file-length policy, and diff check
  pass. Lint has zero errors and the existing unrelated navigation warning.
- Diagnostic commit `fb87908` was pushed to draft PR #11. Worker version
  `9e84161a-88e7-413f-928f-5d8c7f6ce858` and the pinned Vercel canary reproduced
  the Opera failure and emitted `fetch_exception`, proving that no HTTP response
  returned from the Worker's outbound authorization request.
- Vercel was restored to `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7` and the Worker was
  restored to `8637e61a-0d98-49ab-a217-af3252c969c3`. Health and readiness
  returned `200`, the same-origin gateway route returned to `404`, and the
  diagnostic tail was stopped.
- Current Cloudflare documentation identifies several distinct runtime fetch
  exception families, so a compatibility change is not justified from the broad
  `fetch_exception` result alone. The next diagnostic may map only documented,
  allowlisted exception families; it must not log the raw exception.
- Classifier red/green evidence: the focused diagnostic test first failed because
  the fetch exception lacked a category, then passed after adding only fixed
  categories for the documented families plus `unknown`. A secret-bearing
  unknown message remains unreported. The full suite passes 526/526; typecheck,
  build, Worker dry-run, Prettier, file-length policy, lint, and diff checks pass.
  Lint retains the unrelated existing navigation warning.
- Classifier commit `4f6622a` was pushed to draft PR #11. Worker version
  `51607b57-9905-419c-85ba-17bb23c0f02f` reproduced the Opera failure and emitted
  only `{ kind: 'unknown', reason: 'fetch_exception' }`. A narrowly filtered
  Vercel log read-back again found no internal authorization callback.
- Vercel was restored to `dpl_79vfekpDWSrzBr1mqivyYdUbAFL7` and the Worker to
  `8637e61a-0d98-49ab-a217-af3252c969c3`. Health and readiness returned `200`,
  the inactive gateway route returned `404`, and an Opera reload restored the
  ordinary synced player. No compatibility flag or speculative fix was applied.
- Differential-probe red/green evidence at clean baseline `ba7f47c`: the focused
  test failed because the Worker made only the authorization fetch (`1 !== 2`),
  then passed after adding one credential-free `/api/health` control fetch on
  that failure path. R2 remains unread and diagnostics contain only an HTTP
  status or sanitized category. The focused suite passes 11/11 and the full
  suite passes 527/527; typecheck, build, Worker dry-run, file-length, and lint
  gates pass. Lint retains the unrelated existing navigation warning.

## Required Handoff Order

1. Review the Candidate C local diff and automated evidence.
2. Obtain separate approval before commit, push, or draft-PR refresh.
3. Obtain separate provider approval for a Worker upstream and Vercel preview.
4. Continue only if exact-path Opera GX Range QA passes.
5. Review the updated draft, unmerged PR after all preview gates pass.
6. Treat merge and production deployment as separate approvals.
