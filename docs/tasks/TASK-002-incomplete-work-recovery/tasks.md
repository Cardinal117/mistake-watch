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

- Make `For you`, `Recommended`, `Trending`, and `From your playlist` honest data surfaces.
- Use queue and room history as the first recommendation source.
- Add provider-backed YouTube recommendation/search data only where official API behavior supports it.
- Keep provider API keys server-side.
- Add explicit unavailable/provider-limited states.
- Keep `From your playlist` unavailable or room-history based until accounts exist.
- Add recommendation card actions for add to queue, play next, and load now where permissions allow.

Review checkpoint:

- No fake personalized or trending content is shown.
- Recommendation actions respect queue/playback permissions.
- Playback and queue import still work if recommendations fail.

Safe commit point:

- Listen discovery becomes useful and honest without blocking playback.

## TASK-002.6: Real Audio-Reactive Waveform Architecture

Source task: TASK-001 Task 16.D.

Work:

- Implement real audio analysis only for accessible sources.
- Use Web Audio `AnalyserNode` and/or WaveSurfer for direct, HLS, or future R2 audio where technically permitted.
- Keep YouTube and YouTube Music on an honest fallback visualizer because iframe audio cannot be sampled directly.
- Define waveform progress, ambient side waves, reduced-motion behavior, mobile performance limits, and fallback states.
- Avoid browser-heavy decoding for large uploaded media; prepare future precomputed peaks for R2 assets.

Review checkpoint:

- Direct/HLS sources can produce real reactive visuals when CORS and browser support allow it.
- YouTube listen rooms clearly use fallback visuals without implying hidden audio analysis.
- Reduced-motion users get a stable static/progress representation.

Safe commit point:

- Listen mode has a technically honest waveform architecture.

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

## TASK-002.8: Cloudflare R2 Media Upload Pipeline

Source task: TASK-001 later R2 direction.

Work:

- Add owner-uploaded media storage using Cloudflare R2.
- Store media metadata and access records in Supabase.
- Keep large media files out of Supabase Postgres.
- Prepare future waveform peak metadata beside R2 assets.
- Keep YouTube and direct URL playback working.

Review checkpoint:

- Uploaded media can be stored and later played through the existing room flow.
- Access and metadata boundaries are clear.

Safe commit point:

- Mistake Watch has the foundation for personal uploaded media.

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

## TASK-002.10: Accounts, Friends, and Friend Invites

Source task: TASK-001 later accounts/friends direction.

Work:

- Add Supabase auth and profile layer.
- Add friend relationships and friend room visibility.
- Add friend invite popups from rooms.
- Add notification bell/drawer support for room invites.
- Migrate guest avatar/name behavior cleanly into account profiles.
- Keep host crown role-based, not avatar-specific.

Review checkpoint:

- Friends can invite friends to rooms through visible notifications.
- Guest-first behavior still works or has a clear migration path.

Safe commit point:

- Mistake Watch supports account-backed social room discovery and invites.

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
