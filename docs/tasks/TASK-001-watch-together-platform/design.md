# Design Spec: Mistake Watch

## Technical Approach

Use a room-authoritative architecture. The server owns the canonical room timeline, permissions, active mode, queue, presence, and control ownership. Clients render the local media element but continuously reconcile against server state.

Room playback state should include:

- `room_id`
- `mode`: `video`, `music`, or `browser`
- `source`
- `status`: `playing`, `paused`, `buffering`, `ended`, or `error`
- `position_seconds`
- `playback_rate`
- `server_updated_at`
- `host_user_id`
- `controller_user_id`
- `queue_item_id`

Clients estimate the expected current position from `position_seconds + (now - server_updated_at) * playback_rate` while playing. Small drift should be corrected with subtle playback rate changes. Larger drift should seek. Paused state should seek exactly.

Use Supabase for:

- Auth, guest identity records, and user profiles.
- Persistent room metadata.
- Membership and role records.
- Queue records and durable playback history if needed.
- Room settings and permissions.
- Uploaded media metadata, ownership, room attachment, and access records.

Use Cloudflare R2 for:

- Owner-uploaded raw media objects such as `.mp4`, `.webm`, `.mp3`, and `.m4a`.
- Generated HLS playlists and segment files when upload processing is added.
- Large media delivery behind signed URLs or controlled public access, depending on the room privacy model.

Use SpacetimeDB for live room state:

- Low-latency playback reducers and subscriptions.
- Presence and connection lifecycle state.
- Host/controller lock updates.
- Queue mutation reducers and room snapshots.
- Reconnection snapshots from subscribed room state.
- Ephemeral room session state that should not require a Supabase write for every tick or control event.

Keep Supabase and SpacetimeDB responsibilities separate. Supabase should remain the durable product database for accounts, room records, invite metadata, permissions, and persisted queue/history records. SpacetimeDB should be the fast room engine for active sessions and can reference Supabase IDs where persistence needs to line up.

Use remote browser workers for browser mode:

- A worker starts an isolated Chromium session for a room.
- The browser viewport is streamed to all viewers.
- Input events are accepted only from `controller_user_id`.
- Control changes are lock-based and auditable.
- Workers enforce timeout, memory, CPU, navigation, and cleanup policies.

## UI / UX Approach

The first screen for the app should be a functional dashboard based on the Home Page reference, not a marketing landing page. The dashboard should prioritize creating a room, joining by invite link/code, rejoining active rooms, and eventually joining friends' open rooms once accounts and friending exist.

Direct invite links should still be able to bypass the dashboard and open a room join flow with a display-name prompt for guest-first use.

After joining a room, the actual room should become the primary experience. The room layout should prioritize the media surface, with compact but clear controls.

Primary dashboard areas:

- Featured active room or most recent room.
- Create room action.
- Join by link/code action.
- Friends' open rooms section for the later account/friending model.
- Recent rooms or saved rooms once persistence exists.
- Account/profile, settings, and notifications using the shared top nav.

Primary room areas:

- Media stage: video player, audio now-playing surface, or remote browser stream.
- Transport controls: play/pause, seek, volume, current time, sync status.
- Source bar: direct URL input, mode switcher, and load action.
- Queue panel: current item, upcoming items, add URL/search field, reorder/remove actions.
- Participants panel: host, controller, viewers/listeners, grant-control actions.
- Permissions panel: host-only toggles for each guest's queue, playback, and future browser-control permissions.
- Room actions: invite link, settings, leave room.

Music mode should feel distinct but not separate: a compact now-playing view, queue-first workflow, clear host controls, guest add-to-queue actions, and host-only remove/reorder/clear actions.

YouTube-backed listen mode should use an artwork-first layout instead of a full watch-room video stage. The primary visual should be the YouTube thumbnail or track artwork when available. The official YouTube iframe player must remain visible and usable, docked as a deliberate mini player in the artwork area on desktop, with a toggle that can swap between artwork-first and video-first presentation. On narrow layouts, the player can move below the artwork if docking would make the player too small or cramped. The app must not extract audio, hide the player, overlay required controls, or represent YouTube playback as audio-only.

Provider metadata should be layered on top of playback, not required for playback. YouTube Data API enrichment can provide title, channel, duration, thumbnails, views, and likes when available, but room loading and queueing must continue if metadata is pending, quota-limited, or unavailable. Public dislikes should be treated as unavailable through the official API.

Real audio-reactive waveform work should be treated as its own listen-mode UI and architecture pass. For direct audio, HLS audio, and future R2-hosted media where the browser or server can access the audio data, the app can use waveform peaks and Web Audio analysis to drive the transport waveform and ambient background motion. For YouTube and YouTube Music iframe playback, the app should use a clearly designed fallback visualizer driven by playback state or metadata, because the app cannot directly sample the iframe audio stream.

Playlist import and advanced queue controls belong in the right Queue panel. The left room rail remains a compact room overview, and the center stage remains focused on the active media. The Queue tab should read as a stacked control surface:

- Add media card: URL input, Add/Load actions, and expandable playlist detection preview.
- Playlist preview: title/count/loading state, compact first rows, and explicit actions for Add All, Shuffle Add, Smart Shuffle Add, Select Items, and Cancel.
- Queue controls card: compact Queue Mode dropdown, shuffle action, clear action, and optional settings icon.
- Up Next / History segmented control.
- Compact queue cards with thumbnail, title, artist/channel, duration, badges, and small actions.

Playlist import should be explicit and reversible at the preview step. A playlist URL should never silently flood the queue. Import summaries should state how many items were added, skipped as duplicates, skipped as unavailable, or failed due to provider/API issues.

Smart Shuffle should feel curated rather than random. It should score upcoming candidates against the previous selected item and recent history, preferring variety across artist, channel, playlist source, and title similarity. It must keep the currently playing item fixed, keep history separate, and preserve pinned or Play Next intent. When metadata is sparse, it should degrade to normal shuffle instead of presenting false precision.

Loop Queue and Autoplay Related are queue behavior modes, not duplicate queue creators. Loop Queue cycles through existing playable queue rows. Autoplay Related can expose the UI and reducer/API shape before real recommendation fetching exists, but it must label unavailable recommendation behavior honestly and avoid fake related items.

Later music collaboration should add a lightweight voting moment when the current song reaches roughly 75% progress. The UI should show three suggested next songs and a random option. If enabled by the host, the majority choice can be added to the queue.

Browser mode should show:

- Stream viewport.
- URL/address field for the active controller.
- Back, forward, refresh, and home controls.
- A visible controller indicator.
- Request/grant/revoke control actions.
- Loading and blocked-site states.

## Component / Module Structure

- `app/`: Next.js routes, room pages, auth pages, and layout shell.
- `components/dashboard/DashboardShell.tsx`: First-screen dashboard layout.
- `components/dashboard/ActiveRoomPreview.tsx`: Featured room preview and join action.
- `components/dashboard/FriendRooms.tsx`: Later account/friending surface for open friend rooms.
- `components/dashboard/JoinRoomForm.tsx`: Invite link or room code entry.
- `components/room/MediaStage.tsx`: Switches between video, music, and browser stage.
- `components/room/TransportControls.tsx`: Shared playback controls.
- `components/room/SourceInput.tsx`: Direct URL entry and validation feedback.
- `components/room/QueuePanel.tsx`: Queue add, reorder, remove, and clear actions.
- `components/room/QueueCard.tsx`: Optional split for compact queue/history cards with thumbnail, metadata, badges, and actions.
- `components/room/ParticipantsPanel.tsx`: Presence, roles, and control handoff.
- `components/room/PermissionToggles.tsx`: Host-only per-user permission controls.
- `components/room/NextSuggestionVote.tsx`: Later voting surface for suggested next songs.
- `components/room/SyncIndicator.tsx`: Drift, reconnecting, live, and buffering states.
- `lib/spacetime/`: SpacetimeDB client bindings, reducer callers, subscriptions, reconnection, and snapshots.
- `lib/player/`: Media adapters and drift-correction logic.
- `lib/queue/`: Queue mode, shuffle, smart shuffle, playlist import mapping, history actions, and queue mutation helpers.
- `lib/youtube/`: Server-side YouTube metadata and playlist import helpers.
- `spacetime/`: SpacetimeDB module schema, reducers, and live room-state logic.
- `server/browser-worker/`: Remote browser session lifecycle and streaming.
- `supabase/migrations/`: Database schema and policies.

## Data / State Needs

- `profiles`: user display name, avatar, created timestamp.
- `friendships`: later account feature for accepted friend relationships.
- `rooms`: room id, owner id, name, privacy, created timestamp, status.
- `room_members`: room id, user id, role, joined timestamp, last seen timestamp.
- `guest_identities`: guest display name, room-scoped identity token hash, created timestamp, last seen timestamp.
- `room_settings`: default permissions for queueing, control requests, guest access, voting, and source loading.
- `member_permissions`: per-member overrides for queue add/manage, playback control, source loading, and future browser control.
- `queue_items`: room id, source url/provider, video id, title, artist/channel, thumbnail, duration, playlist id/title, added by, added timestamp, position, status, pinned/play-next flags, unavailable flag, and display badges.
- `queue_mode`: room-authoritative queue mode, including normal, shuffle, smart shuffle, loop, and autoplay-related.
- `media_assets`: later R2-backed upload records with owner/member id, bucket key, source type, title, duration, size, processing status, and access policy.
- `queue_votes`: later voting records for suggested next item choices.
- `playback_sessions`: optional history for current/previous source state.
- SpacetimeDB live state: presence, drift, locks, current timeline, active queue snapshot, connection state, and browser worker health.

## Accessibility Notes

- All controls must be keyboard reachable.
- Transport buttons need accessible names and visible focus states.
- Sliders need labels, min/max/current values, and keyboard support.
- Dialogs and menus should use accessible primitives.
- Live sync, reconnecting, and error states should use polite status announcements.
- Color cannot be the only indicator of host/controller/live state.

## Responsive Notes

- Desktop: media stage dominant, queue and participants available in side panels.
- Tablet: stage remains primary, panels collapse into tabs or drawers.
- Mobile: stage on top, controls beneath, queue/participants/settings in bottom sheets or tabs.
- Long URLs, source titles, display names, and error messages must wrap or truncate cleanly.
- Fixed-format controls should have stable dimensions so labels and state changes do not shift the layout.

## SEO / GEO Notes

Most room pages should likely be private/noindex. Public marketing or help pages can be added later with clear product claims and docs, but they are outside the MVP.

## Animation Notes

- Use restrained transitions for panels, queue reordering, control handoff, and mode changes.
- Avoid motion that distracts from watching/listening.
- Respect reduced-motion preferences.
- Sync corrections should not create visible UI jitter.

## Edge Cases

- User joins while media is already playing.
- User lands on the dashboard with no account, no rooms, or only an invite link.
- Friends' rooms are unavailable because the user is not signed in or has no accepted friends.
- Host disconnects, reconnects, or leaves permanently.
- Controller disconnects during browser mode.
- Media URL is invalid, unsupported, blocked by CORS, or slow to buffer.
- Browser worker fails to start, crashes, or times out.
- A site blocks automation, embedding, login, or playback.
- Two users request control at the same time.
- Queue item is removed while playing.
- Guest identity token is lost or duplicated in another browser.
- Host toggles a user's permission while that user is performing an action.
- Suggested next-song voting ties or reaches no majority.
- Network latency causes repeated drift corrections.
- Autoplay is blocked until a guest interacts with the page.
- Room reaches participant or resource limits.
