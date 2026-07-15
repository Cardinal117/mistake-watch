# Acceptance Criteria: First-Party Recommendation Intelligence

## Authority And Correctness

- Canonical events originate atomically from authorized SpacetimeDB reducer
  transitions, not browser analytics claims.
- Event retries are idempotent and partial drain failures are recoverable.
- Playback ticks, sync corrections, and repeated metadata callbacks do not
  create behavioral events.
- Completion, skip, replay, remove, failure, and Play Next semantics are covered
  by reducer and contract tests.
- Room-session and playback-occurrence identities distinguish repeated plays of
  the same queue row while preserving the original contributor separately from
  the action actor.
- Smart Shuffle and multi-move reorder operations do not inflate taste signals.
- Like and Remove Like are authenticated/room-scoped, idempotent, and distinct
  from inferred playback events.

## Ranking

- Equal normalized inputs always produce the same candidate order, component
  scores, reason codes, and tie-breaking.
- Current queue/history collisions, unavailable media, recent repeats, and
  authorization-incompatible assets are excluded.
- Completion and replay can strengthen affinity; skip and remove can reduce it;
  failure affects availability rather than taste.
- Like is the strongest capped positive signal, Remove Like restores neutral,
  and missing Like state is never treated as dislike.
- Every returned candidate has at least one factual explanation reason.
- Empty or unavailable history falls back honestly without blocking playback.

## Security And Privacy

- No permanent or signed R2 URL enters event rows, aggregates, recommendation
  responses, queue state, or room state.
- Uploaded catalogue candidates remain hidden from guests and unauthorized
  accounts even when those users may watch active room playback.
- No Google email, OAuth token, auth metadata, or display-name identity key is
  stored in recommendation events.
- Durable tables use RLS and service-only writes; direct browser event writes
  are denied.
- Guest activity is room/session scoped and is not used for cross-room durable
  profiling.
- Signed-in Like state persists across sessions/devices; guest Like state
  expires with the approved room/session retention policy.
- Retention and deletion behavior is documented and tested before production.

## Performance And Reliability

- No per-tick event write path exists.
- Pure ranking meets p95 <= 50 ms for 500 candidates under the approved fixture.
- Warm recommendation reads meet p95 <= 250 ms in deterministic integration
  tests excluding external provider latency.
- Event and candidate reads are bounded, indexed, and paginated.
- Recommendation/provider caches have explicit TTL, capacity, and failed-entry
  expiry behavior.
- Recommendation failure cannot block room join, playback, queue mutation,
  Add Media, Media Hub opening, or provider fallback.

## Integration

- Existing Room Picks actions retain queue/playback permission enforcement.
- Approved active-media and recommendation cards expose a stable Heart control
  using `aria-pressed`, `Like` / `Remove like` accessible names, keyboard focus,
  tooltip, and rollback on mutation failure.
- Mistake Watch Like state is clearly separate from displayed YouTube like
  counts and never calls a YouTube mutation API.
- Recommendation reads authorize signed-in durable members and room-scoped
  guests without allowing either identity path to cross room boundaries.
- Existing provider suggestions and honest fallback states remain available.
- Owner, guest, uploaded-media playback, and catalogue authorization behavior
  from TASK-009 remains unchanged.
- TASK-010 Media Hub and large-queue performance budgets do not regress.
- Desktop, mobile, keyboard, and two-participant room flows pass.

## Release

- Supabase migration, SpacetimeDB publish, and Vercel deployment follow the
  documented dependency order and each receives explicit approval.
- Production QA confirms one authoritative event per action, synchronized
  playback continuity, stable recommendations, and no private data leakage.

## Must Not Include

- AI DJ, generated mood claims, autonomous queue mutation, voting, UI overhaul,
  public dislike counts, social graph, or additional Google/YouTube account
  scopes.
