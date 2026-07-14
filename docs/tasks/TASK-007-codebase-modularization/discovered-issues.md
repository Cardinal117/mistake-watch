# TASK-007 Discovered Issues

This register separates confirmed defects from security hardening, release gaps,
and deferred architecture work found while implementing Batch 1. Batch 1 did
not change these behaviors unless explicitly noted.

## Tracking and validation status

| ID | Priority | Validation state | Finding | Required closing evidence |
| --- | --- | --- | --- | --- |
| MW-BUG-001 | P1 | Closed after production two-client QA | Uploaded-media autoplay used separate canonical writes | Completed |
| MW-BUG-002 | P1 | Closed after authenticated live QA | Passive direct-player events published canonical room state and reset mode-switch position | Completed |
| MW-BUG-003 | P1 | Fix implemented; live QA pending | Play Next priority remained set after an item became active | Manual and automatic advancement consume the badge and state |
| MW-SEC-001 | P1 | Code/storage condition confirmed; owner-only end-to-end reproduction pending | `owner_only` appears not to revoke permanent R2 URL access | Anonymous URL denial for owner-only object plus response-redaction tests |
| MW-QA-001 | P2 | Confirmed release gap | Owner-authenticated watch/upload QA is live-only | Preview owner/member/guest checklist passes |
| MW-PERF-001 | P2 | Confirmed performance fact, not a bug | Both room modes remain statically imported | Before/after bundle and interaction measurement |
| MW-ARCH-001 | P2 | Confirmed maintainability debt, not a bug | Four major monoliths remain above 1,500 lines | Batch 2-3 file-ceiling and regression gates pass |
| MW-TEST-001 | P3 | Confirmed test fragility | Several regression tests remain source-regex based | Behavioral replacements pass without weaker security coverage |
| MW-UX-001 | P3 | Observation only | Live-room hydration can briefly expose empty fallback state | Reproduced visible flicker or layout-shift measurement |
| MW-PROC-001 | Process | Confirmed workflow limitation | Parallel agents shared one working tree view | Future parallel run uses isolated worktrees |

This file is the canonical discovery register for TASK-007. A finding does not
move to implementation until it receives its own approved task/chunk. Test and
QA evidence must be added here before an item is marked closed.

## MW-BUG-001: Uploaded-media autoplay is not atomic

**Status:** Closed after the additive SpacetimeDB reducer and matching frontend
were released, followed by production owner/guest QA.

`lib/spacetime/use-live-room.ts` handles a queued uploaded asset by calling
`loadMediaSource`, then separately calling `setPlaybackState`, while ordinary
queue advancement uses the atomic `advanceQueueItem` reducer. A disconnect,
stale room revision, duplicate end event, or failure between these calls can
leave source and playback state partially advanced.

Evidence:

- Before the fix, `tests/player/youtube-autoplay-atomic.test.mjs` failed
  `live room autoplay uses the atomic advance reducer`.
- The uploaded branch is in `advanceToNextQueueItem` near
  `lib/spacetime/use-live-room.ts:879`.
- The separate playback call is near `lib/spacetime/use-live-room.ts:921`.

Recommended action:

- Add an uploaded-aware atomic reducer or extend `advanceQueueItem` to accept
  the validated uploaded session reference.
- Preserve expected active item/source stale guards.
- Test duplicate ended events, disconnect between operations, stale sessions,
  and a failed uploaded-session creation.

Implementation evidence:

- Uploaded-session creation remains behind the existing Supabase account,
  catalogue, ready-asset, and durable room-authority checks.
- The client verifies that the returned session belongs to the queued asset,
  then calls only `advanceUploadedQueueItem` for canonical room mutation.
- Session creation or asset-binding failures stop before the reducer call and
  surface through the existing live-room error state.
- The released `advance_queue_item` payload remains backward-compatible and
  refuses uploaded-asset references without changing canonical state.
- The additive `advance_uploaded_queue_item` reducer checks the expected current
  item, expected current source, and required expected next queue item before
  changing queue or playback state.
- A resolved source override is accepted only when the selected queue item is
  an opaque uploaded-asset reference and the override is an opaque
  uploaded-session reference. Normal queue sources reject overrides.
- Queue history, active item, source, duration, position, and playing status are
  committed by a shared helper in the same SpacetimeDB reducer transaction.
- Publishing the additive reducer before the frontend keeps existing clients
  valid and permits frontend rollback without reverting the SpacetimeDB module.
- The formerly failing atomic-autoplay regression now passes.

Closing evidence:

- Release commit `02210bf` was pushed to `main`.
- The production SpacetimeDB module accepted the additive reducer without a
  breaking migration plan.
- Vercel deployment `dpl_5cQfwRQC5hJXHkAwqx9xHpdSmeNg` became ready on both
  production aliases and passed health checks.
- The user confirmed an uploaded item advanced naturally exactly once, retained
  playback for a second participant, and remained hidden from the guest
  catalogue.
- Network QA confirmed session creation and session-scoped playback endpoints,
  with no permanent R2 URL exposed in room state or responses.
- Reordering or removing the predicted next item caused the stale transition to
  do nothing, as required.

## MW-BUG-002: Passive direct-player events can overwrite canonical state

**Status:** Closed after authenticated live QA on the production release.
Temporary-production QA originally reproduced the visible symptom:
switching from Listen to Watch reset playback to `0:00`, while the restored
production baseline preserved the position.

`direct-media-player.tsx` publishes room state from native `onPause`, `onPlay`,
and `onSeeked` callbacks. These events can be caused by applying canonical room
state locally, browser buffering, source replacement, or autoplay handling, not
only by an authorized user command. Publishing them back can create feedback
loops or allow a passive client to overwrite newer canonical state.

Evidence:

- `tests/player/youtube-autoplay-atomic.test.mjs` fails
  `passive player pause and buffer events do not publish canonical room state`.
- Native handlers are near `components/room/direct-media-player.tsx:470-489`.

Recommended action:

- Keep canonical writes in explicit authorized transport actions and ended/error
  handling with stale guards.
- Treat native pause/play/seek events as local observations unless an explicit
  user action token proves intent.
- Add multi-client reconciliation tests for pause, buffer, seek, source change,
  reconnect, and autoplay rejection.

Implementation evidence:

- Native direct-player `pause`, `play`, and `seeked` events no longer write
  canonical room state. Explicit authorized transport controls remain the
  canonical write path.
- Ended and error handling remain active because they are terminal media
  outcomes rather than passive synchronization observations.
- The player regression suite now asserts both sides of the continuity
  contract: mode reducers preserve session fields, and a remounting direct
  player cannot publish an initial `0:00` observation.
- Close this issue only after owner-authenticated Listen/Watch switching passes
  for paused and playing YouTube, direct, and uploaded media.

Closing evidence:

- The user confirmed live YouTube and uploaded playback preserve elapsed
  position in both Listen and Watch modes after deployment.

## MW-BUG-003: Play Next priority survives activation

**Status:** Natural advancement is fixed in production. A manual uploaded-play
follow-up is implemented and awaiting ordered release plus live retest.

Items promoted by autoplay, manual play, or failure recovery changed to
`playing` while retaining `is_play_next: true`. The active row was therefore
still labelled NEXT and continued to carry one-shot priority state until it was
removed or another item became active.

Implementation evidence:

- Every SpacetimeDB transition that promotes a queue item to `playing` now
  writes `is_play_next: false` in the same reducer transaction.
- Queue order, pin state, source references, permissions, and reducer payloads
  are unchanged.
- The regression covers atomic autoplay, explicit play, and failure-recovery
  advancement.
- SpacetimeDB build, sync/player, queue, and reducer tests pass.
- Follow-up QA proved natural advancement was correct but manual Next still
  loaded an uploaded session without promoting the selected queue row. That
  stale row retained NEXT and caused Previous to select the same upload again.
- Additive `play_uploaded_queue_item` now validates the selected queue row and
  opaque uploaded-session reference before reusing the same atomic queue commit
  as autoplay. The client no longer performs separate source and playback
  writes for manual uploaded selection.

Closing evidence required:

- The behavior-only module update was accepted by `mistake-watch-rooms`; the
  migration plan contained no schema operations.
- Database identity remained
  `c2002b3535d2c6109cd2141bff9f9b30bf491a85905c2f5803a63a65dd27d83a`.
- Add uploaded media as Play Next, advance both manually and naturally, and
  confirm the NEXT badge disappears as soon as the item becomes active.
- While the uploaded item is active, select Previous and confirm the prior item
  becomes active instead of reloading the upload.
- Confirm the second participant observes the same consumed priority state.

## MW-SEC-001: `owner_only` does not revoke permanent R2 access

**Status:** Code and storage conditions confirmed; dedicated owner-only
end-to-end reproduction still required before implementation. This is not a
current unauthorized catalogue leak. Production contains 36 assets, all marked
`public`; no `owner_only` rows were found. A sampled public asset correctly
returned HTTP 200 without authentication.

The uploaded catalogue correctly returns no assets when catalogue access is
denied. However, allowed catalogue responses serialize
`media_assets.public_url` as `publicUrl`, upload creation returns a permanent
public URL, and owner-side poster capture reads the media through that value.
Changing an asset to `owner_only` updates only database metadata and does not
change or revoke the R2 URL. Anyone who previously obtained that URL may keep
using it independently of catalogue and room-session checks.

Evidence:

- `lib/media/assets.ts:156` creates a public URL for upload responses.
- `lib/media/assets.ts:1817` maps database `public_url` into catalogue JSON.
- `components/room/watch/media-hub/media-hub-helpers.ts:273` uses
  `asset.publicUrl` for poster capture.
- `updateMediaAssetVisibility` changes only `media_assets.visibility`.
- Session playback itself correctly uses `createPresignedR2GetUrl` in
  `app/api/media/room-sessions/[sessionId]/playback/route.ts`.

Recommended action:

- Decide whether `owner_only` promises metadata hiding or actual object privacy;
  current UI wording implies stronger privacy than the storage boundary gives.
- Stop returning permanent media URLs from `/api/media/assets` and upload
  creation where they are not required.
- Give authorized owner operations a short-lived asset URL endpoint, or move
  poster extraction server-side.
- Add tests asserting catalogue and upload responses do not contain permanent
  owner-only media URLs.
- Rotate/migrate object keys if historical permanent URLs must be invalidated.

Required confirmation test before a fix is approved:

1. Create a dedicated test asset and capture its current public URL.
2. Change it to `owner_only` through the real owner UI/API.
3. Verify catalogue denial for an unauthorized account.
4. Request the previously captured URL without authentication.
5. Treat HTTP 200/206 as confirmation of the object-privacy gap; HTTP 401/403
   would disprove the storage-access portion and narrow the issue to payload
   naming/exposure.

## P2: Preview-only owner QA remains mandatory

Google OAuth does not permit the required owner flow on localhost. Local QA
covered the 331-item listen room, queue virtualization, Add Media, desktop, and
390px mobile behavior, but the local guest could not switch to Watch mode.

Before merge or production release, verify on a preview deployment:

- owner watch/listen switching without losing queue or playback state;
- uploaded catalogue allow/deny behavior;
- owner upload, folder, poster, processing, retry, and abort controls;
- uploaded playback for owner plus a second active participant;
- network payloads contain opaque asset/session references and temporary
  playback URLs, not permanent media URLs in room state.

CloudConvert end-to-end idempotency also remains unverified after the API token
was revoked during the earlier incident. Keep this as a separate controlled
test with spend limits and provider monitoring before normal conversion resumes.

## P2: Static room-mode loading remains

`components/room/room-experience.tsx` statically imports both
`ListenModeLayout` and `WatchModeLayout`, so Batch 1 improves maintainability but
does not reduce initial room code. The measured room bundle increased from
150.4 KB to 151.7 KB gzip due to module-boundary overhead.

Recommended action for Batch 3:

- Dynamically load the inactive room mode.
- Lazy-load hidden media hub, upload, playlist review, and account workflows.
- Preserve loading dimensions and mode-switch state.
- Require a measured payload and interaction comparison before acceptance.

## P2: Remaining major monoliths

Current handwritten files still requiring planned decomposition:

- `components/room/queue-panel.tsx`: 2,205 lines.
- `spacetime/src/index.ts`: 2,193 lines.
- `lib/media/assets.ts`: 1,939 lines.
- `lib/spacetime/use-live-room.ts`: 1,559 lines.

`queue-panel.tsx` and `assets.ts` are Batch 2 priorities. Realtime files belong
to Batch 3 because reducer/schema boundaries and sync behavior have higher blast
radius. Generated `lib/supabase/database.types.ts` is 1,062 lines and should not
be manually split.

## P3: Extracted modules near the ceiling

These are compliant with the 700-line ceiling but should not grow:

- `watch/uploads/use-owner-upload-manager.ts`: 678 lines.
- `listen/queue/queue-drawer.tsx`: 637 lines.
- `listen/add-media/add-media-popover.tsx`: 593 lines.
- `watch/library/watch-media-hub-card.tsx`: 580 lines.
- `listen/header/header-tools.tsx`: 534 lines.
- `watch/uploads/upload-transport.ts`: 521 lines.

Only split them when a stable responsibility boundary is clear. Avoid creating
thin one-function files solely to satisfy a line target.

## P3: Source-regex tests remain brittle

The integration patch removed compatibility-file comments that existed only to
satisfy tests and redirected assertions to the real module tree. The tests still
match implementation text, so harmless renames or syntax changes can fail them
without changing behavior.

Recommended action:

- Keep source checks only for security invariants that cannot be exercised
  cheaply at runtime.
- Prefer exported pure functions, route-level tests, reducer tests, and rendered
  interaction tests for behavior.
- Add a small architecture test for compatibility exports and file ceilings
  instead of encoding function order or exact JSX text.

## P3: Initial live-room hydration observation

During local navigation, the first DOM snapshot briefly showed the fallback
room with zero queue items before the connected snapshot exposed 331 items.
This may be normal hydration rather than a defect, but it can produce visible
content/count flicker on slower devices.

Recommended action:

- Measure fallback-to-live timing and layout shift before changing behavior.
- If visible, retain stable shell dimensions and show an explicit connecting
  state rather than authoritative-looking zero counts.

## Process finding: agent isolation was path-based, not filesystem-based

Both agents observed the same working tree even though they had disjoint file
ownership. Path-scoped commits prevented cross-contamination, but an agent could
have staged another agent's unfinished files.

Recommended action:

- Use separate Git worktrees for future parallel implementation agents where
  tooling permits.
- Continue explicit write ownership and path-scoped staging.
- Integrate and test one commit at a time from a clean branch.

## Recommended order

1. Fix the two confirmed sync defects together as one focused player/realtime
   task with deterministic multi-client tests.
2. Audit and remove permanent R2 URL exposure from authorized browser payloads.
3. Complete preview owner/upload QA for Batch 1.
4. Commit and merge Batch 1 only after that preview gate passes.
5. Start TASK-007 Batch 2 with `queue-panel.tsx`, then `lib/media/assets.ts`.
6. Reserve static mode splitting and realtime decomposition for Batch 3.
