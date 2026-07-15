# Proposal: First-Party Recommendation Intelligence

## Problem

Mistake Watch has provider suggestions and queue-derived discovery, but no
canonical behavioral event contract or durable, explainable scoring model.
Adding AI or richer discovery now would either duplicate heuristics in UI code
or present weak signals as intelligence.

## Goal

Create an authority-safe event pipeline and deterministic recommendation engine
that can rank real candidates, explain each score, and fail without affecting
room playback or queue operations.

## User Value

- More relevant suggestions with fewer immediate repeats.
- Recommendations respond to completions, skips, replays, room context, and
  contributor activity instead of only queue position.
- Users can explicitly Like media and receive clearer recommendations based on
  that deliberate preference.
- Every suggestion can state a factual reason.
- Playback, queue, and Add Media remain fast if recommendations are unavailable.

## Scope

- Define a versioned first-party media-event taxonomy and privacy contract.
- Add idempotent Mistake Watch Like/Remove Like state for signed-in accounts and
  room/session-scoped guests.
- Emit meaningful events atomically from authoritative SpacetimeDB reducers.
- Prove an idempotent server-only durability bridge before schema approval.
- Add a service-only Supabase event/aggregate model after the proof passes.
- Implement pure candidate normalization, filtering, scoring, diversity, and
  explanation modules.
- Add an authorized, cacheable room recommendation read path.
- Integrate the engine into the existing Room Picks data boundary without a UI
  redesign.
- Add a compact accessible Heart toggle to approved active-media and
  recommendation-card surfaces.
- Add deterministic, reducer, route, security, performance, and browser tests.

## Non-Goals

- AI DJ text, chat, voice, autonomous queue changes, or mood invention.
- Add Media, Media Hub, Watch room, or Listen room redesign.
- Suggested-next voting.
- YouTube account playlists, subscriptions, history, or new OAuth scopes.
- Social graph, achievements, or cross-user profile inference.
- Per-tick playback analytics or third-party analytics SDKs.
- YouTube Like mutation or any implication that a Mistake Watch Like changes
  the user's YouTube account.
- A public dislike count or participant-visible preference history.

## Risks

- Client-originated events could be forged or omitted.
- Dual writes between SpacetimeDB and Supabase could lose or duplicate facts.
- Unbounded progress events could create cost and latency problems.
- Private uploaded-media identity could leak catalogue information.
- Historical events could overfit stale preferences or expose guest activity.
- Ranking work could delay room opening or Add Media requests.

## Success Criteria

- Event facts originate from authoritative reducers and use stable idempotency
  keys.
- No playback tick stream is persisted.
- Durable writes are server-only, retryable, and duplicate-safe.
- Ranking is deterministic and produces structured reason codes.
- Like state is private, duplicate-safe, removable, and more influential than
  inferred behavior without overwhelming diversity controls.
- Warm scoring stays within the approved performance budget and never blocks
  playback, queue mutation, or room joining.
- Existing authorization, uploaded-media privacy, and TASK-010 performance
  behavior remain unchanged.
