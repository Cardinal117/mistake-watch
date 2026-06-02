# Brain Dump: Mistake Watch

## Task Name
Mistake Watch

## Goal
Create a polished, performant, easy-to-navigate website where people can join shared rooms to watch videos, browse a shared remote browser, and listen to synchronized music together.

## Why It Matters
The product should make remote shared watching and listening feel natural: one room, one timeline, simple controls, reliable synchronization, and clear ownership over who controls playback or the shared browser.

## User Flow
- A host creates a room and shares an invite link.
- Guests join the room and see the current mode, media state, participants, and queue.
- The host starts a video, direct media URL, or music item.
- Every listener/viewer stays synchronized with host playback.
- The host can grant shared browser control to one participant at a time.
- The active controller can navigate the remote browser while everyone else watches the same streamed browser output.
- In music mode, the host manages playback while participants can add items to a queue if the room settings allow it.

## Requirements
- Support room-based watch/listen sessions.
- Keep audio and video playback synchronized for everyone in the room.
- Provide direct URL input for quick video links and direct media links.
- Support a shared browser mode where a host or one granted participant controls a remote browser.
- Prevent simultaneous shared browser control by multiple people.
- Support synchronized music listening with host-controlled playback.
- Support a music/video queue with add, remove, reorder, and clear actions according to permissions.
- Feel polished, performant, and easy to navigate.
- Use Supabase for database needs and likely auth.

## Design References
- No project `DESIGN.md` exists yet.
- Product should feel like a focused media lounge: calm, efficient, clear, and premium.
- Avoid cluttered dashboard chrome, marketing-first layout, or hidden core actions.

## Existing Files / Components
- No app source exists in the workspace root yet.
- This task packet defines the initial product and implementation plan.

## Constraints
- Browser mode cannot rely on iframing arbitrary websites because many sites block embedding, use DRM, or restrict cross-origin access.
- Perfect sync is an aspiration; implementation should define measurable drift thresholds and correction behavior.
- Autoplay, DRM, protected media, browser policies, and third-party service terms may limit what can be played or controlled.
- Shared remote browsers are infrastructure-heavy and need isolation, cleanup, resource limits, and abuse prevention.
- Do not build production code during this spec task.

## Acceptance Ideas
- There is a clear architecture for rooms, playback authority, queues, and remote browser control.
- Supabase is included as the database/auth/storage platform.
- The implementation is broken into safe phases with explicit review checkpoints.
- Key risks are captured before coding begins.

## Unknowns
- Should users need accounts, or can rooms support anonymous guests first?
- Should direct URL mode support only direct media files/HLS at first, or also YouTube-style providers through embeds/APIs?
- What deployment target should host the realtime backend and remote browser workers?
- Should music sources be direct audio URLs first, or integrate with provider APIs later?
- How much moderation, room privacy, and content restriction is required for the first release?

## Task 16.F Queue And Playlist Brain Dump

- Users should be able to paste a YouTube or YouTube Music playlist link into the existing Queue input.
- Playlist links should not silently dump every item into the room. The UI should detect the playlist, show a preview, then let the user choose Add All, Shuffle Add, Smart Shuffle Add, Select Items, or Cancel.
- The queue should support advanced modes: Normal, Shuffle, Smart Shuffle, Loop Queue, and Autoplay Related.
- Smart Shuffle should feel curated rather than random: avoid repeating the same artist, channel, playlist source, recent history, or near-duplicate titles when metadata exists.
- Smart Shuffle must not touch the currently playing item, history, pinned items, or play-next intent.
- Playlist import and advanced queue controls belong in the right Queue tab only.
- The left rail stays a compact room overview. The center media/listen stage stays focused on playback.
- Queue cards should become more compact: thumbnail, title, artist/channel, duration, status badges, and small actions for play now, play next, reorder, remove, and optional pin.
- Autoplay Related should have a placeholder structure if real recommendation fetching is not ready, but it must not fake provider recommendation data.
