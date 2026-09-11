# TASK-030 approved reliability and Discover follow-ups

Status: owner approved all four ordered follow-ups on 2026-09-11, including
Git publication, implementation and verification; up to two assistants.
This extends the existing full packet rather than starting another roadmap.

## Order and scope

1. **030.5 Delivery publication — complete.** Deployed repair committed as
   `55b4837` and pushed atomically to main and the task branch. The earlier
   delivery manifest and live evidence remain the deployment provenance.
2. **030.6 Catalogue admission.** Diagnose only the two supplied YouTube IDs
   in one bounded metadata request. Preserve public/processed/embed/age gates.
   Empty blocked-country lists may be admitted as worldwide viewable. Actual
   restrictions require country-aware cache/read filtering, never admission
   based on one requesting user's country. Record diagnostic evidence before
   selecting the implementation; do not repeatedly retry excluded uploads.
   Diagnostic at 09:24:26 UTC proved both IDs public, processed, embeddable,
   not age-restricted, with allowlists (248 and 249 countries) including ZA.
   Implement nullable bounded allowed/blocked country arrays on the private
   expiring metadata row. Filter BEFORE candidate limits, ready counts and
   decision issuance using Vercel's request country; unknown country excludes
   restricted sources. Keep legacy RPCs safe with unknown-country wrappers.
   Lists never go to the browser, never store requester country or IP, and
   expire with metadata. No changes to manual playback or authentication.
3. **030.7 Account Like consistency.** Compare live occurrence timestamp with
   durable source_event_at, retain room-local CAS revision, and consistently
   use the freshest preference for hearts and ranking. Explicit account intent
   must be reassertable even when a stale room row already has the requested
   value, with CAS and action idempotency preserved. Read account preferences
   deterministically beyond 250 rows; chunk uploaded-media access checks.
   Unknown initial state must not be actionable, transient refresh failure
   retains known state, and identity changes invalidate reads and mutations.
4. **030.8 Compact Discover controls.** Your regulars uses compact thumbnail
   and title tiles; click/tap expands details with separate Play, Like,
   Add to queue and Add next actions. Reuse the existing mobile discovery
   card's open/closing animation, click-away and Escape/focus behavior.
   Recommended for you exposes Add next beside Add to queue. Preserve queue
   permission checks, confirmation feedback, counts, reduced motion and
   unclipped bottom scrolling. Song-derived accent and gradient remain.
   Owner additionally approved the persistent feedback-message bug: confirmation
   dismisses after10 unpaused seconds, pauses on hover/focus/busy/hidden tab,
   and has Dismiss. Closing only clears local notice; persisted suppression
   remains unchanged and reversible through Suggestion controls.

## Boundaries and architecture

Supabase remains durable account authority; SpacetimeDB remains live room,
CAS and queue authority. An additive trusted reducer contract is permitted
for explicit preference reassertion, with backward-compatible deployment.
No synthetic production listening or Like toggles. Do not infer historical
data loss or fabricate missing preferences/counts. No provider search on
Personal reads, media downloads, new genre claims, community or Autoplay work.
Preserve unrelated owner Quick Capture notes and existing design conventions.

## Acceptance and verification

Behavioral fixes are test-first: record intended failing cases before source
changes and passing focused suites afterwards. Like cases cover newer durable
Like/unlike, newer pending live state, stale-local reassertion exactly once,
CAS conflicts, 251+ records, initial failure and same-room identity switches.
Ranking and hearts must agree. Catalogue tests reflect the actual diagnostic
and fail closed on malformed restrictions. UI browser checks cover desktop
and mobile expansion/close, keyboard/focus, explicit queue actions, permission
and pending states, reduced motion, overflow and zero automatic search calls.
Run typecheck, lint, build and relevant existing regression suites. Review
changed files and migrations before publication; distinguish local, deployed
and natural-use evidence. No destructive schema changes or account rewrites.

## Evidence

Source audit confirmed stale live precedence, unordered 250-row truncation,
unknown actionable hearts, room-only client scope, and same-local-state reducer
early return. These are separate from the now-drained event backlog. Catalogue
exclusion cause is pending the bounded provider diagnostic.
