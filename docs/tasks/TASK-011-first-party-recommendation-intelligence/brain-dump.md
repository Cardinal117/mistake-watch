# Brain Dump: First-Party Recommendation Intelligence

## Goal

Give Mistake Watch a real, explainable recommendation foundation before the
Add/Discover overhaul, Watch discovery, consented YouTube signals, or AI DJ.

## Why It Matters

Current Listen discovery mostly ranks the active queue and played rows with
small heuristics. That is honest, but it cannot distinguish completion from a
skip, identify replay preference, control repetition across sessions, or
explain why a candidate was chosen.

## Original Direction Preserved

- First-party Mistake Watch behavior is the ranking brain.
- YouTube remains a provider for search, metadata, public playlists, embeds,
  and later explicitly consented account signals.
- Recommendations must be deterministic, inspectable, fast, and advisory.
- AI output must not become trusted state or silently mutate the queue.
- Add/Discover and Watch UI redesigns remain separate later tasks.

## Required Signals

- queue add, remove, reorder, Play Next, and play-now;
- playback start, completion, skip, replay, and source failure;
- explicit Mistake Watch Like and Remove Like preference transitions;
- room, session, queue item, contributor, source type, and opaque media identity;
- completion ratio and transition reason only at meaningful boundaries;
- candidate exclusions for current queue/history, unavailable media, recent
  repetition, and authorization-incompatible uploaded media.

## Constraints

- SpacetimeDB remains the live mutation authority.
- Supabase remains the durable product database.
- Browser analytics calls are not authoritative facts.
- A Like is an explicit user command, not inferred analytics. The server or
  reducer must still verify identity, room scope, and normalized media identity
  before accepting it.
- Do not write playback ticks or drift-correction samples as events.
- Do not store permanent private R2 URLs, Google emails, provider tokens, or
  raw authentication metadata in recommendation events.
- A database migration, SpacetimeDB publish, and production release each remain
  separately approval gated.
- No AI DJ, voting, social graph, new OAuth scope, or discovery redesign.

## Acceptance Ideas

- Replaying the same authoritative action does not duplicate an event.
- Equal inputs always produce equal ordered recommendations and explanations.
- A skipped item is penalized; a completed or replayed item is strengthened.
- A Like is the strongest capped positive signal; removing it removes that
  preference boost without becoming a dislike.
- Current, unavailable, recently repeated, and permission-incompatible items
  are excluded.
- Ranking remains non-blocking when durable history or provider candidates are
  unavailable.
- Recommendation work does not regress the large queue or Media Hub budgets.
- Signed-in likes persist across devices while guest likes remain limited to
  the current room/session.

## Unknowns To Prove Before Migration

- The safest bounded server-side drain from a SpacetimeDB event outbox into
  Supabase in Vercel's serverless runtime.
- The room-session rotation and playback-occurrence identity required because
  replay currently reuses an existing queue row.
- Retention periods for guest room events and signed-in account history.
- Whether the first release persists account attribution or starts with
  room/session-only aggregates.
