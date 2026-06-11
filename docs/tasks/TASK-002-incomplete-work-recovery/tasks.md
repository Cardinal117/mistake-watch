# TASK-002 Tasks: Incomplete Work Recovery

This file is the canonical implementation order for recovering incomplete or partially completed work from `TASK-001-watch-together-platform`.

Do not skip ahead unless the user explicitly changes this order.

## TASK-002.1: Listen Mode Quality Pass

Source task: TASK-001 Task 23.

Work:

- Add configurable queue drawer heights for listen mode.
- Show current song index plus total queue count in the listen queue drawer.
- Strengthen the dynamic artwork theme so active content visibly influences the listen page without harming contrast.
- Add a playlist overlay/selective import flow in listen mode.
- Align waveform visual colors with the active listen theme while keeping enough contrast.
- Keep playback, queue reducer semantics, and SpacetimeDB authority unchanged.

Review checkpoint:

- Listen mode feels more finished without changing core sync behavior.
- Queue drawer height is configurable and understandable.
- Playlist import in listen mode supports user selection instead of only import-all.

Safe commit point:

- Listen mode quality issues from the recent polish pass are closed.

## TASK-002.2: Room Chat

Source task: TASK-001 Task 18.

Work:

- Replace the static Chat tab placeholder with live room chat.
- Use SpacetimeDB for immediate room chat delivery.
- Include sender display name, avatar, role, and host crown state.
- Support sending, sent, failed, and reconnect-safe display states.
- Keep chat scoped to the current room.
- Do not add moderation, abuse tooling, or durable Supabase chat history unless a later task requires it.

Review checkpoint:

- Two joined clients can exchange messages live.
- Chat messages do not leak between rooms.
- Chat remains usable after reconnect without duplicate recent messages.

Safe commit point:

- Room chat is usable during watch and listen sessions.

## TASK-002.3: Seamless Next Item Loading

Source task: TASK-001 Task 19.

Work:

- Add next-item prediction without mutating current playback or queue state.
- Prefetch safe metadata and thumbnails for likely next items.
- Add direct/HLS metadata preload where network conditions allow.
- Prepare YouTube player/API readiness without hidden duplicate players or full-video preload.
- Add a clear `Preparing next` or `Loading next` UI state.
- Add transition timing instrumentation.
- Invalidate stale preload targets when queue order, queue mode, or current item changes.

Review checkpoint:

- Next item transitions feel smoother without increasing provider risk.
- Data saver or constrained network conditions avoid aggressive preloading.
- Queue reorders do not cause wrong titles, wrong items, or wrong timestamps.

Safe commit point:

- Queue transitions are smoother and instrumented without changing room authority.

## TASK-002.4: YouTube Availability Hardening

Source task: production playback reliability follow-up from TASK-002.3.

Work:

- Add a server-side YouTube availability check for single video links and playlist import items using official YouTube metadata where available.
- Classify YouTube failures into clear states such as playable, embed blocked, removed/private, restricted, provider unavailable, or unknown.
- Update playlist preview/import so blocked or unavailable items are visible but not selected by default.
- Update queue add/load flows so known-unplayable videos do not enter the playable queue silently.
- Update queue, Room Picks, recently added, and player surfaces to show blocked/unavailable states without pretending the item is playable.
- Handle YouTube IFrame `onError` codes by marking the active item unavailable with a clear reason.
- If autoplay is enabled, skip classified blocked/unavailable YouTube items without stalling the room.
- Preserve direct media, HLS, and existing YouTube playback for playable items.

Review checkpoint:

- Playlist imports no longer surprise users with many broken videos mid-session.
- A blocked YouTube item has a clear reason and cannot look like a normal playable item.
- Autoplay continues past blocked items when appropriate without hiding the failure from the room.

Safe commit point:

- YouTube queue reliability is hardened before provider recommendations add more YouTube-driven discovery.

## TASK-002.5: Provider Recommendations and Room Picks

Source task: TASK-001 Task 22.

Work:

- Make `For you`, `Recommended`, `Most listened`, and `From your playlist` honest data surfaces.
- Use queue and room history as the first recommendation source.
- Add provider-backed YouTube recommendation/search data only where official API behavior supports it.
- Keep provider API keys server-side.
- Add explicit unavailable/provider-limited states.
- Keep `From your playlist` unavailable or room-history based until accounts exist.
- Add recommendation card actions for add to queue, play next, and load now where permissions allow.
- Add a reserved future AI DJ/session-intelligence home that reads current room signals only and does not mutate queue or playback state.

Review checkpoint:

- No fake personalized, provider-trending, or listening-history content is shown.
- Recommendation actions respect queue/playback permissions.
- Playback and queue import still work if recommendations fail.
- The future AI DJ area is clearly advisory and does not imply accounts, personal memory, or autonomous queue control.

Safe commit point:

- Listen discovery becomes useful and honest without blocking playback.

## TASK-002.5A: Adaptive Listen Card Drift

Source task: side-conversation UI extra from listen-room discovery direction.

Work:

- Add subtle adaptive horizontal drift to the listen-room center recommendation/card rails.
- Use the current queue/recommendation cards as the ambient motion source; do not create separate decorative cards.
- Enable continuous drift only when there are enough cards and enough overflow width to loop without visible gaps.
- Adapt the loop threshold to viewport size so small screens can drift with fewer cards while wide screens stay static unless the rail can fill the motion path cleanly.
- Pause drift on hover, focus, keyboard interaction, pointer drag, touch interaction, and while major overlays such as playlist review are active.
- Respect `prefers-reduced-motion` by disabling continuous drift and keeping the existing static/snap carousel behavior.
- Preserve permission-aware card behavior: users with playback authority can click/play; users without authority should get disabled or request-style affordance, not fake play controls.
- Keep queue order, playback state, SpacetimeDB reducers, provider recommendations, and AI features unchanged.

Review checkpoint:

- The card rail feels like quiet ambient room motion, not a marquee or attention-grabbing animation.
- No blank gaps appear on mobile, desktop, or wide desktop.
- Interaction remains obvious and stable while the rail is moving.

Safe commit point:

- Listen-room cards have adaptive ambient drift without changing discovery data or playback authority.

## TASK-002.5C: Live Room Authority Hardening

Source task: security and permission inspection follow-up from live room sync review.

Work:

- Replace browser-client-authoritative live session seeding with a trusted authority path.
- Require server-verified durable room membership before SpacetimeDB can establish host authority for a room session.
- Preserve guest-first joins, but ensure guest-provided role/member fields cannot become the source of live authority.
- Align queue item play-now behavior with the intended playback permission model:
  - either playback permission allows queue item selection and immediate playback;
  - or playback-only guests do not see play-now affordances for queue item selection.
- Add reducer-level duplicate protection for live queue items, especially concurrent or repeated playlist imports.
- Add abuse and quota protection around playlist preview and recommendation API routes where room/member context is required.
- Add focused reducer/security tests for unauthorized seed, allowed/denied guest queue add, playback-granted play-now behavior, duplicate playlist imports, and permission revocation during active queue operations.

Review checkpoint:

- A malicious browser client cannot become host by seeding a known room ID.
- Live room authority is derived from verified durable membership, not arbitrary reducer payload fields.
- Queue add, queue manage, and playback-control permissions behave consistently across UI and reducers.
- Playlist imports cannot flood the live queue with duplicate rows.

Safe commit point:

- Live room authority and queue permission paths are hardened before more room UI, voting, media-library, or social features depend on them.

## TASK-002.5D: Queue Authority And Add Media UX Stabilization

Source task: local multi-client QA follow-up after TASK-002.5C live authority testing.

Work:

- Add a real queue-management permission path in SpacetimeDB so full queue access can reorder, remove, clear, pin, play-next, and manage queue rows where intended.
- Align UI permission gates with reducer authority so enabled controls do not call reducers that will reject the current member.
- Add server-authoritative playback history so the previous/back transport returns through actually played queue items in exact order.
- Replace the current Add Media popout with a centered modal rendered above drawers, room panels, listen surfaces, and watch surfaces.
- Auto-preview pasted single-song and playlist URLs before add/import actions.
- Add duplicate detection before mutation:
  - warn when a source is already in the queue;
  - allow `Add anyway`;
  - support a local `Remember my choice` duplicate preference.
- Add visible notifications for queue outcomes, including song added with title, playlist added with count, duplicate detected, duplicate added anyway, permission denied, and provider/preview failure.
- Redesign playlist review for mobile, vertical monitors, and desktop with search, sorting, select all, add all, add selected, and a more-options duration filter such as select below a timeframe.
- Keep broader accounts, friends, uploaded-media library, and cinematic watch-room redesign out of this task.

Review checkpoint:

- Guests granted full queue access can perform intended queue-management actions without host-only reducer blocks.
- Guests without queue-management permission cannot perform queue-management actions and see honest disabled/denied states.
- Add Media feels like a premium modal, previews URLs before mutation, and never collides with queue drawer controls.
- Duplicate queue additions warn clearly and can be added anyway by explicit user choice.
- Previous/back follows actual playback history rather than selecting an unrelated item.

Safe commit point:

- Queue authority, add-media UX, duplicate handling, and user feedback are stable before the cinematic watch-room layout depends on queue/library surfaces.

## TASK-002.5B: Cinematic Watch Room Purpose Pass

Source task: watch-room direction refinement from the cinematic room redesign discussion.

Work:

- Redesign watch mode as an intentional private-theater surface rather than a dashboard-like room shell.
- Use a quiet top Signal Room band for room identity, connection state, compact room controls, and members drawer access.
- Make the video stage the dominant object on the page, with surrounding UI receding while playback is active.
- Add a minimal grounded transport bar that exposes only essential playback, sync, volume, fullscreen, and current/next context.
- Replace the default always-visible side panel pattern with drawer-based members and queue/library surfaces where possible.
- Add a compact Up Next area that can expand into a larger watch queue/library drawer without competing with the active video.
- Add cinematic ambient glow around the stage:
  - direct/HLS/Stream-first-party media may use sampled or precomputed palette data where technically permitted;
  - YouTube playback must use thumbnail/provider-derived palette fallback and must not claim frame sampling;
  - all ambient changes must transition slowly and respect reduced-motion.
- Keep chat, recommendations, analytics, upload/library implementation, and Cloudflare media storage out of this UI task unless explicitly required for the layout shell.

Review checkpoint:

- Watch mode feels focused, cinematic, synchronized, and immersive.
- The content is visually dominant and the room supports attention rather than activity.
- Members, queue, and controls are available without turning the page into a dashboard.
- Ambient glow feels like cinematic screen spill, not distracting RGB lighting or flicker.

Safe commit point:

- Watch mode has a clear product personality and layout foundation before media-library/upload features are added.

## TASK-002.5E: Vertical Listen AI DJ Placement Shell

Source task: vertical listen layout follow-up from user QA after TASK-002.5D and TASK-002.5B.

Work:

- Move the existing advisory future AI DJ/session-intelligence card into the unused space below the left player card on tall desktop and vertical-monitor listen layouts.
- Keep this as a layout-only shell task:
  - no AI chat;
  - no voice generation;
  - no speech waveform;
  - no queue mutation;
  - no account-backed memory.
- Preserve the current center discovery surface on wide desktop when that layout is stronger, but prefer below-player placement when the left column has meaningful unused vertical space.
- Keep mobile and tablet layouts in normal single-column flow without burying player controls or queue access.
- Keep the card compact, advisory, and clearly marked as future session intelligence.
- Prepare the visual structure for later prompt, voice, and waveform affordances without implementing those behaviors.

Review checkpoint:

- Vertical listen layouts no longer leave the large below-player space feeling wasted.
- The AI DJ shell feels like a native DJ console placeholder without implying shipped AI behavior.
- Player controls, room controls, recommendations, members, and queue drawer remain usable and uncluttered.

Safe commit point:

- Listen mode has a clear responsive home for the future AI DJ surface before real AI/session-intelligence work begins later.

## TASK-002.6: Real Audio-Reactive Waveform Architecture

Source task: TASK-001 Task 16.D.

Work:

- Implement a waveform source resolver that classifies media into explicit analysis paths:
  - `youtube_embed`: fallback visualizer only.
  - `direct_media`: browser `AnalyserNode` where CORS permits.
  - `hls_media`: real analysis where technically possible, otherwise generated progress visuals.
  - `stream_media`: use first-party processed metadata or fallback progress visuals where Cloudflare Stream does not expose analyzable audio.
  - `r2_media`: prefer precomputed waveform peaks when available; fallback to live analysis only when safe.
- Prepare the future R2 waveform metadata contract:
  - `waveform_peaks_url`
  - `waveform_peaks_key`
  - `waveform_status`: `missing`, `pending`, `ready`, or `failed`
- Keep YouTube and YouTube Music honest: if a YouTube URL has a matched ready first-party Stream/R2 asset, use the first-party waveform path; otherwise use the YouTube fallback visualizer because iframe audio cannot be sampled directly.
- Define waveform progress, ambient side waves, reduced-motion behavior, mobile performance limits, and fallback states.
- Avoid heavy real-time waveform analysis on mobile by default. Mobile should use precomputed peaks, static artwork visuals, or lightweight progress visuals.
- Do not implement Stream/R2 upload or ingestion inside TASK-002.6.

Review checkpoint:

- Direct/HLS sources can produce real reactive visuals when CORS and browser support allow it.
- YouTube listen rooms clearly use fallback visuals without implying hidden audio analysis.
- Ready first-party Stream/R2 matches have a defined path to precomputed waveform peaks or honest lightweight fallback visuals.
- Reduced-motion users get a stable static/progress representation.

Safe commit point:

- Listen mode has a technically honest waveform architecture that works for current sources and can consume future first-party media peaks.

## TASK-002.7: Avatar Motion Polish

Source task: TASK-001 Task 17.A.

Work:

- Add subtle optional motion to existing hardware avatars.
- Keep static avatars as the primary identity system.
- Keep crown overlay separate from base avatars.
- Respect reduced-motion.
- Keep role text/icons available for accessibility.
- Do not implement accounts, uploads, friending, or profile backend here.

Review checkpoint:

- Avatar motion is legible, subtle, and does not distract from media playback.
- Host crown remains visible without covering important avatar detail.

Safe commit point:

- Avatar identity feels more alive without changing identity persistence.

## TASK-002.8A: Google OAuth and Owner Authority Foundation

Source task: dependency correction for owner-only Stream/R2 media work and future social rooms.

Work:

- Add Supabase Auth with Google OAuth using basic profile identity first.
- Store app profile data in public profile tables, not directly in Supabase `auth.users`.
- Add a durable owner role model, starting with `profiles.role = owner | member`.
- Add a server-side owner check helper for later Stream/R2 upload and source ingestion.
- Connect signed-in account identity to room membership while preserving guest-first room joins.
- Define guest-to-account migration behavior for display name, avatar, saved rooms, and room memberships.
- Document Google provider token handling:
  - request basic profile scopes first;
  - add playlist/history-related Google or YouTube scopes only when the feature needs them;
  - use offline access only where refresh-token behavior is required.
- Do not implement friends, notifications, listening-history aggregation, achievements, or YouTube account playlist access in this foundation task.

Review checkpoint:

- Users can sign in with Google through Supabase Auth.
- The app can distinguish `owner` and `member` roles server-side.
- Stream/R2 owner-only upload and source ingestion have a reliable authorization primitive before TASK-002.8 starts.
- Guest-first rooms still work.
- No YouTube playlist/history OAuth scopes are requested in the initial login flow.

Safe commit point:

- Mistake Watch has the account and owner-authority foundation needed for owner-only media work without pulling in the full friends/social feature set.

## TASK-002.8: Cloudflare Stream + R2 Media Library and Authorized Upload Pipeline

Source task: TASK-001 later R2 direction, updated by the Cloudflare Stream/R2 hybrid decision.

Work:

- Use Cloudflare Stream as the primary uploaded-video processing and playback layer for fast owner uploads, transcoding, thumbnails, and streamable delivery.
- Keep Cloudflare R2 available for raw original archive, supporting artifacts, waveform/analysis JSON, source files that should not live in Supabase, and future non-Stream media needs.
- Add Supabase durable metadata tables for `media_assets`, `media_ingestion_jobs`, and `media_source_matches`.
- Keep large media files out of Supabase Postgres. Supabase stores durable identity, metadata, access, match, and ingestion status records only.
- Add owner-only upload/ingestion:
  - only the project owner account can upload first-party video assets or enqueue external source ingestion;
  - production must verify owner identity server-side through the TASK-002.8A owner authority foundation;
  - dev/test mode may allow a temporary owner bypass through an explicit env flag, but this must never be the public default.
- Add a watch-library surface inside the expanded watch queue drawer:
  - drag-and-drop upload zone;
  - stored video list/grid;
  - processing status;
  - source match badges;
  - Add to Queue and Play Now actions where permissions allow.
- Add source matching:
  - YouTube video ID is a lookup key, not automatic download permission;
  - playlist import checks each video ID against `media_source_matches`;
  - if a ready first-party Stream/R2 asset exists, queue the first-party media;
  - if no ready first-party asset exists, queue the normal YouTube embed fallback.
- Add media processing/provider contracts:
  - use Cloudflare Stream direct upload or equivalent server-authorized upload URLs for user-friendly drag-and-drop;
  - store Cloudflare Stream asset IDs and playback details in Supabase metadata;
  - run `yt-dlp` only for owner-authorized sources;
  - use custom workers/jobs only where Cloudflare Stream does not cover the required artifact, such as waveform peaks or R2 archive handling;
  - upload non-Stream artifacts to R2 through the S3-compatible API or a Worker/R2 binding path;
  - update Supabase job status as `pending`, `processing`, `ready`, or `failed`.
- Add the movie/direct-media path through owner uploads and authorized direct media URLs, with Stream-first playback where possible.
- Do not include hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation.
- Keep YouTube and direct URL playback working.

Review checkpoint:

- Existing YouTube and direct URL playback still works.
- Ready first-party Stream/R2 assets are preferred automatically when a matched source is already available.
- Only owner-authorized upload/ingestion can create first-party media assets.
- Waveform peaks are generated, queued, or explicitly marked unsupported for supported first-party media.
- Access, metadata, source matching, and ingestion boundaries are clear.

Safe commit point:

- Mistake Watch has the foundation for an owner-controlled watch media library with Cloudflare Stream-first playback and R2-backed supporting storage.

## TASK-002.9: Voting and Suggested Next

Source task: TASK-001 later voting direction.

Work:

- Add suggested-next voting near 75% playback progress.
- Show 3 suggested songs where available.
- Let majority vote add the next item to the queue.
- Include a random suggestion button.
- Keep host authority override.

Review checkpoint:

- Voting helps choose the next queue item without taking authority away from the host.

Safe commit point:

- Collaborative queue selection exists behind room-authoritative rules.

## TASK-002.10: Accounts, Friends, Invites, Listening History, and Social Rooms

Source task: TASK-001 later accounts/friends direction.

Work:

- Extend the account and profile foundation created in TASK-002.8A.
- Add friend relationships and friend room visibility.
- Add friend invite popups from rooms.
- Add notification bell/drawer support for room invites.
- Migrate guest avatar/name behavior cleanly into account profiles.
- Preserve guest-first rooms until account migration is ready.
- Keep host crown role-based, not avatar-specific.
- Add YouTube playlist/history-related Google scopes only if a concrete feature in this task needs them and the consent boundary is explicit.
- Add account-backed listening history foundations for future real `Most listened` data.
- Track per-account media identity, play count, completion count, total listened time, last played time, and source/provider metadata where available.
- Prepare a first-party yearly/monthly recap direction, internally treated as a Mistake Watch wrapped-style recap, without depending on Spotify or external account exports.
- Keep recap naming, visuals, and data model original to Mistake Watch; do not clone Spotify branding.

Review checkpoint:

- Friends can invite friends to rooms through visible notifications.
- Guest-first behavior still works or has a clear migration path.
- Google OAuth supports playlist/history integrations only after explicit incremental consent.
- Real `Most listened` can later aggregate account listening history for members in the active room.
- Account listening history can support a future Mistake Watch recap showing top songs, artists/channels, rooms, contributors, listening time, and session patterns.

Safe commit point:

- Mistake Watch supports account-backed social room discovery, invites, and durable listening-history foundations.

## TASK-002.10A: Easter Eggs and Account Achievements

Source task: fun account-layer follow-up from the easter egg and achievements direction.

Work:

- Add an easter egg and achievements system after accounts/profiles exist so unlocks can attach to durable user profiles.
- Add a typed trigger phrase system for hidden room effects, starting with the `cardinal mistake` trigger.
- When `cardinal mistake` is typed, trigger a local-only cinematic failure overlay: fade the screen to black, play the chosen failure sting, show the `YOU DIED` style screen, then fade back to the room without disrupting playback, queue, sync, or other users.
- Record the related achievement on the user's account once profiles exist. The first unlock should be idempotent so repeated triggers do not duplicate achievement rows.
- Keep the visual/audio effect local by default. Do not make it room-wide unless a later host-controlled room-effect mode is explicitly approved.
- Add an achievement catalog model with stable achievement IDs, display names, descriptions, rarity/category, trigger source, unlocked timestamp, and optional local animation metadata.
- Add a user achievement surface in the future account/profile UI and a compact in-room unlock toast that does not cover core playback controls.
- Support guest-safe fallback behavior: before account login, easter eggs can run locally, but durable achievement persistence should be unavailable or local-only until the user signs in.
- Add safety controls so typed triggers do not fire while entering normal URLs, chat messages, room names, or form fields unless that input is intentionally registered for easter egg detection.
- Respect reduced-motion and reduced-audio preferences. Provide a no-motion/no-audio fallback that still unlocks the achievement.
- Keep copyrighted/inspired media assets isolated behind replaceable app assets so the project can later swap to fully original visual/audio treatment if needed.

Review checkpoint:

- The `cardinal mistake` easter egg feels deliberate, polished, and fun without interrupting the shared room state.
- Achievements persist correctly to the account profile once accounts exist.
- Trigger detection is reliable and does not interfere with normal typing or media controls.

Safe commit point:

- Mistake Watch has a durable account-backed achievements foundation and one polished easter egg trigger.

## TASK-002.10B: AI DJ / Session Intelligence

Source task: later listen-room AI DJ direction.

Work:

- Add a future listen-room intelligence surface that can summarize session patterns once the recommendation and account foundations exist.
- Start with room/session analysis before personal memory: recent playback history, current queue makeup, session duration, songs added, contributor activity, and room energy.
- After accounts/profiles exist, optionally add consent-aware user memory for taste patterns and recurring room preferences.
- Surface technical, evidence-backed readouts such as `Signal Analysis`, `Current Mood`, `Room Energy`, `Current Session`, `Songs Added`, `Top Contributor`, and `Current Pattern Detected`.
- Support an `Odysseus DJ` style module that can explain detected patterns and suggest a direction such as `Dark Orchestral Metal`.
- On tall desktop and vertical-monitor listen layouts, reserve the unused space below the left player card as the preferred home for the AI DJ/session-intelligence card.
- Keep that vertical placement responsive: the player remains first priority, the AI DJ card sits below it only where there is meaningful empty left-column space, and mobile/tablet layouts keep the normal single-column flow.
- Prepare the card for future interaction affordances such as prompt input, spoken-response state, and an audio-reactive waveform, but do not implement AI chat, voice generation, or speech visualization until this task is explicitly active.
- Keep AI output advisory by default; it must not mutate the queue, override host authority, or pretend unavailable provider data exists.
- Feed future suggestions into provider recommendations, suggested-next voting, or host-controlled add/play-next actions only after explicit user action.

Review checkpoint:

- AI DJ feels native to the listen center surface and reads like session intelligence, not generic chatbot copy.
- On vertical listen layouts, AI DJ uses the otherwise empty below-player column space without crowding the media player, room controls, recommendations, or queue drawer.
- Personalization is clearly separated from room-session analysis and only appears after accounts/profiles make it legitimate.

Safe commit point:

- Listen mode has a defined AI/session-intelligence path without pulling AI scope into current discovery or card-drift work.

## TASK-002.11: Shared Browser Prototype

Source task: TASK-001 later shared browser direction.

Work:

- Build browser mode as a separate subsystem from media playback.
- Define worker/container hosting before implementation.
- Add permission handoff for browser control.
- Add resource limits, cleanup, and safety boundaries.
- Keep browser mode isolated from watch/listen playback state.

Review checkpoint:

- Browser prototype can be evaluated without risking media-room sync behavior.

Safe commit point:

- Browser mode has a controlled prototype path.

## TASK-002.12: Hardening and Abuse Controls

Source task: TASK-001 later hardening direction.

Work:

- Add rate limiting and action validation where needed.
- Review invite safety and room access boundaries.
- Add moderation hooks where required by chat, browser, or accounts.
- Add production logging for failure states.
- Run Supabase RLS review and SpacetimeDB authority reducer review.
- Handle provider API and realtime disconnect failures visibly.

Review checkpoint:

- Known abuse and failure paths have explicit controls or documented limitations.

Safe commit point:

- The system is ready for broader friends-and-family usage.

## TASK-002.13: Final QA and Release Gate

Source task: TASK-001 final QA direction.

Work:

- Run full dashboard, watch, listen, queue, chat, invite, permissions, and mobile QA.
- Verify production deploy configuration.
- Verify SpacetimeDB, Supabase, YouTube API, Vercel environment variables, and DNS.
- Produce `qa-report.html`.
- Prepare commit/release handoff only after QA passes.

Review checkpoint:

- The project is ready for a clean release checkpoint.

Safe commit point:

- TASK-002 recovery work is complete and verified.
