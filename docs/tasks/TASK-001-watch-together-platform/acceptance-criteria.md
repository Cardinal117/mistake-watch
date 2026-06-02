# Acceptance Criteria: Mistake Watch

## Functional Requirements

- A host can create a room and share an invite link.
- Guests can join a room with a display name and see current media, queue, participants, and room state.
- Dashboard room cards do not show durable member count as active online people.
- Unsaved rooms close after one hour of idle time.
- Saved rooms remain rejoinable and preserve their persisted queue.
- Hosts can save or unsave a room during the guest-first MVP.
- Closed temporary rooms cannot be joined again through old invite links or room codes.
- Dashboard saved-room quick links expose saved rooms without implying that anyone is online.
- First-time dashboard guidance explains the basic create, invite, media, queue, and save flow until dismissed.
- Every guest or account user has a visible avatar.
- Users can choose from the supplied Mistake Watch avatar set through their avatar/profile entry point and Settings > Account Avatar.
- Host avatars show a crown overlay wherever host identity is shown.
- The room has one authoritative host and at most one active browser controller.
- Direct video/audio URLs can be loaded when supported by the browser/player.
- Play, pause, seek, and source changes synchronize to all connected clients.
- Clients joining mid-playback receive the current room snapshot and align playback.
- Music mode supports a now-playing item and queue management.
- Queue autoplay can be toggled by the host/controller from the transport control area near the volume controls.
- When queue autoplay is disabled, ended media does not automatically start the next queued item.
- When queue autoplay is enabled, ended media advances to the next queued item consistently for all joined clients.
- Listen rooms can load supported YouTube and YouTube Music links through a visible embedded YouTube player, without extracting audio or hiding required player functionality.
- Listen rooms show YouTube thumbnail artwork as the primary music surface when provider artwork is available.
- Listen rooms provide an understandable artwork-first/video-first toggle for YouTube-backed playback.
- YouTube metadata enrichment shows real title, channel, duration, views, and likes when available through the official API, while unavailable metadata has explicit pending/unavailable states.
- YouTube and YouTube Music playlist URLs can be detected from the Queue input without immediately mutating the queue.
- Playlist imports show a preview with title/count/loading state and explicit Add All, Shuffle Add, Smart Shuffle Add, Select Items, and Cancel actions where applicable.
- Listen Mode playlist links pasted through Add Media auto-detect playlist intent and open a review overlay before mutating the queue.
- Listen Mode playlist overlays allow Add All, Select Items, and Cancel with clear selected, skipped, duplicate, unavailable, loading, and error states.
- Playlist imports add valid videos, skip exact duplicates by default, skip unavailable entries when detected, and show an import summary.
- Queue modes are room-authoritative and include Normal, Shuffle, Smart Shuffle, Loop Queue, and Autoplay Related.
- Smart Shuffle reorders upcoming queue items only, keeps the current item and history stable, preserves pinned/play-next intent, and degrades gracefully when metadata is incomplete.
- Loop Queue cycles through the existing queue without duplicating queue rows.
- Autoplay Related has honest placeholder behavior until real recommendation fetching exists, and it must not display fake provider recommendations.
- Guests can add queue items by default.
- Host can remove, reorder, and clear queue items.
- Host can use per-user permission toggles for queue and playback capabilities.
- Queue permissions determine who can add, remove, reorder, and clear items.
- Room chat is scoped to room members and displays sender name, avatar, and host identity where applicable.
- Account-backed friends can send room invites from inside a room.
- Incoming friend room invites appear as an on-screen pop-up and remain available in the notification bell/drawer until resolved.
- Browser mode streams a remote browser session to viewers.
- Browser mode accepts navigation/input only from the active controller.
- Host can grant, revoke, or reclaim control.

## Visual Requirements

- The media surface is the dominant element in the room UI.
- Controls are compact, recognizable, and consistently placed.
- Autoplay, local volume, and fullscreen controls sit together in the grounded transport control area without crowding title or progress information.
- Queue, participants, and settings are easy to reach without crowding the media stage.
- Dashboard create/join actions are grounded in a side panel or attached layout area, not presented as detached floating forms.
- Saved-room quick links are visible from the dashboard as a compact sidebar or side panel.
- Active dashboard rooms use a restrained glow or border state to distinguish them from idle rooms.
- The dashboard watch/rejoin/invite strip shows the current media thumbnail when live metadata provides one.
- First-time guidance is concise, dismissible, and does not feel like a marketing modal.
- The website logo, favicon, navbar branding, and key loading/sync states follow the Signal Aperture direction: amber aperture/chip geometry, cyan play/sync core, and dark glass technical depth.
- Brand treatments support the product hierarchy: product logo, user avatars, host crown, and system loading indicators remain visually related but clearly distinct.
- Avatars use the supplied hardware-themed image set and remain legible at dashboard, room rail, chat, and participant-list sizes.
- Host crown treatment is visible without obscuring the selected avatar.
- Avatar animations are subtle, optional, reduced-motion aware, and never distract from the active watch/listen surface.
- Friend invite pop-ups are noticeable without interrupting playback or blocking core controls.
- Loading, buffering, reconnecting, unsupported media, and browser-failed states are visually clear.
- YouTube-backed listen mode feels like a music player by default while still keeping the embedded player visible and usable.
- Listen Mode queue drawer height is configurable between compact, medium, and tall states without feeling disconnected from the page.
- Listen Mode queue drawer header shows the current song position out of the total queue/playlist count when that information is available.
- Listen Mode waveform colors are derived from the current dynamic artwork theme while staying visually distinct from the background.
- Listen Mode dynamic theme changes are visible across the player panel, controls, and page gradient while preserving the dark neutral base and Signal Aperture gold/blue accent language.
- Playlist import and queue mode controls live in the right Queue tab, not in the left room overview sidebar or center media stage.
- The Queue tab uses a clear stacked structure: Add media card, Queue controls card, Up Next/History segmented tabs, then compact queue/history cards.
- Queue cards stay compact with thumbnail, title, metadata, status badges, and clear actions for play now, play next, reorder, remove, and optional pin.
- The interface feels polished and product-grade, not like a prototype dashboard.

## Responsive Requirements

- Desktop supports media stage plus side panels without overlap.
- Tablet uses collapsible panels or tabs while keeping the media stage primary.
- Mobile supports all core actions without horizontal scrolling.
- Long URLs, titles, and names do not overflow their containers.
- Controls maintain stable dimensions across state changes.

## Accessibility Requirements

- Core room actions are keyboard accessible.
- Buttons, sliders, menus, tabs, and dialogs have accessible names and focus states.
- Logo and loading animations do not replace text labels, page titles, accessible names, or status announcements.
- Playback and connection status changes are announced where useful.
- Host/controller state is conveyed with text or icons, not color alone.
- Avatars and crowns do not become the only indicator of host role; role text or labels remain available where needed.
- Animated avatars and crown overlays fall back to static visuals when reduced motion is preferred.
- Notification and invite pop-ups are keyboard reachable and dismissible.
- Reduced-motion preferences are respected.

## Performance Requirements

- Direct media sync events feel immediate under normal network conditions.
- Playback drift is corrected automatically according to defined thresholds.
- Queue and presence updates do not cause unnecessary full-page re-renders.
- Dashboard presence indicators are based on active/fresh presence, not stale memberships.
- YouTube metadata lookups are cached or rate-limited so provider API quota issues do not degrade room playback.
- Playlist imports are paginated and non-blocking, with loading/error states that do not freeze playback or the room UI.
- Queue drawer height changes, playlist selection overlays, waveform rendering, and dynamic theme transitions do not interrupt active playback or mutate the current playback timeline.
- Playlist API usage is server-side and quota-aware; API keys are never shipped to client JavaScript.
- Remote browser workers have resource limits and cleanup behavior.
- The room UI remains responsive while media is buffering or reconnecting.
- Brand assets are optimized for navbar, favicon, and app-icon use and do not ship oversized concept artwork into normal page loads.

## Review And QA Evidence Requirements

- Markdown task files remain the canonical project record.
- HTML review artifacts are used only when they improve visual review, decision review, implementation handoff, or QA readiness.
- Major UI milestones include browser visual verification at the current local app URL, `http://127.0.0.1:5371`, unless the port is intentionally changed.
- Release or commit preparation uses `qa-release-gate` and documents verification, blockers, and manual review needs.
- Commit preparation remains report-first and must not stage, commit, or push without explicit approval.

## Error State Requirements

- Invalid or unsupported media URLs show actionable feedback.
- Autoplay-blocked clients are prompted for interaction.
- Realtime disconnects show reconnecting state and recover with a fresh snapshot.
- Browser worker startup failure shows a clear failed state.
- Blocked or unsupported websites in browser mode do not crash the room.
- Permission-denied actions explain that the user lacks control or queue rights.
- Playlist import failures explain whether the playlist is inaccessible, private, unsupported, quota-limited, or temporarily unavailable when that information is known.

## Must Not Break

- No user other than the active controller can control the remote browser.
- Queue mutations must not desynchronize now-playing state.
- Playlist import, shuffle, smart shuffle, loop, and autoplay-related behavior must not reorder or replace the currently playing item unexpectedly.
- Queue mode changes must not break existing play, pause, seek, drift correction, queue play-now, or auto-advance behavior.
- Idle cleanup must not delete saved rooms or their queues.
- Guest display names must not be treated as stable user IDs.
- Avatar display names must not be treated as stable user IDs.
- Guests must not bypass room permissions through direct API calls.
- Friend room invites must not bypass room privacy, membership, or friendship checks.
- Browser workers must not persist indefinitely after rooms close.
- Private rooms should not be indexed or exposed publicly.
- The implementation must not claim to support DRM-protected or restricted third-party playback unless it is legally and technically verified.
- YouTube audio must not be extracted, isolated, promoted separately from video, or played from a hidden/background player.
