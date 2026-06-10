# TASK-002 Review Notes

## Current Status

Status: TASK-002.5 Provider Recommendations and Room Picks is implemented pending live-room visual and permission QA.

TASK-002.1 Listen Mode Quality Pass is complete pending manual visual review in a live room.

TASK-002.2 Room Chat is implemented pending manual two-client browser QA in a live room.

TASK-002.3 Seamless Next Item Loading is implemented pending manual live-room transition QA.

TASK-002.4 YouTube Availability Hardening is complete. The earlier SpacetimeDB CLI blocker was resolved by calling the installed executable directly at `C:\Users\Admin\AppData\Local\SpacetimeDB\spacetime.exe`; build with `--module-path .\spacetime`, generate, local publish, and Maincloud publish all succeeded.

TASK-002.5A Adaptive Listen Card Drift is closed. The autonomous drift experiment was removed after user QA found it annoying; manual carousel arrows and normal horizontal scrolling remain.

TASK-002.5C Live Room Authority Hardening is implemented. User manual QA confirmed it is working well in local live-room testing.

TASK-002.5D Queue Authority And Add Media UX Stabilization is implemented pending manual two-client queue-management QA.

Baseline handoff docs now exist at `docs/HANDOFF.md` and `docs/COMMANDS.md` so future agents can continue from TASK-002 without relying on chat memory.

## Canonical Next Task

Next checkpoint: TASK-002.5D QA/review, then TASK-002.5B Cinematic Watch Room Purpose Pass.

## Decisions Locked

- TASK-002 is the recovery roadmap for incomplete TASK-001 work.
- TASK-001 remains historical context and original MVP background.
- Work proceeds in numeric TASK-002 order unless the user explicitly changes it.
- Each subtask needs a focused implementation report after completion.
- TASK-002.4 was inserted after TASK-002.3 because YouTube playback failures need classification before Provider Recommendations and Room Picks add more YouTube-driven discovery.
- Source-to-R2 downloads are owner-only. Normal users can add YouTube links/playlists, but only the project owner account can enqueue external source ingestion into R2.
- YouTube video IDs are source-match lookup keys, not automatic download permission.
- If a ready owner-authorized first-party Stream/R2 asset exists for a YouTube source, playback should prefer the first-party asset; otherwise YouTube iframe playback remains the fallback.
- Real waveform/audio analysis must target direct, HLS, or first-party media. YouTube iframe audio must stay on honest fallback visuals unless a matched first-party asset exists.
- TASK-002.5C hardens live room authority before more queue, voting, media-library, or social features depend on it.
- TASK-002.6 prepares the waveform resolver and future first-party media peak contract. TASK-002.8A implements Google OAuth, profiles, and owner authority. TASK-002.8 implements the Cloudflare Stream/R2 media library and authorized upload/ingestion pipeline. TASK-002.10 implements friends, invites, social rooms, and account-backed listening history.
- Movie/direct-media ingestion means owner uploads or authorized direct media URLs only. Do not add hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation.
- TASK-002.5B is the next watch-room UI/personality slice after TASK-002.5D. It should make watch mode focused, cinematic, synchronized, and media-first before later upload/library features depend on the watch layout.
- Cloudflare Stream is the approved fast video processing/playback path for uploaded watch-room video. R2 remains available for raw/source archive, waveform/analysis JSON, supporting artifacts, and future non-Stream media needs.
- TASK-002.8A was inserted before TASK-002.8 because owner-only Stream/R2 upload and source ingestion require a server-verifiable account/owner role before implementation.
- TASK-002.5D is inserted before TASK-002.5B because local QA found queue permission mismatches, silent duplicate handling, previous/back history gaps, and Add Media stacking problems that should be fixed before the cinematic watch queue/library surfaces are redesigned.

## Important Assumptions

- Existing working systems are preserved by default.
- Chat comes before recommendations because it is a clear missing room feature.
- Cloudflare Stream/R2, voting, accounts/friends, shared browser, and hardening are later system-level tasks.
- Watch-room upload/library UI should not be built before the watch room has its purpose/layout foundation.
- Real waveform work must be technically honest: direct/HLS/first-party media sources can support real analysis where technically permitted, YouTube iframe sources cannot be sampled directly.
- Provider recommendations must not fake personalized, provider-trending, or listening-history data.
- YouTube availability hardening cannot make every video embeddable. It should prevent known-bad items from looking playable, classify runtime failures, and keep autoplay moving when possible.
- Live room authority must not rely on browser-provided role or host-member fields when seeding a SpacetimeDB room session.
- Google OAuth starts with basic profile identity in TASK-002.8A. Playlist/history scopes and offline access are added only when the related account features are implemented and consent boundaries are clear.
- The owner role for Stream/R2 upload and source ingestion must be server-verifiable before TASK-002.8 starts. Client UI flags are not an acceptable authorization boundary.
- Queue add permission, queue management permission, playback permission, and host authority should be treated as distinct capabilities in TASK-002.5D.
- Duplicate queue policy should default to warn-first and allow explicit add-anyway. The `Remember my choice` preference is local-only until accounts/preferences exist.

## Live Authority Inspection Notes

- Current SpacetimeDB live session seeding accepts a browser-provided `host_member_id` when no session exists. That creates a front-run risk after a live database reset, expired session, or first-connect race.
- Current queue play-now behavior has a permission mismatch: client code can let playback-permitted guests request `playQueueItemNow`, while the `play_queue_item` reducer is host-only.
- Playlist import currently sends one reducer call per imported item. UI duplicate filtering is snapshot-local, so reducer-level duplicate protection is needed for repeated or concurrent imports.
- Playlist and recommendation API routes use server-side YouTube keys and should not become unauthenticated quota-burn surfaces once room/member context is available.

## TASK-002.5D Planning Notes

- Local QA after the private seed-grant work confirmed that the room can run locally with SpacetimeDB, but queue permissions still do not match the visible member permission model.
- A guest granted full access could control playback and add non-duplicate songs, but queue-management actions remained blocked or ineffective. Current SpacetimeDB permission state exposes add-queue, playback, and browser controls, while durable Supabase types already include a `can_manage_queue` concept. TASK-002.5D should close that mismatch.
- Previous/back currently does not represent actual playback history. It must use server-authoritative played order so users can move backward through the exact sequence they heard.
- Duplicate handling should not silently block user intent. The user should see duplicate detection, choose whether to add anyway, and optionally remember that choice locally.
- The current Add Media popout can visually collide with the queue drawer and control surfaces, especially on vertical monitor layouts. TASK-002.5D should replace it with a centered modal rendered above drawers and panels.
- The Add Media modal should auto-preview single-song URLs and playlist URLs before mutation. Playlist review needs search, sort, select all, add all, add selected, and a duration filter behind a more-options menu.
- A visible room notification system is needed so queue outcomes are not hidden in reducer errors or console-only state. Notifications should cover song added, playlist count added, duplicate detected, duplicate added anyway, permission denied, and preview/provider failure.
- Console observations from local QA should be triaged in this task: React hydration mismatch and modal z-index/layout issues are app cleanup items; YouTube local `postMessage` warnings are non-blocking unless playback fails.

Implementation test expectations:

- Add SpacetimeDB authority tests for queue-management permission on move, remove, clear, pin, and play-next.
- Add reducer denial tests for missing queue-management permission.
- Add playback-history tests for previous/back order.
- Add duplicate policy tests for warn/add-anyway behavior and local duplicate preference.
- Add client/unit tests for Add Media modal state transitions and playlist review controls.
- Run `npm run typecheck`, `npm run lint`, `npm run test:spacetime`, `npm run test:queue`, `npm run test:sync`, `npm run test:youtube`, and `npm run build`.

## TASK-002.5D Implementation Notes

- Added explicit SpacetimeDB `can_manage_queue` live permission state, while keeping the current user-facing `QUEUE` permission as the single queue authority control.
- Mapped the visible `QUEUE` permission to both SpacetimeDB `can_add_queue` and `can_manage_queue`, so a guest granted queue access can add, reorder, remove, clear, pin, play-next, and requeue as intended.
- Moved queue-management reducers (`move_queue_item`, `remove_queue_item`, `clear_queue`, and `set_queue_item_priority`) from host-only checks to `getAuthorizedQueueManager`.
- Preserved playback authority for play/pause/skip/source load behavior, while queue row mutation stays behind the visible `QUEUE` permission.
- Added `played_sequence` to live queue rows. When a playing item becomes played, SpacetimeDB assigns the next sequence number; listen previous/back now uses this played order instead of inferred array order.
- Added explicit `allow_duplicate` support to `add_queue_item`. Duplicate reducer protection remains default, but the UI can now add duplicates only after an explicit add-anyway decision.
- Replaced the general queue Add Media surface with a centered `document.body` portal modal rendered above room panels and queue drawers.
- Converted the listen header/mobile Add Media popout into the same centered overlay pattern so it no longer collides with vertical-monitor queue drawers.
- Removed the manual Add single song / Review playlist mode cards. Add Media is now URL-driven: paste/input triggers automatic single or playlist preview.
- Added duplicate detection before single-song and playlist queue mutation, plus an Add anyway confirmation and local `mw_queue_duplicate_preference` remember-my-choice setting.
- Added queue notifications for successful single adds, duplicate-added warnings, playlist import counts, source load success, and duplicate detection warnings.
- Expanded playlist review controls with search, duplicate-aware sort, select visible, select all, clear selection, add all, add selected, duplicate badges, and duration filters for shorter-track selection.
- Regenerated SpacetimeDB TypeScript bindings after schema/reducer changes.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:spacetime` passed.
- `npm run test:queue` passed.
- `npm run test:sync` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.
- `spacetime generate` passed.
- `spacetime build --module-path .\spacetime` passed.
- Local SpacetimeDB publish to `http://127.0.0.1:5372` passed for database `mistake-watch-rooms`.
- Browser QA for the corrected URL-driven modal and two-client queue permissions is still pending.

Manual review pending:

- Two-client QA should confirm a guest granted `QUEUE` can add, reorder, remove, clear, pin, play-next, and requeue rows.
- Two-client QA should confirm a guest without `QUEUE` sees disabled controls or receives reducer-denied behavior without hidden mutation.
- Playlist QA should confirm duplicate detection, Add anyway, and remembered duplicate preference.
- Playback-history QA should play multiple songs and confirm previous/back walks the actual played sequence.
- Production requires publishing the SpacetimeDB module before `can_manage_queue`, `played_sequence`, and `allow_duplicate` are available on Maincloud.

### TASK-002.5D Corrective Follow-up: Autoplay Stability And Playlist Filter Bar

- Fixed the playlist review More options layout so duration filters occupy a reserved toolbar band above the scrollable rows instead of visually overlapping the first playlist item.
- Added SpacetimeDB `advance_queue_item`, an atomic playback reducer for queue autoplay. It validates playback authority, queue autoplay state, expected active queue item/source, chooses the next item from server state, marks the previous item played, marks the next item playing, and updates `room_session` to `playing` in one reducer transaction.
- Changed `useLiveRoom.advanceToNextQueueItem` to call `advanceQueueItem` instead of computing the next queue item from the client snapshot and then calling `playQueueItem` plus `setPlaybackState`.
- Updated the YouTube player so `ENDED`, iframe error fallback, interval fallback, and visibility recovery share a guarded autoplay-advance path. When queue autoplay can continue, the player now requests atomic advance instead of publishing `ended`/`error` first.
- Added an active-playback-key in-flight guard so hidden-tab or delayed YouTube events cannot issue repeated advance attempts for the same active item.
- Regenerated SpacetimeDB bindings after adding the reducer.

Verification:

- `npm run typecheck` passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `npm run lint` passed.
- `npm run test:spacetime` passed.
- `npm run test:queue` passed.
- `node --test --test-concurrency=1 tests/player/*.test.mjs` passed. The normal `npm run test:sync` glob hit local V8 out-of-memory when run in parallel in this Windows session.
- `npm run build` passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `spacetime build --module-path .\spacetime` passed.
- `spacetime generate` passed.
- Local SpacetimeDB publish to `http://127.0.0.1:5372` passed for database `mistake-watch-rooms`.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail after starting the local Next dev server.

Manual review pending:

- Two-browser QA should confirm backgrounded YouTube autoplay advances once per song without reload loops or replaying the just-finished song.
- Playlist review QA should confirm the More options filter bar no longer overlaps playlist rows at the desktop/vertical-monitor viewport shown in user QA.
- Maincloud requires a separate SpacetimeDB publish before production can use `advance_queue_item`.

## TASK-002.5C Implementation Notes

- Added a server-issued private SpacetimeDB seed grant derived from verified durable host membership. The room snapshot now exposes the one-time raw seed token only to the current durable host member.
- `seed_room_session` now requires `seed_token` and refuses to create a new live session unless a matching private `room_seed_grant` exists. Browser-provided `host_member_id` alone is no longer enough to establish live host authority.
- `issue_room_seed_grant` can only be called by a SpacetimeDB identity listed in the private `trusted_seed_issuer` table. The matching auth token is stored only as `SPACETIME_SERVER_AUTH_TOKEN` in `.env.local` or Vercel.
- The client hook now calls `seedRoomSession` only for the durable host. Guests still join live rooms through `joinRoom`, but they cannot seed host authority.
- `play_queue_item` now uses playback-authorized reducer authority instead of host-only authority, matching the existing permission model where playback-granted members can select and immediately play a queued item.
- `add_queue_item` now rejects duplicate active queue items by normalized source type and URL at reducer level, preventing repeated or concurrent playlist imports from flooding the live queue with duplicate rows.
- Playlist preview and YouTube recommendation API routes now require room-member context from the existing guest membership cookie and apply per-room/member rate limits before provider quota is used.
- Playlist and recommendation client helpers now include `roomId` and keep their local in-flight/cache keys room-scoped.
- Spacetime generated bindings were refreshed after the reducer payload change.
- Added `tests/spacetime/authority.test.mjs` for seed-token contract, playback-authorized queue selection, and reducer duplicate-protection coverage.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:spacetime` passed.
- `npm run test:queue` passed.
- `npm run test:sync` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.
- `spacetime build --module-path .\spacetime` passed.
- `spacetime generate` passed.

Manual review pending:

- Two-client live-room QA should confirm a guest cannot seed host authority after a fresh SpacetimeDB room state.
- Two-client QA should confirm playback-granted guests can select/play queued items while guests without playback permission cannot.
- Two-client QA should confirm queue-add permission revocation blocks new queue additions during an active room.
- Playlist QA should confirm repeated playlist imports do not create duplicate live queue rows.
- Environment QA should confirm `SPACETIME_SERVER_AUTH_TOKEN` is configured in `.env.local` and Vercel, and that the matching identity hex exists in SpacetimeDB's private `trusted_seed_issuer` table. SpacetimeDB no longer needs `SPACETIME_ROOM_SEED_SECRET`.

## Future Watch Room Notes

- TASK-002.5B should make watch mode feel like a private theater, screening room, movie night, or premiere event rather than a YouTube page or dashboard.
- The watch room should prioritize attention: less information, less activity, less analytics, and fewer persistent side panels than listen mode.
- Target layout: top Signal Room band, dominant center video, minimal grounded transport, compact Up Next surface, and members/queue drawers.
- Ambient glow should feel like cinematic screen spill. Direct/HLS/first-party Stream media can use sampled or precomputed palette data where permitted; YouTube should use thumbnail/provider-derived palette fallback.
- The expanded watch queue drawer is the future home for library browsing, drag-and-drop upload, processing status, source-match badges, and Add to Queue / Play Now actions. That upload/library behavior belongs to TASK-002.8, not TASK-002.5B.

## Future Accounts/Friends Notes

- When TASK-002.10 adds accounts and friends, the right room sidebar should support a two-tab social structure: `Members` for current room participants and `Friends` for quickly inviting friends into the active room.
- The current share action should become the primary invite action in that future flow: it should still support link sharing, but also act as the entry point for friend invites once accounts exist.
- The future Friends tab should not be built into the current guest-first member UI. Keep the current implementation focused on live room members, permissions, and host actions until accounts/profiles/friending are in scope.

## Future Listen Motion And AI Notes

- TASK-002.5A was added as a UI-extra task for adaptive listen-card drift. The intent is subtle ambient motion in the center listen surface, using existing room-pick/recommendation cards rather than a separate decorative layer.
- Adaptive drift must be content-aware. It should only run when the rail has enough cards and overflow width to avoid blank gaps; otherwise it should fall back to the existing static/snap carousel.
- The drift must pause during interaction and respect reduced-motion. It must not change playback state, queue order, provider data, permissions, or SpacetimeDB authority.
- TASK-002.10B was added as a later AI DJ / session-intelligence task. This should not be pulled into the drift task or provider recommendations prematurely.
- The AI DJ direction should support readouts such as `Signal Analysis`, `Current Mood`, `Room Energy`, `Current Session`, `Songs Added`, `Top Contributor`, `Current Pattern Detected`, and `Suggested Direction`.
- Personal user memory belongs after accounts/profiles and consent boundaries exist. Before then, AI/session intelligence can only use current room/session history and queue data.
- AI DJ suggestions should remain advisory by default and should feed host-approved queue actions, suggested-next voting, or provider recommendations rather than silently mutating the queue.
- TASK-002.5 added a future AI DJ/session-intelligence home in the listen discovery surface. It is intentionally non-autonomous: it reads queue/history session signals only and does not imply account memory, fake mood data, or queue mutation.
- The user wants Mistake Watch to eventually replace Spotify-like personal listening value with first-party account history. TASK-002.10 should include durable listening history foundations and a future original recap experience, similar in purpose to a wrapped-style year/month recap but branded and modeled as Mistake Watch's own feature.

## Future Easter Egg And Achievement Notes

- TASK-002.10A was added immediately after accounts/friends as the account-backed easter egg and achievements task.
- The first planned trigger is `cardinal mistake`.
- The intended effect is a local cinematic failure overlay: fade to black, play the chosen failure sting, show a `YOU DIED` style screen, then fade back to the room.
- The effect must not pause, seek, skip, desync, reorder, or otherwise mutate the shared room state.
- Achievement unlocks should be durable only after accounts/profiles exist and should be idempotent per user/achievement.
- Guest fallback can run the visual locally, but it should not imply durable profile achievement history before login.
- Trigger detection should avoid normal form fields unless intentionally registered, especially URL inputs, room-name editing, settings fields, and future chat input.
- Keep the effect and audio asset-driven. The user currently wants the iconic `YOU DIED` direction for the private friends-and-family project, but the system should be able to swap assets later without architecture changes.

## Console Issues Captured From Production

- A Chrome extension content script logged `Cannot use import statement outside a module`. This appears extension-originated, not app-originated, unless the same error appears with a Mistake Watch script URL.
- Production logged React minified error `#418`, which usually indicates a hydration mismatch. Investigate recent listen layout changes for client-only state, dynamic DOM differences, browser extension DOM mutation, or server/client rendered markup divergence.
- YouTube widget API logged repeated `postMessage` target-origin mismatch warnings for `https://www.youtube.com` versus `https://watch.mistakestudios.com`. Some YouTube iframe chatter is expected, but repeated warnings should be checked against player lifecycle and iframe origin handling.
- Production logged `TypeError: e.getPlayerState is not a function`. This is the most actionable app-side issue: a YouTube player readiness/sync interval is likely calling player APIs before the object is a real `YT.Player` instance or after it has been replaced/destroyed.
- A CSS preload warning appeared for a Next chunk. Treat as low priority unless it correlates with slower page load or repeated unused preload warnings.

## Current Listen UI Follow-Up Notes

- Room pick cards and recently added rows should become clickable playback actions. Users with playback authority should play that queue item immediately; users without authority should see disabled/permission-aware affordance rather than silent failure.
- The visible color mismatch around the `For you`, `Recommended`, `Most listened`, and `From your playlist` tabs should be fixed by making the center content background continuous and reducing the hard tinted band behind the tab selector.
- Recommendation cards need clear clickable affordance: pointer cursor, restrained hover border, subtle play indicator, and a distinct current/now-playing state.
- The listen queue drawer must stop mixing played items into the main upcoming queue view. Add a `History` filter/tab and keep previously played songs there so `Queue` clearly represents current and upcoming items only.

## Current Listen UI Follow-Up Implementation

- Room pick cards and recently added rows are now permission-aware playback buttons instead of passive display-only surfaces.
- The center listen canvas background was softened into a more continuous gradient so the recommendation tabs no longer sit inside a visibly mismatched color band.
- The listen queue drawer now has `Queue` and `History` views. `Queue` shows now-playing and upcoming rows only; `History` shows previously played rows.
- The queue drawer count now reflects the active view instead of mixing history into the upcoming queue count.
- YouTube player sync and volume paths now guard runtime player objects before calling APIs such as `getPlayerState`, reducing the risk of stale/not-ready iframe objects throwing in production.
- Follow-up correction: explicit user play actions now call `playQueueItemNow`, which selects the queue item and immediately requests `playing` state instead of leaving the selected item paused.
- Follow-up correction: previous/next transport actions use the same play-now behavior.
- Follow-up correction: the listen header count now separates upcoming and played counts instead of reporting total queue/history as one queue number.
- Follow-up correction: the listen header room code now has its own copy button.
- Follow-up correction: pinned queue rows now show a visible pinned state in both status text and pin-button styling.
- Follow-up correction: the playlist review overlay now closes the underlying add-media popover, uses a fixed three-row modal layout, and scrolls only the playlist rows so preview controls do not overlap or drift off-screen.

## Risks To Watch

- TASK-002.1 may touch visible listen-mode UI and must avoid remounting or interrupting playback.
- TASK-002.2 adds realtime message state and must avoid cross-room leakage.
- TASK-002.3 can accidentally mutate playback if preload logic is not isolated.
- TASK-002.4 can accidentally overpromise YouTube reliability. Keep the task focused on availability checks, clear failure states, and safe skipping.
- TASK-002.5 can drift into fake recommendation content if provider data is unavailable.
- TASK-002.5A can become distracting if implemented as a marquee. It needs measured overflow thresholds, interaction pauses, and reduced-motion handling.
- TASK-002.5D can become too broad if it absorbs the future media library. Keep it focused on queue authority, add-media modal UX, duplicates, notifications, and playback history.
- TASK-002.8 and TASK-002.10 likely need extra Supabase, Cloudflare, and security review before implementation.
- TASK-002.10A should not let fun local effects mutate shared room state or create duplicate account achievement records.
- TASK-002.10B should not introduce persistent taste memory before account/profile consent exists.
- TASK-002.11 requires stricter isolation than normal UI work because browser mode can become resource-heavy and abuse-prone.

## Implementation Rule

When the user says "proceed", implement only the next incomplete TASK-002 subtask unless they name a different TASK-002 number.

## TASK-002.4 YouTube Availability Hardening Spec Notes

- Trigger: production testing showed many YouTube videos reporting "YouTube could not play this video here."
- Goal: reduce failed-room playback by validating YouTube items before import/play where possible and classifying runtime iframe failures when validation cannot predict them.
- Server/API direction: use existing YouTube API integration to check video `status.embeddable` and available status fields where returned. Region, age, private, removed, and embed-blocked states should become explicit unavailable classifications instead of normal queue rows.
- Playlist direction: playlist review should show blocked/unavailable/unknown statuses and default-select only playable items. Import summary should report playable imported, blocked skipped, unavailable skipped, and unknown included/skipped depending on final implementation choice.
- Queue/player direction: known-blocked queue items should show a clear badge/reason, be disabled as normal play targets, and be skipped automatically when autoplay is enabled.
- Runtime direction: YouTube IFrame `onError` codes should be mapped into readable states. Expected mappings include removed/private, embed blocked, player/browser issue, and missing referrer/client identity.
- Scope boundary: do not build provider recommendations, accounts, durable failure analytics, moderation, or non-YouTube media upload in this task.
- Testing direction: add focused tests for availability classification, playlist selection defaults, queue disabled states, and runtime error mapping. Run `npm run typecheck`, `npm run lint`, relevant YouTube/player tests, `npm run build`, and production/browser QA.

## TASK-002.4 Implementation Notes

- Added `lib/youtube/availability.ts` as the shared YouTube availability classifier for metadata, playlist, and runtime iframe failure paths.
- YouTube metadata now requests the official `status` part along with snippet, duration, and statistics so embeddability, privacy, and upload status can be classified where the Data API exposes them.
- Metadata responses now include top-level availability, allowing UI surfaces to display an unavailable/block reason even when no normal metadata record exists.
- Playlist preview now keeps visible unavailable playlist rows when YouTube provides a video id, enriches playlist rows through batched `videos.list` checks, and defaults selection to playable rows only.
- Single YouTube link add/load flows now call the server metadata route before treating the item as playable. Known non-embeddable/private/removed items are blocked with a clear reason; unknown/provider-unavailable lookups remain allowed rather than over-blocking uncertain items.
- Queue rows, listen room picks, recently added rows, and listen queue drawer rows now disable normal play actions for known unavailable YouTube items and show explicit unavailable labels/reasons.
- YouTube iframe `onError` codes are mapped to readable availability states. Runtime failures set a clear local error and, when autoplay is enabled and the client has playback authority, request the next queue item after a short grace window.
- Queue-selection logic now skips known unavailable items for normal, loop, shuffle, and smart-shuffle next-item selection.
- SpacetimeDB `play_queue_item` now rejects known-unavailable queue rows, and the reducer guard has been built, generated, published locally, and published to Maincloud after resolving the CLI path issue.

Verification:

- `npm run test:youtube` passed.
- `npm run test:queue` passed.
- `npm run test:sync` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:spacetime` passed.
- `npm run build` passed.

Resolved verification:

- The SpacetimeDB CLI path issue was resolved by calling `C:\Users\Admin\AppData\Local\SpacetimeDB\spacetime.exe` directly.
- `spacetime build --module-path .\spacetime` passed.
- `spacetime generate` passed.
- Local publish to `http://127.0.0.1:5372` for `mistake-watch-rooms` passed.
- Maincloud publish to `https://maincloud.spacetimedb.com` for `mistake-watch-rooms` passed.

Manual review pending:

- Test playlist preview with a mixed playlist containing playable and unavailable/private/embed-blocked items.
- Test single known embed-blocked YouTube links to confirm they are blocked before queue add/load.
- Test active runtime iframe failure handling and autoplay skip with two clients.

## TASK-002.5 Implementation Notes

- Added `lib/recommendations/listen-discovery.ts` to make listen discovery tabs explicit about source state: room queue, room history, provider, provider-limited, or unavailable.
- `For you` now uses playable queue/history rows and filters known-unavailable items.
- `Recommended` uses server-side YouTube search when provider data is available, otherwise it falls back to honest room-history recommendations.
- `Most listened` replaced `Trending` because Mistake Watch is a listen-together room, not a general music app. It is currently host/room-history based; after accounts exist it should be based on the accounts present in the room and clearly show the most listened-to songs across those members.
- `From your playlist` does not claim account playlist access before accounts exist. It uses room playlist/history matches when available and otherwise shows accounts-required copy.
- Added `lib/youtube/recommendations.ts`, `lib/youtube/recommendations-client.ts`, and `app/api/youtube/recommendations/route.ts` so provider data stays server-side and `YOUTUBE_API_KEY` is not exposed to the client.
- Listen recommendation cards now support permission-aware load/play, add-to-queue, and play-next actions.
- Added a future AI DJ/session-intelligence home in the listen center surface. It summarizes current queue/history signals only and remains advisory.
- Added `tests/recommendations/listen-discovery.test.mjs`.

Verification:

- `node --test tests\recommendations\listen-discovery.test.mjs` passed.
- `npm run test:youtube` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- The listen UI now uses provider recommendations only for `Recommended`; `Most listened` is not backed by global YouTube trends.

Manual review pending:

- Live listen-room visual QA for all four tabs.
- Multi-client permission QA for recommendation card load/play, add-to-queue, and play-next actions.
- Provider-limited state QA by testing with missing or invalid YouTube provider configuration.

## TASK-002.5A Closed Implementation Notes

- Added desktop-only adaptive drift to the listen room-picks rail for desktop/fine-pointer viewports, including narrower vertical-monitor widths.
- The drift uses the existing scrollable recommendation cards rather than cloned decorative cards, so card actions, permission states, and queue/playback behavior stay unchanged.
- Motion only runs when the rail has horizontal overflow to move without blank gaps. Mobile, coarse-pointer layouts, and reduced-motion users keep the normal static/snap carousel.
- Drift is a one-way sweep through the rail rather than a reversing ping-pong motion. The playlist tab uses the same one-way traversal so long playlist rails can be scanned end to end.
- Drift pauses on pointer, wheel, touch, keyboard, and focus interaction, and playlist review overlays block drift while open.
- Follow-up decision: user QA found the autonomous drift annoying, so the autonomous drift loop was removed. Manual carousel arrows and normal horizontal scrolling remain.

Manual review outcome:

- The ambient drift experiment did not meet the desired feel and is no longer the next implementation target.

## TASK-002.3 Implementation Notes

- Added isolated next-item prediction for the current live queue snapshot without mutating playback, queue order, or room state.
- Added safe next-item preparation for YouTube, direct media, and HLS-like sources.
- YouTube preparation warms thumbnail metadata, calls the existing YouTube metadata API, and loads the YouTube IFrame API script only. It does not create hidden duplicate YouTube players and does not preload full YouTube videos.
- Direct/HLS preparation warms thumbnails and media metadata where browser/network conditions allow. HLS manifest warming is best-effort and does not block playback.
- Added a client preparation hook with cache keys and invalidation keys tied to current item, queue mode, queue order, source URL, and played/queued state.
- Added watch-mode and listen-mode `Preparing next` / `Next ready` / `Next pending` status copy.
- Added transition instrumentation through `performance.mark`, `performance.measure`, and a browser `mw:next-item-preparation` event for future QA timing.
- Added tests for prediction, loop-mode behavior, target rejection, YouTube thumbnail derivation, invalidation keys, and preparation cache keys.
- Follow-up UI/data-state refinement: listen-mode recommendations and recent rows now hydrate from YouTube metadata where available and no longer show `Metadata pending` when useful title/artwork data already exists.
- Follow-up UI/data-state refinement: the listen-mode source card, next-preparation status, member permission controls, recommendation carousel affordance, and red/dark dynamic theme strength were tightened to match the current design direction.
- Follow-up listen-room structure refinement: added a compact technical room header for room code, connection state, queue count, invite/share/copy, save room, and watch/listen switching.
- Follow-up listen-room structure refinement: removed duplicated room-wide controls from the right sidebar so it focuses on members, host authority, permissions, and coming up.
- Follow-up listen-room structure refinement: replaced homepage-style greeting language with session/queue language, restyled Add Media to a dark/gold control, reduced background glow strength, and tightened shared button/icon/panel radii.
- Follow-up now-playing refinement: YouTube source, views, and likes are now grouped into compact stat chips below the artist instead of being mixed into the text flow.
- Follow-up now-playing refinement: `Preparing next` moved into an attached bottom strip on the left player card with next-item artwork and title.
- Follow-up listen-room sidebar refinement: the right members panel can now collapse into an attached live member rail instead of staying as a full-width panel at all times.
- Follow-up listen-room sidebar refinement: removed the duplicated right-panel `Coming Up` card because the left now-playing panel already owns the attached `Preparing next` preview.
- Follow-up listen-room sidebar refinement: the listen grid and bottom queue drawer now animate their desktop offsets when the members panel is collapsed, preserving the grounded/attached control layout.
- Follow-up member-list refinement: the members panel now uses a denser table-like section layout instead of page-style copy and floating member cards.
- Follow-up member-list refinement: online members sort to the top under hosts, idle members are visually split into a lower section, and hosts no longer see self-management controls on their own member row.
- Follow-up autoplay continuity refinement: YouTube source changes now reuse the existing iframe player instance and switch videos through the IFrame API instead of destroying/remounting the player on every queue transition.
- Follow-up autoplay continuity refinement: YouTube queue advancement now has a near-end fallback. If the canonical room state is still playing past the known duration plus a grace window and YouTube did not emit `ENDED`, the playback-authorized client requests the next queue item once.
- Follow-up autoplay continuity refinement: queue auto-advance authority now follows playback authority instead of queue-management authority, so a granted playback controller can advance the room without receiving reorder/remove permissions.
- Follow-up autoplay continuity refinement: returning to a backgrounded tab now resyncs the existing YouTube player to canonical SpacetimeDB state rather than blindly calling play.
- Follow-up autoplay continuity refinement: the local blocked-autoplay affordance now uses compact `Resume playback` copy and resyncs before attempting playback.
- Follow-up regression fix: manual play actions, skip actions, and queue-drawer play actions now recover from the stable-iframe transition path by re-attempting playback when the canonical source is already loaded but the room state changes to `playing`.
- Follow-up regression fix: YouTube metadata refresh is delayed/retried after source changes so the app does not read the previous iframe video's duration immediately after `loadVideoById`.
- Follow-up regression fix: listen and shared transport duration displays now prefer the active queue item's raw duration before falling back to session duration, preventing the previous song duration from showing during queue item changes.
- Follow-up reducer correction: `update_media_title` now prefers active queue duration, then newly reported provider duration, then existing session duration. This prevents stale session duration from winning over fresh provider metadata once the SpacetimeDB module is published.
- Follow-up production publish: SpacetimeDB module `mistake-watch-rooms` was published to `https://maincloud.spacetimedb.com` after the reducer correction. The production health endpoint at `https://watch.mistakestudios.com/api/health` returned HTTP 200 afterward.
- Listen room header refinement: the listen room header was compressed into a technical session header with inline room-name editing, clearer session stats, quieter secondary room actions, a stronger Add Media hierarchy, a compact embedded Watch/Listen switch, integrated Room Picks tabs, and a less detached carousel end control.
- Listen room header refinement note: remaining duration is calculated from queued SpacetimeDB item durations when available. If provider duration metadata is missing, the remaining-time stat is omitted rather than faked.
- Browser visual QA note: local `npm run dev:next` started successfully on `127.0.0.1:5371`, but the in-app browser client blocked navigation to both `127.0.0.1:5371` and `localhost:5371` with `ERR_BLOCKED_BY_CLIENT`, so final visual confirmation should be done in production or a normal browser.
- Listen room header refinement production deploy: Vercel production deploy succeeded as `https://mistake-watch-1gkjrc46r-cardinal117s-projects.vercel.app` and aliased to `https://mistake-watch.vercel.app`. Health checks returned HTTP 200 for both `https://watch.mistakestudios.com/api/health` and `https://mistake-watch.vercel.app/api/health`.
- Production console observation before the listen header refinement: the browser showed a Chrome extension `content_reporter.js` module syntax error, a React minified hydration error `#418`, a missing `/favicon.ico`, a SpacetimeDB cache warning for `room_participant`, YouTube iframe `postMessage` origin noise, YouTube/Google Ads CORS failures, and a minified runtime error reading `title` from `undefined`.
- Production console observation after the listen header refinement and refresh: the Chrome extension syntax error and React minified hydration error `#418` still appeared, SpacetimeDB connected, and one YouTube thumbnail request to `i.ytimg.com` failed with `ERR_CONNECTION_CLOSED`.
- Console triage note: the extension syntax error is likely browser-extension noise, YouTube/Google Ads CORS and occasional provider playback failures are expected third-party/provider behavior, and song-specific "could not play" failures should be handled as unavailable YouTube items. The app-relevant issues to investigate later are React hydration error `#418`, the earlier `undefined.title` minified runtime error, the missing favicon request if it still occurs, and the SpacetimeDB cache warning if it repeats during normal room joins.
- Manual production playback note: after the listen header refinement, user testing reported that playback and tabbed-out queue continuation appear to work. Occasional YouTube "could not play this song" failures appear song-specific.

Files added or changed:

- `lib/player/next-item-preparation.ts`
- `lib/youtube/iframe-api.ts`
- `components/room/use-next-item-preparation.ts`
- `components/room/invite-actions.tsx`
- `components/room/youtube-media-player.tsx`
- `components/room/transport-controls.tsx`
- `components/room/listen-mode-layout.tsx`
- `components/room/members-panel.tsx`
- `components/room/queue-panel.tsx`
- `components/room/youtube-metadata-line.tsx`
- `components/ui/button.tsx`
- `components/ui/icon-button.tsx`
- `components/ui/panel.tsx`
- `components/ui/room-transition-overlay.tsx`
- `lib/player/youtube-autoplay-continuity.ts`
- `tests/player/youtube-autoplay-continuity.test.mjs`
- `tests/player/next-item-preparation.test.mjs`

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:sync` passed.
- `npm run test:queue` passed.
- `npm run test:spacetime` passed.
- `npm run build` passed.

Manual review pending:

- Local browser QA was attempted after verification. `npm run dev:next` printed Ready on port `5371`, but the server was not reachable by HTTP immediately afterward and no process was bound to port `5371`. Treat browser QA as pending, not completed.
- Browser QA should confirm the `Preparing next` / `Next ready` states are visible without disrupting playback.
- Two-client QA should confirm queue reorder, shuffle mode, loop mode, and current item changes invalidate stale next-item preparation without time jumps or remounts.
- Production QA should confirm YouTube API readiness and metadata warming still work with deployed environment variables.

## TASK-002.2 Implementation Notes

- Added a public SpacetimeDB `room_chat_message` table scoped by `room_id` with a room/created index.
- Added the `send_room_chat_message` reducer with participant ownership checks, room-scoped idempotency through `room_id:client_message_id`, empty/invalid message rejection, 500-character normalization, sender display metadata, avatar key, and host-role snapshotting.
- Added chat rows to room subscriptions and live snapshots so messages only stream for the current room.
- Replaced the Chat tab placeholder with a live room chat panel.
- User clarified on 2026-06-02 that chat is intentionally not wanted in listen mode. Do not add a listen-mode Chat tab unless the user explicitly changes that product decision.
- Chat UI now shows sender avatar, display name, host/guest role, host crown state, timestamp, and sent/sending/failed state.
- Local sends are optimistic and can be retried when failed. Confirmed SpacetimeDB messages replace matching pending messages by `clientMessageId`.
- Chat history remains ephemeral in SpacetimeDB; no durable Supabase chat history, moderation, accounts, friends, or notification systems were added.

Verification:

- `npm run test:spacetime` passed.
- `npm run typecheck` passed.
- `npm run lint` passed after removing an unnecessary effect-state update.
- `npm run build` passed.
- `spacetime build` passed.
- `spacetime generate` passed after installing root and `spacetime/` dependencies.
- Local SpacetimeDB publish to `http://127.0.0.1:5372` succeeded for database `mistake-watch-rooms`.
- Production SpacetimeDB publish to `https://maincloud.spacetimedb.com` succeeded for database `mistake-watch-rooms`; migration created the public `room_chat_message` table.
- Local Next health check returned HTTP 200 at `http://127.0.0.1:5371/api/health`.
- Vercel production deploy succeeded with deployment URL `https://mistake-watch-jhlrp0kk2-cardinal117s-projects.vercel.app`.
- Production aliases `https://mistake-watch.vercel.app/api/health` and `https://watch.mistakestudios.com/api/health` both returned HTTP 200.

Manual review pending:

- In-app Browser automation was still blocked by a runtime setup failure in the Codex environment (`windows sandbox failed: spawn setup refresh`).
- A headless Edge fallback loaded `http://127.0.0.1:5371` successfully and confirmed the dashboard renders.
- Live room QA is currently blocked because the local dev server has no `.env.local`; the dashboard reports `Supabase-backed rooms are unavailable: Missing required environment variable: SUPABASE_SECRET_KEY`.
- Manual QA still needs two clients in one room exchanging messages live.
- Manual QA still needs a cross-room leakage check with two different room IDs.
- Manual QA should verify failed send/retry behavior by disconnecting or stopping the local SpacetimeDB server.

## TASK-002.1 Implementation Notes

- Listen queue drawer now has persisted Compact, Standard, and Tall height controls.
- Listen queue drawer now shows current item position over total queue size where the old total-only count appeared.
- Listen dynamic theming is stronger through additional active theme CSS variables, stronger ambient radial layers, and a more visible artwork-driven backdrop.
- Listen playlist import now opens a review overlay with select-all, per-item selection, Add All, and Add Selected actions before queue mutation.
- Listen center waveform bars now use the active listen theme variable instead of a fixed amber-only treatment.
- Playback, queue reducer semantics, and SpacetimeDB authority were not changed.
- Follow-up revision replaced the preset drawer height buttons with a generous persisted height slider.
- Follow-up revision derives the listen theme from the current artwork thumbnail when browser image sampling is available, with a warm non-blue fallback when sampling is blocked.
- Follow-up revision moves the dominant page gradient origin to the left player/artwork side instead of keeping a constant blue wash across the page.
- Follow-up revision fixes the playlist review modal stacking bug by rendering the modal through a `document.body` portal. This keeps it above the center listen surface and queue drawer instead of trapping it inside the listen grid's lower stacking context.
- Follow-up mobile usability pass promotes `xl` to the full desktop listen-room shell breakpoint. Mobile, tablet, and narrow/vertical monitor widths use a single-column media-first flow with a mobile Room/Members tools panel, while wide desktop keeps the three-column shell.
- Follow-up mobile correction moves the Room/Members tools panel into the visible mobile top/player flow instead of burying it below the full player and center content. The mobile player shell now drops the desktop-style panel background, border, and artwork glow wrapper so the media player reads as the mobile surface rather than a nested sidebar card.
- Follow-up mobile regression repair restores playback-control priority by moving the full mobile Room/Members tools below the current-player controls and capping the mobile YouTube/artwork viewport. Queue drawer height settings now render as an attached settings row instead of a floating overlay that can collide with queue rows.
- Follow-up mobile scroll repair removes the desktop app-shell height/overflow trap from mobile. The listen room now uses normal vertical document flow below `xl`, so player controls, Room/Members tools, Room Picks, and Recently Added can occupy the scroll area instead of leaving a black void.
- Follow-up vertical-monitor correction: listen mode now treats fine-pointer screens at `900px+` as a desktop room shell instead of forcing them into the mobile/tablet flow until Tailwind `xl`. This keeps portrait monitors in the fixed left-player / scrollable-center / right-members / bottom-drawer layout while phones and coarse-pointer devices stay media-first.
- Follow-up vertical-monitor correction: the listen header, left player shell, right members panel, center scroll area, and queue drawer now follow the same runtime `desktopShell` decision instead of mixing runtime shell state with `xl:` visibility. This prevents portrait desktop widths from showing mobile stats, mobile tools, or phone drawer offsets.
- Follow-up discovery drift correction: room-pick auto drift no longer pauses at the end of the rail before resetting. It now continues left-to-right without the previous end delay. A future refinement can replace scroll-position drift with a duplicated transform track if we need a mathematically seamless loop with no reset point.
- Follow-up discovery drift decision: user QA found the ambient card drift annoying, so the autonomous drift loop was removed for now. Manual carousel arrows and normal horizontal scrolling remain, with no background `requestAnimationFrame` drift work running.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:queue` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.

Manual review pending:

- Browser visual QA for listen-mode drawer height controls and playlist overlay. A local dev-server browser check was attempted, but the local Next/Turbopack dev server hit a stale lock/process issue during background startup. Production build still passed.
