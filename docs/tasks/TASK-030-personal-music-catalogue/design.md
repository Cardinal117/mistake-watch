# Stage 1 architecture and product contract

## Data flow

Trusted app Like / eligible deliberate choice -> private source registration ->
deduplicated refresh job -> server videos.list batch -> validated public metadata.

Personal GET -> active owner authorization -> existing Likes, eligible choices
and retained owner history -> suppression -> cached metadata -> deterministic
familiar recommendations and regulars -> explicit SpacetimeDB queue actions.

The response can schedule one bounded background worker after it is returned.
Daily maintenance also runs independently of room transport. Neither worker
success nor catalogue membership grants room access or updates a preference.

## Catalogue versus personal evidence

The source registry is service-only infrastructure containing opaque video IDs.
It is not a public listing. Source metadata is admitted only after a successful
server lookup explicitly establishes public privacy status and playable status.
Unlisted/private/unknown metadata is not persisted in the shared metadata cache.
Existing user references and manual playback remain intact. No one can use a
client-supplied source ID to enumerate the registry through the Personal API.

Public catalogue membership alone is insufficient relevance. Stage 1 selects
only the current owner's eligible references. Other users can reuse metadata
for IDs they independently reference, but their listening does not yet enter
another account's candidate selection. Community suggestions are Stage 3.

Current app Likes can appear regardless of original room. Deliberate choices
must retain current TASK-028 consent/eligibility semantics. Personal completed
occurrences supply recorded counts and familiar rediscovery, not claims of
attention, deliberate replay, or new global/room learning weights. Temporary
implicit history and withdrawn Shared contributions do not enter personal taste.

## Candidate and UI contract

Keep existing `read_personal_discover` intact for compatibility. The new
`read_personal_catalogue` returns a cache-aware 24-item regulars/rediscovery
projection and up to 96 wider owner candidates. Select BOTH after freshness and
suppression, using balanced source groups; missing early metadata cannot starve
later fresh regulars. The snapshot includes metadata for the union (at most120).

API response extends existing `DiscoverResponse` with `recommendations` carrying
validated item metadata and server-owned reason codes/labels, plus a bounded
catalogue readiness summary. No raw scores, user IDs, provider secrets or global
popularity/consent data are returned. Browser observations cannot author reasons.

Deterministic precedence: explicit Like, eligible deliberate queue choice, then
familiar-history fallback. No artist/title similarity from YouTube text. Use
older listening context for rediscovery and stable ID tie-breaks. Reasons name
the actual evidence: "You liked this", "You chose this before", or "From your
listening history". Never claim similar tastes, verified orchestral identity,
novel discovery or satisfaction in Stage 1.

Persist a bounded server decision with IDs, reason codes and ranking version,
deduplicated for one hour and deleted after seven days. Return its decisionId/
expiry; browser shown/request/queue_observed diagnostics correlate to that
decision. An in-flight add retains the original decision across refreshes. A
new decision permits a new visibility observation without remounting the row.

Distinguish server-offered, browser-reported shown/requested and authoritative
queue events. SpacetimeDB events do not carry a decision ID, so matching account,
room, media and time is only temporal association, not exact causal conversion
attribution. Do not claim an implemented trusted conversion join or train from
browser observations. Exact causal attribution requires a later reviewed room
command/event contract; Stage 1 does not change that authority.

Personal UI removes the provider-search effect and generic room reranker. It
uses returned candidates, filters the current track, and preserves confirmed
queued rows with "In queue"/"Added" controls. Existing Add/Play Next/Play and
optimistic pending feedback reconcile against authoritative queue projection.
Showing, refreshing or dismissing suggestions never mutates the queue.

Refresh/focus polling reads only cached metadata; known song changes do not
fetch provider search or synchronously hydrate metadata. Background cache work
may run for due entries under the global budget. Sparse/cold states honestly
explain that saved music is being prepared or there is not enough history.
Manual search remains the route to unfamiliar music in this stage.

Original Stage 1 had no CSS redesign. Approved 030.8 now adds compact expandable
regulars and visible Add next controls; see approved-follow-ups.md. Preserve DESIGN.md tokens, all responsive layout rules,
bottom-scroll correction, stage tabs and song-derived accent/gradient. Expired
metadata must disappear from mounted Personal results at its deadline, not only
after the next navigation. Feedback revisions continue to protect multi-device
edits. Failed refresh must not silently restore stale/blocked recommendations.

## Worker and cost behavior

Use the existing server YouTube credential, never per-user OAuth imports. New
worker fetches up to 50 IDs in one videos.list request with explicit timeout and
`cache: no-store` so the stored fetch timestamp reflects an actual provider
response rather than an older Next cache entry. No search.list fallback.

Require processed status and explicit public/embeddable fields. Approved 030.6
retains bounded country rules in the private expiring metadata and filters before
candidate limits/counts and decision issuance using the Vercel request country.
Unknown country excludes restricted entries; malformed rules and age restrictions
remain excluded. Legacy reader/decision RPCs use unknown-country wrappers. This is automatic discovery
eligibility, not a guarantee of successful playback for every viewer. Manual
playback/metadata handling stays unchanged.

Claim refresh work atomically with a lease and global daily request reservation.
One invocation performs at most one batch. Initial safety cap: 100 batch requests
per UTC day for this catalogue worker, configurable downward at the server,
without changing manual-search quotas. This is an operational ceiling, not a
recommendation-quality percentage or assertion about the project's YouTube quota.
Reserve before network I/O; failed/time-out requests consume the reservation.
Budget exhaustion leaves work pending until the next window. Duplicate workers
cannot fetch the same leased job; completion requires the current lease token.

Before claiming work, recheck current eligible references; revoked Shared history,
expired events and exclusions alone cannot justify perpetual provider refresh.
Transient failures back off and do not renew old metadata. Missing/private/
unlisted/unplayable results evict old display metadata immediately and store only
bounded job status/retry information. Never log URLs with API keys, payloads or
private histories. Operational results use numeric counts and fixed error codes.

## Retention, reset and rollout

Cache expiry is 28 days from the verified fetch, proactively refreshed from day
21 only while recently used/referenced. This provides margin under the owner's
30-day maximum. Read-time gates enforce expiry even if maintenance fails. Daily
cleanup physically deletes expired cache rows independently of SpacetimeDB;
monitor failures because read filtering alone is not physical deletion.
Refreshing or showing a source never advances its actual-use timestamp.

Orphan source/jobs can be removed after 30 inactive days when no retained first-
party reference remains. Likes/exclusions are not foreign-key dependants of the
expiring cache and survive its deletion. No raw first-party retention extension.
Clear-history/account deletion must immediately remove eligibility in reads;
rebuildable catalogue rows carry no user association or preference score.

Local migration and synthetic testing first. Production schema application,
backfill and deployment require their own reviewed release step. UI defaults to
honest unavailable state if the new schema is absent, never automatic search.
Emergency catalogue worker disable must preserve manual playback and cached
reads; rollback must keep independent expiry maintenance until cache is purged.
