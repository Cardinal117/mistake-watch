# Review Notes: First-Party Recommendation Intelligence

## Status

Batches A and B are implemented and verified locally. Release readiness is 30%.
No Supabase migration, Maincloud publish, Vercel deployment, provider scope, or
production configuration has changed.

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

## Decisions Required Before Batch C

- Approve the proven SpacetimeDB-to-Supabase drain mechanism.
- Set guest room-event retention and signed-in account-history retention.
- Decide whether the first production slice stores account attribution or only
  room/session/member-scoped attribution.
- Approve guest Like retention and whether guest-to-account Like migration is
  excluded or offered through a later explicit consent flow.
- Approve the exact Supabase DDL and RLS/grant model before migration.
- Confirm whether the 5,000-event local outbox and processed-action bounds are
  acceptable for production or should be raised after drain-load measurement.
- Confirm room-lifetime guest preference scope. Guest state is currently bound
  to the recommendation room-session ID and capped at 1,000 rows per member;
  no guest-to-account migration is implemented.
- Approve direct/HLS first-pass identity as room-local `queue:<queue_item_id>`.
  YouTube IDs and uploaded asset IDs are stable; cross-add direct URL hashing is
  intentionally deferred until a server-side canonicalizer is approved.

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
- Batch D: 70% - deterministic ranking, Like weighting, and explanations pass.
- Batch E: 82% - authorized, bounded service contracts pass.
- Batch F: 92% - Like UI and existing Room Picks integration pass browser QA.
- Batch G: 100% - migration, publish, deploy, and production QA are complete.

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
- Passed: full `npm test` (254 tests), ESLint, changed-file Prettier, and the
  production Next.js build.
- Passed: independent final security, idempotency, runtime-proof, formatting,
  and scope review found no unresolved Blocker or Important findings.
- Intentionally deferred: durable account Likes, Supabase DDL/RLS, drain job,
  ranker, recommendation API, Heart UI, Maincloud publish, and deployment.
