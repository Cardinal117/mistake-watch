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

## TASK-002.4 YouTube Availability Hardening

- Single YouTube links are checked for embeddability/availability before being treated as playable where official metadata is available.
- Playlist preview classifies items as playable, blocked/unavailable, restricted, unknown, or provider-error where possible.
- Playlist import defaults to selecting playable items only and clearly reports skipped or blocked counts.
- Queue and discovery surfaces visually distinguish blocked/unavailable YouTube items from playable items.
- Playback-authorized users cannot accidentally trigger known-blocked items as normal play actions.
- YouTube IFrame runtime errors are classified and reflected in room state or local UI without crashing the player.
- Queue autoplay can advance past classified blocked/unavailable YouTube items while preserving a visible failure record.
- Direct media, HLS, and playable YouTube items continue to work.

## TASK-002.5 Provider Recommendations and Room Picks

- Discovery tabs represent honest data sources.
- Queue/history recommendations work before accounts exist.
- Provider failures show explicit unavailable states.
- Recommendation actions respect permissions.
- Playback is not blocked by recommendations.
- The future AI DJ/session-intelligence area exists as an advisory room-signal surface only.
- No account memory, fake mood data, autonomous queue mutation, or AI-generated claims are introduced.

## TASK-002.5A Adaptive Listen Card Drift

- Listen-room recommendation/card rails drift only when there is enough overflow content to loop cleanly.
- The drift adapts to viewport size so mobile, desktop, and wide desktop do not show blank gaps.
- Motion pauses on hover, focus, keyboard interaction, pointer/touch interaction, and major overlays.
- `prefers-reduced-motion` disables continuous drift.
- Existing card click/play behavior and permission-aware disabled states remain intact.
- The drift does not mutate queue order, playback state, provider data, or SpacetimeDB room state.
- The animation feels subtle, premium, and room-native rather than like a marquee.

## TASK-002.6 Real Audio-Reactive Waveform Architecture

- Direct/HLS/R2-capable sources can use real analysis where technically permitted.
- YouTube sources use a clearly scoped fallback visualizer.
- Reduced-motion users get non-animated equivalents.
- Mobile performance constraints are documented and respected.

## TASK-002.7 Avatar Motion Polish

- Existing avatar identities remain unchanged.
- Optional motion is subtle and reduced-motion aware.
- Host crown remains a separate role overlay.
- Motion causes no layout shift in dense room/member surfaces.

## TASK-002.8 Cloudflare R2 Media Upload Pipeline

- Uploaded media is stored outside Supabase Postgres.
- Supabase stores durable metadata/access records.
- Existing YouTube/direct media flows remain working.
- Future waveform peak storage has a defined metadata path.

## TASK-002.9 Voting and Suggested Next

- Suggested-next voting appears at the intended playback moment.
- Majority vote can add an item to the queue.
- Random suggestion action exists.
- Host retains override authority.

## TASK-002.10 Accounts, Friends, and Friend Invites

- Supabase auth/profile layer exists.
- Friend invites can appear as popup and notification drawer items.
- Friend rooms can be discovered according to privacy rules.
- Guest identity migration path is clear.
- Account-backed listening history stores enough data to support real Most listened calculations later.
- Listening history can support a future first-party Mistake Watch recap without relying on Spotify exports or branding.
- Recap data remains original to Mistake Watch and avoids copying Spotify Wrapped presentation or naming.

## TASK-002.10A Easter Eggs and Account Achievements

- Achievement unlocks attach to durable account/profile identity after accounts exist.
- The `cardinal mistake` typed trigger displays a local cinematic failure overlay and returns the user to the room without disrupting playback, queue, sync, or other participants.
- The easter egg can run locally before login, but durable achievement persistence is unavailable or local-only until the user signs in.
- Achievement unlocks are idempotent and cannot create duplicate achievement records for repeated triggers.
- Trigger detection does not fire unexpectedly while entering URLs, room names, chat text, settings, or other normal form input unless explicitly registered.
- Reduced-motion and reduced-audio preferences are respected.
- In-room achievement toasts do not cover critical media controls or permission controls.
- Visual/audio assets are replaceable app assets so the experience can be made fully original if needed.

## TASK-002.10B AI DJ / Session Intelligence

- Session intelligence uses real room/session inputs such as history, queue state, duration, contributor activity, and provider metadata where available.
- No fake mood, energy, contributor, or personalization values are shown as real.
- Account/user memory is unavailable until Supabase auth/profile and consent boundaries exist.
- AI DJ suggestions are advisory unless the host or an authorized user explicitly adds or plays an item.
- The surface can explain detected patterns and suggested direction without overriding host authority.
- Provider/API failures produce unavailable or limited states instead of invented recommendations.

## TASK-002.11 Shared Browser Prototype

- Browser mode is isolated from media playback.
- Control permission handoff is explicit.
- Resource limits and cleanup behavior are defined.
- Prototype can be tested without destabilizing watch/listen rooms.

## TASK-002.12 Hardening and Abuse Controls

- Rate limits and validation exist for high-risk actions.
- Invite and room access boundaries are reviewed.
- Supabase RLS and SpacetimeDB authority reducers are reviewed.
- Provider and realtime failures have visible handling.

## TASK-002.13 Final QA and Release Gate

- Full multi-client room QA is complete.
- Mobile layout QA is complete.
- Production environment configuration is verified.
- `qa-report.html` records readiness, blockers, and residual risks.
