# Mistake Watch Sync Model

## Task 11-15.C Scope

Task 11 introduced the SpacetimeDB room engine skeleton. Task 12 adds live
presence, host authority, permission state, active controller state, generated
bindings, and the first frontend subscription hook for room panels.

Task 13 adds deterministic playback-state types and sync math in isolation.
Task 14 wires that model into direct media and HLS playback with host-owned
source loading, live playback reducers, and client drift correction. Queue
mutation authority and provider search remain later tasks. Task 14.B adds a
YouTube IFrame Player API adapter that uses the same canonical playback state
for embeddable YouTube videos.

Task 15 makes the active room queue a live SpacetimeDB surface. Queue ordering,
add/remove/clear actions, and now-playing selection update through reducers so
all subscribed clients see one authoritative queue state.

Task 15.B keeps queue metadata lightweight while provider credentials and upload
infrastructure are deferred. YouTube queue rows derive thumbnails from the
normalized video id, use a generic label until the player resolves the real
title, and mirror active player title/duration metadata back into the active
live queue item.

Task 15.C adds live room identity polish. The room name is mirrored into
SpacetimeDB so joined clients update immediately after a host rename, while
Supabase remains the durable room-name store. The desktop room rail now reads
the same live participants as the People tab instead of relying on the initial
server snapshot.

Task 15.D should align the dashboard with the same rule: active people counts
must represent connected/fresh presence, not durable room membership. Supabase
membership rows answer "who has joined or saved this room"; SpacetimeDB presence
answers "who is in the room now."

## Authority Boundary

Supabase remains durable:

- rooms
- guest identities
- room memberships
- room settings
- member permission overrides
- persisted queue records
- playback history or recovery records

SpacetimeDB owns active room state:

- active room session row
- connected/idle participants
- current live queue snapshot
- active controller identity shell
- live permission flags
- current playback timeline shell
- room-scoped error events

Dashboard surfaces must not treat durable `room_members` rows as online
presence. Until dashboard aggregation can query active SpacetimeDB room
presence directly, it should either show saved/member counts with explicit
labels or use a short server-side freshness threshold based on `last_seen_at`.

The frontend should treat Supabase IDs as durable references and SpacetimeDB
rows as the current low-latency room state.

## Live Tables

`room_session`
: One row per active room. Tracks room id, mode, host member id, controller
identity, live room name, playback status, timeline shell, active queue item
id, source title, source type, source URL, and the server timestamp for the
last state update.

`room_participant`
: One row per active or recently idle member connection. Tracks room id,
member id, display name, SpacetimeDB identity, connection id, role, status, and
last-seen time.

`room_permission`
: One row per room member for queue add, playback control, and browser-control
capability flags. Updates are host-owned through reducers.

`live_queue_item`
: The active room queue snapshot. It mirrors selected Supabase queue item ids
and metadata so live clients can subscribe without repeatedly reading Supabase.

`room_error`
: Room-scoped connection, reducer, and future playback error payloads.

## Reducer Skeleton

`seed_room_session`
: Creates the initial room session shell if it does not already exist.

`join_room`
: Adds or replaces the caller's participant row for a room.

`heartbeat`
: Refreshes participant status and emits a room error if heartbeat happens
before join.

`leave_room`
: Removes the participant row for a member and room.

`set_member_permissions`
: Host-only reducer for queue, playback, and browser-control capability flags.

`grant_room_control`
: Host-only reducer that assigns the active controller identity.

`revoke_room_control`
: Host-only reducer that clears the active controller identity.

`load_media_source`
: Host-only reducer that stores the direct/HLS source, resets position to zero,
sets playback rate to one, and pauses the room before playback starts.

`set_playback_state`
: Host-or-playback-permitted reducer that updates room status, position,
playback rate, and server timestamp for play, pause, seek, buffering, ended, and
error transitions.

`add_queue_item`
: Host-or-queue-permitted reducer that appends a validated source to the active
room queue. Guests can add by default through their live queue permission.

`play_queue_item`
: Host-only reducer that marks one queue item as `playing`, marks the previous
playing item as `played`, updates `room_session.active_queue_item_id`, loads the
item source into the room session, resets position to zero, and pauses until the
host starts playback.

`move_queue_item`
: Host-only reducer that reorders queued items and normalizes queued positions.
The currently playing item is not reorderable.

`remove_queue_item`
: Host-only reducer that removes an item. Removing the active item clears the
session source and returns the room to paused/idle media state.

`clear_queue`
: Host-only reducer that clears upcoming queued items while preserving the
currently playing item.

`update_room_name`
: Host-only reducer that mirrors the durable room name into the active room
session so connected clients update without a page reload.

`on_disconnect`
: Marks participants associated with the disconnected connection as idle.

## Queue Model

The live queue is scoped by `room_id` and sorted by status plus position:

- `playing` is the current now-playing queue item.
- `queued` items are upcoming and can be reordered by the host.
- `played` and `removed` are not shown in the active queue subscription surface.

Queue permissions are enforced server-side:

- Host can add, play now, remove, reorder, and clear.
- Guests can add when their `room_permission.can_add_queue` flag is true.
- Guests cannot remove, reorder, clear, or force a queue item into now-playing.

The frontend validates source URLs before sending queue adds, but SpacetimeDB is
still the authority for who can mutate the queue.

Queue metadata is intentionally progressive:

- Missing duration is represented as pending metadata rather than a fake or
  zero-length duration.
- YouTube thumbnail URLs are derived client-side from the parsed video id.
- Active queue item title and duration are updated by `update_media_title` after
  the player adapter reports real metadata.
- YouTube Data API, oEmbed fetching, R2 media metadata, and uploaded-media
  thumbnails remain separate later tasks.

## Playback State Model

`lib/player/types.ts` defines the client-side canonical playback shape used by
future media adapters:

- `roomId`
- `mode`
- `source`
- `status`
- `positionSeconds`
- `playbackRate`
- `serverUpdatedAtMs`
- `hostMemberId`
- `controllerMemberId`
- `activeQueueItemId`

`status` is intentionally small: `playing`, `paused`, `buffering`, `ended`, and
`error`. The player layer should map provider-specific states into this shape
instead of spreading provider terminology through room sync logic.

## Sync Math

`expectedPositionAt(state, clientNowMs)` calculates the target media position
from the canonical room state. Playing state advances by:

```txt
position_seconds + ((client_now_ms - server_updated_at_ms) / 1000) * playback_rate
```

Paused, buffering, ended, and error states do not advance. The result is clamped
to zero and to the known source duration when a duration is available.

## Drift Thresholds

The default thresholds live in `DEFAULT_SYNC_THRESHOLDS`:

- `settledDriftSeconds`: `0.075`
- `rateCorrectionDriftSeconds`: `0.35`
- `hardSeekDriftSeconds`: `1.5`
- `maxRateCorrection`: `0.06`

Correction behavior:

- Within settled drift: do nothing, or restore canonical playback rate if the
  local element is already using the wrong rate.
- Small drift up to `0.35s`: adjust playback rate subtly instead of seeking.
- Medium drift up to `1.5s`: seek to the expected position.
- Hard drift at or above `1.5s`: hard seek to the expected position.
- Paused or ended canonical state: pause and seek when the local element is
  still playing or outside settled drift.
- Buffering or error canonical state: wait. Do not force local playback.

These values are conservative defaults for direct media/HLS. They can be tuned
after real two-client playback measurements.

## Direct Media Adapter

Task 14 introduces an HTML5 media adapter for direct media URLs and HLS streams:

- Source URLs are validated on the client before a host can submit them.
- HLS URLs ending in `.m3u8` use native HLS when available and `hls.js` when the
  browser needs it.
- Direct file URLs use the browser's built-in audio/video support.
- The room transport controls call `set_playback_state` for play, pause, and
  seek events.
- The active media element samples local position and playback rate every 750ms
  and applies the Task 13 correction decision.
- Unsupported HLS, local media load errors, buffering, ended, error, and
  autoplay-blocked states are surfaced instead of being treated as successful
  playback.

Client validation cannot guarantee remote media will load. CORS headers,
provider hotlink protection, unsupported codecs, or mixed-content rules can
still fail at media-element load time. Those failures are reported locally and,
when the caller is allowed to control playback, reflected into the room playback
state as `error`.

## YouTube Adapter

Task 14.B accepts YouTube watch, short, embed, share, live URLs, and raw
11-character video IDs. These are normalized to canonical watch URLs before
being stored in SpacetimeDB as `source_type = "youtube"`.

The watch room uses the official YouTube IFrame Player API:

- The player API script is loaded from `https://www.youtube.com/iframe_api`.
- The player is created with `enablejsapi=1`, `playsinline=1`, and the current
  page origin.
- YouTube player state changes map into the existing playback statuses.
- The same sync correction loop drives `playVideo`, `pauseVideo`, `seekTo`, and
  `setPlaybackRate`.
- Autoplay blocks and player errors are surfaced as visible room/player states.
- YouTube native controls remain enabled so viewers can use YouTube-owned
  controls such as quality. Unauthorized local play, pause, or seek actions are
  not published to SpacetimeDB and are corrected back toward the canonical room
  timeline.

Each viewer's browser remains responsible for YouTube account state. If a viewer
is signed into YouTube Premium in that browser profile, the embedded player can
use that session. Mistake Watch does not proxy Premium access, bypass ads, or
force videos that YouTube blocks from embedding, login, age, region, or policy
reasons.

YouTube quality is intentionally left to the native player. The current official
IFrame API no longer supports custom quality APIs such as `setPlaybackQuality`
or `getAvailableQualityLevels`, so Mistake Watch should not promise an app-owned
quality picker for YouTube embeds.

## Autoplay And Buffering

Autoplay failure is not treated as successful sync. When the local player
reports an autoplay block while the canonical state is playing, the sync
decision is `user-interaction-required`. Task 14 should surface this as a
visible prompt and retry playback after the user interacts.

Buffering is treated as a server-authoritative hold state. While canonical
status is `buffering`, clients should wait rather than repeatedly seeking or
rate-correcting, because aggressive correction during buffering can create
visible churn and worse rebuffering.

## Frontend Adapter

`lib/spacetime/adapter.ts` deliberately depends on a small
`SpacetimeGeneratedBindings` interface instead of importing generated bindings
directly. After `spacetime generate`, the generated `DbConnection` can be passed
into `createRoomConnection`.

Room subscriptions are scoped to:

- `room_session`
- `room_participant`
- `room_permission`
- `live_queue_item`
- `room_error`

all filtered by `room_id`.

## Local Development

The local app uses:

```bash
NEXT_PUBLIC_SPACETIME_URI=ws://127.0.0.1:5372
NEXT_PUBLIC_SPACETIME_MODULE=mistake-watch-rooms
```

The CLI configuration lives in root `spacetime.json`:

- `database`: `mistake-watch-rooms`
- `module-path`: `./spacetime`
- generated TypeScript bindings: `./lib/spacetime/generated`

The local publish script targets `http://127.0.0.1:5372` explicitly. The
developer-local database currently used by `.env.local` is
`mistake-watch-08qfy`, from `spacetime.local.json`.
