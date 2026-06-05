# TASK-002 Review Notes

## Current Status

Status: TASK-002.5 Provider Recommendations and Room Picks is implemented pending live-room visual and permission QA.

TASK-002.1 Listen Mode Quality Pass is complete pending manual visual review in a live room.

TASK-002.2 Room Chat is implemented pending manual two-client browser QA in a live room.

TASK-002.3 Seamless Next Item Loading is implemented pending manual live-room transition QA.

TASK-002.4 YouTube Availability Hardening is complete. The earlier SpacetimeDB CLI blocker was resolved by calling the installed executable directly at `C:\Users\Admin\AppData\Local\SpacetimeDB\spacetime.exe`; build with `--module-path .\spacetime`, generate, local publish, and Maincloud publish all succeeded.

Baseline handoff docs now exist at `docs/HANDOFF.md` and `docs/COMMANDS.md` so future agents can continue from TASK-002 without relying on chat memory.

## Canonical Next Task

Next implementation task after TASK-002.5 QA: TASK-002.5A Adaptive Listen Card Drift.

## Decisions Locked

- TASK-002 is the recovery roadmap for incomplete TASK-001 work.
- TASK-001 remains historical context and original MVP background.
- Work proceeds in numeric TASK-002 order unless the user explicitly changes it.
- Each subtask needs a focused implementation report after completion.
- TASK-002.4 was inserted after TASK-002.3 because YouTube playback failures need classification before Provider Recommendations and Room Picks add more YouTube-driven discovery.

## Important Assumptions

- Existing working systems are preserved by default.
- Chat comes before recommendations because it is a clear missing room feature.
- R2, voting, accounts/friends, shared browser, and hardening are later system-level tasks.
- Real waveform work must be technically honest: direct/HLS/R2 sources can support real analysis, YouTube iframe sources cannot be sampled directly.
- Provider recommendations must not fake personalized, provider-trending, or listening-history data.
- YouTube availability hardening cannot make every video embeddable. It should prevent known-bad items from looking playable, classify runtime failures, and keep autoplay moving when possible.

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

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:queue` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.

Manual review pending:

- Browser visual QA for listen-mode drawer height controls and playlist overlay. A local dev-server browser check was attempted, but the local Next/Turbopack dev server hit a stale lock/process issue during background startup. Production build still passed.
