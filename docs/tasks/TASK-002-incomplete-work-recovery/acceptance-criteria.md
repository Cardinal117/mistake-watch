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

## TASK-002.5F Listen Room Header And Presence Refinement

- The listen-room header matches the approved reference direction: room name first, compact metadata second, minimal primary actions, and a compact settings menu for secondary actions.
- `Watch` and `Listen` render as left-aligned icon tabs with a clear active underline/accent state rather than as a bulky full-width segmented control.
- The search bar appears to the right of the mode tabs with placeholder text `Search YouTube, playlists, artists...`.
- Search UI states are explicit: empty, typing, searching, results, no-results, and provider-error/quota.
- Search requests, when wired to a provider route, use a minimum query length of 3, a 600ms debounce, a 10-minute cache TTL, a maximum of 10 results, and cancellation of the previous request.
- The permanent listen-mode right members sidebar is removed.
- Current room members appear as compact avatars above the room title, flowing left to right, with hover/focus tooltips for member names.
- Existing host/crown and online/presence indicators remain visible where available without crowding the header.
- Permission management opens from the settings menu as a focused pop-out/window and preserves existing permission semantics and host authority behavior.
- Copy Room ID, Copy Room Link, Share Room, Save/Saved Room, Room Settings, Permissions, and Leave Room live inside the settings menu.
- Leave Room is visually destructive/pink.
- Save Room is state-aware and clearly shows saved versus unsaved state.
- The settings cog and menu use the approved reference treatment: compact square cog, dark glass surface, thin separators, clear icon labels.
- The listen-room accent follows the current media thumbnail palette where technically available while preserving contrast and reduced-motion behavior.
- Existing playback, queue, chat/watch behavior, room join, invite, and permissions continue to work.

## TASK-002.5G Listen Player Rail And Discovery Cleanup

- The listen player/media card remains the left-side player concept, but reads as the left music rail itself instead of a floating card nested inside a sidebar.
- Desktop player rail width is increased toward 380-420px where viewport width allows, without forcing room-pick content into cramped or broken layouts.
- The left rail keeps current-media responsibilities: artwork/video, title, artist/channel, metadata chips, progress, transport, volume/fullscreen, Up Next, and queue count.
- Tall desktop and vertical-monitor layouts use below-player space for an intentional Suggested Next / Up Next area instead of leaving a dead gap or showing a disconnected bubble.
- Future AI DJ is hidden for now and does not appear as a future-feature block in the active listen room.
- Recently Added is removed from listen mode.
- Room Picks cards gain roughly 12-16px of vertical breathing room and keep thumbnail, title, channel, duration, and actions readable.
- Room Picks actions still respect existing Play, Add Next, Add Queue, and permission behavior.
- Existing playback, queue reducer semantics, provider availability classification, Add Media flow, recommendation honesty, and sync behavior remain unchanged.

## TASK-002.5I Performance Quick Wins

- `public/favicon.svg` is reduced from the multi-megabyte embedded asset to a small optimized favicon.
- Dashboard, listen room, and watch room no longer pay a multi-megabyte favicon download.
- `hls.js` is not part of the initial non-HLS room load.
- HLS playback still works when an HLS source is selected.
- Native HLS browser support remains preferred where available.
- YouTube playback, direct/R2 playback, transport controls, fullscreen controls, queue autoplay, and room sync remain unchanged.
- Static checks and production build pass.
- Larger performance work such as queue virtualization, room bundle splitting, metadata caching, and CLS cleanup remains explicitly out of scope for this quick-win task.

## TASK-002.5J Queue Resilience and Large Queue Performance

- YouTube runtime/player/provider errors do not silently drain upcoming queue items.
- Runtime-error auto-skip is limited to confirmed permanent unavailable states such as removed/private videos or embed-blocked videos.
- Auto-skipped items produce compact, readable room-visible event/history records with source, reason, and timestamp.
- Repeated known-bad URLs are labeled clearly in queue/history surfaces instead of failing without context.
- Listen-mode metadata loading fetches the first 10 queued items quickly, then progressively resolves the rest with bounded concurrency.
- Queue drawer preview/handle can show that metadata is still loading without blocking queue interaction.
- Large queue drawers use virtualized/windowed rendering or an equivalent visible-row strategy for 250+ item queues.
- Queue drawer heavy content is not rendered while the drawer is closed except for the compact preview data needed by the handle.
- Room Picks, history, and playlist/recommendation tabs do not depend solely on active upcoming queue rows and can render useful cached/history-backed states when upcoming is empty.
- Skeleton loaders appear for initially loading tab/card surfaces and disappear when cached or fetched content is ready.
- Existing SpacetimeDB queue reducer contracts remain authoritative and are not replaced by client-only ordering.
- Static checks and production build pass.

## TASK-002.5K Listen Room TV View Mode

- TV mode is local/client-only and does not change the shared room mode or other members' layouts.
- Listen mode exposes a clear TV mode entry point without confusing it with Watch/Listens shared room mode switching.
- TV mode uses a full-viewport cinematic presentation close to the supplied neon music-lounge reference.
- The current media/video/artwork is the dominant visual element.
- Top-left room pill shows room name and listener count.
- Top-right exit control remains accessible and includes a keyboard hint.
- Current title, artist/channel, source metadata, progress, play/pause, previous, next, shuffle/repeat/autoplay, volume, fullscreen, and Up Next remain usable.
- YouTube TV mode hides native iframe controls where technically possible and renders Mistake Watch controls over the app shell.
- Fullscreen is applied to the app TV shell wrapper so custom controls can remain visible above the media.
- Controls remain readable over bright/dark artwork using gradient scrims and glass surfaces.
- Controls may fade when idle but exit remains discoverable and reduced-motion is respected.
- Dynamic thumbnail-driven accent colors style TV mode progress, controls, room pill, Up Next, and glows.
- TV mode exits back to the previous listen-room layout without resetting playback, queue, search state, or local volume.
- Watch mode remains visually unchanged except for any safe shared helper refactor.
- Static checks, production build, and browser QA pass.

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

## TASK-002.8A Account Identity and Owner Authority Foundation

- Supabase Auth with Google OAuth exists using minimal identity scopes only: `openid`, email, and profile.
- App profile data is stored in public profile tables, not directly in Supabase `auth.users`.
- A durable `profiles.role = owner | member` model exists.
- The app can distinguish owner and member roles server-side.
- Stream/R2 upload and source-ingestion permissions have a reliable server-side authorization primitive before TASK-002.8 starts.
- Signed-in account identity can connect to room membership while guest-first rooms still work.
- Guests can still create rooms, join rooms, queue where allowed, chat where allowed, and receive room permissions without signing in.
- Durable room membership supports exactly one identity path per member: signed-in `user_id` or guest `guest_id`, not both.
- Guest-to-account migration behavior is implemented or documented for display name, avatar, current room memberships, saved rooms, and temporary ownership transfer.
- The Account Command Panel shell exists with clear guest, signed-in, and owner states.
- Initial Google login does not request YouTube, Google Drive, playlist, history, contacts, calendar, or offline-access scopes.
- Provider token handling and consent boundaries are documented before any future provider-data task starts.

## TASK-002.8 R2 Media Library and Authorized Upload Pipeline

- R2 is used as the primary first-party uploaded-media storage and playback source for the private small-room phase.
- Cloudflare Stream, transcoding, adaptive bitrate playback, automatic thumbnail extraction, and background waveform generation are deferred unless separately approved.
- First-party uploaded video is constrained to browser-playable formats, with `.mp4` H.264/AAC as the preferred first supported path.
- Uploaded media is stored outside Supabase Postgres.
- Supabase stores durable metadata, access records, source matches, R2 object keys/public URLs, and upload/ingestion status through `media_assets`, `media_upload_sessions` or `media_ingestion_jobs`, and `media_source_matches`.
- Existing YouTube/direct media flows remain working.
- Owner-only upload/source ingestion is enforced server-side through the TASK-002.8A owner authority foundation. Non-owner users can add YouTube links/playlists but cannot upload first-party media or trigger first-party source ingestion.
- A dev/test owner bypass, if added, is explicit env-gated and never enabled as the public default.
- The expanded watch queue/library drawer supports drag-and-drop upload, stored video browsing, processing states, source-match badges, and Add to Queue / Play Now actions.
- Playlist import prefers ready first-party source matches and falls back to YouTube embed items when no ready first-party asset exists.
- YouTube video IDs and source URL hashes are lookup keys, not automatic permission to download.
- Server-generated signed R2 upload URLs are short-lived, scoped to one object key, and never expose Cloudflare/R2 secrets to the browser.
- R2 CORS supports production, Vercel alias, and local dev upload/playback origins.
- Supported first-party media can consume existing waveform peaks, queue future waveform work, or show an explicit unsupported state.
- Movie/direct-media support is limited to owner uploads and authorized direct media URLs. No hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation is included.
- Uploaded media management supports explicit folder creation, folder-first browsing, normalized partial search, grid/list views, persistent folder sorting, card settings menus, owner-only visibility toggles, and folder-level queue actions.
- Hidden uploaded media is excluded from non-owner uploaded-library listing, search, and folder discovery while remaining visible/manageable to the owner.
- Folder-level Play/Add Next/Add Queue actions use the current folder sort order without changing SpacetimeDB queue reducer contracts.
- Owner uploads show actual byte-based progress as one clear progress bar for both single PUT and multipart uploads.
- Large owner-uploaded MP4 files use R2 multipart upload with server-created part URLs, part ETag tracking, retryable part uploads, and server-side completion.
- Media assets are finalized only after R2 accepts completion and object size verification succeeds.
- Multipart upload state is stored in Supabase without exposing R2 secrets to the browser.
- R2 CORS must expose `ETag`; if it does not, the UI reports a clear upload-part ETag error.

## TASK-002.8H Multi-File Upload Queue And Batch Processing UX

- Owners can select or drop multiple video files at once from the Watch Media Hub uploaded-library area.
- Each selected file appears as a distinct upload queue item with name, size, target folder, status, progress, and available actions.
- The upload queue uses controlled concurrency and does not start every large file upload simultaneously.
- Existing single PUT and multipart upload paths remain in use; credentials stay server-only and no R2 secrets reach the browser.
- The queue shows the full lifecycle after R2 upload reaches 100%, including inspection, conversion approval, CloudConvert processing, ready, failed, and cancelled states.
- Recoverable multipart sessions appear in the upload queue after refresh and require reselecting the same local file before resuming missing parts.
- Batch folder assignment supports choosing an existing folder or creating a new folder before upload, with per-item correction where practical.
- Batch conversion approval is owner-only, shows estimated credits/reasons, and supports approve-all plus individual approval.
- A failed upload or conversion does not block waiting or active items from continuing.
- Failed conversions can retry from existing R2 source objects when a source object exists.
- Direct-ready MP4/H.264/AAC files still skip CloudConvert.
- Unsupported MKV/HEVC/unknown files continue through the existing approval and CloudConvert pipeline.
- Non-owner users cannot upload, approve conversion, or trigger first-party source ingestion.
- The UI remains compact and usable on desktop and mobile without nested panel clutter.
- Static checks and production build pass.

## TASK-002.8I Signal State Vocabulary And Processing Status UX

- The app has a typed normalized display-state resolver for upload/media processing state with `state`, `label`, `detail`, `tone`, optional real `progressPercent`, optional `latestEvent`, and optional primary/secondary action labels.
- The resolver maps raw R2 upload progress, recoverable multipart sessions, media asset processing status, owner approval requirements, CloudConvert queued/processing/exporting states, failed media, retryable media, and ready media without scattering those conditionals through UI components.
- `SignalInlineStatus`, `SignalSkeleton`, `SignalProgressBar`, and `SignalStatusChip` exist as small shared primitives and are reused in targeted room/media surfaces.
- `SignalProgressBar` appears only for real measurable progress such as byte-based R2 upload or stored completed multipart bytes.
- CloudConvert queued/processing/exporting states do not show fake 96/97/99 percent progress. They show stage, detail, and next action where available.
- Recoverable multipart uploads show resume/cancel actions, stored progress, failure detail when available, and recovery window detail.
- Approval-required media clearly shows why action is blocked, estimated credits when available, and owner approval action where available.
- Failed media/upload states show a useful failure reason and recovery action rather than a generic spinner or static label.
- YouTube search loading uses layout-preserving skeletons without per-row spinners.
- YouTube metadata pending states preserve chip layout through placeholder chips instead of plain `Loading details` text.
- Awaiting-media states no longer reuse progress-looking animation or playback waveform motion.
- `RoomTransitionOverlay` remains reserved for blocking room/navigation transitions.
- Reduced-motion preferences are respected by status animations.
- Existing playback, queue reducers, upload endpoints, CloudConvert endpoints, Add Media, watch mode, listen mode, and room sync behavior remain unchanged.
- Static checks and production build pass.

## TASK-002.8G Live Room Reconnect And Stale Queue Recovery

- A transient SpacetimeDB disconnect does not require a full browser refresh to recover room controls.
- The client attempts bounded automatic reconnects after websocket disconnects, subscription failures, or connection errors.
- Reconnect attempts reuse the stored SpacetimeDB token and re-run room membership join for the current member.
- The last known good room session and queue remain visible while reconnecting instead of being replaced by an empty live-cache state.
- If the current participant becomes missing or idle while the browser remains in the room, the client attempts a room rejoin before treating the member as removed.
- Heartbeat and durable activity timers do not accumulate duplicate intervals across reconnects.
- Existing queue reducers, playback reducers, permissions, autoplay, watch mode, listen mode, and durable Supabase room data remain unchanged.
- Static checks and production build pass.

## TASK-002.9 Voting and Suggested Next

- Suggested-next voting appears at the intended playback moment.
- Majority vote can add an item to the queue.
- Random suggestion action exists.
- Host retains override authority.

## TASK-002.10 Account Personalization and First-Party History

- The personalization/history layer builds on the Google OAuth/profile foundation from TASK-002.8A.
- Signed-in users can persist profile preferences across sessions.
- Guests keep local-only preferences and remain fully usable without sign-in.
- Theme support uses controlled presets and safe accent/preferences rather than arbitrary custom CSS.
- Account settings include useful quality-of-life controls for general profile, personalization, watch room, listen room, rooms, privacy, and account state.
- Saved, recent, and owned room surfaces exist for signed-in accounts where the underlying data is available.
- Account-backed first-party history stores enough Mistake Watch data to support real `Most listened`, `Recently played`, and room-aware recommendation seeds later.
- First-party history includes source identity, room/session context, queue/play contribution, play/listen/watch time where technically reliable, and timestamps.
- Profile previews expose only public-safe fields and never expose email or private account data to other users.
- No playlist/history-related Google scopes, Google Drive scopes, contacts scopes, or offline access are requested in this task.
- Future recap data remains original to Mistake Watch and avoids copying Spotify Wrapped presentation or naming.

## TASK-002.10C Social Graph and Incremental Provider Permissions

- Friend relationships work only between signed-in accounts.
- Guests cannot send, receive, or persist as friend graph nodes.
- Friend request states support pending, accepted, declined, blocked, and duplicate/idempotency protection.
- Friend room visibility and friend invites respect profile/room privacy settings.
- Account notification surfaces can show friend requests, friend acceptances, and room invites without covering media controls.
- Privacy and abuse controls exist for friend requests, online status, room visibility, blocking, and invite/request rate limits.
- Provider data permissions are requested only through explicit incremental consent tied to a visible feature.
- Any YouTube/Google provider scope request uses the narrowest feasible scope and explains what will be accessed before redirecting to consent.
- Users who never grant provider data permissions can still use rooms, accounts, friends, first-party history, and first-party recommendations where available.
- Mistake Watch first-party account history remains the primary recommendation source unless an official provider API supports a specific additional data path.
- Provider token storage, refresh-token behavior, revocation, and user-facing consent copy are documented before any long-lived provider access is used.

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
