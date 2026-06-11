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

## TASK-002.5C Live Room Authority Hardening

- A malicious browser client cannot become host by seeding a known room ID.
- Live host authority is derived from verified durable membership, not arbitrary reducer payload fields.
- Guest-first room joins still work.
- Queue add, queue manage, and playback-control permissions behave consistently across UI and SpacetimeDB reducers.
- Playback-permitted users either can select and play queue items through reducers, or the UI does not expose play-now queue selection to them.
- Duplicate playlist import attempts cannot flood the live queue with repeated items.
- Playlist preview and recommendation API routes have appropriate room/member context or abuse protection where needed.
- Existing host playback, guest queue add, YouTube playback, direct media, and HLS behavior continue to work.

## TASK-002.5D Queue Authority And Add Media UX Stabilization

- A guest granted full queue access can reorder, remove, clear, pin, play-next, and manage queue items without being blocked by host-only reducers.
- A guest without queue-management permission cannot perform queue-management actions, and the UI clearly disables, hides, or explains those actions.
- Playback-granted users can still play, pause, skip, and control playback according to the current playback permission model.
- Previous/back returns to the actual prior played item, then earlier played items in order.
- Add Media appears as a centered modal above queue drawers, room panels, listen surfaces, and watch surfaces.
- Pasting a single URL shows preview metadata before adding.
- Pasting a playlist URL shows a searchable/selectable playlist review before importing.
- Duplicate items are not silently ignored. The user sees a duplicate warning and can choose to add anyway.
- Successful add/import actions produce visible confirmation with useful titles or counts.
- The Add Media modal works on mobile, vertical monitor layouts, and regular desktop without overlapping queue controls.
- Hydration mismatch and z-index/layout issues found during local QA are logged as cleanup checks for this task. YouTube local `postMessage` warnings remain non-blocking unless playback fails.

## TASK-002.5B Cinematic Watch Room Purpose Pass

- Watch mode has a distinct focused private-theater identity instead of reading as a generic room dashboard.
- The active video is visually dominant on desktop and mobile.
- Room identity, controls, members, queue, and sync status remain accessible without competing with the video.
- Members and Up Next use drawer or compact surfaces where practical instead of permanent dashboard-style panels.
- The transport bar is grounded, minimal, and exposes only essential playback/sync controls by default.
- Ambient watch-room glow changes slowly and supports reduced-motion.
- YouTube ambience uses thumbnail/provider-derived fallback rather than claiming live iframe frame sampling.
- No media-library upload/storage, recommendation analytics, or broad runtime media pipeline changes are implemented in this UI task.

## TASK-002.5E Vertical Listen AI DJ Placement Shell

- On tall desktop and vertical-monitor listen layouts, the existing advisory AI DJ/session-intelligence card appears in the otherwise unused space below the left player card.
- The player, transport controls, room controls, recommendations, members panel, and queue drawer remain usable without overlap or visual crowding.
- Mobile and tablet layouts keep the existing single-column flow and do not bury core playback controls below the AI DJ shell.
- The card remains advisory/future-facing and does not imply AI chat, voice generation, speech waveform, account memory, or autonomous queue control.
- Wide desktop may keep the AI DJ card in the center discovery surface if the below-player placement is not the strongest layout for that viewport.
- The implementation prepares a clean visual home for future AI DJ interactivity without implementing the later AI/session-intelligence system.

## TASK-002.6 Real Audio-Reactive Waveform Architecture

- A waveform source resolver distinguishes `youtube_embed`, `direct_media`, `hls_media`, future `stream_media`, and future `r2_media` sources.
- Direct/HLS/R2-capable sources can use real analysis where technically permitted.
- YouTube iframe sources use a clearly scoped fallback visualizer unless a matched ready first-party Stream/R2 asset exists.
- Future R2 waveform metadata has a defined contract: `waveform_peaks_url`, `waveform_peaks_key`, and `waveform_status`.
- Ready first-party media matches can consume precomputed waveform peaks or honest lightweight fallbacks when TASK-002.8 provides them.
- Reduced-motion users get non-animated equivalents.
- Mobile performance constraints are documented and respected, with no heavy real-time analysis by default.
- TASK-002.6 does not implement Stream/R2 upload or ingestion.

## TASK-002.7 Avatar Motion Polish

- Existing avatar identities remain unchanged.
- Optional motion is subtle and reduced-motion aware.
- Host crown remains a separate role overlay.
- Motion causes no layout shift in dense room/member surfaces.

## TASK-002.8A Google OAuth and Owner Authority Foundation

- Supabase Auth with Google OAuth exists.
- App profile data is stored in public profile tables, not directly in Supabase `auth.users`.
- A durable `profiles.role = owner | member` model exists.
- The app can distinguish owner and member roles server-side.
- Stream/R2 upload and source-ingestion permissions have a reliable server-side authorization primitive before TASK-002.8 starts.
- Signed-in account identity can connect to room membership while guest-first rooms still work.
- Guest-to-account migration behavior is documented for display name, avatar, saved rooms, and room memberships.
- Initial Google login requests basic profile identity only; YouTube playlist/history scopes are not requested until a later feature explicitly needs them.

## TASK-002.8 Cloudflare Stream + R2 Media Library and Authorized Upload Pipeline

- Cloudflare Stream is used as the primary uploaded-video processing and playback layer.
- R2 is used for raw/source archive, supporting artifacts, waveform/analysis JSON, and future non-Stream media needs where appropriate.
- Uploaded media is stored outside Supabase Postgres.
- Supabase stores durable metadata, access records, source matches, Stream/R2 identifiers, and upload/ingestion job status through `media_assets`, `media_ingestion_jobs`, and `media_source_matches`.
- Existing YouTube/direct media flows remain working.
- Owner-only upload/source ingestion is enforced server-side through the TASK-002.8A owner authority foundation. Non-owner users can add YouTube links/playlists but cannot upload first-party media or trigger first-party source ingestion.
- A dev/test owner bypass, if added, is explicit env-gated and never enabled as the public default.
- The expanded watch queue/library drawer supports drag-and-drop upload, stored video browsing, processing states, source-match badges, and Add to Queue / Play Now actions.
- Playlist import prefers ready first-party source matches and falls back to YouTube embed items when no ready first-party asset exists.
- YouTube video IDs and source URL hashes are lookup keys, not automatic permission to download.
- Custom media workers run outside Vercel only where Cloudflare Stream does not cover required artifacts or ingestion needs, and update job status through pending, processing, ready, and failed states.
- Supported first-party media has waveform peak generation, queueing, or an explicit unsupported state.
- Movie/direct-media support is limited to owner uploads and authorized direct media URLs. No hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation is included.

## TASK-002.9 Voting and Suggested Next

- Suggested-next voting appears at the intended playback moment.
- Majority vote can add an item to the queue.
- Random suggestion action exists.
- Host retains override authority.

## TASK-002.10 Accounts, Friends, Invites, Listening History, and Social Rooms

- The social account layer builds on the Google OAuth/profile foundation from TASK-002.8A.
- Playlist/history-related Google scopes are requested only through explicit incremental consent if this task implements features that require them.
- Provider token storage and offline access behavior are explicitly documented before any refresh-token style access is used.
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
- On tall desktop and vertical-monitor listen layouts, the AI DJ surface can occupy the empty space below the player card while preserving player priority and avoiding overlap with the queue drawer.
- Future prompt, voice, and waveform affordances are visually reserved but not implemented until explicit AI interaction scope is approved.
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
