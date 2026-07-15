# Design Spec: First-Party Recommendation Intelligence

## Authority And Data Flow

```text
room action
  -> SpacetimeDB reducer validates authority and mutates live state
  -> same reducer appends one versioned event to a bounded room outbox
  -> trusted server drain reads outbox with server identity
  -> idempotent Supabase insert/aggregate update
  -> authorized recommendation service loads aggregates + candidates
  -> pure ranker returns ordered candidates + factual reason codes
  -> existing Room Picks adapter renders results or its current fallback
```

The outbox proof is required before migration. Browser clients may request
recommendations, but they do not declare canonical queue or playback facts.

## Event Contract

Initial event types:

- `queue_added`, `queue_removed`, `queue_reordered`, `queue_play_next`;
- `playback_started`, `playback_completed`, `playback_skipped`,
  `playback_replayed`;
- `source_failed`.

Explicit preference transitions are separate commands and events:

- `media_liked`;
- `media_unliked`.

Unlike inferred playback events, these originate from an intentional user
action. They are accepted only after server/reducer verification of the user or
guest identity, room scope, and normalized media identity.

Each event carries only the fields needed for ranking or audit:

- versioned event ID and deterministic idempotency key;
- room ID, room-session ID, playback-occurrence ID, queue-item ID, actor member
  ID, and original contributor member ID when known;
- source type and opaque media identity (`provider_id` or `media_asset_id`);
- transition reason, position, duration, and bounded completion ratio where
  relevant;
- reducer/server timestamp.

Do not include emails, OAuth data, signed URLs, permanent R2 URLs, display-name
identity keys, or arbitrary client metadata.

## Event Semantics

- Emit transitions, not progress ticks.
- A completion requires the authoritative ended/advance path and a defensible
  completion threshold.
- A skip requires an explicit next/play transition before completion.
- A replay requires returning to a previously played media identity.
- Queue reorder is operational context and does not by itself imply preference.
- Smart Shuffle may perform several move reducers for one operation; those
  moves must not be multiplied into preference evidence.
- Source failure affects availability, not user taste.
- Retry paths reuse the same idempotency key.

## Durability Boundary

SpacetimeDB owns the active outbox because it owns the reducers. A trusted,
bounded server process may drain events into Supabase using
`SPACETIME_SERVER_AUTH_TOKEN` and service-role database access. The proof batch
must validate connection lifecycle, pagination, acknowledgements, retries, and
Vercel execution limits before a migration is proposed.

The expected durable model is service-only:

- `recommendation_events`: immutable normalized events;
- `recommendation_media_aggregates`: bounded room/account/media counters and
  timestamps used by ranking;
- unique idempotency constraint on the authority event key;
- covering indexes for room/session/media/time reads;
- RLS enabled with no direct browser write policy.

Exact DDL remains unapproved until the bridge proof and retention decision are
reviewed.

## Preference State

The current preference is distinct from the immutable event stream. The
expected durable model adds `media_preferences` with one current row per
signed-in account and opaque media identity. Setting Like twice is idempotent;
Remove Like returns the state to neutral and does not create a negative signal.

Guest preferences remain room/session scoped and expire with the approved
guest retention boundary. They must not become cross-room profiles. Account
likes persist across devices and support explicit deletion/export behavior.

The first release exposes only Like and Remove Like. A later private `Show less
like this` command may provide an explicit negative signal, but absence of a
Like is always neutral.

Existing Supabase `queue_items` and `playback_sessions` are not an event ledger:
the current runtime reads them for initial state but does not durably mirror
every live reducer transition. TASK-011 must not silently treat those tables as
complete recommendation history.

## Ranking Contract

The pure ranker accepts normalized candidates, aggregates, current room state,
and explicit weights. It returns:

- ordered candidates;
- total and component scores;
- stable reason codes and short factual labels;
- exclusion reasons for diagnostics.

First-pass components:

- explicit Like affinity, capped so one artist or source cannot dominate;
- room affinity and recent completions;
- current-media similarity using available provider metadata;
- replay and completion strength;
- freshness and diversity;
- contributor/session context;
- penalties for skip, remove, failure, repetition, and queue/history collision.

Signal priority starts with explicit Like, then replay, high completion,
Play Next/manual add, and normal completion. Skip and remove apply bounded
penalties. Source failure changes availability rather than taste.

Stable media IDs, deterministic tie-breaking, caps, and bounded lookback windows
are mandatory. Ranking logic must not live in React components.

## Candidate And Authorization Rules

- Current queue, recent history, unavailable sources, and repeated candidates
  are filtered before scoring.
- Provider candidates remain constrained to data Mistake Watch legitimately
  receives through existing public APIs.
- Uploaded-media events may contribute to room-session analysis, but catalogue
  candidates must never reveal an asset to a user who lacks catalogue access.
- Guests may receive room-safe recommendations without gaining durable account
  history or private catalogue access.
- Recommendation actions continue through existing queue/playback permission
  checks.

## Module Direction

- `lib/recommendations/events.ts`: event types and validation.
- `lib/recommendations/preferences.ts`: preference state and Like commands.
- `lib/recommendations/media-identity.ts`: opaque stable identity rules.
- `lib/recommendations/scoring.ts`: pure component scoring.
- `lib/recommendations/rank.ts`: exclusions, ordering, diversity, reasons.
- `lib/recommendations/room-service.ts`: authorized aggregate/candidate reads.
- `spacetime/src/recommendation-events.ts`: outbox schema/helpers.
- `app/api/recommendations/room/route.ts`: authorized read endpoint.
- `app/api/recommendations/preferences/route.ts`: verified Like/Remove Like
  command path where the final identity design requires an HTTP boundary.
- Supabase migration and generated types only after bridge approval.

Final names may follow nearby repository conventions after implementation
inspection. Generated SpacetimeDB bindings are regenerated, never hand-edited.
`spacetime/src/index.ts` is already approximately 2,205 lines, so event tables,
identity helpers, and reducer instrumentation must be extracted rather than
making that legacy entry module materially larger.

## Like UI

- Reuse the repository's Lucide icon system with `Heart`.
- Use a compact icon button with stable dimensions, tooltip, visible focus, and
  `aria-pressed` plus `Like` / `Remove like` accessible names.
- Use existing Signal Blue/Gold, dark surfaces, border radius, and reduced
  motion rules from `DESIGN.md`; no new palette or decorative animation.
- Show the control on approved active-media and Room Picks/recommendation cards
  where a stable media identity exists. Do not crowd every queue row.
- Optimistically reflect state only with rollback on failure and an honest
  unavailable state when identity or media normalization cannot be verified.
- Never show who liked an item or expose another participant's private state.

Recommendation explanations may use factual labels such as `Because you liked
Julien Journet`, `Similar to songs you liked`, or `Matches your liked orchestral
tracks`. Room-level wording must not reveal which participant supplied a signal.

## Performance Budgets

- No per-tick database writes.
- Pure ranking target: p95 at or below 50 ms for 500 candidates with a bounded
  aggregate input fixture.
- Warm authorized endpoint target: p95 at or below 250 ms in deterministic
  integration testing, excluding external provider latency.
- Candidate and event queries are bounded and paginated.
- Recommendation failure must not delay room join, playback, queue mutation,
  Add Media, or Media Hub opening.

## Privacy And Retention

- Start room/session-first; account attribution is separately reviewable.
- Guest activity must not become cross-room profiling.
- Retention and deletion behavior must be explicit before durable deployment.
- Ranking explanations expose reasons, not another participant's private
  activity details.

## Edge Cases

- Duplicate reducer retries and out-of-order drain attempts.
- Ended event followed immediately by explicit Next.
- Manual Next before a duration is known.
- Loop/replay and previous-button transitions.
- Queue item removed while playing.
- Same YouTube video added through different URL forms.
- Uploaded-media playback visible to guests without catalogue permission.
- Provider candidates unavailable or rate-limited.
- Existing provider cache entries that have expired or previously cached a
  failure.
- Rapid Like/Remove Like toggles, retries, offline rollback, and duplicate tabs.
- A guest liking media and later signing in without explicit migration consent.
- A private uploaded asset liked by an authorized account and viewed by a guest
  who lacks catalogue access.
- Signed-in room membership without a guest-cookie authentication path.
- Empty history, one-item rooms, and 1,000-item queues.
