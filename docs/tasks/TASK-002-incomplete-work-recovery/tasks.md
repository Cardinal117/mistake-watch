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

## TASK-002.5F: Listen Room Header And Presence Refinement

Source task: corrective listen-room layout direction from the reference-header review.

Work:

- Rework the listen-room top shell to follow the approved reference direction:
  - room name is the primary title;
  - room metadata sits underneath as calm supporting text;
  - primary actions stay minimal;
  - secondary room actions move into a settings menu.
- Replace the bulky full-width `Watch | Listen` switch with compact left-aligned icon tabs:
  - video icon plus `Watch`;
  - headphones icon plus `Listen`;
  - active mode uses a clean underline/accent treatment.
- Add the listen search bar to the right of the mode tabs:
  - placeholder: `Search YouTube, playlists, artists...`;
  - UI shell supports empty, typing, searching, results, no-results, and provider-error states;
  - search behavior should be debounced at 600ms, start at 3 characters, cache results for 10 minutes, cap results at 10, and cancel the previous request.
- Keep this task focused on the search shell and interaction states unless a provider route already exists. Do not add broad YouTube provider scope, Google account provider permissions, playlist-history access, or fake recommendations here.
- Remove the permanent listen-mode right members sidebar.
- Move current room members into a compact top avatar row above the room title, flowing left to right:
  - show avatar icons only by default;
  - show member display name in a tooltip on hover/focus;
  - preserve host/crown and online indicators where available.
- Move room permission management into a settings-menu `Permissions` action that opens a focused pop-out/window:
  - reuse existing member permission semantics;
  - preserve host authority behavior;
  - do not change SpacetimeDB reducer permission contracts in this UI task.
- Move copy/share/save/leave actions into the settings cog menu:
  - `Copy Room ID`;
  - `Copy Room Link`;
  - `Share Room`;
  - state-aware `Save Room` / `Saved Room`;
  - `Room Settings`;
  - `Permissions`;
  - pink/destructive `Leave Room`.
- Match the reference cog/menu treatment closely:
  - small square glass cog button;
  - compact dark menu;
  - thin dividers;
  - clear icon labels;
  - pink leave action.
- Make listen-room accent controls follow the current music thumbnail palette where available:
  - active Listen underline;
  - Add Media accent/glow;
  - search focus ring;
  - progress/interactive accents where appropriate;
  - reduced-motion and contrast remain respected.

Review checkpoint:

- The listen-room header no longer tries to be a status bar, action bar, mode switch, and member panel at once.
- Room identity, mode navigation, search, and room actions have clear hierarchy.
- Member presence remains visible without consuming a permanent right sidebar.
- Permission controls remain available through the settings menu and continue to respect existing authority behavior.

Safe commit point:

- Listen mode has the approved reference-style header, member presence, settings menu, permissions pop-out, and search shell before lower-page player/discovery polishing continues.

## TASK-002.5G: Listen Player Rail And Discovery Cleanup

Source task: corrective listen-room layout direction from the full reference-player review.

Work:

- Preserve the listen player/media-card concept, but make it read as the actual left music rail rather than a floating card inside a sidebar.
- Increase the left player area slightly:
  - current target was around 320px;
  - desktop target should be roughly 380-420px where viewport width allows;
  - avoid making the player so large that room picks become cramped.
- Keep the left rail as the listen room's current-media anchor:
  - brand/room identity at the top where appropriate;
  - large artwork/video thumbnail;
  - now-playing metadata;
  - source/view/like chips where currently supported;
  - progress;
  - transport controls;
  - volume/fullscreen;
  - Up Next and queue count grounded below the player.
- On tall desktop and vertical-monitor listen layouts, use the below-player space for an intentional `Suggested Next` / `Up Next` area instead of a floating bubble or empty gap.
- Hide the current Future AI DJ section for now:
  - do not show a future-feature block as if it is shipped information;
  - keep real recommendation content in the Room Picks cards;
  - reserve the later Odysseus/session-intelligence concept for TASK-002.10B.
- Remove the `Recently added` section from listen mode:
  - it is no longer part of the desired listen-room flow;
  - discovery should come from Room Picks, search, queue context, and later account/history surfaces.
- Give Room Picks cards more vertical breathing room:
  - add roughly 12-16px of vertical space;
  - keep thumbnails prominent;
  - keep title, channel, duration, and action buttons readable;
  - preserve Play, Add Next, and Add Queue behavior/permission gates.
- Preserve existing playback, queue reducer semantics, Add Media behavior, room sync, provider availability classification, and recommendation honesty.

Review checkpoint:

- The left player rail feels like a permanent music console, not a suggestion card.
- Room Picks feel curated and breathable instead of vertically cramped.
- Tall layouts no longer show accidental dead space below the player.
- The listen room no longer displays filler/future sections that make the product feel unfinished.

Safe commit point:

- Listen mode has the approved left-rail/player and discovery cleanup while preserving existing media playback, queue, and recommendation behavior.

## TASK-002.5H: YouTube Search In Add Media

Source task: Add Media provider-search follow-up from the listen-room search shell direction.

Work:

- Add an in-app YouTube video search flow inside Add Media.
- Keep the room header search as an entry point only: focusing it should open/focus Add Media search rather than running provider search directly in the header.
- Add a server-side `/api/youtube/search` route so the YouTube API key never reaches frontend code.
- Use YouTube Data API search for videos only, then enrich results through video metadata for title, channel, thumbnail, duration, and availability.
- Normalize results into the existing queue/source input shape.
- Preserve pasted YouTube URL, playlist URL, direct media, and HLS behavior exactly.
- Add frontend search behavior with:
  - minimum query length of 3 characters;
  - 600ms debounce;
  - request cancellation for stale queries;
  - short-lived query cache;
  - skeleton loading state;
  - empty, typing, no-results, and error states.
- Reuse existing queue duplicate handling and add-anyway confirmation.
- Keep playlist search, Google account scopes, YouTube user history, provider-account playlists, and broad recommendation changes out of this task.

Review checkpoint:

- Users can search YouTube from Add Media and add a result to the queue without leaving the room.
- Header search does not spend quota directly; it only opens/focuses the Add Media search surface.
- Search requests are debounced, cancellable, cached, and room-rate-limited.
- Existing pasted-link Add Media behavior is unchanged.

Safe commit point:

- Add Media supports server-side YouTube video search without exposing provider keys or expanding account/provider permission scope.

## TASK-002.5I: Performance Quick Wins

Source task: Lighthouse baseline review from June 23, 2026 after incognito runs with a stress-test 250-item room queue.

Work:

- Replace the oversized `public/favicon.svg` with a small optimized Signal Aperture-style favicon asset.
- Preserve the app identity direction without embedding a large PNG/base64 payload in the favicon.
- Lazy-load `hls.js` only when the active playback source is HLS.
- Keep native HLS playback support unchanged for browsers that can play HLS without `hls.js`.
- Keep direct MP4/R2 playback, YouTube playback, room sync, transport controls, fullscreen controls, queue autoplay, and error handling unchanged.
- Do not implement queue virtualization, watch/listen bundle splitting, large-list memoization, image CDN changes, or layout CLS work in this quick-win task.
- Re-run static checks and production build after the quick wins.
- Capture a follow-up Lighthouse baseline later from production/Vercel before judging final scores.

Review checkpoint:

- Every page stops downloading the multi-megabyte favicon.
- Non-HLS room sessions do not fetch the HLS player chunk on initial room load.
- HLS links still load when actually selected.
- The patch is small enough to deploy before the larger queue/bundle performance task.

Safe commit point:

- Shared room and dashboard payloads are reduced by quick, low-risk asset/player-loading fixes without changing product behavior.

## TASK-002.5J: Queue Resilience and Large Queue Performance

Source task: corrective follow-up from the June 24, 2026 queue disappearance bug and 250-item queue performance review.

Performance contract:

- Use the July 13, 2026 production Speed Insights snapshot in `queue-performance-baseline-2026-07-13.md` as the field baseline.
- Primary field target: reduce `/rooms/[roomId]` P75 INP from `336 ms` to `202 ms` or better after at least 50 post-deployment samples.
- Synthetic target: improve the same-device 250-item queue benchmark by at least 40% from the pre-change baseline captured in Batch A.
- Treat YouTube Music mobile as a perceived-responsiveness reference, not a claim of exact product parity: immediate shell, stable placeholders, deferred offscreen work, and responsive scrolling/actions.
- Queue work may improve room hydration and responsiveness, but room artwork/video LCP and root-layout CLS remain separately measurable follow-ups if this task cannot move them without scope expansion.

### Batch A: Benchmark And Derived-State Foundation

Status: implemented locally on July 13, 2026; production/mobile manual QA and commit remain pending.

Implementation:

- Add deterministic queue fixtures for `0`, `1`, `10`, `250`, and stress-test `1000` items without changing production queue authority.
- Add development/test instrumentation for drawer-open-to-committed-row time, mounted row count, metadata request count, peak metadata concurrency, and queue action latency.
- Capture a pre-change 250-item mobile-profile benchmark before optimizing.
- Replace repeated per-row queue scans with memoized queue partitions and one item-id-to-index map per queue update.
- Preserve SpacetimeDB ordering and reducer authority; derived client state remains read-only.

Automated checks:

- Unit tests cover queue partitioning, index lookup, empty/current/upcoming/history boundaries, and stable output ordering.
- Benchmark output records fixture size, device profile, run count, median, and P75 so before/after values are comparable.
- Existing sync, queue reducer, typecheck, lint, and build checks pass.

QA requirements:

- Verify queue add, play-next, remove, reorder, previous/back, and clear behavior with `0`, `1`, `10`, and `250` items.
- Confirm instrumentation is development/test-only and emits no user media details or production console noise.

Safe commit point:

- A repeatable baseline exists and queue-derived state is linear-time without changing visible behavior.

### Batch B: Bounded Metadata Scheduler

Status: implemented and verified on July 13, 2026 through automated checks, a production build, and 332-item local browser resource inspection. Browser resource inventory confirmed request budget, deduplication, progressive loading, and close cancellation; exact simultaneous in-flight timing remains deterministic-test evidence because the browser surface does not expose request timing.

Implementation:

- Resolve metadata for the first 10 upcoming items immediately.
- Prioritize current, next, visible, and overscan rows before background items.
- Limit metadata work to at most 3 concurrent requests.
- Reuse the existing metadata cache and in-flight deduplication; add cancellation and stale-result guards for room changes, queue removal, and drawer closure.
- Remove whole-queue `Promise.all` fanout from remaining-duration calculations and other queue summaries.
- Keep stable loading dimensions for unresolved titles, durations, and thumbnails.

Automated checks:

- Scheduler tests prove first-10 priority, maximum concurrency of 3, deduplication, cancellation, reprioritization, cache reuse, and stale-result rejection.
- A 250-item fixture starts no more than 10 initial metadata requests and never exceeds 3 active requests.
- Provider failures settle into explicit unavailable/error state without retry storms or queue mutation.

QA requirements:

- Network inspection confirms initial request count and concurrency limits.
- Opening, closing, scrolling, and switching rooms does not create duplicate requests or apply metadata from the previous room.

Safe commit point:

- Large queues load useful metadata progressively without whole-queue network pressure.

### Batch C: Closed-Drawer Isolation And Virtualized Rendering

Status: closed-drawer isolation and open-drawer virtualization implemented and verified locally on July 13, 2026; commit, deployment, and post-deployment field measurement are pending.

Implementation:

- Keep only the queue handle and compact preview mounted while the drawer is closed; do not mount full queue rows or row metadata hooks.
- When open, virtualize/window the queue so a 250-item list mounts no more than 30 rows including overscan.
- Preserve stable row dimensions, scroll position, selected/current state, focus behavior, and keyboard access.
- Prefer an existing dependency or a small local strategy only after measuring dynamic-row needs and bundle impact; do not add a virtualization dependency by default.
- Render history/recommendation heavy content only for the active visible tab and reuse cached results after first load.

Automated checks:

- Component tests prove zero full queue rows while closed and at most 30 mounted rows for a 250-item open queue.
- Tests cover scroll-to-current, reorder/removal near viewport boundaries, stable keys, focus retention, and empty/loading/error states.
- Bundle comparison documents any dependency cost.

QA requirements:

- Test desktop and mobile queue opening, fast scrolling, keyboard navigation, focus restoration, and orientation/viewport changes.
- Confirm no overlapping rows, text clipping, scrollbar jumps, or cumulative layout shift from metadata resolution.

Safe commit point:

- Drawer cost scales with the visible viewport rather than total queue length.

### Batch D: Failure Resilience And Event Visibility

Status: released to production on July 13, 2026 in commit `644d668`; Maincloud schema/reducer publication, Vercel deployment, health checks, isolated-room connection QA, transient failure containment, and unavailable YouTube preflight QA passed. A naturally occurring runtime-only removed/private or embed-blocked YouTube event remains pending because known unavailable videos are rejected before playback.

Implementation:

- Preserve the existing rule that generic YouTube provider/player/unknown errors do not auto-skip.
- Auto-skip only confirmed permanent failures such as removed/private or embed-blocked media, with the existing stale-playback guard and skip circuit breaker retained.
- Record compact room-visible events with normalized source/provider id, readable reason, title when available, timestamp, and system/actor source.
- Keep a lightweight room/session known-problem source map and label repeated unavailable items in queue/history surfaces.
- Keep upcoming queue, history, and recommendation source state independent so empty upcoming state does not erase useful history or cached recommendations.

Automated checks:

- Failure-classification tests cover permanent, transient, unknown, stale, repeated, and circuit-breaker cases.
- Event serialization tests prove compact, room-scoped records without private URLs, tokens, or unrelated room data.
- Regression tests prove a sequence of provider errors cannot silently drain a 250-item queue.

QA requirements:

- Test removed/private, embed-blocked, transient network, generic player, stale callback, and repeated known-bad source scenarios.
- Confirm every automatic move is understandable in the room event/history UI and authorized queue controls still behave normally.

Safe commit point:

- Playback failures are bounded, visible, and cannot silently consume the room queue.

### Batch E: Production Performance And Release Gate

Implementation and verification:

- Run focused tests plus `npm run test:sync`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Repeat the Batch A benchmark on the same device profile and require at least 40% improvement in the agreed synthetic queue metric.
- Deploy to production, perform owner/guest room QA, and query Vercel Speed Insights after at least 50 new room INP samples.
- Compare `/rooms/[roomId]` P75 INP, FCP, LCP, CLS, and TTFB against the July 13 baseline; do not claim field success before the sample threshold.
- Record any remaining artwork/video LCP or root-shell CLS work as a separate performance follow-up rather than broadening this task.

Release gates:

- P75 room INP is `202 ms` or better after at least 50 post-deployment samples, or the task is reported as functionally complete but field-performance pending/failed.
- Queue interactions target `100-150 ms` perceived response in controlled mobile QA.
- Overall room CLS does not regress; the broader product target remains `0.1` or lower.
- No queue authorization, ordering, playback sync, uploaded-media access, Media Session, or provider fallback regression is present.
- QA evidence and remaining risks are recorded before commit preparation.

Review checkpoint:

- A bad YouTube embed or provider error cannot silently drain a 250-item queue.
- Auto-skipped items are visible and understandable in room history or event surfaces.
- Large queues stay responsive while still showing useful first-page queue metadata quickly.
- Opening the queue drawer with 250+ items mounts no more than 30 rows including overscan.
- A closed queue drawer mounts zero full queue rows and starts no row-level metadata work.
- Initial metadata work is capped at 10 items and 3 concurrent requests.
- Room Picks and history surfaces remain useful even after the upcoming queue is empty.

Safe commit point:

- Listen/watch rooms can survive YouTube runtime failures and large queues without silent queue loss or heavy initial metadata/render pressure.

## TASK-002.5K: Listen Room TV View Mode

Source task: listen-room TV presentation idea from June 24, 2026, using the neon cinematic reference screen as the target feel.

Work:

- Add a client-only TV view mode for listen rooms.
- Keep TV mode local to the current browser/client:
  - do not change SpacetimeDB room mode;
  - do not affect other members;
  - do not create a durable room setting unless a later task explicitly asks for it.
- Add a TV mode entry point to listen mode controls:
  - desktop/top controls can expose a compact TV icon/button;
  - TV mode should also be reachable from an appropriate player control or settings affordance;
  - preserve normal watch/listen mode switching separately from TV view.
- Build a dedicated TV presentation surface that looks close to the reference:
  - full-viewport cinematic media/background canvas;
  - top-left room pill with room name and listener count;
  - top-right `Exit TV Mode` control with keyboard hint;
  - large current song title and artist/channel;
  - source chip and optional verified/provider indicator where available;
  - wide progress bar;
  - large centered play/pause control with previous/next nearby;
  - secondary shuffle/repeat/autoplay controls;
  - compact volume/fullscreen cluster;
  - compact Up Next card on the right.
- For YouTube sources, use the YouTube iframe API in TV mode with native iframe controls hidden where possible, then render Mistake Watch controls over the player shell.
- Keep fullscreen on the app TV shell wrapper rather than the YouTube iframe so custom controls remain visible above the video.
- Add idle-control behavior:
  - controls stay visible on mouse/keyboard/touch activity;
  - controls can fade down after a short idle period without hiding critical exit access;
  - reduced-motion users get no animated fade or a very subtle opacity change.
- Preserve dynamic thumbnail-driven listen accent styling:
  - progress bar;
  - title eyebrow;
  - play button glow/fill;
  - room pill glow;
  - exit/TV controls;
  - volume slider;
  - Up Next accent.
- Preserve playback behavior:
  - existing YouTube/direct/HLS playback state;
  - queue autoplay;
  - previous/next queue actions;
  - duration and seek behavior;
  - fullscreen behavior;
  - local volume.
- Use TV mode to reveal player/autoplay issues safely:
  - if YouTube controls cannot be fully hidden, keep our overlay dominant and avoid duplicate visual noise where possible;
  - do not create new autoplay fallback semantics inside TV mode.
- Hide management surfaces while in TV mode:
  - Room Picks;
  - Add Media;
  - Search;
  - Queue drawer;
  - Account/settings panels except exit/minimal controls;
  - member permissions/chat surfaces.
- Keep watch room unchanged unless shared player-shell helpers require a small non-visual refactor.

Review checkpoint:

- Listen TV mode feels like a premium full-screen music lounge, close to the provided neon reference.
- Current media is the main character; app controls are readable but secondary.
- YouTube native controls do not visually fight with Mistake Watch controls in normal TV mode usage.
- Exiting TV mode reliably returns to the previous listen-room layout without changing room state.
- TV mode works for YouTube and degrades honestly for direct/HLS sources.
- TV mode does not break normal listen mode, watch mode, queue reducers, Add Media, search, or room sync.

Safe commit point:

- Listen mode has a local TV presentation view that improves passive viewing and provides a cleaner surface for future playback/autoplay QA.

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

## TASK-002.8A: Account Identity and Owner Authority Foundation

Source task: dependency correction for owner-only Stream/R2 media work and future social rooms.

Work:

- Add Supabase Auth with Google OAuth using minimal identity scopes only:
  - `openid`;
  - email;
  - profile.
- Keep Google sign-in framed as identity and persistence only. The UI must explain that no YouTube, Google Drive, playlist, history, contacts, or calendar permissions are requested in this task.
- Store app profile data in public app tables, not directly in Supabase `auth.users`.
- Add a durable profile model:
  - `profiles.id` references `auth.users(id)`;
  - display name;
  - handle or reserved handle field;
  - avatar URL / avatar key / avatar source;
  - role: `owner | member`;
  - account status fields needed by the app;
  - timestamps.
- Add RLS for all public account tables. Public profile fields may be readable according to profile visibility rules, but private account details and email are self-only.
- Add a lightweight guest identity model that preserves the current guest-first flow:
  - guests can create and join rooms;
  - guests can keep local display name/avatar identity;
  - guests can receive room permissions;
  - guests can be temporary room hosts/owners for rooms they create;
  - guests are not forced to sign in.
- Add or adapt durable room membership so a member is associated with exactly one identity path:
  - signed-in `user_id`, or
  - guest `guest_id`, never both for the same membership record.
- Define and implement the guest-to-account migration prompt:
  - ask before attaching the current guest session to the signed-in account;
  - migrate display name/avatar preference where appropriate;
  - connect current room memberships to the account;
  - transfer temporary room ownership to the signed-in account when the guest created the room;
  - allow the user to decline and continue as guest for the current session.
- Add server-side owner authority helpers for later upload/source-ingestion APIs:
  - require signed-in account ownership where owner-only first-party media actions are involved;
  - separate app/media owner authority from current room host authority;
  - do not rely on frontend role flags or user-editable metadata.
- Add a global account/avatar entry point:
  - dashboard top-right;
  - watch Signal HUD / account area without crowding playback;
  - listen room header/control area;
  - compact mobile icon.
- Add the Account Command Panel shell using the existing glass/translucent room overlay language:
  - Overview;
  - Profile;
  - Personalization preview;
  - Rooms preview;
  - Privacy;
  - Account.
- Implement only foundation-level account panel behavior:
  - sign in with Google;
  - sign out;
  - show guest/signed-in/owner state;
  - edit local guest display/avatar where currently supported;
  - show durable profile fields for signed-in users;
  - show clear future placeholders only where they help explain the roadmap.
- Document Google provider token handling and consent boundaries:
  - basic profile scopes first;
  - no YouTube playlist/history scopes in this task;
  - no Google Drive scopes in this task;
  - no offline access unless a later concrete feature requires refresh-token behavior;
  - provider tokens must not be exposed to the browser or stored in public tables.
- Do not implement friends, notifications, listening-history aggregation, achievements, Stream/R2 upload, Google Drive import, YouTube account playlist access, or broad provider recommendations in this foundation task.

Review checkpoint:

- Users can sign in with Google through Supabase Auth.
- The app can distinguish `owner` and `member` roles server-side.
- Stream/R2 owner-only upload and source ingestion have a reliable authorization primitive before TASK-002.8 starts.
- Guest-first rooms still work.
- Guests are not forced to sign in and can still create/join rooms, queue, chat, and receive permissions where room rules allow.
- The account panel makes the guest/signed-in/owner state clear without implying that provider account data has been connected.
- No YouTube, Google Drive, playlist, history, contacts, calendar, or offline-access scopes are requested in the initial login flow.

Safe commit point:

- Mistake Watch has the account and owner-authority foundation needed for owner-only media work without pulling in the full friends/social feature set.

## TASK-002.8: R2 Media Library and Authorized Upload Pipeline

Source task: TASK-001 later R2 direction, updated by the TASK-002.8 preflight decision to ship an R2-first private media library before adding Cloudflare Stream.

Work:

- Use Cloudflare R2 as the primary first-party uploaded-media storage and playback source for this private, small-room phase.
- Defer Cloudflare Stream transcoding/adaptive delivery until actual usage, format diversity, or bandwidth needs justify it.
- Require first-party uploaded video to be browser-playable without server transcoding:
  - preferred: `.mp4` with H.264 video and AAC audio;
  - later supported formats can be added only after playback QA proves browser compatibility;
  - unsupported files should be rejected or marked unusable before they enter the playable library.
- Add Supabase durable metadata tables for `media_assets`, `media_upload_sessions` or `media_ingestion_jobs`, and `media_source_matches`.
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
  - if a ready first-party R2 asset exists, queue the first-party media;
  - if no ready first-party asset exists, queue the normal YouTube embed fallback.
- Add media processing/provider contracts:
  - use server-generated signed R2 upload URLs for user-friendly direct browser upload;
  - store R2 object keys, public playback URLs, MIME type, size, upload status, and owner metadata in Supabase;
  - optionally store poster/thumbnail/waveform artifacts in R2 when those artifacts exist;
  - run source ingestion only for owner-authorized sources and only after explicit approval;
  - update Supabase upload/job status as `pending`, `uploading`, `ready`, or `failed`.
- Add R2 environment and access boundaries:
  - server-only Cloudflare/R2 credentials are never exposed to browser code;
  - signed upload URLs are short-lived and scoped to one generated object key;
  - public playback URLs use the configured R2 custom domain;
  - R2 CORS allows the production app, Vercel alias, and local dev origins for `GET`, `HEAD`, and `PUT`.
- TASK-002.8 preflight results are accepted:
  - bucket `watch2bucket` is reachable through the Cloudflare API;
  - S3-compatible PUT/DELETE works with current credentials;
  - public custom domain `https://r2.mistakestudios.com` can read uploaded objects;
  - CORS preflight succeeds for production, Vercel alias, and local dev origins.
- Defer the following to later tasks unless separately approved:
  - Cloudflare Stream integration;
  - transcoding;
  - adaptive bitrate streaming;
  - automatic thumbnail extraction;
  - resumable multipart upload UI beyond the first signed-upload path;
  - background waveform generation workers.
- Add the movie/direct-media path through owner uploads and authorized direct media URLs, with R2-first playback where possible.
- Do not include hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation.
- Keep YouTube and direct URL playback working.

Implementation shape:

- Supabase schema:
  - `media_assets`: durable owner/media metadata, R2 object key, public URL, title, MIME type, file size, duration when known, status, source type, and timestamps.
  - `media_upload_sessions` or `media_ingestion_jobs`: short-lived upload intent/status records for owner-created uploads.
  - `media_source_matches`: maps YouTube video IDs or normalized source hashes to ready first-party `media_assets`.
  - RLS keeps read access scoped to safe library metadata and write/update/delete access owner-only through server/admin paths.
- Server modules:
  - `lib/media/r2.ts`: validates R2 env, builds object keys, creates signed `PUT` URLs, and resolves public playback URLs.
  - `lib/media/assets.ts`: creates upload sessions, completes media metadata, lists ready library assets, and checks source matches.
  - Owner checks use `requireOwnerAccount()` from TASK-002.8A.
- API routes:
  - `POST /api/media/uploads`: owner-only; validates filename, MIME type, size, and media kind; returns signed upload URL plus generated object key/upload id.
  - `POST /api/media/uploads/:id/complete` or equivalent: owner-only; marks uploaded object ready after metadata confirmation.
  - `GET /api/media/assets`: room/library-safe listing for the Watch Media Hub.
  - Optional source-match endpoint only if playlist/import code needs server-side lookup in this slice.
- Watch Media Hub UI:
  - owner sees drag-and-drop/upload controls and upload progress/status.
  - non-owner sees stored ready media and normal queue actions but no upload controls.
  - stored R2 media cards expose Add to Queue, Play Next, and Play Now where existing room permissions allow.
  - unsupported files show clear rejection/status instead of entering the playable queue.
- Playback contract:
  - ready R2 video queues as first-party direct media with `sourceType`/metadata that existing player code can route to browser-native video playback.
  - existing YouTube/direct media behavior remains unchanged.
  - matched YouTube IDs prefer ready R2 assets; unmatched YouTube remains iframe fallback.

Review checkpoint:

- Existing YouTube and direct URL playback still works.
- Ready first-party R2 assets are preferred automatically when a matched source is already available.
- Only owner-authorized upload/ingestion can create first-party media assets.
- Waveform peaks are consumed when already available, queued for later work, or explicitly marked unsupported for first-party media.
- Access, metadata, source matching, and ingestion boundaries are clear.

Safe commit point:

- Mistake Watch has the foundation for an owner-controlled watch media library with R2-backed upload, storage, metadata, and direct playback.

## TASK-002.8B: Uploaded Library Organization, Posters, and Live Classification

Source task: owner QA follow-up after the first R2 upload path successfully stored playable MP4 media.

Work:

- Add owner-managed uploaded-media organization:
  - folder/collection records for owner-uploaded media;
  - default `Unsorted` behavior for existing assets;
  - owner-only create/move folder actions;
  - optional episode/series sorting metadata for later richer series views.
- Add automatic poster/thumbnail capture for uploaded MP4 assets:
  - browser captures a frame after upload completes;
  - poster image is uploaded to R2 through a signed URL;
  - Supabase stores the thumbnail URL/object key on the media asset;
  - failed poster capture falls back to the existing generated placeholder.
- Split the Watch Media Hub into clearer areas:
  - discovery tab for YouTube/direct/HLS room items such as For you, Recommended, Live, and Room history;
  - uploaded tab for owner-uploaded folders/series and uploaded library cards;
  - increase the watch queue drawer size so queue, discovery, and uploaded media do not compete for space.
- Add live classification for link-based media:
  - HLS streams and live-looking links appear in a `Live` discovery section;
  - live media shows clear live context instead of fixed-duration assumptions where possible;
  - deeper YouTube live-state metadata can be added later through provider metadata hardening.
- Keep CloudConvert/transcoding, automatic MKV conversion, waveform generation, advanced series metadata editors, and user-owned uploaded libraries out of this slice unless separately approved.

Review checkpoint:

- Newly uploaded MP4 assets receive a poster thumbnail when browser capture is permitted.
- Owner can choose or create a folder before upload and move existing uploaded assets into folders.
- Uploaded media has a distinct library view separate from discovery/recommendation rows.
- Live/HLS items are surfaced in a `Live` section without changing queue reducer contracts.
- Non-owner users cannot manage folders or upload/poster metadata, but can still play ready uploaded media where existing room permissions allow.

Safe commit point:

- Uploaded media feels like an organized owner library with thumbnails and folders, while source discovery and live streams remain clearly separated.

## TASK-002.8C: Uploaded Library Management Refinement

Source task: owner QA follow-up after TASK-002.8B made uploaded media visible but still too utility-like for folder-based library management.

Work:

- Make folder creation explicit:
  - owner can create a folder from the uploaded tab through a clear action button;
  - folder creation validates names and shows loading/error state;
  - new folders are immediately added to the folder list and selected.
- Make the uploaded tab folder-first:
  - show folders and quick views before media rows;
  - support `All media`, `Unsorted`, `Live`, and specific folder views;
  - add a `See all media` path so large libraries do not depend on the first folder row.
- Add uploaded-library view controls:
  - grid view for visual browsing;
  - list view for operational management;
  - normalized partial search across title, artist/source label, folder name, duration, and source type;
  - search must be case-insensitive and resilient to spacing/number formatting differences.
- Add persistent folder sorting:
  - folder records store default sort key and direction;
  - supported sort keys are name, recently added, oldest added, shortest duration, and longest duration;
  - the active sort controls both visible ordering and folder-level queue insertion order.
- Replace always-visible per-card folder dropdowns with a settings/actions menu:
  - grid cards show a compact settings button;
  - menu includes Play now, Add next, Add to queue, Move to folder, and visibility;
  - list view shows Play, Next, and Queue as direct buttons, with management actions still under settings.
- Add owner-only uploaded-media visibility management:
  - owner can mark an uploaded asset visible to viewers or hidden from non-owners;
  - non-owner library listing and search exclude hidden uploaded assets;
  - existing assets remain visible by default.
- Add folder-level queue actions:
  - when viewing a folder, owner/user with queue permissions can add the current folder contents to the queue;
  - support Play folder, Add folder next, and Add folder to queue;
  - folder actions use the current persisted folder sort order.
- Keep watch history, resume progress, CloudConvert/transcoding, MKV conversion, advanced episode parsing, bulk delete, and friend-only visibility out of this slice.

Review checkpoint:

- Owner can explicitly create folders and immediately browse/upload into them.
- Uploaded media opens as a small library: folders first, quick views, grid/list, sort, and normalized search.
- Grid cards stay visually clean with actions hidden behind settings; list view exposes direct playback/queue buttons.
- Owner can move assets between existing folders and toggle viewer visibility from the card settings menu.
- Non-owner users do not see owner-hidden uploaded media.
- Folder-level queue actions add/play the folder contents in the active sort order without changing queue reducer contracts.

Safe commit point:

- Uploaded media behaves like a manageable owner library instead of a flat upload utility, while watch-history/resume remains a later architecture task.

## TASK-002.8D: Multipart R2 Uploads And Progress

Source task: owner QA follow-up after large MP4 upload planning for 3-4 GB and larger files.

Work:

- Add a large-file upload path for owner-uploaded browser-playable MP4 media:
  - keep the existing single signed PUT path for smaller uploads;
  - switch to R2 multipart upload for large files;
  - use short-lived server-created part URLs;
  - keep all Cloudflare/R2 credentials server-side.
- Track multipart upload state in Supabase:
  - upload mode;
  - multipart upload id;
  - part size/count;
  - completed part ETags;
  - uploaded bytes;
  - active/completing/aborted status.
- Show one clear upload progress bar for both paths:
  - single PUT progress uses actual XHR upload bytes;
  - multipart progress uses completed and in-flight part bytes;
  - finalization and verification are visible states rather than looking stuck.
- Retry failed part uploads without restarting the whole file.
- Require R2 CORS to expose `ETag` so the browser can complete multipart uploads.
- Abort incomplete multipart sessions when the user or server rejects/cancels the upload path where possible.
- Keep transcoding, MKV conversion, background worker processing, cross-refresh resumable upload recovery, upload history, and non-owner upload libraries out of this slice.

Review checkpoint:

- A 3-4 GB browser-playable MP4 uses multipart upload instead of one long PUT.
- The upload UI shows one easy-to-read progress bar with actual progress for small and large uploads.
- Individual part failures retry without discarding successfully uploaded parts.
- The media asset is only created after R2 accepts the upload and object size verification succeeds.
- Owner-only upload authority remains enforced server-side.

Safe commit point:

- Owner uploads are reliable enough for large MP4 files while preserving the current R2-only, browser-playable media boundary.

## TASK-002.8E: CloudConvert Credit Efficiency Update

Source task: owner cost-control follow-up after CloudConvert processing became the normal upload pipeline.

Work:

- Add a media inspection and processing-strategy step before CloudConvert jobs are created.
- Classify owner uploads as direct-ready, convert, needs-approval, or failed.
- Let confidently browser-safe MP4/H.264/AAC uploads become ready directly from R2 without CloudConvert.
- Continue converting unsupported or uncertain files through CloudConvert when they are small enough.
- Use a browser-playback-safe CloudConvert output profile for converted videos:
  - H.264 MP4 video;
  - AAC stereo audio for predictable headphone, laptop, phone, and browser playback;
  - keep the original uploaded source object in R2 unchanged.
- Require explicit owner approval before likely expensive conversions, including long, large, or unknown-duration large files.
- Store inspection result, processing strategy, estimated credits, and approval state on the media asset.
- Show upload lifecycle and uploaded-card badges for direct, converting, needs approval, and failed states.
- Add owner-only conversion approval from the uploaded library.
- Add CloudConvert efficiency stats to the owner account diagnostics.
- Keep CloudConvert as the processing backend for this task; do not add VPS/worker processing.

Review checkpoint:

- Browser-safe MP4 uploads do not spend CloudConvert credits.
- Expensive conversions are visible and owner-approved before the job starts.
- Existing unsupported-format upload and CloudConvert processing still work.
- Owners can see how many uploads were direct, converted, approval-required, and estimated credits avoided.

Safe commit point:

- Owner media upload processing is cost-aware without replacing the current R2/CloudConvert architecture.

## TASK-002.8F: Multipart Upload Recovery And Cleanup

Source task: owner reliability follow-up after 3-4 GB multipart upload testing.

Work:

- Treat `media_upload_sessions` as the durable source of truth for recoverable multipart uploads.
- Keep failed multipart sessions resumable until their `resumable_until` window expires.
- Add owner-only resumable upload listing in the Watch Media Hub.
- On resume:
  - require the owner to reselect the same local file;
  - validate file name, size, and MIME type when available;
  - reuse already recorded completed part ETags;
  - request signed URLs only for missing parts;
  - continue the same byte-based progress bar from already uploaded bytes.
- On cancel:
  - call the existing R2 multipart abort path;
  - mark the upload session aborted;
  - remove it from the active recovery UI.
- Add an app cleanup endpoint that aborts expired incomplete multipart uploads and marks sessions expired.
- Add a Vercel Cron entry for periodic cleanup while keeping R2 lifecycle cleanup as a backup safety layer.
- Keep CloudConvert, transcoding decisions, media folders, and playback behavior unchanged.

Review checkpoint:

- Refreshing or losing a large upload no longer means starting from zero when completed parts were already recorded.
- Owners can see recoverable uploads, resume with the same file, or cancel and clean up.
- Expired abandoned multipart uploads are explicitly aborted by the app cleanup route.
- Completed uploads still flow into the existing media asset creation and processing decision pipeline.

Safe commit point:

- Large R2 multipart uploads have a practical owner recovery and cleanup path without replacing the direct-to-R2 architecture.

## TASK-002.8H: Multi-File Upload Queue And Batch Processing UX

Source task: owner workflow follow-up after CloudConvert/R2 testing showed that uploading many 20-40 minute episodes one at a time is too manual.

Work:

- Add a client-side upload queue manager for owner-selected batches of video files.
- Support multi-file drag/drop and file picker selection from the Watch Media Hub uploaded-library area.
- Create one queued upload item per file with durable references to the existing upload session and media asset where available:
  - local queue id;
  - file name, size, type, and folder target;
  - upload session id;
  - media asset id after source upload completion;
  - status, progress, error, retry/recoverability metadata.
- Use controlled concurrency instead of starting every file at once:
  - default to one active file upload at a time;
  - keep existing multipart part concurrency inside the active file path;
  - allow future tuning without changing the UI contract.
- Keep the upload queue visible across the full lifecycle:
  - waiting;
  - preparing;
  - uploading to R2;
  - paused/recoverable;
  - source uploaded;
  - inspecting;
  - waiting for owner conversion approval;
  - converting;
  - ready;
  - failed;
  - cancelled.
- Reuse the existing R2 upload, multipart recovery, CloudConvert credit-efficiency, approval, and processing status APIs instead of introducing a new transcoding backend.
- Add batch folder assignment:
  - choose an existing folder once before/while adding a batch;
  - create a folder inline and apply it to the selected batch;
  - allow per-item folder correction after queueing where practical.
- Add upload queue controls:
  - pause/resume all where technically safe;
  - cancel all waiting/active/recoverable uploads;
  - retry failed upload items;
  - clear completed items;
  - per-item cancel/retry/details actions.
- Add batch conversion approval:
  - list files that need CloudConvert approval;
  - show estimated credits and why conversion is needed;
  - allow approve all or approve individually;
  - keep owner-only server authority for approvals.
- Integrate recoverable multipart uploads into the same queue surface:
  - after refresh, show recoverable sessions as queue items;
  - require the owner to reselect the same file;
  - resume missing parts using stored completed ETags.
- Ensure failed conversions can retry from the existing R2 source object without requiring reupload.
- Keep the queue UI concise and operational, not a dashboard:
  - one clear progress bar per item;
  - compact batch summary;
  - obvious active/waiting/needs-approval groups;
  - no nested panels inside panels.
- Do not implement user-owned media libraries for non-owners, background desktop uploaders, service workers, Cloudflare Stream, VPS transcoding, friend sharing, or automatic series metadata scraping in this slice.

Review checkpoint:

- Owners can select 10+ episode files and see each one as a queued upload item.
- The app uploads files sequentially or with controlled concurrency rather than starting every large upload at once.
- Upload progress, processing progress, approval waits, and failures are visible per file.
- Browser refresh does not hide recoverable multipart uploads; owners can reselect files and resume where possible.
- Direct-ready MP4 files still skip CloudConvert.
- Unsupported MKV/HEVC files still use the existing approval/CloudConvert path.
- A failed item does not block the rest of the batch.

Safe commit point:

- Owners can batch-add a season of normal 20-40 minute videos without babysitting single-file uploads, while preserving the existing R2 and CloudConvert architecture.

Corrective incident hardening:

- Prevent repeated upload-completion calls from creating duplicate uploaded-media rows or duplicate CloudConvert jobs for the same R2 source object.
- Make upload completion idempotent:
  - return the existing attached media asset when `media_upload_sessions.media_asset_id` is already set;
  - return and attach an existing asset when the same owner/source object already exists;
  - record a compact processing event when an upload completion is reused instead of creating a new asset.
- Make CloudConvert processing idempotent:
  - do not create another provider job when an asset already has an active queued/processing job;
  - lock the asset before calling CloudConvert so duplicate requests cannot launch multiple paid jobs;
  - clear stale failed job ids only when the owner intentionally retries failed processing.
- Keep upload session state aligned with CloudConvert terminal state:
  - mark the linked upload session `ready` when processing succeeds;
  - mark the linked upload session `failed` when processing fails.
- Add a database uniqueness guard so one owner/source object can only have one media asset.
- Ignore stale CloudConvert webhook updates when the webhook job id does not match the asset's active processing job.

## TASK-002.8I: Signal State Vocabulary And Processing Status UX

Source task: loading/status corrective pass after upload, CloudConvert, metadata, and search states started using generic spinners or fake-looking progress.

Work:

- Add a small shared state vocabulary for user-facing async/status UI:
  - `waiting`;
  - `loading`;
  - `uploading`;
  - `processing`;
  - `queued`;
  - `blocked`;
  - `recoverable`;
  - `failed`;
  - `ready`.
- Add shared primitives that follow the Signal Aperture design language without creating a large framework:
  - `SignalInlineStatus` for short async states;
  - `SignalSkeleton` for layout-preserving placeholders;
  - `SignalProgressBar` only when real measurable progress exists;
  - `SignalStatusChip` for compact state labels.
- Add a resolver layer for upload/media processing display state so raw upload sessions, media assets, R2 upload progress, approval states, and CloudConvert states map into one normalized object:
  - `state`;
  - `label`;
  - `detail`;
  - `tone`;
  - `progressPercent` only when real progress exists;
  - `latestEvent` where available;
  - `primaryAction` and `secondaryAction` labels where available.
- Use the resolver to drive owner media upload, recoverable multipart, approval-required media, failed/retryable media, and CloudConvert queued/processing/exporting states.
- Replace generic spinners in repeated room/search/metadata surfaces with the correct primitive for the state:
  - short inline async work uses `SignalInlineStatus`;
  - card/search placeholders use `SignalSkeleton`;
  - metadata placeholders preserve final chip layout through `MetadataPlaceholderChips`;
  - awaiting-media surfaces use `IdleSignalState` instead of progress-looking animation.
- Keep `RoomTransitionOverlay` as the blocking room/navigation transition overlay only.
- Respect reduced-motion and avoid decorative-only animation.
- Do not add a new design system, new dependency, new upload backend, new CloudConvert behavior, or broader batch upload behavior in this task.

Review checkpoint:

- Users can distinguish waiting, loading, uploading, queued, processing, approval-blocked, recoverable, failed, and ready states without guessing from a spinner.
- R2 upload progress is shown only when byte progress exists.
- CloudConvert states show lifecycle stage and next action without fake percentages.
- Recoverable and failed states expose resume/retry/cancel guidance.
- Search and metadata placeholders preserve layout without noisy spinner rows.

Safe commit point:

- Loading/status UI has a small normalized foundation that can support TASK-002.8H batch uploads without scattering conditionals through the room UI.

## TASK-002.8J: Uploaded Media Access Hardening And Room Playback Sessions

Source task: security review after owner-uploaded R2 media became usable and inspection found private catalogue assets can still leak through `source-matches`, queue/live room `sourceUrl`, and permanent `publicUrl` fields.

Work:

- Apply an immediate leak patch before broader architecture changes:
  - update `/api/media/source-matches` and its media lookup helper so owner-only/private uploaded assets are never returned to unauthorized users;
  - ensure unauthorized responses do not include `publicUrl`, R2 object keys, source object keys, processed object keys, thumbnail object keys, or private uploaded metadata;
  - preserve YouTube fallback behavior when no authorized uploaded match can be returned.
- Add explicit uploaded-media authorization helpers:
  - `canAccessUploadedCatalogue(user)` for browsing/searching/selecting uploaded catalogue media;
  - `canStartUploadedMedia(user, roomId, assetId)` for adding/starting uploaded media in a room;
  - `canWatchRoomMedia(userOrGuest, roomId, roomMediaSessionId)` for participant playback of the active room media session.
- Formalize catalogue allowlisting:
  - Google sign-in proves identity only;
  - app-owned authorization records decide who can browse/select/start uploaded catalogue items;
  - role/status checks must be server-side and auditable;
  - upload remains owner-only unless a later explicit uploader role is approved.
- Introduce a room-scoped uploaded-media playback session abstraction:
  - add `room_media_sessions` or an equivalent durable server-side table/model;
  - store room id, asset id, started-by user/member context, active/expired state, started timestamp, expiry timestamp, and audit timestamps;
  - require the session to be created by `canStartUploadedMedia`;
  - allow current room participants, including guests, to watch only through `canWatchRoomMedia`.
- Stop treating private uploaded media as plain direct URLs:
  - do not pass permanent uploaded-media `publicUrl` values into durable queue state;
  - do not pass permanent uploaded-media `publicUrl` values into SpacetimeDB live room session state;
  - represent uploaded room media with an opaque uploaded-media/session reference where possible;
  - keep normal YouTube, direct URL, and HLS behavior unchanged.
- Add a server playback URL resolver endpoint:
  - validate room membership or valid room guest/session context;
  - validate the room media session is active and belongs to the requested room;
  - validate the backing media asset is ready/startable;
  - generate a temporary R2 playback URL only after access passes;
  - never store generated playback URLs in Supabase queue rows or SpacetimeDB live room state.
- Update uploaded-media player flow:
  - players resolve uploaded playback URLs through the server endpoint;
  - unauthorized, expired, inactive, missing, or unrelated sessions show explicit failure states;
  - refresh behavior for long videos is documented and tested as an MVP tradeoff.
- Add security-focused tests and review gates:
  - guest cannot browse/search/access the uploaded catalogue;
  - signed-in non-whitelisted user cannot browse/search/access the uploaded catalogue;
  - whitelisted Google user can browse/select/start uploaded catalogue media;
  - owner remains the only upload/management authority;
  - guest in the active room can watch an uploaded session started by an authorized user;
  - guest cannot watch inactive, expired, or unrelated room media sessions;
  - source-matches does not leak owner-only uploaded assets or permanent URLs;
  - queue and live room state do not contain permanent private uploaded-media URLs;
  - existing YouTube/direct/HLS queue and playback tests remain green.
- Run production-level verification before commit:
  - unit and route tests for permission helpers and source-match filtering;
  - reducer/live-room tests for uploaded-media references and no permanent URL leakage;
  - Supabase migration/RLS review for new authorization/session tables;
  - `npm run typecheck`;
  - `npm run lint`;
  - relevant media, queue, sync, SpacetimeDB, and identity tests;
  - `npm run build`;
  - manual production-like QA with an owner, a whitelisted non-owner if supported, a signed-in non-whitelisted user, and a guest participant.
- Keep this task security/access-model focused:
  - do not build a new full catalogue UI;
  - do not expose upload in listen mode;
  - do not add friend sharing, public catalogue discovery, DRM/restricted media bypass, scraping, Cloudflare Stream migration, or a new transcoding backend;
  - do not rely on client-side email checks or hidden UI as the security boundary.

Review checkpoint:

- Owner-only/private uploaded assets no longer leak through `source-matches`, queue state, live room state, dashboard state, or player props.
- Catalogue access and room playback access are visibly separate in code, tests, and docs.
- Authorized users can start uploaded media, while guests/non-whitelisted users cannot browse or start it.
- Current room participants can watch an active uploaded-media room session without gaining catalogue access.
- Temporary playback URL generation is server-validated, auditable, and never persisted into live/durable room state.
- Existing YouTube, direct URL, HLS, upload, CloudConvert, queue, and watch/listen playback behavior remain intact.

Safe commit points:

- Commit A: source-match leak patch and permission helper tests.
- Commit B: uploaded catalogue allowlist/authorization records and RLS verification.
- Commit C: room media session model plus create/resolve playback endpoints.
- Commit D: queue/live/player migration away from permanent private uploaded URLs.
- Commit E: final QA, security checklist, docs updates, and commit-prep report.

Safe commit point:

- Mistake Watch has a production-grade uploaded-media access boundary: private catalogue access is whitelisted, room playback is session-scoped, and permanent private R2 URLs are not leaked through app state.

## TASK-002.8G: Live Room Reconnect And Stale Queue Recovery

Source task: long-session QA after TASK-002.5J reduced aggressive queue draining but a room could still look empty or stop accepting controls after several hours until refresh.

Work:

- Add client-side SpacetimeDB reconnect handling for room websocket disconnects, subscription failures, and connection errors.
- Preserve the last known good live snapshot while reconnecting so the current media and queue do not visually disappear during transient live-cache gaps.
- Rejoin the current room member after reconnect and when the participant row becomes stale or idle while the browser is still on the room page.
- Keep heartbeats and durable room activity timers tied to the active connection lifecycle so stale timers do not accumulate.
- Surface reconnecting/disconnected state through the existing `connectionStatus` and `errorMessage` plumbing instead of silently disabling playback controls.
- Do not change SpacetimeDB schema, queue reducer semantics, autoplay rules, or durable Supabase room data in this corrective task.

Review checkpoint:

- A long-lived room can recover from a dropped/stale live connection without a manual browser refresh.

Safe commit point:

- Queue and playback controls resume after live-room reconnect, while the last known room state remains visible during recovery.

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

## TASK-002.10: Account Personalization and First-Party History

Source task: TASK-001 later accounts direction, split after TASK-002.8A to keep social/provider permissions separate from first-party account value.

Work:

- Extend the account/profile foundation created in TASK-002.8A.
- Add durable profile preferences that sync across signed-in sessions while keeping guest preferences local:
  - selected theme preset;
  - accent preference;
  - reduced-motion preference or inherit-system state;
  - glow intensity;
  - blur/transparency comfort;
  - compact mode / density preference;
  - data-saver / lightweight visuals preference.
- Add controlled theme presets only. Do not add arbitrary custom CSS or unrestricted color picking:
  - Obsidian Signal / default;
  - Cardinal Red;
  - Midnight Glass;
  - Soft Studio.
- Add room-mode preference groups in the Account Command Panel:
  - General;
  - Personalization;
  - Rooms;
  - Watch Room;
  - Listen Room;
  - Privacy;
  - Account.
- Watch room preferences should include only settings that improve repeated use:
  - audience/chat overlay default;
  - chat overlay opacity;
  - member color visibility;
  - queue drawer default behavior;
  - ambient glow intensity;
  - auto-hide controls preference where safe;
  - cinematic controls preference.
- Listen room preferences should include only settings that improve repeated use:
  - queue drawer default height/density;
  - visualizer visibility/intensity;
  - dynamic thumbnail color strength;
  - discovery panel density;
  - autoplay preference where room rules allow;
  - AI/session intelligence dock visibility when that feature exists.
- Add saved/recent/owned room account surfaces:
  - saved rooms for signed-in accounts;
  - recent rooms;
  - owned rooms;
  - current guest rooms available for migration;
  - leave room / remove from saved list where appropriate.
- Add first-party Mistake Watch history, without relying on external provider history:
  - queued items by profile;
  - played items by profile where attribution is known;
  - watch/listen participation time;
  - room joins;
  - contributor activity;
  - source/provider metadata already available inside Mistake Watch;
  - last played/listened timestamps;
  - play count and completion count where technically reliable.
- Use first-party account history to power real app-native surfaces:
  - `Most listened`;
  - `Recently played`;
  - account profile preview stats;
  - room-aware recommendation seeds;
  - future recap foundations.
- Add privacy controls for profile and activity visibility:
  - profile visibility;
  - activity visibility;
  - online/active status visibility;
  - room activity visibility;
  - clear local guest session;
  - clear local room history.
- Add lightweight profile preview behavior for clicking avatars:
  - guest preview shows temporary identity and current room role/permissions only;
  - signed-in preview shows public profile fields and public-safe contribution stats only;
  - never show email or private account fields to other users.
- Preserve guest behavior:
  - guests can continue with local-only settings;
  - guests do not get durable cross-device history;
  - guests are not inserted into friend/social graphs.
- Do not request YouTube playlist/history scopes, Google Drive scopes, contacts, or offline access in this task.
- Do not implement friends, friend invites, notifications, provider-account recommendations, Stream/R2 upload, achievements, or AI personalization in this task.

Review checkpoint:

- Signed-in users have durable preferences and profile settings that persist across sessions.
- Guests keep local-only preferences and remain usable without account pressure.
- Account history is based on Mistake Watch first-party events, not external provider history.
- Real `Most listened`, `Recently played`, and room-aware recommendation seeds can use account history without fake data.
- Profile previews expose only public-safe fields.
- No new Google/YouTube data scopes are requested.

Safe commit point:

- Mistake Watch accounts feel useful through personalization, saved rooms, and first-party history without pulling in the social graph or provider-data permissions.

## TASK-002.10C: Social Graph and Incremental Provider Permissions

Source task: follow-up split from the original accounts/friends direction after identity and first-party history are established.

Work:

- Add signed-in-only friend relationships:
  - requester profile;
  - addressee profile;
  - status: pending, accepted, declined, blocked;
  - timestamps;
  - idempotency/duplicate prevention.
- Guests cannot send friend requests, receive friend requests, appear in friend search, or persist as social graph nodes.
- Add friend request and response flows:
  - send request from profile preview or account/social surface;
  - accept/decline/block;
  - cancel outgoing request;
  - show pending inbound/outbound states.
- Add friend room visibility and invite behavior:
  - friends can see rooms according to privacy settings;
  - invite friends to active rooms;
  - invite notifications appear in a notification drawer/bell;
  - room invite links still work for guests and non-friends.
- Add notification infrastructure only for account/social events needed here:
  - friend request;
  - friend accepted;
  - room invite;
  - invite accepted/expired/declined where useful.
- Add privacy and abuse controls:
  - who can send friend requests;
  - who can see online status;
  - who can see joined rooms;
  - block list;
  - rate limits for friend requests and invites;
  - report/remove hooks if needed later.
- Add optional incremental Google/YouTube provider permissions only when a concrete feature requires them:
  - explain the exact feature before requesting access;
  - request the narrowest scope possible;
  - do not request Drive, playlist/history, or offline access in bulk;
  - use incremental consent rather than expanding the initial Google sign-in.
- Provider-connected features may include:
  - importing a user's YouTube playlist when explicitly authorized;
  - showing provider-account playlist context where API support and consent allow;
  - provider-aware recommendation seeds where technically available.
- Keep Mistake Watch first-party history as the primary recommendation source. Do not claim to expose the user's actual YouTube homepage recommendations unless an official API capability supports the exact data.
- Document provider token storage, refresh-token behavior, revocation, and user-facing consent copy before any long-lived provider access is used.
- Do not implement account achievements, recap presentation, AI DJ personalization, or Stream/R2 upload in this task unless separately approved.

Review checkpoint:

- Friend relationships work only between signed-in accounts.
- Guests remain frictionless room participants but do not clog durable social data.
- Friend room visibility and invites respect privacy settings.
- Notification drawer/bell handles social events without covering media controls.
- Any provider permission request is explicit, incremental, narrow, and tied to a visible user action.
- The app still works for users who never grant provider data permissions.

Safe commit point:

- Mistake Watch has a durable account social graph and consent-safe provider-permission layer without forcing Google/YouTube data access into the core room experience.

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
