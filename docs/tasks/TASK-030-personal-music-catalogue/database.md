# Supabase schema and service boundary

These are the implemented Stage 1 contracts, verified against the local migration
and application reader. The migration is additive and preserves existing data,
history and consent. No hosted schema has been changed.

## Tables

| Private table | Purpose and constraints |
| --- | --- |
| `music_catalogue_sources` | YouTube provider/video identity, creation and trusted last-use timestamps; unique video ID. No user profile, media bytes, thumbnail bytes, title guesses or global popularity score. |
| `music_catalogue_metadata` | One source FK, compact validated public display title/channel/duration/thumbnail URL, optional raw views/likes, provider fetch/expiry. Only explicit public+playable source accepted; maximum 28-day cache TTL. |
| `music_catalogue_jobs` | One source FK, due/retry time, attempts, lease UUID/deadline and bounded status. An expired lease can be reclaimed; stale completion cannot win. |
| `music_catalogue_budget` | UTC day and reserved batch-request count. Atomic reservation before worker fetch; bounded retention for operational counters. |
| `personal_catalogue_decisions` | Owner/room, server decision UUID, ordered media IDs with evidence reason codes and ranking version, creation/7-day expiry. Identical decisions reused within one hour; maximum 100 retained per user. No provider display metadata. |

Existing `personal_discover_interactions` gains an optional opaque decision UUID.
It deliberately has no deletion-cleared FK: the original action's idempotency
context must survive expiry/capacity eviction of a diagnostic decision snapshot.
Browser shown/requested/observed records can refer to the
same server-owned decision. Validate owner/room/media/expiry and prevent relinking
an existing action to a different decision. Missing diagnostic context must not
prevent valid owner/CAS-authorized explicit feedback; save the preference and
omit unusable trace context. Exact retries remain idempotent after expiry.

Do not add empty recording, classification, embedding, user-profile or community
tables speculatively. Existing preferences/events/aggregates already own those
first-party concerns. A future recording ID remains separate from video identity.

## RLS intent

Private schema, RLS enabled as defense in depth, no `anon`/`authenticated` table
or RPC grants. Follow the existing server-only API pattern. Public RPC wrappers
are callable only by `service_role`, with explicit revocation from PUBLIC,
anon and authenticated. Internal privileged functions use empty search_path;
Personal readers recheck active account, room status and owner membership using
`private.require_personal_discover_owner`. The application derives the account
from its verified session, never a request field.

No endpoint returns a globally enumerable source list or lookup-by-arbitrary-ID.
No policies broaden uploaded-media access or touch SpacetimeDB authority.

## Registration and bounded backfill

Reuse one registration helper for trusted eligible choice/Like triggers and
owner-scoped reconciliation. Eligibility is written after the event row, so
do not inspect it from an AFTER INSERT event trigger. Registration is idempotent
and preserves source last-use from the actual event time. Failed enrichment
cannot roll back playback: ingestion never makes a provider call.

Owner backfill preview reports bounded distinct IDs/counts without metadata
requests or writes. Apply receives exactly that preview ID list, revalidates
current eligibility and may omit revoked/expired IDs, never add new IDs absent
from the preview. Rerun is idempotent. Prioritize unregistered IDs so repeated
128-item reconciliation progresses through a larger library. Already registered
references are refreshed by jobs, not by repeatedly filling the preview window.
Existing retained source IDs need fresh provider verification
before cache admission; never copy a queue snapshot as verified API metadata.
No production backfill during this task. Avoid collecting private user payloads
in preview reports; local tests use synthetic data only.

## Query and concurrency contracts

- Owner candidate query joins current Likes, retained Personal owner history and
  valid account-eligible manual choices; Shared consent epochs must still be
  active. Suppression applies before limits. Return bounded positive evidence
  counts/timestamps separately from public provider fields.
- Registration may prepare at most 128 owner references per reconciliation.
  Wider fresh candidate reads must not be starved by missing/blocked entries.
- Bulk metadata reads only return verified unexpired rows for IDs already
  authorized by the owner projection. Normal read performs no provider calls.
- Atomic claim uses row locks/SKIP LOCKED and a global budget reservation. Return
  batch lease token and at most 50 IDs. Completion validates ID belongs to that
  current lease and verified timestamps cannot exceed the worker's bounds.
- Catalogue storage mutations acquire one short global advisory lock before row
  and budget locks to keep lock order consistent. Provider I/O runs outside the
  transaction. This deliberately serializes bounded pilot writes; revisit only
  if measured contention warrants a more granular locking scheme.
- Cache completion is transactional per batch; a revoked/nonpublic source evicts
  earlier public metadata. Failure does not modify its original expiry.
- Cleanup deletes expired cache independently, requeues due active work without
  changing source last-use, removes old budget rows and prunes unreferenced idle
  registry entries. Recheck eligible references before claiming refresh work;
  raw revoked/expired events or exclusions alone are insufficient. Do not delete
  user Likes or explicit exclusions.

## Frozen RPC signatures

- `read_personal_catalogue(target_room uuid,target_account uuid)` => JSON object
  with `items` (same five evidence fields as old Discover, max 24), `feedback`,
  `countWindowDays:180`, `candidates` (max 96: same evidence plus `choiceCount`
  and `lastChoiceAt`), `metadata` (max 120: `mediaId,title,channelTitle,
  durationSeconds,thumbnailUrl,fetchedAt,expiresAt`) and `catalogue` containing
  `readyCount,pendingCount`. Only fresh public metadata appears; items and
  candidates are eligible owner references. Counts are owner-scoped.
- `reconcile_personal_catalogue(target_room uuid,target_account uuid,
  preview_ids text[] default null)` => null list is read-only preview
  `{mediaIds,eligibleCount}`; list supplied applies only its revalidated subset
  and returns `{registeredCount,skippedCount}`. Max 128 IDs, no arbitrary IDs.
- `claim_music_catalogue_jobs(request_limit integer default 100)` =>
  `{leaseToken,videoIds,retryAt,budgetExhausted}`; max 50 IDs, lease 5 min. DB hard
  ceiling 100 batches/UTC day, caller can lower; empty work reserves nothing.
- `complete_music_catalogue_jobs(lease_token uuid,results jsonb)` =>
  `{acceptedCount,discardedCount}`. Results have `mediaId,status` and, only for status
  `public`, `title,channelTitle,durationSeconds,thumbnailUrl,viewCount,likeCount`.
  Other statuses: `unavailable`, `transient_failure`. Validate bounded fields,
  unique IDs and lease ownership. Use claim timestamp as conservative fetch time,
  not caller expiry; 28-day expiry and 21-day next-refresh. Invalid/stale lease
  cannot replace newer metadata. Missing result IDs are retryable after lease.
- `prune_music_catalogue(prune_at timestamptz default now())` =>
  `{metadataDeleted,sourcesDeleted,budgetDeleted}`; no provider/SpacetimeDB calls.
- `issue_personal_catalogue_decision(target_room uuid,target_account uuid,
  selected_ids text[])` => `{decisionId,expiresAt,candidates}` where candidates
  are persisted `{mediaId,reason}` entries. The API uses these stored reason
  codes to avoid a Like/unlike race between selection and decision recording.
  Max 96 selected IDs, server
  revalidates current owner evidence and fresh public metadata, derives reason
  codes (`liked`, `chosen`, `history`) and stores version `personal-catalogue-v1`.
  Owner serialization/dedup prevents concurrent polling from exceeding the cap.
  Existing `record_personal_discover` accepts optional `decisionId` only for the
  recommended surface; wrapper validates and strips it before existing logic.

Indexes follow actual predicates: unique provider/video identity, job due/lease,
cache expiry and first-party owner/source lookup. Test meaningful query plans;
avoid speculative indexing or unbounded user-by-song materializations.

## Migration and operations

Create migration with `supabase migration new` after CLI help/version discovery.
Use isolated local synthetic database cloned from local schema only, not hosted
data. Test baseline assertion before implementation, apply transactionally, then
run pgTAP including existing consent/lifecycle regressions. Generate/update the
existing database type definitions for new service RPCs. Run local DB advisors.

Maintenance endpoint must enforce CRON_SECRET in production and invoke cache
cleanup before/independently of any room transport. Reuse the existing daily
recommendation cron where safe; do not add duplicate external schedulers.
Provider errors or disabled enrichment cannot bypass cleanup. Report local
versus hosted execution distinctly. The exact future production sequence,
bounded preview/apply and rollback checks are in [release-plan.md](release-plan.md).
