# TASK-002 Acceptance Criteria

## Global Criteria

- TASK-002 remains the canonical recovery order for incomplete TASK-001 work.
- Each subtask is implemented one at a time after explicit approval.
- Existing watch/listen playback, room join, queue, permissions, and sync behavior remain working unless the active subtask explicitly changes them.
- Every implemented subtask ends with relevant tests, `npm run typecheck`, `npm run lint`, targeted browser QA for UI/realtime changes, and an implementation report.
- No fake provider data, fake personalization, fake metrics, or hidden YouTube behavior is introduced.

## TASK-002.1 Listen Mode Quality Pass

- Listen queue drawer supports configurable heights.
- Drawer displays current item position plus total count.
- Listen dynamic theme is visibly stronger while preserving contrast.
- Listen playlist import supports a selective overlay flow.
- Waveform visuals use the listen theme without blending into the background.

## TASK-002.2 Room Chat

- Chat tab is no longer a placeholder.
- Messages deliver live between joined clients in the same room.
- Messages show sender identity and role context.
- Failed send and reconnect states are visible.
- Messages do not leak across rooms.

## TASK-002.3 Seamless Next Item Loading

- Likely next item can be predicted without mutating playback state.
- Metadata and thumbnails are prefetched safely.
- Direct/HLS preload respects network constraints.
- YouTube preloading avoids hidden players and full-video preload.
- Transition timing is measurable.

## TASK-002.4 Provider Recommendations and Room Picks

- Discovery tabs represent honest data sources.
- Queue/history recommendations work before accounts exist.
- Provider failures show explicit unavailable states.
- Recommendation actions respect permissions.
- Playback is not blocked by recommendations.

## TASK-002.5 Real Audio-Reactive Waveform Architecture

- Direct/HLS/R2-capable sources can use real analysis where technically permitted.
- YouTube sources use a clearly scoped fallback visualizer.
- Reduced-motion users get non-animated equivalents.
- Mobile performance constraints are documented and respected.

## TASK-002.6 Avatar Motion Polish

- Existing avatar identities remain unchanged.
- Optional motion is subtle and reduced-motion aware.
- Host crown remains a separate role overlay.
- Motion causes no layout shift in dense room/member surfaces.

## TASK-002.7 Cloudflare R2 Media Upload Pipeline

- Uploaded media is stored outside Supabase Postgres.
- Supabase stores durable metadata/access records.
- Existing YouTube/direct media flows remain working.
- Future waveform peak storage has a defined metadata path.

## TASK-002.8 Voting and Suggested Next

- Suggested-next voting appears at the intended playback moment.
- Majority vote can add an item to the queue.
- Random suggestion action exists.
- Host retains override authority.

## TASK-002.9 Accounts, Friends, and Friend Invites

- Supabase auth/profile layer exists.
- Friend invites can appear as popup and notification drawer items.
- Friend rooms can be discovered according to privacy rules.
- Guest identity migration path is clear.

## TASK-002.10 Shared Browser Prototype

- Browser mode is isolated from media playback.
- Control permission handoff is explicit.
- Resource limits and cleanup behavior are defined.
- Prototype can be tested without destabilizing watch/listen rooms.

## TASK-002.11 Hardening and Abuse Controls

- Rate limits and validation exist for high-risk actions.
- Invite and room access boundaries are reviewed.
- Supabase RLS and SpacetimeDB authority reducers are reviewed.
- Provider and realtime failures have visible handling.

## TASK-002.12 Final QA and Release Gate

- Full multi-client room QA is complete.
- Mobile layout QA is complete.
- Production environment configuration is verified.
- `qa-report.html` records readiness, blockers, and residual risks.

