# Tasks: Mistake Watch

## Workflow Review Rules

- Markdown files in this task packet remain the durable source of truth.
- Use HTML companion artifacts only when they make review, handoff, or QA clearer than Markdown alone.
- Good candidates are `implementation-report.html` after substantial UI or architecture tasks and `qa-report.html` before release readiness or commit preparation.
- Do not create every possible HTML artifact by default.
- After meaningful frontend UI tasks, verify the app visually through the browser at `http://127.0.0.1:5371` when the dev server is available.
- Before Supabase schema, auth, RLS, or storage work, use the Supabase skill/docs, apply schema changes through migrations, and plan advisor checks after changes when project access is available.

## Task 1: Repository and App Scaffold

Suggested files:

- `package.json`
- `app/`
- `components/`
- `lib/`
- `styles/`
- `tailwind.config.*`
- `tsconfig.json`

Work:

- Scaffold the Next.js TypeScript app.
- Add Tailwind CSS, linting, formatting, lucide-react icons, and accessible UI primitives.
- Establish the app route structure for dashboard and room pages.
- Add placeholder mock data modules for dashboard and room UI development.
- Confirm `DESIGN.md` is the canonical visual source of truth.

Review checkpoint:

- Confirm the app boots locally with no product behavior yet.
- Confirm the project structure is ready for dashboard, room, Supabase, and SpacetimeDB live-room work.

Safe commit point:

- App scaffold compiles and renders a minimal shell.

## Task 1.A: Latest-Compatible Scaffold Baseline

Suggested files:

- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `tailwind.config.*`
- `app/globals.css`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Use the latest stable compatible package line for scaffold dependencies while the app is still early.
- Prefer the current Next, React, Tailwind, TypeScript, ESLint, Prettier, and lucide-react versions when they verify cleanly.
- Update Tailwind/PostCSS configuration to match the selected Tailwind major version.
- Re-run typecheck, lint, build, format, and audit after the upgrade.
- Document any dependency advisories that remain and why they are accepted or deferred.

Review checkpoint:

- Confirm the scaffold is on the latest compatible foundation without breaking Task 1 routes.
- Confirm the decision is captured for future implementation tasks.

Safe commit point:

- Latest-compatible scaffold passes verification and has no known high or critical audit findings.

## Task 2: Design Tokens and Base UI Primitives

Suggested files:

- `DESIGN.md`
- `tailwind.config.*`
- `styles/globals.css`
- `components/ui/`
- `components/layout/`

Work:

- Convert the Obsidian Lounge palette, type scale, spacing, radius, borders, and surfaces into implementation tokens.
- Add base button, icon button, input, tab, panel, badge, avatar, slider, and tooltip primitives.
- Add app-wide typography and dark-surface defaults.
- Add reduced-motion handling for glow, pulse, hover, and transition effects.
- Ensure no detached floating bubble control dock pattern is introduced.

Review checkpoint:

- Confirm primitives visually match the design references.
- Confirm tokens are reused instead of one-off color and spacing values.

Safe commit point:

- Base UI primitives and design tokens are ready for feature surfaces.

## Task 3: Dashboard Shell

Suggested files:

- `app/page.tsx`
- `components/dashboard/DashboardShell.tsx`
- `components/dashboard/DashboardNav.tsx`
- `components/dashboard/DashboardHero.tsx`
- `components/dashboard/CurrentRoomChip.tsx`
- `components/dashboard/JoinRoomForm.tsx`

Work:

- Build the dashboard-first home screen using the updated Home Page reference.
- Replace reference branding with Mistake Watch.
- Include top navigation, search, notification/settings placeholders, profile/avatar state, and current-room chip.
- Add primary actions for create room and join by link/code.
- Keep dashboard copy functional and private/friends-oriented, not public marketing.

Review checkpoint:

- Confirm the app opens to a functional dashboard, not a landing page.
- Confirm create/join actions are visually primary and visible without excessive scrolling.

Safe commit point:

- Static dashboard shell matches the intended first-screen direction.

## Task 4: Dashboard Content Sections

Suggested files:

- `components/dashboard/RoomRows.tsx`
- `components/dashboard/RecentRooms.tsx`
- `components/dashboard/FriendRooms.tsx`
- `components/dashboard/SavedRooms.tsx`
- `lib/mock/dashboard.ts`

Work:

- Add dashboard sections for current room, recent rooms, saved rooms, and friends' open rooms.
- Mark friends' open rooms as account/friending-dependent until accounts exist.
- Avoid public "Trending" or global catalog language unless explicitly added later.
- Add empty states for no recent rooms, no active room, and accounts not connected.
- Ensure dashboard cards include host, participants, mode, privacy, now-playing, and join state where relevant.

Review checkpoint:

- Confirm the dashboard communicates personal/friends room activity without implying public discovery.
- Confirm empty states are polished and useful.
- Create or update an implementation report if the dashboard content needs visual review beyond these Markdown notes.

Safe commit point:

- Dashboard content model is visually complete with mock data.

## Task 5: Room Watch Shell

Suggested files:

- `app/rooms/[roomId]/page.tsx`
- `components/room/RoomShell.tsx`
- `components/room/MediaStage.tsx`
- `components/room/RoomStatusHud.tsx`
- `components/room/RoomSidebar.tsx`
- `components/room/QueuePanel.tsx`
- `components/room/ParticipantsPanel.tsx`
- `components/room/PermissionToggles.tsx`
- `components/room/TransportControls.tsx`
- `lib/mock/room.ts`

Work:

- Build the static watch-room shell from the Cinematic Room Page reference.
- Add media stage, top room/status HUD, right sidebar, tabs, queue preview, participants placeholder, and permissions placeholder.
- Add the grounded bottom transport bar pattern.
- Do not add floating bubble controls.
- Add room invite, leave, and support/settings placeholders.

Review checkpoint:

- Confirm the watch room feels grounded, cinematic, and media-first.
- Confirm the bottom transport bar belongs to the viewport and does not obscure core content.
- Browser screenshots should be captured or summarized for desktop and mobile review.

Safe commit point:

- Static watch room shell is responsive and visually aligned with the reference.

## Task 6: Listen Mode Shell

Suggested files:

- `components/room/MusicStage.tsx`
- `components/room/AudioVisualizer.tsx`
- `components/room/ModeSwitcher.tsx`
- `components/room/QueuePanel.tsx`
- `lib/mock/music.ts`

Work:

- Add listen mode as a room mode inside the same room shell.
- Use amber accent tokens for listen mode while preserving the shared layout language.
- Add album art, now-playing metadata, visualizer, queue sidebar state, and grounded transport controls.
- Add placeholders for guest add-to-queue and host queue management actions.
- Respect reduced-motion settings for the visualizer and glow effects.

Review checkpoint:

- Confirm listen mode feels distinct without becoming a separate product.
- Confirm the amber mode does not conflict with errors or destructive actions.

Safe commit point:

- Static listen mode shell is complete with mock data.

## Task 7: Responsive Layout and Interaction Polish

Suggested files:

- `components/dashboard/`
- `components/room/`
- `styles/`
- `tests/visual/` if available

Work:

- Define desktop, tablet, and mobile behavior for dashboard sections, room sidebar, queue tabs, and transport controls.
- Convert room sidebars into drawers or tabs on smaller screens.
- Ensure long URLs, room names, display names, and media titles wrap or truncate correctly.
- Add accessible focus states and keyboard behavior for tabs, buttons, forms, and transport controls.
- Perform visual checks against the design references.

Review checkpoint:

- Confirm no incoherent overlap, horizontal scrolling, or cramped text on common mobile and desktop sizes.
- Create or update a QA report if responsive findings need visual evidence or handoff notes.

Safe commit point:

- Static UI is polished enough to begin data wiring.

## Task 8: Supabase Project Configuration and Schema Plan

Suggested files:

- `supabase/migrations/`
- `docs/data-model.md`
- `lib/supabase/`
- `.env.example`

Work:

- Add Supabase client configuration and environment variable documentation.
- Define migration plan for profiles, guest identities, rooms, room members, room settings, member permissions, queue items, and later friendships.
- Document RLS intent before applying policies.
- Decide what is persistent in Supabase versus ephemeral/live in SpacetimeDB.
- Check current Supabase documentation before finalizing auth, RLS, migrations, or client integration details.

Review checkpoint:

- Confirm schema supports guest-first rooms and later accounts/friending without rewrites.

Safe commit point:

- Supabase schema plan is documented and ready for implementation.

## Task 9: Supabase Schema and Guest Identity

Suggested files:

- `supabase/migrations/`
- `lib/supabase/`
- `lib/identity/`
- `app/rooms/[roomId]/`

Work:

- Implement Supabase tables and RLS policies for the MVP data model.
- Add guest identity creation with display name and room-scoped token handling.
- Add room creation and invite-link metadata.
- Add membership creation and role assignment.
- Add host reclaim strategy for refresh/disconnect cases.
- Run Supabase security and performance advisor checks after migrations when project access is available.

Review checkpoint:

- Confirm guests can join early rooms without creating full accounts.
- Confirm room membership and permissions are enforced server-side.

Safe commit point:

- Persistent guest-first room membership works.

## Task 10: Dashboard and Room Data Wiring

Suggested files:

- `app/page.tsx`
- `app/rooms/[roomId]/page.tsx`
- `components/dashboard/`
- `components/room/`
- `lib/rooms/`

Work:

- Replace mock dashboard and room data with Supabase-backed data where available.
- Add create room flow.
- Add join by link/code flow.
- Add recent/current room behavior.
- Keep friends' open rooms as a gated placeholder until accounts/friending are implemented.

Review checkpoint:

- Confirm dashboard actions lead to real rooms.
- Confirm invite links still support guest display-name join.

Safe commit point:

- Dashboard and static room shell are backed by real room data.

## Task 11: SpacetimeDB Room Engine Skeleton

Suggested files:

- `spacetime/`
- `lib/spacetime/`
- `docs/sync-model.md`
- `.env.example`

Work:

- Create the SpacetimeDB module/client structure for active room sessions.
- Define room tables, reducers, room snapshot shape, presence heartbeat/connection state, and error payloads.
- Add local development wiring for frontend-to-SpacetimeDB connection.
- Add room authority boundaries without playback behavior yet.

Review checkpoint:

- Confirm clients can connect, join/subscribe to a room, receive snapshots, and disconnect cleanly.

Safe commit point:

- SpacetimeDB room engine supports room connection and snapshots.

## Task 12: Presence, Roles, and Permission Authority

Suggested files:

- `spacetime/`
- `lib/spacetime/`
- `components/room/ParticipantsPanel.tsx`
- `components/room/PermissionToggles.tsx`

Work:

- Track connected participants, host, guests, and active controller state.
- Publish presence changes and role changes through SpacetimeDB subscriptions.
- Enforce host-owned permission updates.
- Wire participants and permissions panels to SpacetimeDB live room state.
- Add reconnect behavior that requests a fresh room snapshot.

Review checkpoint:

- Confirm multiple clients see consistent participants, roles, and permissions.

Safe commit point:

- SpacetimeDB presence and permission authority work without media playback.

## Task 13: Playback State Model and Sync Math

Suggested files:

- `docs/sync-model.md`
- `lib/player/sync.ts`
- `lib/player/types.ts`
- `tests/`

Work:

- Define canonical playback state shape and drift thresholds.
- Implement expected-position calculation from server timestamp and playback rate.
- Implement correction strategy for small drift, medium drift, and hard seek.
- Add unit tests for sync math and edge cases.
- Document autoplay and buffering behavior.

Review checkpoint:

- Confirm sync math is deterministic and tested before media wiring.

Safe commit point:

- Playback sync model is implemented and tested in isolation.

## Task 14: Direct Media Player Integration

Suggested files:

- `lib/player/`
- `components/room/MediaStage.tsx`
- `components/room/TransportControls.tsx`
- `components/room/SourceInput.tsx`
- `spacetime/`
- `lib/spacetime/`

Work:

- Add HTML5 video/audio playback adapters.
- Add HLS support with hls.js where the browser needs it.
- Implement host source load, play, pause, and seek events.
- Apply client drift correction to active media elements.
- Add invalid URL, unsupported source, CORS failure, buffering, and autoplay-blocked states.

Review checkpoint:

- Confirm two or more clients remain within the chosen sync threshold during normal playback.

Safe commit point:

- Direct URL video/audio playback is synchronized in a room.

## Task 14.B: YouTube Embed Playback Adapter

Suggested files:

- `lib/player/`
- `components/room/YoutubeMediaPlayer.tsx`
- `components/room/MediaStage.tsx`
- `components/room/SourceInput.tsx`
- `spacetime/`
- `lib/spacetime/`

Work:

- Accept YouTube watch, short, embed, and share URLs in the source input.
- Normalize YouTube URLs to a video id while preserving the original source link.
- Add a YouTube IFrame Player API adapter for watch mode.
- Sync YouTube play, pause, seek, buffering, ended, error, and autoplay-blocked states through the existing SpacetimeDB playback state.
- Keep each viewer's own YouTube browser session responsible for Premium, login, age, region, and embedding eligibility.

Review checkpoint:

- Confirm a host can load an embeddable YouTube video and a joined guest follows play, pause, and seek without relying on direct media URLs.

Safe commit point:

- YouTube video playback works through the room sync model for embeddable videos.

## Task 15: Queue Data Model and UI Behavior

Suggested files:

- `supabase/migrations/`
- `lib/queue/`
- `components/room/QueuePanel.tsx`
- `spacetime/`
- `lib/spacetime/`
- `tests/`

Work:

- Add queue item creation, ordering, removal, clearing, and now-playing state.
- Add room settings for who can add or manage queue items.
- Enforce host-only remove, reorder, and clear.
- Allow guests to add queue items by default.
- Add reducer/unit tests for queue behavior.

Review checkpoint:

- Confirm queue ordering and now-playing state stay consistent across clients.

Safe commit point:

- Queue state works with permissions and SpacetimeDB live updates.

## Task 15.B: Queue Metadata Enrichment

Suggested files:

- `lib/player/source.ts`
- `components/room/QueuePanel.tsx`
- `components/room/RoomSidebar.tsx`
- `spacetime/`
- `lib/spacetime/`
- `tests/`

Work:

- Improve queued YouTube labels so raw video ids are not presented as the main title.
- Show YouTube thumbnails in queue rows by deriving the thumbnail URL from the parsed video id.
- Replace `TBD` duration labels with a clearer pending metadata state.
- When a queue item becomes the active player source and the player reports title/duration metadata, mirror that metadata back to the active live queue item.
- Keep YouTube Data API, oEmbed fetching, R2 media metadata, and uploaded-media thumbnails deferred to later dedicated tasks.

Review checkpoint:

- Confirm queue rows look intentional before full provider metadata exists and active YouTube items update once the player resolves real metadata.

Safe commit point:

- Queue presentation metadata is clearer without adding provider credentials or upload infrastructure.

## Task 15.C: Room Identity and Presence Polish

Suggested files:

- `components/room/RoomShell.tsx`
- `components/room/RoomExperience.tsx`
- `components/room/RoomSidebar.tsx`
- `components/room/ParticipantsPanel.tsx`
- `components/room/InviteActions.tsx`
- `components/ui/Avatar.tsx`
- `lib/rooms/actions.ts`
- `spacetime/`
- `lib/spacetime/`
- `docs/sync-model.md`

Work:

- Make the desktop left room rail consume live room participants so the preview updates with the People tab.
- Add a copy button directly beside the visible room code.
- Let the host rename the room from the room rail, persist the name to Supabase, and mirror it through SpacetimeDB so joined clients update live.
- Show a compact neutral people-count badge on the right sidebar People tab.
- Visually call attention to the People count when a new online participant joins.
- Play a short local join sound when the browser allows audio playback.
- Give every participant a deterministic color and icon so people are easier to distinguish across the room rail and People tab.

Review checkpoint:

- Confirm two joined clients see the same live room name and participant preview after rename/join events.
- Confirm the People tab count updates live and attracts attention without becoming visually noisy.
- Confirm room-code copy is separate from full invite copy.

Safe commit point:

- Room identity and presence feel live and legible without changing playback or queue behavior.

## Task 15.D: Dashboard Presence and Room Lifecycle

Suggested files:

- `lib/rooms/data.ts`
- `lib/rooms/actions.ts`
- `components/room/RoomNavigationPanel.tsx`
- `components/dashboard/RoomRows.tsx`
- `components/dashboard/CurrentRoomSection.tsx`
- `supabase/migrations/`
- `supabase/functions/` or SQL cron/functions
- `docs/data-model.md`
- `docs/sync-model.md`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Stop showing durable room membership count as the dashboard's active people count.
- Add a clear distinction between active online presence, saved/member count, and idle rooms.
- Source dashboard active counts from live room presence where available, or from a short server-side `last_seen_at` freshness threshold until dashboard-to-SpacetimeDB aggregation is available.
- Add room lifecycle state for unsaved temporary rooms versus saved rooms.
- Add durable room fields or settings for saved status, saved owner/guest context, idle deadline, closed timestamp, and close reason.
- Add a host-accessible save/unsave action in the room experience so the host can deliberately keep a room rejoinable.
- Persist the save/unsave decision in Supabase and reflect it in dashboard room cards.
- Treat newly created rooms as temporary/unsaved by default unless the host explicitly saves them.
- Keep saved rooms visible in the dashboard saved quick links and saved-room section even when nobody is online.
- Close or terminate unsaved rooms after one hour of idle time.
- Define inactivity as no fresh live participants and no relevant room activity after the idle threshold; do not rely on durable membership count.
- When closing an unsaved room, mark it closed in Supabase and prevent invite/code joins from re-opening it silently.
- Preserve saved rooms and their persisted queue items so users can rejoin later.
- Add a host/user-controlled saved-room toggle, with guest-first behavior documented until accounts exist.
- Decide and implement the cleanup mechanism using Supabase Cron or an equivalent scheduled server job.
- Ensure closed temporary rooms no longer appear as active/joinable on the dashboard.

Review checkpoint:

- Confirm the dashboard does not imply people are online when no live participants are connected.
- Confirm an unsaved idle room is closed after the idle threshold.
- Confirm a saved room remains rejoinable and keeps its queue.

Safe commit point:

- Dashboard room cards and backend lifecycle state reflect real activity instead of stale membership.

## Task 15.E: Dashboard Structure and First-Run Guidance

Suggested files:

- `app/page.tsx`
- `components/dashboard/DashboardShell.tsx`
- `components/dashboard/DashboardNav.tsx`
- `components/dashboard/DashboardHero.tsx`
- `components/dashboard/DashboardLiveSections.tsx`
- `components/dashboard/CreateRoomForm.tsx`
- `components/dashboard/JoinRoomForm.tsx`
- `components/dashboard/SavedRoomQuickLinks.tsx`
- `components/dashboard/FirstRunGuide.tsx`
- `lib/rooms/data.ts`
- `lib/onboarding/`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Refine the dashboard so create-room and join-room actions feel attached to the product layout rather than floating over the hero.
- Move create/join actions into a grounded right-side panel on desktop, with a clean stacked section on mobile.
- Add a persistent dashboard sidebar or side panel for quick links to saved rooms and frequently rejoined rooms.
- Make saved-room quick links compact, scannable, and useful even when rooms are currently idle.
- Give active rooms a restrained glowing border or light sweep treatment so live rooms are visually set apart from idle or saved-only rooms without making the dashboard noisy.
- Show the current media thumbnail in the dashboard bar/strip that exposes watch/rejoin/invite context when the active source has a thumbnail, such as YouTube queue/media.
- Fall back to the room mode visual treatment when no thumbnail is available, rather than showing a broken or empty image area.
- Add a first-time-only guidance message that briefly explains creating a room, sharing an invite/code, loading media, queueing, and saving rooms.
- Store first-run dismissal locally for guest-first MVP, with a later path to account-backed onboarding preferences.
- Keep the dashboard private/friends-and-family oriented; do not turn it into a marketing landing page.
- Preserve the live dashboard state from Task 15.D so room names, people counts, now-playing labels, and playback states stay current.
- Avoid detached bubble panels; dashboard actions should look docked, grounded, and part of a fixed operational surface.

Review checkpoint:

- Confirm the dashboard clearly answers: create a room, join a room, resume a recent room, open a saved room, and understand first-time flow.
- Confirm the right-side create/join panel and saved-room quick links feel attached and not floaty.
- Confirm active rooms are visually distinguishable at a glance through a tasteful glow/border state.
- Confirm the watch/rejoin/invite dashboard strip shows the currently watched thumbnail when metadata provides one.
- Confirm the first-time message appears only until dismissed and does not block normal dashboard use.

Safe commit point:

- Dashboard structure feels like a usable control center with grounded create/join actions, saved quick links, and first-run guidance.

## Task 16: Music Mode Playback

Suggested files:

- `components/room/MusicStage.tsx`
- `lib/player/`
- `lib/queue/`
- `spacetime/`
- `lib/spacetime/`

Work:

- Wire music mode to the same playback authority and queue model.
- Add audio-first now-playing behavior.
- Advance to the next queue item on end when enabled.
- Keep listen mode visually consistent with the static shell.
- Add empty queue and unable-to-play states.

Review checkpoint:

- Confirm music mode supports host-led listening and queue management.

Safe commit point:

- Music mode is functional with synchronized audio and queue progression.

## Task 16.B: YouTube Listen Mode Playback

Suggested files:

- `lib/player/source.ts`
- `components/room/MusicStage.tsx`
- `components/room/YoutubeMediaPlayer.tsx`
- `components/room/SourceInput.tsx`
- `components/room/QueuePanel.tsx`
- `components/room/TransportControls.tsx`
- `tests/player/source.test.mjs`

Work:

- Allow YouTube links in listen rooms without extracting or separating audio from video.
- Accept `music.youtube.com/watch?v=...` links and normalize them through the same YouTube video-id parser used by watch rooms.
- Keep the official YouTube iframe player visible and usable in listen mode so the app remains aligned with YouTube embedded-player requirements.
- Replace the listen-mode CD placeholder with provider artwork when a YouTube thumbnail is available.
- Add an artwork-first listen layout: large thumbnail/artwork panel with a visible mini YouTube player docked at the lower-right of the artwork area.
- Add a compact toggle that swaps between artwork-first and video-first presentation.
- Keep host-authoritative play, pause, seek, drift correction, queue play-now, and auto-advance behavior on the existing SpacetimeDB room timeline.
- On mobile or narrow layouts, move the visible YouTube player below the artwork when a docked preview would be too small or cramped.
- Update copy and validation so listen rooms describe supported sources as direct audio, HLS audio, YouTube, and YouTube Music links.
- Do not hide, shrink below compliant visible dimensions, cover, or replace YouTube's required player functionality.

Review checkpoint:

- Confirm a YouTube Music URL and a regular YouTube URL can be loaded in a listen room, display artwork, keep a visible embedded player, and remain synced across host and guest clients.
- Confirm the artwork/video toggle is understandable and does not make listen mode feel like a full watch-room video stage by default.
- Confirm non-host users without playback permission are corrected back to the host timeline if they seek or pause locally through the YouTube player.

Safe commit point:

- Listen mode supports YouTube-backed music sessions with a thumbnail-first UI and a visible compliant YouTube player.

## Task 16.C: YouTube Data API Metadata

Suggested files:

- `lib/youtube/`
- `lib/player/source.ts`
- `components/room/TransportControls.tsx`
- `components/room/MusicStage.tsx`
- `components/room/QueuePanel.tsx`
- `components/dashboard/`
- `app/api/`
- `.env.example`
- `tests/player/`

Work:

- Add a server-side YouTube metadata lookup path using `YOUTUBE_API_KEY` or the existing environment key name chosen for production.
- Fetch and normalize public video metadata: title, channel title, thumbnail URLs, duration, published date when useful, view count, and like count when available.
- Treat public dislike counts as unavailable because YouTube's official public Data API does not expose them.
- Cache metadata lookups to avoid quota waste and avoid client-side exposure of the API key.
- Store or mirror enriched metadata into queue/session state only where it improves the active room and dashboard surfaces.
- Show views and likes in the listen-mode now-playing area and the watch-mode transport/details area when metadata is available.
- Show metadata in queue rows and dashboard room cards without blocking playback when the API fails, is quota-limited, or metadata is unavailable.
- Add explicit unavailable states such as `Metadata pending`, `Views unavailable`, or `Likes unavailable` instead of fake counts.
- Keep YouTube player playback independent from Data API metadata success.

Review checkpoint:

- Confirm YouTube-backed queue items and active sessions show real title, thumbnail, channel, duration, views, and likes where available.
- Confirm unavailable or quota-failed metadata does not block queueing, loading, or playback.
- Confirm the YouTube API key is never shipped to client JavaScript.

Safe commit point:

- YouTube metadata enriches watch/listen room surfaces and dashboard cards without making playback depend on provider API availability.

## Task 16.D: Real Audio-Reactive Waveforms

Suggested files:

- `components/room/MusicStage.tsx`
- `components/room/TransportControls.tsx`
- `components/room/AudioVisualizer.tsx`
- `components/room/WaveformProgress.tsx`
- `components/room/MusicReactiveBackdrop.tsx`
- `lib/audio-analysis/`
- `lib/player/`
- `lib/media-storage/`
- `app/globals.css`
- `tests/player/`

Work:

- Replace the current playback-state-reactive waveform styling with a proper audio visualization plan.
- Evaluate and choose the waveform approach before implementation:
  - `wavesurfer.js` for direct audio/HLS or R2-hosted audio waveform rendering and seekable progress.
  - `Peaks.js` if two-level overview/detail waveform navigation becomes important.
  - Web Audio `AnalyserNode` for real-time frequency/time-domain reactive bars, side waves, glow, and background motion when the audio source is accessible.
  - Server/precomputed waveform peaks through `bbc/audiowaveform`, WaveformAPI, or our own R2 processing pipeline when files are large or mobile performance matters.
- Keep YouTube/YouTube Music on a fallback visualizer because iframe audio cannot be sampled directly by the app.
- Design a proper listen-mode UI pass for:
  - waveform transport bar shape and thumb behavior;
  - background left/right waveform density;
  - artwork/player balance;
  - reduced-motion behavior;
  - mobile layout;
  - paused, buffering, loading, and autoplay-blocked states.
- Decide whether direct audio/HLS should use the browser media element as the single playback source or be delegated to a waveform library player.
- If WaveSurfer is used, ensure it stays synchronized with SpacetimeDB without fighting the existing drift-correction logic.
- If precomputed peaks are used, define where peak JSON is stored, how it is linked to queue/media records, and how missing peaks fall back gracefully.
- Avoid fake "audio-reactive" claims for YouTube iframe sources; label those as playback-state-reactive unless a compliant provider-side analysis path exists.

Questions and proposed answers:

- Q: What framework should we use first?
  A: Use `wavesurfer.js` for direct/R2 audio waveform progress because it is purpose-built for interactive waveform playback and has TypeScript support. Keep custom CSS/canvas for the ambient side waves so they fit Mistake Watch's UI instead of inheriting a generic library look.
- Q: What actually reacts to the audio?
  A: Use Web Audio `AnalyserNode` for direct audio/HLS when CORS permits connecting the media element to an audio context. It can provide time-domain waveform data and frequency data. For YouTube iframe audio, use a fallback driven by playback state, beat estimates, or metadata because the iframe audio is not directly available to our app.
- Q: Should we compute waveforms in the browser?
  A: Only for short/direct files. For large uploads or R2 assets, precompute peaks server-side or during upload processing and store peak JSON with the media asset. Browser decoding large files can hurt mobile performance.
- Q: Where do uploaded-file waveforms belong?
  A: In the Cloudflare R2 media pipeline task family: store media in R2, metadata in Supabase, and waveform/peak JSON beside the asset or in a related metadata record.
- Q: Should this replace the current quick visual patch?
  A: Yes, once approved. The current waveform is acceptable as a temporary state-reactive visual, but Task 16.D should replace it with a clearer architecture and UI.

Review checkpoint:

- Confirm the chosen waveform stack and source-specific behavior before implementation.
- Confirm direct audio/HLS can produce real reactive visuals when technically permitted.
- Confirm YouTube-backed listen rooms use a clearly labeled fallback visualizer and do not imply hidden audio analysis.
- Confirm the waveform transport remains seekable, readable, responsive, and accessible.
- Confirm reduced-motion users get a static but still useful waveform/progress state.

Safe commit point:

- Listen mode has a technically honest waveform system: real audio-reactive visuals for accessible audio sources, precomputed peaks where needed, and a polished fallback for YouTube iframe sources.

## Task 16.E: Transport Local Controls and Queue Autoplay Toggle

Suggested files:

- `components/room/TransportControls.tsx`
- `components/room/YoutubeMediaPlayer.tsx`
- `components/room/DirectMediaPlayer.tsx`
- `components/room/MediaStage.tsx`
- `lib/spacetime/`
- `spacetime/`
- `tests/`

Work:

- Add an explicit queue autoplay toggle button beside the volume control area in the grounded transport bar.
- Make queue autoplay room-authoritative so all clients agree whether the next queued item should start automatically when the current item ends.
- Keep the toggle host/controller-gated; guests without playback permission should see the current autoplay state but not change it.
- Default autoplay can remain enabled for the current friends-and-family MVP unless the host disables it.
- When autoplay is disabled and a video/audio item ends, mark the session ended but do not advance into the next queued item automatically.
- Wire the volume control as local-only per viewer. Volume should not sync across the room.
- Wire fullscreen as local-only per viewer using the active player/stage wrapper rather than changing room playback state.
- For YouTube sources, use the YouTube IFrame API for local volume where supported and keep YouTube's native controls available.
- For direct media/HLS sources, control the underlying media element volume locally.
- Preserve the existing synchronized play, pause, seek, drift correction, queue play-now, and metadata behavior.

Review checkpoint:

- Confirm the transport shows volume, fullscreen, and queue autoplay controls in the same right-side control area without crowding the progress bar.
- Confirm disabling autoplay prevents automatic queue advancement for YouTube and direct media in both watch and listen modes.
- Confirm enabling autoplay advances to the next queued item and starts it consistently for all joined clients.
- Confirm volume and fullscreen affect only the local browser and do not change other users' playback state.

Safe commit point:

- Transport controls are no longer placeholders: local fullscreen/volume work, and queue autoplay is an explicit host-controlled room setting.

## Task 16.F: YouTube Playlist Import and Advanced Queue Modes

Suggested files:

- `lib/player/source.ts`
- `lib/youtube/`
- `lib/queue/`
- `components/room/QueuePanel.tsx`
- `components/room/QueueCard.tsx` if split from `QueuePanel`
- `components/room/TransportControls.tsx`
- `lib/spacetime/`
- `spacetime/`
- `app/api/youtube/`
- `tests/player/`
- `tests/queue/`

Work:

- Detect YouTube video URLs, YouTube Music URLs, and YouTube playlist URLs from the existing Queue input.
- Treat URLs containing a `list=` playlist parameter as playlist-capable input, even when the URL also includes a specific video id.
- Do not silently dump playlist contents into the queue. Show a playlist import preview before queue mutation.
- Add a playlist preview state inside the right Queue tab's source/add card:
  - "Playlist detected" status label.
  - Playlist title when available.
  - Video count or loading state.
  - First few preview rows when available, using compact thumbnail/title/channel treatment.
  - Actions for `Add All`, `Shuffle Add`, `Smart Shuffle Add`, `Select Items`, and `Cancel`, with lower-priority actions visually calmer than the primary action.
- Import playlist items through a server-side YouTube Data API path so API keys are not exposed to client JavaScript.
- Page through playlist results using the official YouTube Data API playlist item pagination, respecting provider quota and errors.
- Add all valid imported videos as normal room queue items while preserving their original playlist source metadata.
- Skip unavailable, private, deleted, or unsupported entries when detected, and keep importing the rest of the valid playlist.
- Prevent exact duplicate video ids by default, unless a later host setting explicitly allows duplicates.
- Show an import summary after completion:
  - added count;
  - skipped duplicate count;
  - skipped unavailable count;
  - failed/provider unavailable state when relevant.
- Keep importing non-blocking from the user's perspective: use loading states, disabled duplicate submits, and clear retry/cancel affordances.
- Add a compact Queue Mode control in the Queue panel, near the Up Next area:
  - `Normal`;
  - `Shuffle`;
  - `Smart Shuffle`;
  - `Loop Queue`;
  - `Autoplay Related`.
- Keep the Queue Mode UI compact so the right rail does not become cramped:
  - source/add card first;
  - queue toolbar card second;
  - `Up Next` / `History` segmented tabs third;
  - queue cards below.
- Add queue toolbar controls:
  - mode dropdown;
  - shuffle action;
  - clear action;
  - optional compact settings icon only if needed.
- Keep Clear visually available but less dominant than add/import/play actions.
- Implement normal shuffle for upcoming queue items only.
- Implement Smart Shuffle for upcoming queue items only:
  - keep the currently playing item fixed;
  - never reorder history;
  - avoid changing order while a drag/reorder interaction is active;
  - preserve pinned and `Play Next` items near the top;
  - reduce back-to-back repetition by artist, channel, playlist source, recent history, and near-duplicate titles where metadata exists;
  - fall back gracefully to normal shuffle when metadata is too sparse.
- Add deterministic helper functions around Smart Shuffle so it can be unit tested without React:
  - `smartShuffleQueue`;
  - `scoreSmartShuffleCandidate`;
  - metadata fallback rules for missing artist/channel/source data.
- Add queue item metadata needed by playlist import and advanced modes:
  - `videoId`;
  - `artist`;
  - `channelName`;
  - `thumbnailUrl`;
  - `duration`;
  - `sourceType`;
  - `playlistId`;
  - `playlistTitle`;
  - `addedByUserId`;
  - `addedByName`;
  - `addedAt`;
  - `isPinned`;
  - `isPlayNext`;
  - `isUnavailable`;
  - display badges.
- Add queue mode state:
  - `normal`;
  - `shuffle`;
  - `smartShuffle`;
  - `loop`;
  - `autoplayRelated`.
- Make queue mode room-authoritative through SpacetimeDB so all clients agree on how the queue advances.
- Implement Loop Queue without duplicating queue rows:
  - when the queue reaches the end, cycle back to the first playable queue item;
  - history still records plays normally;
  - looping does not grow the queue.
- Add Autoplay Related as a structured placeholder if real recommendation fetching is not implemented:
  - define `fetchRelatedItems(currentVideoId)`;
  - show clear UI copy that related tracks will be added when the queue ends;
  - do not fake recommendation data;
  - mark future auto-added items with an `AUTO` badge.
- Improve compact queue cards:
  - thumbnail on the left;
  - one- or two-line title;
  - artist/channel and duration below;
  - badges for `NOW`, `NEXT`, `PINNED`, `PLAYLIST`, and future `AUTO`;
  - actions for drag/reorder, play now, play next, remove, and optional pin;
  - actions visible or discoverable without making the card tall.
- Improve the History tab:
  - keep recently played items separate from Up Next;
  - show compact rows;
  - add `Requeue` and `Play Next` actions;
  - ensure shuffle modes never reorder history.
- Respect existing permissions:
  - users with queue permission can add playlist links;
  - host can always manage queue;
  - only host/controller or permitted users can reorder, remove, clear, pin, play next, or change queue mode according to existing permission policy;
  - disabled controls should explain permission limits with tooltip/help text rather than disappearing.
- Preserve existing playback sync:
  - keep current media active while upcoming queue items are imported or reordered;
  - never reorder the currently playing item;
  - do not break direct URL loading;
  - do not break YouTube embed behavior;
  - do not block playback if playlist metadata lookup fails.

UI/UX layout:

- The right Queue tab is the only home for playlist import and advanced queue controls.
- Do not place playlist controls in the left room overview sidebar.
- Do not place playlist controls in the center media/watch/listen stage.
- Queue panel structure:
  - Card 1: `Add media`, with paste URL input, Add/Load behavior, and expandable playlist preview.
  - Card 2: `Queue controls`, with Queue Mode dropdown and compact queue actions.
  - Segmented control: `Up Next` and `History`.
  - Compact queue list.
- The playlist preview should use Mistake Watch's dark technical panel language:
  - cyan for watch/source/import actions;
  - amber only where the current listen mood or warning/status calls for it;
  - 8px to 12px radii;
  - thin borders;
  - compact JetBrains Mono status labels;
  - no floating modal unless playlist selection needs a dedicated overlay for long lists.
- `Select Items` may open an attached drawer/dialog for long playlists, but it should feel like a precise queue tool, not a large marketing modal.
- On mobile, playlist preview and queue mode controls should stack inside the Queue drawer/tab without horizontal scroll.

Review checkpoint:

- Confirm playlist URL detection works for normal YouTube, YouTube Music, playlist URLs, and mixed `watch?v=...&list=...` URLs.
- Confirm playlist import shows preview before mutation and summary after completion.
- Confirm Add All, Shuffle Add, and Smart Shuffle Add behave distinctly.
- Confirm Smart Shuffle only affects upcoming items and keeps current/history stable.
- Confirm Loop Queue cycles through existing queue items without duplicating rows.
- Confirm Autoplay Related exposes honest placeholder behavior without fake recommendations.
- Confirm queue cards remain compact, readable, and usable in the right rail.
- Confirm permissions disable or gate queue actions correctly.
- Confirm existing playback sync, direct media, YouTube watch playback, and listen playback still pass regression checks.

Safe commit point:

- Playlist import and advanced queue modes are available in the Queue tab, tested in isolation and in-room, without disrupting current synchronized playback.

## Task 16.G: Room Loading and Metadata Cache Pass

Suggested files:

- `app/api/youtube/`
- `lib/youtube/`
- `lib/rooms/actions.ts`
- `components/dashboard/`
- `components/room/`
- `next.config.*`
- `vercel.json` if needed
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Add a focused caching plan for room startup, YouTube metadata, playlist previews, dashboard room cards, and static thumbnail/avatar assets.
- Cache YouTube metadata and playlist responses server-side with clear TTLs so repeated queue imports and room reloads do not spend quota or add avoidable latency.
- Add client-side request de-duplication for repeated metadata lookups during the same room session.
- Use Next/Vercel caching only where data can safely be shared across users; keep guest/member permission and live playback state uncached.
- Preload or preconnect only provider assets that materially reduce room load time without making mobile startup heavier.
- Review image and thumbnail loading so current media thumbnails load eagerly where useful and queue/history thumbnails remain lazy.
- Keep SpacetimeDB live state authoritative; never cache playback position, presence, permissions, or queue mutation results in a way that can override live state.
- Add lightweight instrumentation around room create/join/load steps so slow paths can be measured before broader optimization.

Review checkpoint:

- Confirm room create, join, and first media load feel faster or at least expose measured slow steps.
- Confirm repeated YouTube playlist/metadata requests are cached or de-duped without stale queue state.
- Confirm dashboard room cards and room screens do not cache live participant counts, playback position, or permissions incorrectly.
- Confirm mobile load remains stable and does not fetch unnecessary heavy assets before interaction.

Safe commit point:

- Room loading is measurably cleaner, YouTube metadata requests are less repetitive, and live room correctness remains unchanged.

## Task 17: Avatar Identity and Profile Picker

Suggested files:

- `public/avatars/`
- `Avatars/`
- `components/ui/Avatar.tsx`
- `components/account/AvatarPicker.tsx`
- `components/dashboard/DashboardNav.tsx`
- `components/room/ParticipantsPanel.tsx`
- `components/room/RoomNavigationPanel.tsx`
- `lib/identity/`
- `lib/rooms/actions.ts`
- `supabase/migrations/`

Work:

- Promote the supplied avatar image set from `Avatars/` into the app asset pipeline without losing the source originals.
- Add a fixed selectable avatar catalog using processor, memory, audio, network, storage, controller, cooling, and power avatars.
- Persist each guest or signed-in user's selected avatar key in the appropriate identity/profile record.
- Assign every user a visible avatar by default, even before account login exists.
- Show the host crown overlay on host avatars wherever host identity appears, including the room rail, People tab, dashboard current-user state, and future invite notifications.
- Add an avatar picker reachable from the user avatar and from Settings > Account Avatar.
- Keep deterministic fallback color/icon behavior only as a fallback when no image avatar is available.
- Ensure avatar images are optimized for small UI surfaces and do not bloat the dashboard or room render path.

Review checkpoint:

- Confirm all room participants display an avatar image, the host crown is visually clear, and users can change their avatar selection without creating an account.
- Confirm selected avatars persist across refresh for guest-first identities and can later migrate to account profiles.

Safe commit point:

- Guest-first users have selectable persistent avatars and host identity is visibly crowned across the app.

## Task 17.A: Avatar Motion and Host Overlay Polish

Suggested files:

- `Avatars/`
- `public/avatars/`
- `components/ui/Avatar.tsx`
- `components/account/AvatarPicker.tsx`
- `components/dashboard/DashboardNav.tsx`
- `components/room/ParticipantsPanel.tsx`
- `components/room/RoomNavigationPanel.tsx`
- `components/room/ChatPanel.tsx` if Task 18 is active
- `app/globals.css` or an avatar-specific CSS module
- `lib/identity/`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Extend the hardware-themed avatar system with restrained, reusable motion treatments that fit the Obsidian Lounge design system without distracting from watch/listen sessions.
- Keep the static hardware avatar set as the primary avatar identity system.
- Keep the crown overlay separate from the base avatar identity so host status can be applied to any avatar.
- Add subtle optional motion states for avatars using code-native CSS/SVG animation first, not heavy animated image files by default.
- Animate only small internal details:
  - processor: cyan core pulse or trace flicker;
  - memory: contact lights sequence;
  - audio: waveform pulse;
  - network: signal ping;
  - storage: small data sweep;
  - controller: control-node blink;
  - cooling: slow fan rotation;
  - power: charge/pulse glow.
- Add a reusable host crown overlay treatment that can sit on any avatar without obscuring the base icon.
- Give the crown a very small optional glint or pulse animation when appropriate.
- Respect reduced-motion preferences by disabling avatar loops and showing static avatars/crowns.
- Ensure animations remain subtle in dense surfaces such as the room rail, People/Members tab, dashboard nav, chat messages, and future invite notifications.
- Avoid sprite sheets unless a specific avatar cannot be expressed cleanly with CSS/SVG motion.
- If sprite sheets are used, keep them small, optimized, source-controlled with clear naming, and scoped to the specific avatar that needs frame-by-frame motion.
- Do not introduce new colors outside `DESIGN.md` tokens. Use the existing deep charcoal, amber, cyan, and soft light palette.
- Do not make avatars the only indicator of role; host role text/icon labels must remain available for accessibility.

Review checkpoint:

- Confirm static avatars remain legible at small UI sizes before enabling animation.
- Confirm the host crown overlay is visible but does not cover important avatar detail.
- Confirm avatar motion feels alive but does not distract from media playback.
- Confirm reduced-motion users receive static avatars and no looping visual effects.
- Confirm dashboard, room rail, People/Members tab, chat, invite, and avatar picker surfaces remain stable with no layout shift.

Safe commit point:

- Avatar animation is optional, restrained, reduced-motion aware, and layered on top of the static selectable avatar system without changing identity persistence behavior.

## Task 17.B: Signal Aperture Brand and Website Theme Alignment

Suggested files:

- `DESIGN.md`
- `app/layout.tsx`
- `app/globals.css`
- `app/page.tsx`
- `components/layout/`
- `components/dashboard/`
- `components/room/`
- `components/ui/Avatar.tsx`
- `public/brand/`
- `public/favicon.ico` or generated favicon/app icon assets
- `Logo Concepts/`
- `docs/tasks/TASK-001-watch-together-platform/implementation-report.html`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`

Work:

- Promote the new Signal Aperture logo direction into a formal brand system for the app without losing the existing logo concept sources.
- Use the transparent navbar lockup as the lead brand direction: amber cinematic aperture/chip blades, cyan play/sync core, dark glass tile, and stylized `Mistake Watch` text.
- Add production-ready brand assets to the app asset pipeline, including navbar logo, icon-only mark, favicon, and any required app icons.
- Update `DESIGN.md` with a brand subsection for the Signal Aperture direction so future UI work has clear rules for logo use, favicon use, glow intensity, icon lockups, loading animation concepts, and places where the logo should not be overused.
- Align the website chrome to the logo direction:
  - navbar branding should use the transparent horizontal lockup or an optimized code-native equivalent;
  - favicon/app icon should use the icon-only aperture/play-core mark;
  - dashboard and room chrome should echo the aperture/chip language through restrained amber edges, cyan active cores, and precise circuit-like detail;
  - loading, connecting, joining, and room-sync states may use aperture rotation, cyan core pulse, or trace-sweep motion derived from the logo.
- Keep the Obsidian Lounge foundation intact. This is a brand/theme alignment pass, not a full product redesign.
- Preserve the media-first room experience. Do not make logo decoration compete with active video, artwork, queue, transport controls, or member management.
- Keep the host crown as a role overlay only. Do not use crown shapes in the product logo or favicon.
- Keep hardware-themed avatars visually related to the brand, but do not make avatars and logo identical.
- Use existing palette tokens: deep charcoal, amber gold, cyan, and soft light. Do not introduce unrelated accent colors.
- Replace any remaining generic placeholder branding, favicon, or nav identity with the Signal Aperture brand assets.
- Ensure logo assets are legible at real navbar height, small mobile header sizes, browser favicon sizes, and PWA/app icon sizes.
- Add reduced-motion fallbacks for any logo-derived loading animations.
- Avoid heavy animated raster assets for normal navigation. Prefer CSS/SVG/code-native motion where possible and reserve image sequences for deliberate loading experiences only.
- Keep file sizes reasonable and avoid shipping large concept PNGs directly when smaller optimized assets or vector/code-native equivalents are sufficient.

Review checkpoint:

- Confirm the navbar logo reads clearly on desktop and mobile without crowding navigation controls.
- Confirm favicon/app icon remains recognizable at 16px, 32px, and larger app-icon sizes.
- Confirm the dashboard and room surfaces feel more aligned with the Signal Aperture brand without losing usability or media focus.
- Confirm loading and sync animations feel like restrained brand motion, not decorative noise.
- Confirm reduced-motion users get static logo/loading states.
- Confirm avatar, crown, logo, and loading treatments have distinct roles: product identity, user identity, host role, and system activity.

Safe commit point:

- Mistake Watch has a coherent Signal Aperture brand system applied to logo, favicon, navbar, and key UI theme moments without changing core room behavior.

## Task 18: Room Chat

Suggested files:

- `components/room/ChatPanel.tsx`
- `components/room/RoomSidebar.tsx`
- `lib/chat/`
- `spacetime/`
- `lib/spacetime/`
- `supabase/migrations/`

Work:

- Replace the static chat placeholder with live room chat.
- Use SpacetimeDB for immediate room chat delivery and Supabase for durable chat history only if history is enabled.
- Attach each chat message to the sender's stable member/user id, display name, avatar, and role at send time.
- Support basic message states: sending, sent, failed, deleted/hidden later if moderation is added.
- Keep chat scoped to the current room and invisible to non-members.
- Add unread state on the room Chat tab when the panel is not active.
- Keep host/moderation controls deferred unless abuse controls are being implemented.

Review checkpoint:

- Confirm multiple joined clients receive chat messages live, with the correct avatar and host crown where applicable.
- Confirm chat does not leak between rooms and handles reconnect without duplicating recent messages.

Safe commit point:

- Room chat is usable during watch/listen sessions and is identity-aware.

## Task 19: Seamless Next Item Loading and Resource-Aware Preload

Suggested files:

- `components/room/transport-controls.tsx`
- `components/room/youtube-media-player.tsx`
- `components/room/direct-media-player.tsx`
- `components/room/queue-panel.tsx`
- `lib/player/`
- `lib/queue/`
- `lib/youtube/`
- `lib/performance/`
- `spacetime/`
- `tests/player/`
- `tests/queue/`

Work:

- Add a next-item prediction layer that identifies the likely next queue item without mutating the active item, current playback position, or queue mode.
- Add a polished `Loading next` / `Preparing next` UI state near the transport and room stage so queue transitions feel intentional even on slower networks.
- Prefetch metadata and thumbnails for the next one to three likely queue items, depending on queue certainty and viewport relevance.
- Do not preload full YouTube videos or create hidden duplicate YouTube iframes for background preloading.
- For YouTube sources, keep preloading limited to API metadata, thumbnails, player/API readiness, and safe UI preparation. Investigate `cueVideoById` only if it can be proven not to interrupt the current video, violate provider behavior, increase unwanted data usage, or trigger autoplay/ad edge cases.
- For direct media and Cloudflare R2-backed media, add resource-aware preload support:
  - use `preload="metadata"` for direct audio/video where useful;
  - prefetch manifests for HLS;
  - consider first-segment warming only when network and data-saver checks allow it;
  - avoid downloading full media files as a default behavior.
- Gate preload behavior behind a clear setting or internal policy flag so it can be disabled quickly if it causes data or device issues.
- Respect browser/network signals where available:
  - `navigator.connection.saveData`;
  - effective connection type;
  - mobile/small-device constraints;
  - low-memory or unsupported-browser fallbacks where detectable.
- Keep live sync state uncached. Only cache or prefetch static/provider-safe assets such as metadata, thumbnails, HLS manifests, and future R2 media headers/ranges.
- Add instrumentation for next-item transition time:
  - current ended to next source selected;
  - next source selected to player ready;
  - player ready to first playing state;
  - preload hit/miss state.
- Keep preloading compatible with queue modes:
  - Normal/Loop can predict the next item confidently;
  - Shuffle/Smart Shuffle should only preload after the next item is known or after a deterministic prediction is stable;
  - queue reorder/remove/clear must invalidate stale preload targets.

Review checkpoint:

- Confirm YouTube transitions feel smoother without hidden second players or full-video preloads.
- Confirm direct/HLS transitions improve when preload is enabled, especially for R2-backed media later.
- Confirm data saver or slow-network mode reduces or disables preload behavior.
- Confirm changing queue mode, reordering the queue, or removing the predicted next item does not cause stale preloads, wrong titles, wrong durations, or wrong playback positions.
- Confirm no preload path mutates room playback state, active queue item, source duration, source title, or server timestamp.

Safe commit point:

- Next-item transitions are visibly smoother and instrumented, while data usage remains controlled and YouTube playback stays provider-safe.

## Task 20: Dedicated Listen Mode Music Lounge UI

Reference:

- `C:\Users\Admin\Downloads\DesignUI for listen mode.png`
- User-provided listen-mode redesign brief from June 1, 2026.

Suggested files:

- `components/room/room-experience.tsx`
- `components/room/listen-mode-layout.tsx`
- `components/room/listen-now-playing-panel.tsx`
- `components/room/listen-discovery-panel.tsx`
- `components/room/listen-add-media-popover.tsx`
- `components/room/listen-room-sidebar.tsx`
- `components/room/listen-queue-drawer.tsx`
- `components/room/listen-queue-row.tsx`
- `components/room/listen-queue-controls.tsx`
- `components/room/listen-room-members.tsx`
- `components/room/listen-room-invite-card.tsx`
- `components/room/transport-controls.tsx`
- `components/room/queue-panel.tsx`
- `lib/queue/`
- `lib/player/`
- `lib/spacetime/`
- `tests/queue/`
- `tests/player/`

Work:

- Create a dedicated Listen Mode layout branch instead of reusing the Watch Mode room shell.
- Remove the permanent old left room sidebar in Listen Mode:
  - do not show room name, invite card, saved-room action, settings, or mode toggle as the left-column focus;
  - keep room/mode/invite controls available in the redesigned right Room area.
- Add a persistent left Now Playing panel:
  - large artwork/thumbnail;
  - subtle visualizer overlay or visualizer below artwork;
  - `Now Playing` label;
  - track title;
  - artist/channel/source;
  - views/likes where YouTube metadata is available;
  - progress bar;
  - playback controls for shuffle, previous, play/pause, next, repeat;
  - volume slider;
  - optional fullscreen/expand icon.
- Redesign the center area as a music discovery surface:
  - greeting/header copy such as `Good evening` and `What do you want to listen to next?`;
  - filter tabs for `For you`, `Recommended`, `Trending`, and `From your playlist`;
  - horizontal recommendation cards with artwork, title, artist/channel, and duration;
  - recently added list with title, artist/channel, duration, added-by user, timestamp, and add button.
- Move Add Media to the top-right of the main content area:
  - prominent `+ Add Media` button;
  - popover with YouTube / YouTube Music URL input;
  - detect single media vs playlist;
  - show `Add to queue` for single media;
  - show `Import playlist` for playlist links, with future track-selection support;
  - remove or hide duplicate add-media controls from the right sidebar in Listen Mode where possible.
- Redesign the right sidebar for Listen Mode:
  - narrower session/context panel;
  - tabs: `Queue`, `Members`, `Room`;
  - Room section includes current mode selector, invite friends card, room code, and copy link action;
  - Members section uses the shared member authority surface so hosts can see members, adjust queue/playback/browser permissions, grant or revoke controller, kick active members, and remove idle members;
  - bottom `Coming up` card previews the next queued item.
- Replace the permanent queue sidebar with a bottom queue drawer:
  - drawer header: `Queue · X songs`;
  - queue controls: search in queue, shuffle, smart shuffle, pinned first, clear, more menu;
  - wide horizontal queue rows using the available center space;
  - each row includes drag handle, position number, pin state, thumbnail, title, artist/source, duration, added by, status, visualizer indicator for now playing, and more menu.
- Add mobile-ready queue swipe/remove behavior:
  - swiping a row left reveals a red delete action;
  - swipe does not delete immediately;
  - user must tap the revealed trash button to confirm removal.
- Implement or prepare pinned-first queue behavior:
  - pinned songs act as a priority layer when `Pinned First` is enabled;
  - isolate pinned-first queue selection logic so it can be expanded later without damaging normal/shuffle/smart-shuffle behavior.
- Condense or mode-scope the bottom transport:
  - remove duplicated song metadata in Listen Mode because the Now Playing panel owns that information;
  - keep global controls only if still useful;
  - do not split the same song details across Now Playing, bottom bar, and right panel.
- Preserve existing live behavior:
  - SpacetimeDB playback sync remains unchanged unless a small state addition is explicitly required;
  - room creation/joining remains unchanged;
  - playlist import, shuffle, smart shuffle, queue reorder, permissions, and playback sync must keep working.
- Keep the legal YouTube source player visible when YouTube is the listen source:
  - preserve the current compliance rule that the iframe is not hidden, tiny, offscreen, covered, or display-none;
  - integrate it intentionally into the Now Playing panel or an expandable source monitor area.

Visual direction:

- Match the provided reference image as the primary layout direction while translating it into the Mistake Watch `Obsidian Lounge` system.
- Use deep charcoal surfaces, thin borders, cyan primary actions, amber listen accents, soft glass panels, and compact technical labels.
- Keep cards rounded but structured; avoid excessive pill shapes and detached floating bubbles.
- Make Listen Mode feel like a shared premium music lounge, not a video-room variant.
- Avoid fake recommendation truth: until recommendations are wired to real data, label sections as queue-based, recently added, room picks, or placeholder/demo-only in development surfaces.

Review checkpoint:

- Confirm Listen Mode no longer visually uses the old Watch Mode layout.
- Confirm the left side is Now Playing, not room controls.
- Confirm Add Media is accessible from the top-right popover and does not duplicate awkwardly in the right sidebar.
- Confirm queue management primarily happens through the bottom queue drawer.
- Confirm right sidebar is simplified to Members/Room context in Listen Mode, with queue management owned by the bottom drawer.
- Confirm the Listen Members tab keeps permission, controller, kick, and idle-removal actions available to hosts.
- Confirm song metadata is not duplicated unnecessarily.
- Confirm YouTube source visibility remains compliant.
- Confirm mobile behavior has a clear path for queue, members, room, add media, and playback controls.
- Confirm existing sync, queue, playlist import, permissions, and room switching still work.

Safe commit point:

- Listen Mode has a dedicated music-lounge layout that matches the new reference direction while preserving current live-room behavior.

## Task 21: Listen Mode Source Monitor and Dynamic Artwork Theme

Context:

- Vercel production testing found that the visible YouTube mini player can appear abruptly and disrupt the Listen Mode layout once a song starts.
- The current active thumbnail/artwork treatment can also place and scale the thumbnail into the center surface in a way that looks low-quality when provider artwork is not suited to large cover usage.
- This task is a focused Listen Mode visual/structure correction. It should not implement real provider recommendations, accounts, friending, R2 uploads, or a new playback engine.

Suggested files:

- `components/room/listen-mode-layout.tsx`
- `components/room/youtube-media-player.tsx`
- `components/room/youtube-room-stage.tsx`
- `components/room/audio-visualizer.tsx`
- `lib/player/source.ts`
- `lib/youtube/use-youtube-metadata.ts`
- `docs/tasks/TASK-001-watch-together-platform/review-notes.md`
- `docs/tasks/TASK-001-watch-together-platform/implementation-report.html`

Work:

- Rework the Listen Now Playing panel so the visible YouTube source monitor behaves as the live artwork/thumbnail area instead of popping in as a separate layout block.
- Overlay the existing waveform/visualizer treatment over the source monitor/artwork area so the player feels intentional and embedded.
- Keep the YouTube iframe compliant:
  - visible;
  - large enough for YouTube iframe requirements;
  - not hidden, offscreen, opacity-zero, or covered in a way that blocks required controls.
- Avoid scaling thumbnails aggressively into the center discovery surface:
  - do not stretch low-resolution thumbnails to fill large central areas;
  - use thumbnails as contained artwork, blurred ambient layers, or source-monitor content only where they remain visually clean.
- Add a smooth dynamic Listen theme layer derived from the current source artwork or a safe fallback:
  - the page background/panel glow should gradually shift when the active song changes;
  - transitions should be smooth and not instant/sharp;
  - keep colors within the existing Obsidian Lounge palette and avoid one-off random colors;
  - preserve readable contrast for text and controls.
- Keep the center discovery surface stable:
  - no layout jump when the source monitor becomes available;
  - no sudden reflow when YouTube metadata/thumbnail arrives;
  - placeholders reserve the same core geometry as the loaded state.
- Preserve existing live behavior:
  - no playback remounts caused by visual theme changes;
  - no sync, queue, permission, kick, playlist, or mode-switching changes unless required by layout integration.

Review checkpoint:

- Confirm starting a YouTube song in Listen Mode does not cause the mini player to pop out or break the layout.
- Confirm the source monitor/artwork area keeps stable dimensions before and after metadata loads.
- Confirm waveform/visualizer treatment remains visible and integrated over the monitor/artwork area.
- Confirm the page color/theme shift follows the active content smoothly without harming text/control contrast.
- Confirm active thumbnails no longer appear awkwardly scaled in the center discovery window.
- Confirm Watch Mode is unaffected.
- Confirm YouTube source visibility remains compliant.

Safe commit point:

- Listen Mode presents YouTube-backed playback as a stable artwork/source-monitor surface with smooth content-aware theming and no production layout jumps.

## Task 22: Provider Recommendations and Room Picks

Context:

- The Listen Mode discovery surface currently exposes `Room picks`, `Recommended`, `Trending`, and `From your playlist` as UI structure backed by queue/recent-room data.
- The app must not fake provider recommendations. This task defines and implements the first real recommendation path after playback, queue, and source-monitor stability are solid.

Suggested files:

- `app/api/youtube/`
- `lib/youtube/`
- `lib/recommendations/`
- `lib/queue/`
- `components/room/listen-mode-layout.tsx`
- `components/room/listen-discovery-panel.tsx`
- `components/room/listen-add-media-popover.tsx`
- `tests/recommendations/`
- `tests/youtube/`

Work:

- Define recommendation source priority:
  - current queue and recent room history first;
  - YouTube metadata/search or related-provider data where official APIs allow it;
  - later account listening history, saved rooms, and friends' activity when accounts exist.
- Keep provider API keys server-side and cache/de-dupe recommendation requests with clear TTLs.
- Implement honest states for each section:
  - real provider-backed results;
  - queue/history based results;
  - unavailable/provider-limited state;
  - empty state without fake songs.
- Make `Room picks`, `Recommended`, `Trending`, and `From your playlist` select distinct data sets only when those data sets are genuinely available.
- Add queue actions to recommendation cards:
  - add to queue;
  - play next where permissions allow;
  - load now where host/controller permissions allow.
- Preserve permission behavior so guests cannot bypass queue or playback authority through recommendation actions.
- Keep recommendation loading non-blocking. Playback, queue import, and room join must not depend on recommendation API success.
- Do not implement account-based `From your playlist` until accounts/profiles exist. Before accounts, label it as unavailable or room-history based instead of pretending personal data exists.

Review checkpoint:

- Confirm recommendation sections do not show fake provider truth.
- Confirm provider API failures, quota limits, private/unavailable videos, and empty results have explicit UI states.
- Confirm recommendation cards can be queued without disrupting the current song.
- Confirm recommendation actions respect queue/playback permissions.
- Confirm Listen Mode remains stable if recommendations are slow or unavailable.

Safe commit point:

- Listen Mode discovery uses honest, provider-safe recommendation data and clear fallback states without blocking playback.

## Task 23: Listen Mode Queue Drawer and Dynamic Theme Quality Pass

Context:

- Listen Mode now has a dedicated music-lounge layout, source monitor, dynamic artwork theme, and bottom queue drawer.
- The current queue drawer has one fixed expanded height, the drawer count does not communicate the current song position in the total playlist/queue, playlist imports still need a richer selection overlay, and the dynamic listen theme is still too subtle.
- This task is a quality-of-changes pass. It should improve the existing Listen Mode interaction model without changing core SpacetimeDB playback authority, queue reducer semantics, YouTube compliance, or the Watch Mode layout.

Suggested files:

- `components/room/listen-mode-layout.tsx`
- `components/room/listen-add-media-popover.tsx`
- `components/room/listen-queue-drawer.tsx`
- `components/room/listen-playlist-preview-modal.tsx`
- `components/room/listen-theme.ts`
- `components/room/listen-waveform.tsx`
- `lib/player/source.ts`
- `lib/youtube/playlist-client.ts`
- `lib/queue/`
- `tests/queue/`
- `tests/youtube/`
- `app/globals.css`

Work:

- Make the Listen Mode queue drawer expansion configurable:
  - provide a clear control for compact, medium, and tall drawer heights;
  - persist the preference locally per browser unless a room-authoritative setting is explicitly added later;
  - keep the drawer smooth when changing height and when opening/closing.
- Improve queue position readout in the drawer header:
  - show the current song index out of the total queue/playlist count where the drawer currently only shows total songs;
  - handle empty queue, no current item, imported playlist, and history/loop modes without misleading numbers;
  - keep the readout compact enough for mobile.
- Upgrade the Listen Mode Add Media flow:
  - auto-detect whether the pasted YouTube/YouTube Music link is a single video/song or playlist;
  - when a playlist is detected, open a polished overlay before queue mutation;
  - allow Add All, Select Items, and Cancel;
  - support selection states, selected count, unavailable/skipped items, duplicate warnings, loading/error states, and keyboard dismissal;
  - keep playlist API calls server-side and quota-aware.
- Improve waveform color behavior:
  - derive waveform colors from the same dynamic artwork/theme source used by the Listen Mode background;
  - keep enough contrast so the waveform remains visible and does not blend into the background;
  - respect reduced-motion preferences and paused/waiting states.
- Strengthen dynamic Listen Mode theming:
  - make the active artwork/theme shift more noticeable while preserving the dark neutral base;
  - make the gradient/color transition originate visually from the left player panel and seep toward the center/right page;
  - have player-panel buttons, active controls, and key listen-page accents adapt to the current thumbnail-derived theme;
  - keep the supplied Signal Aperture gold/blue brand accent pair as the base constraint and avoid arbitrary unrelated colors.
- Preserve YouTube compliance:
  - the visible YouTube source monitor must remain visible and usable;
  - do not hide, cover, shrink below required size, or extract audio from the YouTube iframe.
- Preserve room behavior:
  - queue drawer height changes, theme changes, and playlist preview selection must not interrupt the current song, mutate playback position, or reorder the current item.

Review checkpoint:

- Confirm the queue drawer can switch between compact, medium, and tall heights without layout jumps.
- Confirm the drawer header clearly shows current song position out of total queue/playlist count.
- Confirm playlist links open a selection overlay before mutating the queue.
- Confirm Add All and Select Items produce predictable queue additions and clear skipped/duplicate summaries.
- Confirm waveform colors are theme-aware but readable.
- Confirm the dynamic background and listen controls visibly respond to the active thumbnail without overpowering content.
- Confirm YouTube source monitor remains visible, usable, and compliant.

Safe commit point:

- Listen Mode queue drawer and dynamic theme behavior feel configurable, legible, and more music-native without disrupting playback or queue authority.

## Later Task: Cloudflare R2 Media Uploads

Suggested files:

- `lib/media-storage/`
- `lib/cloudflare/`
- `components/room/SourceInput.tsx`
- `components/room/QueuePanel.tsx`
- `supabase/migrations/`
- `.env.example`
- `docs/media-storage.md`

Work:

- Add Cloudflare R2 as the selected storage backend for owner-uploaded media.
- Add environment documentation for R2 account id, bucket name, access key id, secret access key, and public/custom media domain.
- Define Supabase metadata records for uploaded media assets without storing large media files in Postgres.
- Add signed upload and signed playback URL strategy.
- Add upload size limits, allowed file types, cleanup behavior, and room/member ownership checks.
- Decide whether HLS packaging is manual at first or handled by a later worker/transcoding step.

Review checkpoint:

- Confirm a host can upload or select an owned media asset and load it into the room without manually pasting a third-party direct URL.

Safe commit point:

- R2-backed media assets can be uploaded, listed, and loaded into the live room behind documented access controls.

## Later Task: Voting and Suggested Next Song

Suggested files:

- `components/room/NextSuggestionVote.tsx`
- `lib/suggestions/`
- `lib/queue/`
- `spacetime/`
- `lib/spacetime/`
- `supabase/migrations/`

Work:

- Trigger an optional voting window when the current song reaches roughly 75% progress.
- Show three suggested next songs and one random option.
- Let participants vote once per voting window.
- Add the majority winner to the queue when enabled by the host.
- Handle ties, no-vote outcomes, and host override.

Review checkpoint:

- Confirm voting cannot disrupt the current playback timeline or duplicate queue items.

Safe commit point:

- Suggested-next voting works behind a host-controlled setting.

## Later Task: Accounts, Friends, and Friend Rooms

Suggested files:

- `supabase/migrations/`
- `app/auth/`
- `components/dashboard/FriendRooms.tsx`
- `components/notifications/`
- `lib/friends/`
- `lib/notifications/`

Work:

- Add account sign-in with Supabase Auth.
- Add friendship requests, accepted friendships, and privacy settings.
- Replace guest-generic Listen Mode greetings with account-personalized greetings such as `Good evening, {displayName}` when a durable profile exists, while preserving a generic guest fallback.
- Show friends' open rooms on the dashboard.
- Add friend invite actions from within a room so a room member can invite one of their friends without copying a public invite link.
- Deliver friend room invites as in-app notifications tied to the invited user's account.
- Show incoming room invites as a non-blocking on-screen pop-up/toast while the user is online.
- Add the same incoming room invite to the notification bell and notification drawer until dismissed, accepted, or expired.
- Include inviter name/avatar, host crown when applicable, room name, current media/thumbnail when available, and accept/decline actions in the invite UI.
- Enforce room privacy and friendship visibility server-side; a friend invite should not expose a private room to non-friends or stale relationships.
- Preserve guest invite-link joining.

Review checkpoint:

- Confirm friend-room discovery never exposes private rooms to non-friends.
- Confirm a friend invited from a room sees both an on-screen invite and a notification drawer item, and accepting the invite joins through the correct room access path.

Safe commit point:

- Account users can see friends' open rooms and receive account-backed room invites from friends.

## Later Task: Shared Browser Prototype

Suggested files:

- `server/browser-worker/`
- `components/room/BrowserStage.tsx`
- `components/room/BrowserControls.tsx`
- `lib/browser-session/`

Work:

- Start isolated Chromium sessions per browser-mode room.
- Stream the browser viewport to room clients.
- Forward input events only from the current controller.
- Add grant, request, revoke, and timeout behavior for control.
- Add navigation controls and visible controller state.
- Add blocked, failed, and resource-limit states.

Review checkpoint:

- Confirm one active controller can navigate while other clients only view.
- Confirm browser workers clean up after room close or timeout.

Safe commit point:

- Browser mode prototype works behind a feature flag or clear beta boundary.

## Later Task: Hardening, Security, and Abuse Controls

Suggested files:

- `server/`
- `supabase/migrations/`
- `lib/rate-limit/`
- `docs/`

Work:

- Add rate limits for room creation, source loads, queue adds, and browser sessions.
- Add browser worker resource limits and idle cleanup.
- Add moderation settings for host-only sources and queue permissions.
- Add audit logs for control handoff and browser session lifecycle.
- Add privacy and content limitation copy where needed.

Review checkpoint:

- Confirm high-cost operations cannot be spammed by guests.

Safe commit point:

- Production risk controls are in place for public testing.

## Final Task: QA, Release Readiness, and Commit Prep

Suggested files:

- `tests/`
- `docs/`
- `.github/workflows/`

Work:

- Add unit tests for sync math, queue reducers, permissions, and room events.
- Add integration tests for room creation, join flow, SpacetimeDB live events, and queue updates.
- Add Playwright tests for dashboard, room join, source load, queue actions, and responsive layout.
- Run visual QA across desktop, tablet, and mobile.
- Use `qa-release-gate` to confirm acceptance criteria, scope, design, and verification evidence.
- Create or update `qa-report.html` when final QA needs a human review surface.
- Use `git-commit-assistant` after QA passes to produce a report-first commit review.
- Do not stage, commit, or push until the commit report is approved.

Review checkpoint:

- Confirm QA passed or blockers are documented.
- Confirm the proposed commit is atomic and scoped.
