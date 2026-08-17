# Review Notes: First-Party Recommendation Intelligence

## Status

TASK-011 is live in production and functional QA passed. Release readiness is
98%. The account-member provider-route authorization hotfix is committed,
deployed, user-verified, and merged to `main`. Two post-attachment account Like
events are confirmed in the authoritative Maincloud outbox. Final closure
requires observing those events after the scheduled durable drain and
confirming the resulting account preference survives a fresh signed-in session.
The Supabase migration is applied, Maincloud was published non-destructively,
and Vercel deployment `dpl_AFfECQewb4i9m6F5QwABLp3FzpvW` is active on the live
aliases.

The Batch A/B checkpoint is pushed as `bfc234b`. Pre-Batch C infrastructure
reconciliation is complete.

The migration-history reconciliation checkpoint is pushed as `bc31399`. Batch
C is committed and pushed as `3a79b82`. Batch D is committed and pushed as
`3eab0e2`. Batches E/F, release corrections, and the attached-account provider
fix are pushed through `a163a4b` on both
`task-011-first-party-recommendations` and `main`.

## Batch G Production Outcome

- Applied the recommendation durable-store migration to Supabase as tracked
  version `20260716064635`.
- Published the SpacetimeDB module with `--delete-data=never`. Maincloud added
  `room_session.playback_occurrence_id` and seven private recommendation tables
  without deleting data or requiring a manual migration.
- Added an append-only schema regression after the first publish plan exposed
  that inserting the occurrence column into the middle of the production table
  would require a manual migration.
- Deployed exact commit `7462db6` to Vercel production as
  `dpl_FHBEn8Ue865tEQfwvjqVkMRrfi4G`.
- Verified both production aliases, `/api/health`, and `/api/ready` return
  healthy responses. Vercel registers both daily cron jobs, and an authenticated
  recommendation drain invocation returned `200`.
- Two-participant manual QA passed Like/Remove Like, recommendation refresh,
  playback and queue continuity, Next and natural completion synchronization,
  guest uploaded-catalogue denial, and active uploaded playback visibility.
- Production authority evidence recorded two distinct `media_liked` events at
  revision 1, with no duplicate Like event for either action. The subsequent
  drain acknowledged all 16 pending authority events and left the outbox empty.
- Manual DevTools inspection of recommendation response bodies was not
  completed. Automated contracts reject URLs, object destinations, email,
  OAuth fields, and participant-controlled identity fields; production
  authority rows contain opaque media IDs only.

## Final Account-Persistence Gate

- The supplied high-load room was successfully attached on 2026-07-16.
  Supabase now records the signed-in account as owner and saved-room user, the
  host membership is account-backed, and `account_guest_migrations` records
  both ownership and saved-room transfer.
- The two existing production Likes occurred before attachment. Refresh
  persistence was real, but it proved private room-session persistence rather
  than durable cross-session account state.
- The pre-attachment Like events were correctly stored without account
  attribution and did not create `media_preferences` rows. This originally left
  the signed-in durable path unexercised; the current post-attachment events are
  recorded below.
- Final closure requires draining the post-attachment Likes and confirming the
  durable account preference survives a fresh signed-in session.

Current update:

- The provider authorization hotfix is deployed from exact commit `a163a4b` as
  `dpl_AFfECQewb4i9m6F5QwABLp3FzpvW` and is merged to `main`.
- User QA confirmed attached-account YouTube search and the surrounding room
  behavior work as intended.
- Maincloud contains two post-attachment `media_liked` events for the
  account-backed host member. The room outbox contains 45 pending events, which
  is within the next scheduled 50-event drain batch.
- Supabase currently has no durable account event or `media_preferences` row
  for those Likes because the scheduled drain has not run since the actions.
- Final closure is therefore reduced to observing the scheduled drain, checking
  the resulting durable preference, and confirming it survives a fresh session.

## Account Attachment Provider Regression

- Production logs recorded two `403` responses from `/api/youtube/search`
  immediately after room attachment.
- `lib/rooms/request-guards.ts` authorized quota-bearing provider routes only
  through the guest cookie. Attachment correctly clears
  `room_members.guest_identity_id` and sets `room_members.user_id`, leaving the
  converted owner unable to satisfy that guest-only guard.
- Search, playlist preview, and related-video recommendations share this guard,
  so all three provider workflows are affected for an attached account member.
- The corrective patch checks an
  authenticated Supabase user against an open room and account-backed
  membership before retaining the existing guest fallback and rate limit.
- Corrective verification passed 314 tests, TypeScript, ESLint, Prettier,
  file-length policy with zero violations, and a production build. Commit
  `a163a4b` is deployed and merged to `main`.
- The SpacetimeDB client cache warning had no matching Maincloud warning or room
  error. The host participant remained online and authoritative, so it is
  recorded as a transient reconnect/cache observation rather than the cause of
  the provider failure.

## Post-Release Product Findings

- The Now Playing Heart renders only when the live source has a corresponding
  queue item. Direct `Load now` clears `active_queue_item_id`, so directly
  loaded media has no Now Playing Heart even though it has a valid media
  identity.
- The Heart updates optimistically but remains disabled during the full
  authorization and SpacetimeDB round trip. Production latency makes the
  roughly one-second pending state feel slower because there is no positive
  animation or pending treatment.
- A follow-up should separate an account-only personal Like from any temporary
  guest room preference, add reduced-motion-aware interaction feedback, and
  support canonical current media even when it was not sourced from a queue
  row.
- Current Listen recommendations intentionally use the playing item to obtain
  provider candidates, then rerank with first-party signals. The future Add
  Media overhaul should distinguish `Related to what is playing` from an
  account-history-driven `For You` surface.

## Batch E And F Outcome

- Added private, no-store recommendation and preference routes with streamed
  byte limits, bounded URL-free request contracts, server-resolved account or
  guest identity, active SpacetimeDB participant revalidation, and a bounded
  TTL/LRU cache with shorter failure expiry.
- Recommendation reads merge durable account signals with current room
  preference state. Current room state overrides durable state and participates
  in the cache key, so a successful Like refreshes ranking without allowing a
  stale cache hit after a participant leaves or is kicked.
- Preference reads exclude durable direct/HLS identities from other rooms and
  expose uploaded preferences only when the current catalogue scope still
  authorizes a ready public or owner asset.
- Added a trusted SpacetimeDB preference reducer/procedure. Browser requests
  cannot supply participant IDs, storage URLs, or provider credentials;
  uploaded and direct/HLS media identities are verified against live room
  state before mutation.
- Reconciled durable Like revisions with room-scoped optimistic concurrency.
  Removing an existing durable Like now emits a trusted neutral transition
  instead of conflicting with or bypassing SpacetimeDB authority.
- Integrated first-party ordering only into the existing Listen Room Picks
  boundary. Service failure preserves the original provider order, while an
  authoritative empty result remains empty so hard exclusions are not undone.
- Added a shared Lucide Heart to now-playing and recommendation cards with
  stable dimensions, `aria-pressed`, Like/Remove Like labels, optimistic
  rollback, stale-room protection, disabled uploaded state for guests, and an
  announced error status.
- Independent review found five Important issues: stale participant reads,
  cross-room/private preference leakage, stale ranking after Like, restoration
  of hard-excluded candidates, and silent mutation failures. All five were
  corrected. Its final lint finding was also corrected by moving the room ref
  update into an effect; the complete lint gate passes.

## Batch D Outcome

- Added one pure deterministic ranking boundary split across candidate/input
  normalization, component scoring, and bounded diversity selection. No React,
  network, database, provider, or room mutation dependency enters the ranker.
- Reused the approved opaque identity rules: YouTube provider IDs, uploaded
  asset UUIDs, and room-local `queue:<queue_item_id>` direct/HLS identities.
  Candidate output is rebuilt from an allowlisted shape and never retains
  source, signed, public, or R2 URL fields.
- Added hard exclusions before scoring for invalid, unavailable,
  authorization-incompatible, current, queued, recently played, and duplicate
  candidates. Uploaded candidates fail closed unless catalogue authorization is
  explicitly true.
- Added integer score components for private Like, replay, completion, Play
  Next/manual add, room context, current-media similarity, contributor context,
  bounded recency, freshness, skip/remove penalties, and diversity.
- Kept Like as the strongest individual positive component even when custom
  weights are supplied. Remove Like and missing Like remain neutral; source
  failure counters never become a taste penalty.
- Prevented account and room-session aggregates for the same event stream from
  doubling inferred behavior. Account signals drive signed-in affinity while
  room aggregates contribute a separately capped room component.
- Added stable media-key tie-breaking, factual reason codes/labels, deterministic
  exclusion diagnostics, and a maximum result limit of 100.
- Added deterministic fixtures for empty and sparse inputs, every hard
  exclusion, reverse-input stability, Likes, positive and negative signals,
  failure neutrality, similarity, diversity, private uploads, duplicates, and
  1,000 candidates.
- Fixture development exposed that oversized aggregate counters were discarded
  instead of bounded, which could erase legitimate skip/remove penalties.
  Counter normalization now saturates at 10,000 and has focused coverage.
- Optimized the diversity loop to normalize metadata once and allocate only for
  selected rows. The final focused 500-candidate benchmark measured `6.75 ms`
  p95 against the `50 ms` gate.
- Independent Batch D review found four Important issues: unauthorized upload
  diagnostics exposed an opaque asset ID, negative-only activity could earn a
  recency boost, room skip/remove evidence could disappear during account
  composition, and two explanations overstated single observations. All four
  were corrected and covered by focused regression tests. A locale-sensitive
  tie-break was also replaced with code-point ordering for cross-runtime
  determinism. Re-review found no unresolved Blocker or Important finding.

## Batch C Outcome

- Added service-only `recommendation_events`,
  `recommendation_media_aggregates`, and `media_preferences` DDL with RLS,
  explicit grants, bounded fields, covering indexes, retention columns, and
  account-deletion cascades.
- Added one bounded atomic ingest RPC. Only newly inserted authority events can
  increment room-session or verified-account aggregates; conflicting reuse of
  an event ID or idempotency key fails instead of being treated as a retry.
- Added service-only, non-personal event-key tombstones retained for 180 days.
  Account deletion can erase account-linked recommendation rows without letting
  an unacknowledged outbox retry increment the room aggregate a second time.
- Added database-side room/member/account verification in addition to the
  server lookup. Guest activity never receives account attribution.
- Added stale-order protection for rapid Like/Remove Like transitions. Like is
  durable until explicitly neutralized or the account is deleted; neutral
  current-state rows expire after 30 days.
- Set room-session event and aggregate retention to 30 days and verified-account
  event and aggregate retention to 180 days. No guest-to-account migration is
  implemented.
- Added a trusted drain service and CRON-secret-protected route. The outbox is
  acknowledged only after the atomic Supabase RPC returns consistent counts.
  Malformed events, persistence errors, or inconsistent results leave the
  outbox unacknowledged for investigation and retry.
- Added pure normalization and migration-security tests covering forbidden URL
  fields, opaque media IDs, attribution, retention, deterministic batches,
  duplicate safety, RLS/grants, cleanup, and drain authorization.
- Applied the complete 19-migration history to a disposable local Supabase
  PostgreSQL instance. Real database assertions passed for service-role access,
  `anon`/`authenticated` denial, exact retries, conflicting-batch rollback,
  30/180-day retention after final attribution, stale Like ordering, cleanup,
  account-deletion cascades, and post-deletion retry deduplication. The
  temporary stack was stopped and removed.
- Independent review found four behavioral issues: same-key payload conflicts,
  incomplete database collision comparison, and retention calculated before
  final database attribution, followed by loss of deduplication evidence after
  account deletion. All four were corrected and covered by focused and
  real-database verification; no Blocker or Important finding remains.

## Batch A And B Outcome

- Added a versioned first-party event taxonomy and explicit Like/Remove Like
  contract. Like is the strongest capped positive signal; Remove Like restores
  neutral state.
- Added private SpacetimeDB room-session, playback-occurrence, replay-memory,
  processed-action, guest-preference, overflow, and event-outbox state.
- Added a trusted private outbox procedure plus bounded, idempotent
  acknowledgement. Browser clients cannot subscribe to the private tables.
- Added occurrence IDs to public room playback state so delayed advance or
  source-failure retries cannot mutate a newer replay or loop occurrence.
- Added a 90%/ended completion rule. Autoplay before that boundary is recorded
  as a skip rather than a completion.
- Added reducer events for queue add, Play Next, reorder, remove, playback start,
  completion, skip, replay, source failure, Like, and Remove Like. Playback
  ticks and drift corrections remain excluded.
- Added required client action IDs to duplicate-sensitive queue add, play,
  priority, and reorder commands. Smart Shuffle shares one action ID across its
  move reducers, producing one operational event while later shuffles remain
  distinct. The private processed-action ledger prevents duplicate retries.
- Added private, revision-checked guest preference commands and a caller-scoped
  preference read procedure. Neutral rows retain revision state so delayed
  stale toggles cannot resurrect a removed Like.
- Prevented an existing room member ID from being rebound to another
  SpacetimeDB identity during join. This closed a permission and preference
  takeover path found during independent review.
- Split room tables, schema, errors, keys, recommendation tables, policy, and
  authority into focused modules. `spacetime/src/index.ts` is 2,204 lines,
  below its frozen 2,205-line ceiling.

## Baseline And Bridge Evidence

- Read-only live-room observation: 346 upcoming and 223 played rows, eight Room
  Picks, no Like controls, and no queue mutation during measurement.
- Existing queue-derived Room Picks median: 0.115 ms for 250 items and 0.407 ms
  for 1,000 items across five runs of 250 derivations. This is a pure-function
  baseline, not a network or render latency claim.
- Isolated local SpacetimeDB database `task011-local-proof-2` proved:
  - module-owner trusted outbox reads succeed;
  - anonymous outbox reads are denied;
  - one queue add creates one versioned event without a source URL;
  - acknowledgement removes the event;
  - retrying the same duplicate-enabled client action leaves two total queue
    rows rather than creating a third duplicate.
- Repeatable reducer-runtime proof in `task011-reducer-proof` additionally
  verifies one event for a multi-move shuffle, a distinct later shuffle,
  natural completion, replay, stale failure rejection, current failure capture,
  Like retry idempotency, and Remove Like revision handling.
- The outbox reads at most 100 rows per call. Pending rows are never pruned.
  Capacity is 5,000 per room; overflow increments private loss telemetry and
  logs a warning without blocking playback or queue mutation.

## Resolved Decisions

- SpacetimeDB authority emits canonical events at mutation boundaries.
- Browser clients do not originate trusted behavioral facts.
- Like is a deliberate user command and may originate in the UI, but it becomes
  trusted preference state only after identity, scope, and media validation.
- Events record transitions only; playback ticks and drift samples are excluded.
- Ranking is deterministic and explainable before any AI presentation.
- Uploaded playback access does not imply uploaded catalogue recommendation
  access.
- Existing Room Picks is the only planned presentation integration in this
  task; Add/Discover, Watch discovery, and AI DJ remain later packets.
- One primary implementer owns event semantics, persistence, and ranking.
- Signed-in Likes are durable and private; guest Likes remain room/session
  scoped. Remove Like restores neutral rather than creating dislike.

## Resolved Batch C Defaults

- The trusted SpacetimeDB-to-Supabase drain remains server-only and bounded to
  100 events per outbox read.
- Guest room-session events and aggregates expire after 30 days. Verified
  account events and aggregates expire after 180 days.
- Account attribution is stored only after both application and database checks
  match the event actor to the same room-member row and `auth.users` account.
- Guest Likes remain private room-session state and are never migrated into an
  account without a later explicit consent flow.
- Signed-in Likes persist until Remove Like or account deletion. Neutral rows
  expire after 30 days and never represent dislike.
- The 5,000-event room outbox and 1,000-preference per-member limits remain the
  first production bounds pending measured drain load.
- Direct/HLS identity remains room-local `queue:<queue_item_id>`. YouTube IDs
  and uploaded asset UUIDs remain stable; direct URL hashing is deferred.

## Pre-Batch C Infrastructure Reconciliation

- Confirmed all 18 local migration filenames now match the 18 migration version
  and name pairs recorded by the production Supabase project.
- Registered `media_upload_completion_idempotency` through the supported
  migration ledger as version `20260715092501`. Its idempotent SQL made no
  schema change because the exact unique partial index was already live.
- Confirmed no recommendation event, preference, or aggregate tables exist in
  Supabase. Batch C therefore starts from an explicit zero-schema baseline.
- Reviewed Supabase advisors. The two service-only tables with RLS and no client
  policies remain intentional; leaked-password protection is a separate
  Google-only authentication hardening consideration. No blocker was found for
  preparing Batch C locally.
- Removed obsolete `SPACETIME_ROOM_SEED_SECRET` configuration from Vercel. The
  active production `SPACETIME_SERVER_AUTH_TOKEN` remains configured; there are
  currently no preview-target environment entries.
- No Batch C DDL, persistence code, recommendation table, Maincloud publish, or
  application deployment was performed during reconciliation.

## Existing System Findings

- `lib/recommendations/listen-discovery.ts` currently derives Room Picks from
  queue and played rows with lightweight heuristics.
- `lib/youtube/recommendations.ts` provides provider candidates but is not a
  first-party learning system.
- SpacetimeDB reducers are authoritative for queue and playback transitions.
- Supabase already has durable `queue_items`, `playback_sessions`, room member,
  guest identity, and profile foundations, but no canonical recommendation
  event store. Those queue/playback tables are not currently mirrored on every
  live mutation and must not be treated as complete history.
- `SPACETIME_SERVER_AUTH_TOKEN` and generated server connections exist, giving
  Batch A a concrete path to test a trusted drain without accepting browser
  events.
- Completion, manual Next, play-now, previous, loop, and replay currently
  converge on shared queue advancement. Intent must be captured at the reducer
  boundary because it cannot be reconstructed afterward.
- Replay reuses the queue row and loses a distinct occurrence identity; actor,
  original contributor, queue row, and playback occurrence must remain
  separate.
- Current provider recommendation caching has no explicit TTL/capacity and can
  retain failures for the process lifetime. The current request guard also
  needs an explicit signed-in membership path in addition to guest-cookie
  authorization.
- `spacetime/src/index.ts` is approximately 2,205 lines. TASK-011 must extract
  its event module instead of expanding the legacy entry file substantially.

## Agent Strategy

- Planning: one read-only agent maps event producers, authority, and tests.
- Implementation: one supporting agent may own deterministic fixtures and
  performance tests while the primary agent alone owns event semantics, schema,
  reducer integration, and scoring contracts.
- Final QA: a second read-only agent is useful only after implementation for an
  independent security, privacy, idempotency, and scope review.
- Two parallel coding agents are not recommended because reducer, persistence,
  and ranking semantics are tightly coupled.

## Cumulative Progress Model

The percentages below measure release readiness, not development effort:

- Batch A: 15% - contracts and trusted bridge feasibility are proven.
- Batch B: 30% - authoritative inferred events and guest session preference
  commands work locally.
- Batch C: 50% - durable preference/event storage and retry safety are ready.
- Batch D: 70% - deterministic ranking, Like weighting, explanations, and the
  500-candidate performance gate pass locally.
- Batch E: 82% - authorized, bounded service contracts pass.
- Batch F: 92% - Like UI and existing Room Picks integration pass local gates.
- Batch G: 98% - migration, publish, deploy, provider authorization correction,
  and functional production QA are complete. Post-attachment account Likes are
  present in the authoritative outbox; the scheduled durable drain and fresh
  session persistence proof remain.

## Recommended Product Order After TASK-011

1. Consented YouTube account signals where official API support is verified.
2. Add/Discover and Watch discovery overhaul using this ranking contract.
3. Account-backed personalization where consent and retention are established.
4. AI DJ/session intelligence as an advisory presentation layer.

## Verification Notes

- Passed: SpacetimeDB build and generated bindings.
- Passed: recommendation and SpacetimeDB contract tests after the table-module
  refactor.
- Passed: root TypeScript check and file-length policy.
- Passed: deterministic Room Picks baseline benchmark.
- Passed: isolated local trusted read, anonymous denial, bridge acknowledgement,
  and repeatable reducer-runtime transition proof.
- Passed after Batch C: full `npm test` (264 tests), TypeScript, ESLint,
  changed-file Prettier, and file-length policy with no new warnings.
- Passed after Batch D: full `npm test` (280 tests), including reverse-input
  determinism, 1,000-candidate coverage, redacted authorization exclusions,
  negative-only recency protection, and a measured focused 500-candidate p95
  of `6.75 ms` against the `50 ms` gate.
- Passed after Batches E/F: full `npm test` (310 tests), TypeScript, ESLint,
  file-length policy, changed-file Prettier, production build, SpacetimeDB
  build/generate, 44 focused service/UI/security tests, and route smoke checks
  for private no-store `400`/`403` responses.
- Passed: local browser room load and console smoke produced no browser errors.
  The supplied high-load room could not be exercised against the local code
  because local SpacetimeDB state had no matching queue and the new trusted
  procedures are intentionally unpublished.
- Passed: disposable local Supabase reset/apply plus behavioral SQL proof for
  RLS, grants, duplicates, rollback, retention, preference ordering, cleanup,
  account deletion, and post-deletion retry deduplication.
- Passed: independent security/accessibility review findings were corrected;
  its final ref-lint blocker was fixed and the complete lint gate rerun.
- Passed after Batch G: full `npm test` (311 tests), TypeScript, ESLint,
  file-length policy with zero violations, production build, SpacetimeDB build,
  exact generated-binding parity, deterministic ranking performance, browser
  E2E, Supabase security checks, additive Maincloud publish, Vercel readiness,
  authenticated drain, and two-client functional production QA.
- Passed after attachment regression fix: full `npm test` (314 tests),
  TypeScript, ESLint, changed-file Prettier, file-length policy, and production
  build.
- Pending final closure: observe the scheduled drain for the two account-backed
  Likes, confirm the durable preference survives a fresh session, and complete
  manual DevTools response-body inspection.

## Cross-Browser Account Attachment Follow-Up

- Production QA on 2026-08-17 confirmed that a Like becomes visible immediately
  in a second private browser after that browser signs in to the same Google
  account and joins the attached room. This verifies account-backed room
  preference synchronization rather than browser-local persistence.
- The same QA exposed an Account Overview mismatch: a browser retaining its own
  guest room cookie was offered `Attach current room` even though the signed-in
  account already had a durable room member. Recommendation authorization was
  correct; only the panel's attachment presentation used the browser's current
  guest member as its source of truth.
- The local correction resolves the account once in the room server page and
  derives a boolean attachment state from the existing room owner, saved-room,
  and member records. It deliberately preserves the browser guest member as the
  current live-room authority identity.
- Regression coverage now verifies account-member, owner, saved-room,
  guest-only, and unrelated-account outcomes, plus all desktop and mobile room
  Account-panel entry points.
- Passed locally after the correction: full `npm test` (324 tests), TypeScript,
  ESLint, changed-file Prettier, file-length policy with zero violations,
  `git diff --check`, and the production build.
- The supplied WebInspector capture contains two successful preference updates
  to `/api/recommendations/preferences`. Each request contains only
  `actionId`, `expectedRevision`, `liked`, `mediaId`, `roomId`, and
  `sourceType`; both responses are `private, no-store` with `nosniff`. The HAR
  omitted response bodies, so manual response-body redaction inspection remains
  pending.
- Manual release QA remains required on a deployed build: reopen Account
  Overview in both signed-in browsers and confirm both show the attached state
  with no duplicate attachment action.
