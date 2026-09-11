# TASK-030 Stage 1 production rollout

Status: **deployed and bounded live checks passed, 2026-09-11**. The owner
explicitly approved the full rollout after reviewing the production preflight,
including migration, bounded reconciliation, PR/merge/deployment and scoped
release-documentation commit/push. Earlier pending gates are historical.
Natural listening quality, broader catalogue coverage and physical-device QA
remain separate evidence.

## Source and deployment receipts

- Feature: `76a0b10f1714b0b7c4d217ce85e2f73f132293b0`.
- [PR #18](https://github.com/Cardinal117/mistake-watch/pull/18) merged as
  `d4b2b897971a7600b72926ffc3b916a0c8c2a5e0`, with an expected-head guard.
- Feature and merge trees both equal
  `77184f71916f3bf684cf4497aa3569fb34b716af`.
- Vercel project `mistake-watch`, `prj_7VzLOAM0sh5pUoMsv4dQZES2uRoX`, scope
  `cardinal117s-projects`; deployment `dpl_GXKN6uiWS7Cgvsb1Xhmasnk6j57d`.
- [Deployment](https://mistake-watch-8mm2va6n0-cardinal117s-projects.vercel.app)
  built from a clean archive of the merge using hosted Production variables.
  No local environment file was uploaded. Build completed at 07:45:27 UTC.
- Deployment API reports READY and the exact merge SHA in `githubCommitSha`.
  After promotion, the alias API maps
  [watch.mistakestudios.com](https://watch.mistakestudios.com) to that deployment.
- GitHub status checks and PR-triggered workflow runs were absent, not passing
  hosted CI. Local QA is in [review-notes.md](review-notes.md); the production
  Next.js build also passed. Its dependency postinstall allowlist warning did
  not prevent the build and did not trigger dependency changes.

Vercel has no Git connection; deployment and promotion were explicit. Ordinary
CLI device authorization restored the session without extracting browser cookies
or exposing credentials. Later documentation-only Git commits do not change this
deployed application SHA or automatically deploy anything.

## Supabase and preservation

Project: `watch-mistakestudios`, `qzmivwhzotuleivzphhm`.

Applied only `20260911055006_personal_music_catalogue.sql`, SHA256
`de2d7f282540b5bd77d938a5d25da064cb98afdba6dd54e5e6ef83e0d9e63dc4`.
The application tool assigned history version `20260911074041`. A guarded
transaction verified the exact new name, one-statement payload and full SQL,
required 29 total entries and an absent target version, then aligned only that
new row to repository version `20260911055006`. The preceding 28 entries and
statements were preserved.

- Before and after checks: **131 rooms and 2 accounts**, unchanged.
- Five new tables have RLS enabled. Anon/authenticated roles cannot SELECT;
  service role can. All seven relevant public RPCs deny browser-role EXECUTE
  and allow service EXECUTE. The existing feedback wrapper remains invoker.
- An actual read-only check using the other existing account against the owner's
  Personal room raised `42501`. No synthetic production account or history.
- Post-migration advisors: existing leaked-password protection warning unchanged;
  no new warning/error. INFO notices: RLS without policies 15 to 20, unused
  indexes 13 to 20, unindexed foreign keys unchanged at 6. The five additional
  RLS notices reflect intentionally service-only tables. This is not a claim
  that hosted advisors are entirely clean; see the [preflight baseline](production-preflight-2026-09-11.md).

The signed-in owner was resolved through their Personal room. Read-only preview
found 24 eligible references. Only the exact privately retained preview list was
applied, with current eligibility revalidation: registered 24, skipped 0. No
global history sweep or provider request occurred during reconciliation.

## Bounded live catalogue evidence

| Observation | Result |
| --- | --- |
| Registered source references / jobs | 24 / 24 |
| Ready public metadata rows | 6 |
| Jobs held as unavailable | 18 |
| Metadata batch reservations on release day | 1 |
| Pending Personal candidates after refresh | 0 |
| Cached row expiry | All exactly 28 days after fetch |
| Expired metadata after maintenance | 0 |

Only **6 of the 24 references** passed the conservative provider admission
checks. The other 18 are not ready recommendations. The worker can reject absent,
restricted, private, unprocessed or non-embeddable videos; the stored unavailable
status does not identify which condition applied to each rejected reference.
Do not label all 18 region-restricted or silently weaken admission during release.
The reference registry and compact display cache contain no media/image blobs.

The live desktop Personal room showed six regulars and six recommendation rows
with "You liked this" reasons, while preserving the song accent/gradient and
Discover/Visualizer controls. Recorded play counts were zero; Rediscover was
honestly empty. No live listening-quality claim follows from this screenshot.

The observed deployment log sample contained 47 requests, including 15 Personal
Discover reads and one existing player `/api/youtube/metadata` request. It
contained zero `/api/youtube/search`, `/api/youtube/recommendations` or
`/api/recommendations/room` requests. This proves the observed mount/poll window;
the song-change assertion is covered by local browser tests, not a production
playback mutation. A cached decision record was also observed server-side.

## HTTP and maintenance verification

Before promotion, authenticated official CLI requests checked the protected
deployment. After promotion, live custom-domain health/readiness returned actual
JSON with status 200; Supabase and SpacetimeDB were ready. Both QA-only routes,
`/dev/listen-design` and `/dev/room-kinds`, returned 404. Unauthenticated Personal
Discover returned 403 requiring active membership.

The deployed cron configuration contains the existing
`/api/recommendations/drain` schedule at **01:00 UTC daily**. Its manual Vercel
invocation at **2026-09-11T07:52:33.706Z** produced a request log with status
**200**. The route awaits maintenance and reports failure if maintenance fails.
The subsequent SQL read still showed 24 references, 6 cached rows, one batch
reservation, no expired rows, and unchanged room/account counts.

This verifies manual execution of the deployed maintenance path. The first
scheduled daily invocation and deletion of naturally expired rows were not yet
observed. Physical expiry deletion is covered by isolated SQL tests; no expired
production fixture was inserted merely to demonstrate deletion.

## Remaining evaluation and boundaries

The owner can listen normally in their Personal room. Evaluate useful suggestions,
versions, candidate coverage, suppressions and metadata reuse from real behavior.
Investigate the 18 unavailable references as a bounded coverage follow-up before
changing admission rules. Existing recorded evidence is not time-of-day learning.

This rollout does not implement genre/BPM enrichment, cross-user similarity or
new Autoplay behavior. No SpacetimeDB publication, provider-account provisioning,
Auth configuration change, synthetic preferences, queue edits, playback changes
or feedback submissions were performed for production QA. Desktop live review
and local responsive tests do not substitute for physical-device acceptance.

Use the [release plan](release-plan.md) for maintenance-preserving disable and
rollback behavior. Setting the metadata daily limit to zero stops new fetches
while retaining cleanup; removing cleanup while cached data remains is unsafe.
