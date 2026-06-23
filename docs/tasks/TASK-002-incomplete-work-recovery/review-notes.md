# TASK-002 Review Notes

## Current Status

Status: TASK-002.8 R2 Media Library and Authorized Upload Pipeline is implemented through TASK-002.8F Multipart Upload Recovery And Cleanup, with production QA ongoing for large-upload resume and owner media-library UX.

TASK-002.5F Listen Room Header And Presence Refinement and TASK-002.5G Listen Player Rail And Discovery Cleanup were added as a two-part corrective listen-room reference refinement. Both are implemented pending browser visual QA on the live listen room.

TASK-002.5H YouTube Search In Add Media is implemented pending browser QA in watch/listen Add Media surfaces.

TASK-002.1 Listen Mode Quality Pass is complete pending manual visual review in a live room.

TASK-002.2 Room Chat is implemented pending manual two-client browser QA in a live room.

TASK-002.3 Seamless Next Item Loading is implemented pending manual live-room transition QA.

TASK-002.4 YouTube Availability Hardening is complete. The earlier SpacetimeDB CLI blocker was resolved by calling the installed executable directly at `C:\Users\Admin\AppData\Local\SpacetimeDB\spacetime.exe`; build with `--module-path .\spacetime`, generate, local publish, and Maincloud publish all succeeded.

TASK-002.5A Adaptive Listen Card Drift is closed. The autonomous drift experiment was removed after user QA found it annoying; manual carousel arrows and normal horizontal scrolling remain.

TASK-002.5C Live Room Authority Hardening is implemented. User manual QA confirmed it is working well in local live-room testing.

TASK-002.5D Queue Authority And Add Media UX Stabilization is complete. User QA confirmed the queue authority, notifications, auto-preview, playlist filter bar, and autoplay corrective pass are working.

TASK-002.5B Cinematic Watch Room Purpose Pass is complete after user-confirmed watch UI and functionality QA.

TASK-002.5E Vertical Listen AI DJ Placement Shell is complete after vertical, wide desktop, and mobile browser QA.

TASK-002.5F Listen Room Header And Presence Refinement is implemented pending browser visual QA on desktop, vertical-monitor width, and mobile fallback.

TASK-002.5G Listen Player Rail And Discovery Cleanup is implemented pending browser visual QA on desktop, vertical-monitor width, and mobile fallback.

TASK-002.6 Real Audio-Reactive Waveform Architecture is complete after resolver, UI wiring, build, and dev-check verification.

Baseline handoff docs now exist at `docs/HANDOFF.md` and `docs/COMMANDS.md` so future agents can continue from TASK-002 without relying on chat memory.

## Canonical Next Task

Current user-directed corrective listen-room refinement checkpoint: TASK-002.5F and TASK-002.5G are implemented pending visual QA.

Current provider-search checkpoint: TASK-002.5H is implemented pending browser QA.

Normal roadmap checkpoint after the corrective listen-room refinement and TASK-002.8 manual QA: TASK-002.9 Voting and Suggested Next.

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
- TASK-002.6 prepares the waveform resolver and future first-party media peak contract. TASK-002.8A implements account identity and owner authority. TASK-002.8 implements the R2-first media library and authorized upload/ingestion pipeline, with Cloudflare Stream deferred. TASK-002.10 implements account personalization and first-party Mistake Watch history. TASK-002.10C implements signed-in-only friends, invites, social notifications, and incremental Google/YouTube provider permissions.
- Movie/direct-media ingestion means owner uploads or authorized direct media URLs only. Do not add hidden-stream scraping, DRM bypass, ad circumvention, anti-bot circumvention, or piracy-site automation.
- TASK-002.5B is the next watch-room UI/personality slice after TASK-002.5D. It should make watch mode focused, cinematic, synchronized, and media-first before later upload/library features depend on the watch layout.
- R2 is the approved first implementation path for the private watch media library. Cloudflare Stream is deferred until usage, format diversity, bandwidth needs, or transcoding requirements justify it.
- TASK-002.8A was inserted before TASK-002.8 because owner-only Stream/R2 upload and source ingestion require a server-verifiable account/owner role before implementation.
- TASK-002.5D is inserted before TASK-002.5B because local QA found queue permission mismatches, silent duplicate handling, previous/back history gaps, and Add Media stacking problems that should be fixed before the cinematic watch queue/library surfaces are redesigned.
- TASK-002.5E is inserted after TASK-002.5B because the AI DJ vertical placement request is a small listen-layout shell correction, not the later full TASK-002.10B AI/session-intelligence system.
- TASK-002.5F and TASK-002.5G split the approved listen-room reference refinement into two parts:
  - Part 1 handles the header, member presence, settings menu, permissions pop-out, search shell, and dynamic accent direction.
  - Part 2 handles the left player rail, Room Picks card breathing, removal of Recently Added, and hiding Future AI DJ for now.
- The left listen panel should remain the media/player card concept, but visually become the left rail itself rather than a floating card inside another panel.
- The listen-mode right member sidebar should be removed. Member presence belongs in the top avatar row, while detailed permissions belong in a settings-menu pop-out.
- The search bar belongs to the right of the compact `Watch | Listen` icon tabs, with debounced provider behavior and honest provider-error states.
- The current Future AI DJ panel should be hidden until the later TASK-002.10B session-intelligence work can make it useful and truthful.

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
- Guest-first remains a product rule after accounts. Guests can create/join rooms, queue/chat/control where room permissions allow, and preserve temporary display/avatar identity without signing in.
- A signed-in account gives durable identity, preferences, saved rooms, first-party history, and later social/provider features. It is an enhancement layer, not an entry requirement.
- Friending is signed-in-only. Guests must not be inserted into durable friend graphs, friend search, or friend request flows because guest identities are temporary session participants.
- Mistake Watch first-party history is the primary source for account recommendations and stats. Google/YouTube provider scopes are later incremental consent features and must not be presented as access to the user's actual YouTube homepage recommendations unless an official API supports that exact data.
- App/media owner authority, current room host authority, signed-in account membership, and guest session identity are separate concepts and must not be collapsed into one role flag.
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

## TASK-002.6 Implementation Notes

- Added `lib/player/waveform-source.ts`, a pure waveform source resolver for explicit analysis paths: `youtube_embed`, `direct_media`, `hls_media`, future `stream_media`, and future `r2_media`.
- Added the future first-party waveform metadata contract: `waveform_peaks_url`, `waveform_peaks_key`, and `waveform_status` with `missing`, `pending`, `ready`, and `failed` states.
- Locked in the honest YouTube behavior: YouTube iframe playback resolves to fallback/progress visuals because iframe audio cannot be sampled directly. If a future matched first-party Stream/R2 asset is supplied, that first-party source can resolve to precomputed peaks instead.
- Direct and HLS sources now have an explicit `browser_analyser` path when the client has opted into live analysis and CORS/browser support permit it.
- Future R2 assets prefer ready precomputed waveform peaks; R2 may only fall back to live analysis when the client explicitly allows it and mobile constraints do not apply.
- Future Cloudflare Stream assets use ready precomputed peaks when available, otherwise lightweight progress visuals because Stream playback should not imply raw analyzable audio access.
- Added shared client waveform environment detection for reduced-motion and mobile-constrained clients. Live analysis remains opt-in; mobile defaults to precomputed/static/progress visuals instead of heavy runtime analysis.
- Wired listen-mode visualizers and the listen transport waveform to carry resolver-backed `data-waveform-source` and `data-waveform-mode` attributes. Existing visual design remains intact, but source behavior is now inspectable and technically honest.
- Added static/non-animated waveform styling so reduced-motion and precomputed/static plans do not look like live sampled audio.
- Added `tests/player/waveform-source.test.mjs` covering YouTube fallback, matched R2 peaks, Stream fallback, direct/HLS analyzer eligibility, mobile constraints, reduced motion, and metadata readiness.
- Did not implement Cloudflare Stream/R2 upload, Google Drive ingestion, media-library browsing, durable media matching, schema changes, or WebAudio node plumbing. Those remain later TASK-002.8/TASK-002.8A work.

Verification:

- `node --test tests\player\waveform-source.test.mjs` passed.
- `npm run lint` passed.
- `npm run typecheck` passed with `NODE_OPTIONS=--max-old-space-size=4096`.
- `npm run build` passed with `NODE_OPTIONS=--max-old-space-size=8192`.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.

Manual review pending:

- Browser QA should confirm listen-mode YouTube still reads as the same fallback visual experience, without UI text implying real iframe audio analysis.
- Browser QA should confirm reduced-motion clients receive stable/non-animated waveform behavior.
- Future TASK-002.8 QA should verify that ready first-party R2/Stream metadata can feed `waveform_peaks_url` or `waveform_peaks_key` into this resolver before any uploaded-media waveform UI claims real analysis.

## Account Roadmap Split Notes

The account roadmap is intentionally split into three implementation tasks to prevent scope creep and preserve guest-first rooms:

1. TASK-002.8A Account Identity and Owner Authority Foundation:
   - Google OAuth with minimal identity scopes only.
   - Profiles, roles, RLS, server-side owner checks, guest-to-account migration, global account entry, and Account Command Panel shell.
   - No friends, first-party history aggregation, Stream/R2 upload, YouTube/Drive scopes, or provider-account recommendations.

2. TASK-002.10 Account Personalization and First-Party History:
   - Durable preferences, controlled themes, saved/recent/owned rooms, watch/listen settings, profile previews, and first-party Mistake Watch history.
   - Real `Most listened`, `Recently played`, and recommendation seeds should come from Mistake Watch events first.
   - No friend graph and no Google/YouTube data scopes.

3. TASK-002.10C Social Graph and Incremental Provider Permissions:
   - Friend requests, friend room visibility, friend invites, notification drawer, privacy controls, and abuse controls.
   - Friends require signed-in accounts on both sides.
   - Optional Google/YouTube provider scopes are requested only through explicit incremental consent for a concrete feature such as playlist import.

Implementation implication:

- TASK-002.8 can proceed after TASK-002.8A because owner-only Stream/R2 upload only needs server-verifiable owner authority, not the later personalization/history/social layers.
- TASK-002.10 and TASK-002.10C can proceed later without blocking the owner-upload foundation, but TASK-002.10 should precede provider recommendation work so first-party history remains the primary recommendation source.
- A visible room notification system is needed so queue outcomes are not hidden in reducer errors or console-only state. Notifications should cover song added, playlist count added, duplicate detected, duplicate added anyway, permission denied, and preview/provider failure.
- Console observations from local QA should be triaged in this task: React hydration mismatch and modal z-index/layout issues are app cleanup items; YouTube local `postMessage` warnings are non-blocking unless playback fails.

## TASK-002.8A Implementation Notes

- Added Supabase migration `20260612092858_account_identity_owner_authority.sql`.
- Extended `public.profiles` with handle, avatar key/source, Google avatar URL, `role`, and `account_status`.
- Added column-level grants so authenticated users can maintain safe profile fields but cannot client-edit `profiles.role` or `profiles.account_status`.
- Added `private.is_app_owner()` and `private.is_room_owner(room_id)` as server/database owner-authority primitives for TASK-002.8 Stream/R2 upload and source ingestion.
- Added `private.handle_new_auth_user()` and the `on_auth_user_created` trigger so new Supabase Auth users get public app profiles.
- Added `public.account_guest_migrations` plus `room_members.linked_from_guest_identity_id` to record explicit guest-to-account attachment.
- Added server account helpers in `lib/account/server.ts`, including `getAccountSummary()`, `requireOwnerAccount()`, and `migrateCurrentGuestRoomToAccount()`.
- Added OAuth routes:
  - `/auth/sign-in` starts Google OAuth with `openid email profile` only.
  - `/auth/callback` exchanges the auth code for the Supabase session.
  - `/auth/sign-out` clears the Supabase session.
  - `/account/migrate-guest-room` attaches the current guest room session after user confirmation from the Account Command Panel.
- Added the Account Command Panel shell with Overview, Profile, Personalization, Rooms, Privacy, and Account sections.
- Added compact account entry points to the dashboard nav, watch Signal HUD, listen desktop header, and listen mobile room tools.
- Corrective UI pass: removed the dashboard's separate avatar/settings controls so the Account Command Panel is the single account entry point.
- Corrective UI pass: moved browser-local avatar selection into the Account Command Panel Profile tab.
- Corrective UI pass: rendered the Account Command Panel through a `document.body` portal so the account window centers against the viewport instead of inheriting dashboard/sidebar layout offsets.
- Preserved guest-first create/join behavior. Signing in does not silently attach guest rooms, change room creation, or create social graph data.
- Added signed-in room snapshot fallback so migrated account members can reload the room after their guest membership is converted to `user_id`.
- Added `task-002.8a-account-auth-boundaries.md` to document Google consent, provider token boundaries, profile role authority, and guest-to-account migration behavior.
- Updated `implementation-report.html` for TASK-002.8A review.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail after Next.js and SpacetimeDB were running.
- `supabase migration list --local` ran but failed because local Supabase Postgres was not running on `127.0.0.1:54322`.
- Supabase remote migration `20260612132118_account_identity_owner_authority` applied successfully.
- Supabase remote advisor follow-up migration `20260612132354_account_guest_migration_fk_indexes` applied successfully.
- Supabase security advisors pass with no lints after the migrations.
- Supabase performance advisors no longer report unindexed foreign keys for `account_guest_migrations`; remaining performance notices are INFO-level unused-index notices on fresh/low-traffic tables.

Manual review pending:

- Confirm Google provider callback URLs and run live OAuth/account browser QA.
- Configure/confirm Supabase Google provider callback URLs.
- Sign in with Google and confirm the Account Command Panel shows signed-in/member state.
- Promote one test profile to `owner` through server/admin tooling and confirm owner state appears.
- Create a guest room, sign in, attach the current guest room, reload the room, and confirm membership still loads through the signed-in identity.
- Confirm unsigned guests can still create/join rooms and use current queue/chat/permission flows.

Implementation test expectations:

- Add SpacetimeDB authority tests for queue-management permission on move, remove, clear, pin, and play-next.

## TASK-002.8 R2 Preflight Notes

- TASK-002.8 direction changed from Cloudflare Stream-first to R2-first for the private small-room phase.
- Cloudflare Stream is deferred until actual usage, format diversity, bandwidth, adaptive playback, or transcoding needs justify it.
- R2 bucket `watch2bucket` is configured with public base URL `https://r2.mistakestudios.com`.
- Preflight confirmed required Cloudflare/R2 env vars are present locally.
- Preflight confirmed Cloudflare API bucket lookup returns HTTP 200.
- Preflight confirmed S3-compatible temporary PUT returns HTTP 200 and temporary DELETE returns HTTP 204.
- Preflight confirmed a temporary uploaded object is reachable through the R2 custom domain with HTTP 200.
- Preflight confirmed CORS OPTIONS returns HTTP 204 for:
  - `https://watch.mistakestudios.com`
  - `https://mistake-watch.vercel.app`
  - `http://localhost:5371`
  - `http://127.0.0.1:5371`
- Current CORS allows `GET`, `HEAD`, and `PUT` with `content-type`, which is enough for the first signed browser upload path.
- First implementation should constrain uploaded video to browser-playable files, preferably `.mp4` with H.264 video and AAC audio.
- Add reducer denial tests for missing queue-management permission.
- Add playback-history tests for previous/back order.
- Add duplicate policy tests for warn/add-anyway behavior and local duplicate preference.
- Add client/unit tests for Add Media modal state transitions and playlist review controls.
- Run `npm run typecheck`, `npm run lint`, `npm run test:spacetime`, `npm run test:queue`, `npm run test:sync`, `npm run test:youtube`, and `npm run build`.

## TASK-002.8 Implementation Notes

- Added Supabase migrations:
  - `20260613152000_r2_media_library.sql`
  - `20260613154500_r2_media_library_advisor_fixes.sql`
- Added `public.media_assets`, `public.media_upload_sessions`, and `public.media_source_matches` with RLS enabled.
- RLS/read model:
  - ready media assets are readable by `anon` and `authenticated`;
  - authenticated owners can read their own upload/session records;
  - public mutation is not granted; server/admin paths create and update upload/media rows.
- Added advisor follow-up index `media_upload_sessions_media_asset_id_idx` and collapsed duplicate authenticated media-asset SELECT policies.
- Added server-only R2 helpers in `lib/media/r2.ts` for environment validation, browser-playable MP4 validation, object key generation, public URL resolution, signed PUT URL creation, and uploaded-object HEAD verification.
- Added media metadata service helpers in `lib/media/assets.ts` for owner-only upload creation, upload completion, ready asset listing, and source-match lookup.
- Added API routes:
  - `GET /api/media/assets`;
  - `POST /api/media/uploads`;
  - `POST /api/media/uploads/[uploadId]/complete`;
  - `POST /api/media/source-matches`.
- Updated the Watch Media Hub queue sheet:
  - owner accounts can drag/drop or choose MP4 files;
  - upload progress/status is shown inline;
  - ready R2 assets render in the Cloud Storage section;
  - ready assets expose Add to Queue, Play Next, and Play Now through existing room permission gates.
- Updated Add Media and playlist import source matching:
  - YouTube video IDs are checked against ready `media_source_matches`;
  - matched media queues as first-party direct R2 media;
  - unmatched items keep the normal YouTube fallback path.
- Cloudflare Stream, transcoding, adaptive bitrate playback, automatic thumbnail extraction, multipart/resumable upload UX, cleanup jobs, and background waveform generation remain deferred.

Verification:

- Remote Supabase migration `r2_media_library` applied successfully to project `qzmivwhzotuleivzphhm`.
- Remote Supabase migration `r2_media_library_advisor_fixes` applied successfully to project `qzmivwhzotuleivzphhm`.
- Supabase security advisors show only the existing `auth_leaked_password_protection` warning.
- Supabase performance advisors no longer show TASK-002.8 structural warnings. Remaining performance entries are INFO-level unused-index notices on fresh/low-traffic tables.
- SQL sanity check confirmed RLS is enabled on `media_assets`, `media_upload_sessions`, and `media_source_matches`.
- SQL sanity check confirmed the expected media table SELECT policies are present.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` failed because local Next.js and SpacetimeDB were not running. Attempts to launch the standard dev stack from this shell failed with a PowerShell `Start-Process` PATH casing issue and then SpacetimeDB `spawn EPERM` inside a background job. Treat browser/dev-check QA as pending, not failed product behavior.

Manual review pending:

- Owner browser QA: upload a small MP4 through the Watch Media Hub, confirm the object lands in R2, completion creates a ready media asset, and the card appears in Cloud Storage.
- Playback QA: Add to Queue, Play Next, and Play Now on an R2 asset in a live watch room.
- Permission QA: non-owner/guest can see ready library items but cannot upload; queue/play actions still follow room permissions.
- Source-match QA: insert a test `media_source_matches` row for a known YouTube video ID and confirm single-add/playlist import prefers the R2 direct asset.

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

## TASK-002.5B Implementation Notes

- Replaced the old watch-mode dashboard grid with a dedicated cinematic watch layout in `WatchModeLayout`.
- Removed the permanent left navigation column and permanent right sidebar from watch mode. Watch now uses a quiet top Signal Room band, dominant central stage, compact drawer triggers, and a grounded bottom transport.
- Reused the existing `MediaStage`, `YoutubeRoomStage`, `RoomSidebar`, `QueuePanel`, `MembersPanel`, and `RoomChatPanel` so playback, queue authority, permissions, Add Media, and chat behavior remain on the same underlying logic.
- Added drawer-style watch access for Queue, Members, and Chat. The drawer uses the existing sidebar tabs and content, but it is no longer permanently competing with the video.
- Added a compact Up Next panel next to the stage on wide screens. It shows current screening context, the next queued item, queue count, and a direct queue drawer action.
- Added a thumbnail/provider-derived ambient watch backdrop. YouTube ambience uses thumbnail metadata only; it does not sample iframe frames.
- Added a cinematic presentation mode for `TransportControls` so watch mode no longer reserves space for the old right sidebar and the transport reads as a grounded full-width control surface.
- Kept listen mode on its existing `ListenModeLayout`. No AI DJ, media-library upload, Cloudflare Stream/R2, recommendation analytics, or account behavior was implemented in this task.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:sync` passed.
- `npm run test:queue` passed.
- `npm run test:spacetime` passed.
- `npm run test:youtube` passed.
- `npm run build` passed.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.
- In-app browser smoke QA passed for a local watch room at desktop viewport: Signal Room band, watch stage, Up Next panel, queue drawer, Add Media access, and grounded transport rendered without obvious overlap.

Manual review pending:

- Browser QA should still confirm the watch stage with actual YouTube/direct media loaded on desktop, vertical monitor, and mobile widths.
- Browser QA should confirm Queue, Members, and Chat drawers open above the stage and transport without hiding critical controls.
- Browser QA should confirm Add Media remains reachable through the Queue drawer and still uses the completed TASK-002.5D modal behavior.
- Browser QA should confirm YouTube thumbnail ambience is slow/quiet and does not read as live iframe frame sampling.
- Two-client QA should confirm the watch drawer model remains comfortable while another member joins, receives permissions, and uses queue controls.

### TASK-002.5B Corrective Follow-up: Watch Room Layout Refinement

- Simplified the watch Signal HUD so it no longer carries navbar Add Media, separate Members/Chat buttons, played totals, or the previous cramped multi-stat line.
- Removed the permanent wide `Up Next` side panel. Compact next-item context now lives in the grounded cinematic transport bar.
- Replaced watch-mode `RoomTabId` drawer usage with watch-specific `queue` and `audience` surfaces.
- Added a watch queue sheet that opens from the top on desktop and from the bottom on mobile while still rendering the existing `QueuePanel`, preserving Add Media, duplicate detection, playlist review, queue permissions, and queue reducer behavior.
- Added a combined watch Audience panel that renders chat and members together. Desktop uses a right-side audience panel with chat on the left and members/permissions on the right; mobile uses a bottom sheet.
- Added audience presentation hooks to `RoomChatPanel` and `MembersPanel`: chat now supports translucent watch styling and deterministic member accent colors, while members now show a compact member chip rail above the existing full permission controls.
- Relaxed watch-stage internal min-heights in `MediaStage` and watch-mode `YoutubeRoomStage` so the stage can fit inside the available `100dvh` shell between the Signal HUD and transport.
- Follow-up screenshot correction: member chips were removed from the Signal HUD so member presence belongs to the right Audience rail/sidebar, not the navbar.
- Follow-up screenshot correction: the expanded Audience system now overlays the content from the right instead of reserving layout width and shrinking the video.
- Follow-up screenshot correction: the persistent right Audience rail is attached to the right edge and uses the available room height above the transport, similar to the listen-room compact member rail.
- Follow-up screenshot correction: the Audience panel only switches to a right-side two-panel system at large desktop widths; narrower layouts keep a bottom-sheet shape.
- Follow-up screenshot correction: Audience chat rows now use the requested live-chat identity-line format: avatar, member name, `--_>`, and message content with deterministic member accent styling.
- Follow-up screenshot correction: Audience chat now uses a near-transparent glass treatment with slight backdrop blur, faint border, and subtle inner glow so it reads like chat over the stream instead of a solid app panel.
- Follow-up screenshot correction: Audience chat now supports `Ctrl+Enter` to send while preserving normal Enter/newline behavior.
- Follow-up screenshot correction: Audience chat blur was reduced further and the member/permissions column was compacted in audience mode only.
- Follow-up screenshot correction: the cinematic transport no longer uses the earlier centered max-width cap, removes redundant `Now Playing` and `Preparing next` copy, and gives the right-side `Next` context a thumbnail preview.
- Follow-up screenshot correction: the watch queue surface now presents as a translucent `Watch media hub` with left-side media/discovery/storage sections, the existing live queue on the right, and a bottom search/upload/drag strip. Stream/R2 upload behavior remains deferred to TASK-002.8.
- Follow-up screenshot correction: the cinematic bottom transport now has the same compact translucent HUD treatment as the top Signal band, with current media, playback controls, Next preview, sound controls, and progress in a tighter bordered strip.
- Follow-up screenshot correction: the Watch Media Hub top/right queue column was compacted with a hub presentation so Add Media, queue controls, and tabs are easier to use in the overlay.
- Follow-up screenshot correction: Watch Media Hub cards now populate from active queue/history items where available; queued cards can trigger the existing play-now action. Cloud Storage and Shared Media remain explicit `Coming soon` sections.
- Follow-up screenshot correction: Watch Media Hub cards now expose listen-mode-style action controls: add to queue, play next, and play now. Queued cards use existing priority/play-now callbacks; history/recommended cards use existing add/load callbacks when permissions allow.
- Console follow-up: fixed the watch transport hydration mismatch by making the first render deterministic for volume and playback clock; stored volume is now applied after hydration.
- Kept listen mode, SpacetimeDB reducers, Supabase schema, Cloudflare Stream/R2 media-library scope, upload behavior, and chat wire data unchanged.

Verification:

- `npm run typecheck` passed with `NODE_OPTIONS=--max-old-space-size=4096` after the default Windows heap run hit V8 out-of-memory.
- `npm run lint` passed.
- `npm run build` passed with `NODE_OPTIONS=--max-old-space-size=8192` after a smaller heap run hit a Next.js build worker out-of-memory.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.
- Latest corrective pass also passed `npm run lint`, `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=4096`, `npm run build` with `NODE_OPTIONS=--max-old-space-size=8192`, and `npm run dev:check` with 20 pass, 0 warn, 0 fail.
- Latest transport/media-hub refinement passed `npm run lint`, `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=4096`, `npm run build` with `NODE_OPTIONS=--max-old-space-size=8192`, and `npm run dev:check` with 20 pass, 0 warn, 0 fail.
- Latest hub-card action refinement passed `npm run lint`, `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=4096`, `npm run build` with `NODE_OPTIONS=--max-old-space-size=8192`, and `npm run dev:check` with 20 pass, 0 warn, 0 fail.
- Hydration console follow-up passed `npm run lint`, `npm run typecheck` with `NODE_OPTIONS=--max-old-space-size=4096`, `npm run build` with `NODE_OPTIONS=--max-old-space-size=8192`, and `npm run dev:check` with 20 pass, 0 warn, 0 fail.

Manual review pending:

Manual review outcome:

- User confirmed watch-room UI and functionality QA after the cinematic layout, Audience overlay, media hub, transport, chat, and hub-card action refinements.
- Release-gate QA should still include two-client regression coverage for chat messages, member chips, permission controls, and queue controls before a broader release checkpoint.

## TASK-002.5E Implementation Notes

- Added a vertical/tall desktop listen layout breakpoint for the future AI DJ/session-intelligence shell: `900px` to `1180px` wide, at least `760px` tall, fine pointer.
- On that layout, the existing advisory AI DJ card now renders below the left now-playing/player card, using the otherwise empty left-column space.
- On mobile/tablet and wide desktop layouts, the AI DJ card remains in the center discovery flow so the existing single-column and wide-room layouts do not regress.
- Kept the card strictly advisory and local-layout-only. No AI chat, voice generation, speech waveform, account memory, model calls, recommendations mutation, or queue mutation were added.
- Made the rail version more compact with a `Session intelligence dock` title and single-column insight readouts so it fits below the player without crowding transport controls.
- During vertical browser QA, tightened the listen header at 900px to 1199px desktop widths so room actions stack instead of overlapping the room identity/stat line. Wider desktop still uses the two-column header.
- Fixed the tall/vertical center-column stretch where `Room picks` could reserve a large empty area before `Recently added`. `ListenDiscoveryPanel` now uses content-sized grid rows so recommendation sections collapse to actual content height.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.
- In-app browser QA at 1000x1200 confirmed the compact `Session intelligence dock` appears below the player, the center `Session intelligence home` is hidden, and the listen header no longer overlaps.
- In-app browser QA at 1000x1200 confirmed `Room picks` no longer stretches into an empty panel and `Recently added` follows with a normal section gap.
- In-app browser QA at 1440x900 confirmed wide desktop keeps `Session intelligence home` in the center discovery flow.
- In-app browser QA at 390x844 confirmed mobile keeps `Session intelligence home` in the normal single-column flow.

Manual review notes:

- No AI chat, voice, waveform, account memory, model calls, recommendation mutation, or queue mutation were added.
- Future QA with actual loaded media should still confirm the vertical rail remains comfortable below real artwork/video metadata, but the placement shell itself is complete.

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
- Vertical layout refinement logged on 2026-06-11: for tall desktop and vertical-monitor listen layouts, the future AI DJ/session-intelligence card should move into the unused space below the left player card where it can feel like a dedicated DJ console. The player remains the priority; this is a placement/responsive-layout note, not approval for AI chat, voice generation, or waveform speech visualization yet.
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

## TASK-002.8C Implementation Notes

- Added explicit owner folder creation in the Uploaded tab. New folders are created through `/api/media/folders`, added to local state, selected for browsing, and selected as the upload target.
- Added uploaded-library quick views for all media, unsorted, live, and folder cards. The Uploaded tab now has normalized partial search and grid/list view controls.
- Added persistent folder sort metadata on `media_folders` (`default_sort_key`, `default_sort_direction`) and a folder sort update route. Folder-level Play/Add Next/Add Queue actions use the current folder sort order.
- Replaced the always-visible per-card folder dropdown with a compact settings menu. Grid cards keep Play/Add Next/Add Queue/Move/Visibility actions behind the menu, while list rows expose Play/Add Next/Add Queue as direct buttons and keep management actions in the menu.
- Added `media_assets.visibility` with `public` default and `owner_only` support. Server listing and RLS policies now exclude hidden assets from non-owner/public access while preserving owner management.
- Kept watch history/resume, CloudConvert/transcoding, MKV conversion, advanced episode parsing, bulk delete, and friend-only visibility out of this slice.

Verification:

- `npm run typecheck` passed before remote migration application.
- `npm run lint` passed.
- `npm run build` passed.
- Supabase migration `media_library_management_refinement` applied to project `qzmivwhzotuleivzphhm`.
- Supabase security advisor still reports only the existing leaked-password-protection warning.
- Supabase performance advisor reports only INFO-level unused-index notices.

Manual review pending:

- Owner QA should create a folder, upload into it, switch grid/list, search with partial/case-insensitive terms, move media between folders from the settings menu, toggle visibility, and verify folder-level queue actions preserve the selected sort order.
- Non-owner QA should confirm owner-hidden uploaded media does not appear in the Uploaded tab, search, folder cards, or playable library results.

## TASK-002.8D Implementation Notes

- Added Supabase migration `20260614101745_media_multipart_upload_progress.sql`.
- Extended `media_upload_sessions` with multipart upload metadata: `upload_mode`, `multipart_upload_id`, `part_size_bytes`, `part_count`, `completed_parts`, `bytes_uploaded`, and `resumable_until`.
- Kept single PUT upload support for smaller files and added automatic multipart mode for uploads at or above 500 MB.
- Raised the default owner-upload limit to 10 GiB unless `MEDIA_UPLOAD_MAX_BYTES` overrides it.
- Added R2 multipart helpers for create, sign part PUT URLs, complete, and abort while keeping R2 credentials server-only.
- Added `/api/media/uploads/[uploadId]/parts` for part URL creation and completed part progress recording.
- Added `/api/media/uploads/[uploadId]/abort` for aborting active multipart sessions where possible.
- Updated `/api/media/uploads/[uploadId]/complete` so multipart completion requires reported part ETags before the asset row is created.
- Updated the watch media hub upload UI so both single and multipart uploads show one visible byte-based progress bar. Multipart uploads use 64 MB parts, up to 3 concurrent uploads, and retry each failed part up to 3 times.
- Multipart upload sessions stay valid for 24 hours while individual part URLs remain short-lived.
- R2 CORS must expose the `ETag` response header for multipart completion. If it does not, the UI reports a clear ETag/CORS error.
- Cross-refresh upload resume, background cleanup of abandoned multipart uploads, transcoding, and MKV conversion remain future work.

Verification:

- Supabase remote migration applied to project `qzmivwhzotuleivzphhm`.
- Verified the new `media_upload_sessions` columns through `information_schema.columns`.
- Supabase security advisor still reports only the existing leaked-password-protection warning.
- Supabase performance advisor reports INFO-level unused-index notices, including the new fresh multipart index.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` passed with 20 pass, 0 warn, 0 fail.

Manual review pending:

- Owner QA should upload a small MP4 and confirm the single upload progress bar moves with actual progress.
- Owner QA should upload a 3-4 GB browser-playable MP4 and confirm multipart progress advances, finalization completes, and the item appears playable in Uploaded media.
- If multipart upload fails with missing ETag, confirm R2 bucket CORS includes `ExposeHeaders: ["ETag"]` for the production origin.

## TASK-002.8D CloudConvert Processing Refinement Notes

- Added Supabase migration `20260617064533_cloudconvert_processing_pipeline.sql`.
- Added CloudConvert processing metadata to `media_assets`, including source object metadata, processed object metadata, provider status, job id, processing timestamps, and friendly error storage.
- Added `media_processing_events` with owner-only RLS so CloudConvert job/task status can be inspected without exposing processing events publicly.
- Replaced the MP4-only upload assumption with an owner upload flow that accepts normal video files, stores the source in R2, starts a CloudConvert job, and only marks the asset ready after the processed browser-safe MP4 is exported back to R2.
- Added server-only CloudConvert helpers for job creation, diagnostics, webhook signature verification, job sync, event logging, success handling, and failure handling.
- Added `/api/media/assets/[assetId]/processing`, `/api/media/cloudconvert/status`, and `/api/media/cloudconvert/webhook`.
- Updated the watch media hub so upload progress continues from R2 upload into CloudConvert queued/processing/export phases. Processing and failed assets remain visible to owners, while play/queue actions stay disabled until the item is ready.
- Added an owner-only CloudConvert diagnostics section to the Account tab. It shows configured state, masked token status, account/user fields returned by CloudConvert, usage fields when available, webhook state, and recent processing failures.
- Kept CloudConvert token usage server-only. The browser only sees app-owned processing statuses and masked diagnostics.
- Existing local ingest/repair scripts remain useful admin fallbacks; product upload now routes through CloudConvert.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` failed only because local Next.js `127.0.0.1:5371` and SpacetimeDB `127.0.0.1:5372` were not running. Environment checks inside `dev:check` passed.
- Supabase remote migration `cloudconvert_processing_pipeline` applied successfully to project `qzmivwhzotuleivzphhm`.
- SQL verification confirmed the new `media_assets` processing columns and `media_processing_events` table exist.
- Supabase security advisor still reports only the existing leaked-password-protection warning.
- Supabase performance advisor reports INFO-level unused-index notices, including fresh CloudConvert processing indexes.

Manual review pending:

- Add `CLOUDCONVERT_API_TOKEN`, `CLOUDCONVERT_WEBHOOK_SECRET`, and optionally `CLOUDCONVERT_WEBHOOK_URL` to Vercel before deploying this pipeline.
- Owner QA should upload an MKV or H.265 MP4 and confirm it moves through upload, processing, thumbnail creation, and ready playback.
- Owner QA should confirm the Account CloudConvert diagnostics section masks the token and shows graceful errors if CloudConvert is unreachable.

## TASK-002.8E CloudConvert Credit Efficiency Notes

- Added Supabase migration `20260617183000_cloudconvert_credit_efficiency.sql`.
- Added `media_assets.inspection_result`, `processing_strategy`, `estimated_credits`, `owner_approval_required`, and `owner_approved_at`.
- Added a pure media processing decision helper in `lib/media/processing-decision.ts`.
- Owner uploads now run a conservative browser preflight for MP4/M4V files before completion:
  - MP4 files with H.264/AVC and AAC markers become `direct_ready` and skip CloudConvert.
  - Unsupported, uncertain, or non-MP4 files still use CloudConvert when small enough.
  - Long, large, or unknown-duration large files become `needs_approval` before CloudConvert spends credits.
- Removed the upload-start requirement that CloudConvert must be configured. Direct-ready MP4 uploads can complete without provider configuration.
- Added owner approval through `POST /api/media/assets/[assetId]/processing`, reusing the existing CloudConvert processing and polling path.
- Uploaded media cards now distinguish Direct, Converting, and Needs approval states. Approval-required assets show estimated CloudConvert credits and expose an owner-only approval action.
- Account CloudConvert diagnostics now show direct-ready count, converted count, approval-required count, and estimated credits avoided.
- Direct-ready assets remain compatible with the existing best-effort browser poster capture path, so thumbnail generation does not force full conversion.

Verification:

- `node --test tests\media\processing-decision.test.mjs` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `npm run dev:check` reported 14 pass, 2 warn, 4 fail because local Next.js `127.0.0.1:5371` and SpacetimeDB `127.0.0.1:5372` were not running; environment and module parity checks passed.
- Supabase remote migration `cloudconvert_credit_efficiency` applied successfully to project `qzmivwhzotuleivzphhm`.
- Supabase security advisor still reports only the existing leaked-password-protection warning.
- Supabase performance advisor reports INFO-level unused-index notices, including fresh credit-efficiency indexes.

Manual review pending:

- Owner QA should upload a known browser-safe MP4 and confirm no CloudConvert job is created.
- Owner QA should upload a long/large MKV or HEVC file and confirm it waits for approval before processing.
- Owner QA should approve a waiting conversion and confirm it enters normal CloudConvert status polling.
- Owner QA should confirm Account CloudConvert efficiency stats update after direct and approval-required uploads.

## TASK-002.8F Multipart Upload Recovery And Cleanup Notes

- Added owner-only resumable multipart upload listing through `/api/media/uploads/resumable`.
- Added multipart retry support through `/api/media/uploads/[uploadId]/retry`; failed multipart sessions can return to `uploading` while still inside their `resumable_until` window.
- Added `/api/media/uploads/[uploadId]/fail` so browser part-upload failures preserve completed part metadata instead of forcing an abort.
- Updated part URL creation, part progress recording, and multipart completion to allow recoverable failed sessions where appropriate.
- Added `/api/media/uploads/cleanup` for expired multipart cleanup. In production it requires `Authorization: Bearer $CRON_SECRET`; locally it can be called without the secret for development checks.
- Added `vercel.json` with an hourly cron entry for the cleanup route.
- Watch Media Hub now shows recoverable uploads for owners, including filename, bytes uploaded, resumable-until time, error message, Resume, Cancel, and a progress bar.
- Resume asks the owner to reselect the same local file, validates name/size/type, skips completed parts, and uploads only missing parts while keeping one progress bar.
- Cancel reuses the existing abort route so R2 incomplete multipart uploads are explicitly aborted and the session is marked aborted.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `node --test tests\media\*.test.mjs` passed.
- `npm run build` passed and included the new upload recovery routes.
- `npm run dev:check` reported 14 pass, 2 warn, 4 fail because local Next.js `127.0.0.1:5371` and SpacetimeDB `127.0.0.1:5372` were not running. A background startup attempt failed before service launch with a local PowerShell `Start-Process` PATH duplication error.

Manual review pending:

- Start a large multipart upload, interrupt it, refresh, reselect the same file, and confirm it resumes from completed bytes instead of zero.
- Cancel a recoverable upload and confirm it disappears from the Watch Media Hub.
- Confirm `CRON_SECRET` exists in Vercel before relying on production cron cleanup.

## TASK-002.5F Implementation Notes

- Updated the desktop listen shell from three columns to two columns by removing the permanent right members sidebar.
- Moved live member presence into a compact avatar row above the room name. Avatars use the current listen accent and native hover/focus title text for member names.
- Reworked the listen header toward the approved reference:
  - room name is the primary header;
  - room metadata is a quieter single row;
  - Add Media, account, and the settings cog are the only primary right-side actions.
- Replaced the desktop bulky mode switch with left-aligned icon tabs for Watch and Listen. The active tab uses the current thumbnail-driven listen accent.
- Added the listen search shell to the right of the mode tabs. It has empty, typing, debounced searching, skeleton, and honest provider-unavailable states. It does not fake YouTube search results or request new provider scopes.
- Added a compact settings cog menu containing Copy Room ID, Copy Room Link, Share Room, Save/Saved Room, Room Settings, Permissions, and Leave Room.
- Made Save Room state-aware in the cog menu using the existing `setRoomSavedAction`.
- Moved Leave Room out of the left player rail and into the cog menu, using the current listen accent for the destructive action treatment.
- Added a permissions pop-out from the cog menu that reuses the existing `MembersPanel`, preserving permission toggles, control grant/revoke, idle remove, and kick behavior.
- Updated the listen queue drawer desktop bounds so it no longer reserves right-side space for the removed members sidebar.
- Kept mobile listen room tools unchanged for this slice to avoid changing phone/tablet behavior before separate mobile QA.

Verification:

- `npm run typecheck` passed.

Manual review pending:

- Desktop visual QA: confirm the header matches the reference direction, the right sidebar is gone, and member avatars sit above the room name.
- Permissions QA: open cog menu, open Permissions, and verify host permission controls still work.
- Search-shell QA: type fewer than 3 characters, then 3+ characters, and confirm no skeleton appears until after debounce.
- Theme QA: confirm active tabs, search focus, Add Media/header controls, menu glow, and avatar rings follow the current thumbnail accent.
- Mobile QA: confirm the existing mobile room tools still work because they were intentionally preserved in this slice.

## TASK-002.5G Implementation Notes

- Increased the desktop listen rail from the older 320px sidebar target to a responsive `clamp(380px, 24vw, 420px)` music rail.
- Kept the left-side player/media-card concept, but removed the heavy nested card treatment so the player reads as part of the rail itself.
- Enlarged the artwork/player stage modestly and kept current metadata, source chips, progress, transport controls, volume, fullscreen, and autoplay controls in the rail.
- Added an integrated `Suggested Next` rail section showing the next queued item, queue count, and remaining queue duration where available.
- Removed the active listen-room Future AI DJ render path for now. The later Odysseus/session-intelligence concept remains reserved for TASK-002.10B.
- Removed the `Recently added` section from listen mode so the page focuses on Room Picks, search, queue context, and later account/history surfaces.
- Added more vertical breathing room to Room Picks by increasing rail padding, card gap, and card width targets while preserving Play, Add Queue, and Play Next actions.
- Preserved existing playback, queue reducer semantics, Add Media, provider availability, recommendation honesty, room sync, and mobile tools.
- Corrective screenshot QA pass: restored the listen queue to its bottom drawer placement on desktop and offset it by the wider player rail instead of turning it into a right sidebar.
- Corrective screenshot QA pass: moved the listen center waveform to the shell-level background so it spans horizontally behind both the left player rail and main content area.
- Corrective screenshot QA pass: made the player rail header, listen-mode badge, fallback artwork state, progress slider, play button, autoplay toggle, volume slider, queue drawer handle, queue drawer tabs, queue row active states, and queue drawer settings consume the thumbnail-driven `--listen-primary` accent instead of fixed amber/cyan tokens.
- Corrective screenshot QA pass: reduced the left rail's opaque separation so the player header and media controls read as one integrated music console while preserving text readability.
- Corrective screenshot QA pass: removed the redundant left-rail Mistake Watch / Signal Room / Listen Mode header strip and removed the `Now Playing` label so the YouTube player stage and media title no longer visually collide.
- Corrective screenshot QA pass: widened the search result panel to match the search input, brightened the shell-wide waveform, forced the top-right Add Media and account avatar actions onto the thumbnail-driven accent, and anchored the left-rail Up Next area toward the bottom to reduce dead space without clipping vertical screens.
- Corrective screenshot QA pass: slightly increased left-rail spacing between the media stage, metadata, transport controls, volume row, and Up Next section so the player console breathes without changing the approved rail width or vertical-screen behavior.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.

Manual review pending:

- Desktop visual QA: confirm the left rail feels like the permanent music console and not a card inside a card.
- Vertical-monitor QA: confirm the rail stays usable, the Suggested Next area is intentional, and the main Room Picks surface remains readable.
- Room Picks QA: confirm cards have enough vertical breathing room without losing actions or clipping long titles.
- Regression QA: confirm queue actions, play now, add next, add queue, Add Media, and playback controls still work.
- Mobile QA: confirm the preserved mobile listen flow still scrolls naturally and does not inherit desktop rail sizing.

## TASK-002.5H Implementation Notes

- Added `lib/youtube/search.ts` as the server-side YouTube video search provider helper.
- Added `/api/youtube/search`, guarded by room-member request context and rate limiting, so frontend code never receives the YouTube API key.
- YouTube search now uses `search.list` for video IDs and `videos.list` for normalized metadata, duration, thumbnail, and availability.
- Added 10-minute server-side and client-side query caching to reduce quota burn for repeated searches.
- Added `lib/youtube/search-client.ts` with cancellable fetch support for debounced browser search requests.
- Added `YouTubeAddMediaSearch` as the shared Add Media search panel:
  - minimum 3 characters;
  - 600ms debounce;
  - request cancellation for stale queries;
  - skeleton loading rows;
  - empty, typing, no-results, and graceful error states.
- Wired YouTube search into the shared `QueuePanel` Add Media modal used by watch/queue surfaces.
- Wired YouTube search into the listen-specific Add Media modal.
- Changed the listen header search to act only as an entry point/focus trigger for Add Media search. It does not call YouTube directly and does not spend quota from the header.
- Search result add/load actions normalize into the existing queue/source input shape and reuse the existing duplicate warning/add-anyway flow.
- Preserved pasted URL behavior for YouTube video links, YouTube playlists, direct media, and HLS links.
- Did not add playlist search, Google account scopes, YouTube user history, provider-account playlists, or broader recommendation behavior.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.

Manual review pending:

- Browser QA: focus the listen header search and confirm it opens/focuses Add Media search.
- Browser QA: search 2 characters and confirm no provider request/skeleton appears.
- Browser QA: search 3+ characters and confirm skeletons appear only after debounce.
- Browser QA: add a result and confirm queue duplicate handling matches pasted YouTube links.
- Browser QA: confirm pasted URL, playlist URL, direct media, and HLS Add Media paths still work.

## TASK-002.5I Implementation Notes

- Added the quick-win performance task after the incognito Lighthouse baseline identified two low-risk shared payload issues:
  - `public/favicon.svg` was a multi-megabyte embedded SVG payload downloaded by dashboard, watch room, and listen room.
  - `hls.js` was statically imported by the direct media player and appeared as unused room JavaScript when the active source was not HLS.
- Replaced `public/favicon.svg` with a small hand-authored Signal Aperture-style SVG that preserves the dark tile, gold aperture ring, cyan play core, and online dot language without embedding raster data.
- Changed `components/room/direct-media-player.tsx` to type-import `hls.js` and dynamically import the runtime only inside the HLS source path.
- Native HLS support remains preferred: if the browser can play `application/vnd.apple.mpegurl`, the app still assigns the HLS URL directly without loading `hls.js`.
- Non-HLS direct media, R2 MP4, YouTube playback, room sync, fullscreen controls, queue autoplay, and transport behavior were not intentionally changed.
- Larger performance work is intentionally deferred:
  - queue virtualization for 250+ item queues;
  - watch/listen layout bundle splitting;
  - lazy-loading media hub/account/audience panels;
  - thumbnail/metadata request discipline;
  - CLS/layout stability pass.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- `public/favicon.svg` is now 818 bytes instead of the previous multi-megabyte embedded asset.
- `components/room/direct-media-player.tsx` now type-imports `hls.js` and dynamically imports the runtime only in the HLS source path.

Manual review pending:

- Optional production Lighthouse recapture after deploy.
- HLS playback QA with an actual `.m3u8` source.

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
