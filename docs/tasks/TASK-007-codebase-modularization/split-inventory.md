# TASK-007 Batch 1 Split Inventory

Counts below are physical source lines, including blank lines and comments. They
describe maintainability, not shipped JavaScript size.

## Totals

| Area | Before | Compatibility entry | New modules | After | Net source lines |
| --- | ---: | ---: | ---: | ---: | ---: |
| Listen | 6,046 | 1 | 18 files / 6,459 lines | 6,460 | +414 |
| Watch | 4,418 | 1 | 20 files / 5,078 lines | 5,079 | +661 |
| Combined | 10,464 | 2 | 38 files / 11,537 lines | 11,539 | +1,075 |

The additional source lines are primarily module imports/exports, explicit prop
and contract types, and formatting needed to give each module an independent
boundary. Production room JavaScript changed by much less: 588.4 KB to 592.8 KB
raw and 150.4 KB to 151.7 KB gzip. Global CSS remained 157.8 KB raw / 22.3 KB
gzip.

## Listen split

Original:

- `components/room/listen-mode-layout.tsx`: 6,046 lines.

Compatibility entry:

- `components/room/listen-mode-layout.tsx`: 1-line export.

New modules:

| Lines | File | Responsibility moved from the original layout |
| ---: | --- | --- |
| 593 | `listen/add-media/add-media-popover.tsx` | URL detection, preview, queue/load actions, notifications and room errors |
| 486 | `listen/add-media/add-media-view.tsx` | Add Media presentation and search/link controls |
| 314 | `listen/add-media/playlist-review-overlay.tsx` | Playlist review, selection, duplicates and duration filters |
| 270 | `listen/discovery/discovery-panel.tsx` | Discovery tabs and recommendation surface |
| 313 | `listen/discovery/media-cards.tsx` | Discovery and recommendation media cards |
| 534 | `listen/header/header-tools.tsx` | Header-level room tools and control groups |
| 330 | `listen/header/technical-room-header.tsx` | Desktop technical room header composition |
| 246 | `listen/helpers.ts` | Listen formatting and pure helper functions |
| 449 | `listen/hooks/listen-hooks.ts` | Queue duration, local preferences and listen-specific hooks |
| 400 | `listen/listen-mode-layout.tsx` | Top-level listen composition and state ownership |
| 152 | `listen/mobile/mobile-room-tools.tsx` | Compact mobile room/member/add-media controls |
| 351 | `listen/now-playing/now-playing-panel.tsx` | Artwork, metadata and now-playing presentation |
| 637 | `listen/queue/queue-drawer.tsx` | Queue drawer state, virtualization and controls |
| 315 | `listen/queue/queue-row.tsx` | Individual queue row and metadata priority behavior |
| 337 | `listen/settings/settings-dialogs.tsx` | Listen and room settings dialogs |
| 70 | `listen/shared.ts` | Shared listen contracts and constants |
| 178 | `listen/theme/listen-theme.tsx` | Ambient artwork and listen visual theme |
| 484 | `listen/tv/tv-mode-layout.tsx` | TV mode layout and controls |

Listen module total: 6,459 lines. Largest module: 637 lines.

## Watch split

Original:

- `components/room/watch-mode-layout.tsx`: 4,418 lines.

Compatibility entry:

- `components/room/watch-mode-layout.tsx`: 1-line export.

New modules:

| Lines | File | Responsibility moved from the original layout |
| ---: | --- | --- |
| 100 | `watch/audience/watch-audience-system.tsx` | Members/chat audience drawer composition |
| 164 | `watch/contracts.ts` | Watch, media-library, upload and queue contracts |
| 237 | `watch/header/watch-signal-band.tsx` | Room identity, save/invite/account and mode controls |
| 460 | `watch/library/uploaded-media-library.tsx` | Uploaded catalogue access and library views |
| 580 | `watch/library/watch-media-hub-card.tsx` | Uploaded/discovery cards and owner actions |
| 60 | `watch/media-hub/discovery-sections.tsx` | Discovery section definitions |
| 315 | `watch/media-hub/media-hub-helpers.ts` | Media-hub conversion, folder and playback helpers |
| 99 | `watch/media-hub/use-media-library.ts` | Catalogue loading hook |
| 267 | `watch/media-hub/watch-media-hub.tsx` | Media-hub coordination and state composition |
| 98 | `watch/media-hub/watch-media-hub-section.tsx` | Reusable hub section rendering |
| 440 | `watch/media-hub/watch-media-hub-view.tsx` | Media-hub tab, upload and library presentation |
| 194 | `watch/presentation.tsx` | Queue conversion and presentation helpers |
| 123 | `watch/queue/watch-queue-surface.tsx` | Watch queue drawer/surface composition |
| 194 | `watch/uploads/execute-owner-upload.ts` | One-file owner upload execution |
| 190 | `watch/uploads/media-inspection.ts` | Browser media inspection and poster capture |
| 207 | `watch/uploads/upload-queue.tsx` | Batch and resumable upload queue presentation |
| 521 | `watch/uploads/upload-transport.ts` | Multipart transport, status polling and R2 upload helpers |
| 678 | `watch/uploads/use-owner-upload-manager.ts` | Owner batch/resume/retry/abort upload state machine |
| 114 | `watch/watch-mode-layout.tsx` | Top-level watch composition and surface state |
| 37 | `watch/watch-surface-header.tsx` | Shared watch drawer header |

Watch module total: 5,078 lines. Largest module: 678 lines.

## What remains unsplit

Planned Batch 2 targets:

- `components/room/queue-panel.tsx`: 2,205 lines.
- `lib/media/assets.ts`: 1,939 lines.
- Shared queue/Add Media contracts and duplicated controller behavior.

Planned Batch 3 targets:

- `spacetime/src/index.ts`: 2,193 lines.
- `lib/spacetime/use-live-room.ts`: 1,559 lines.
- Static Watch/Listen imports and hidden workflow loading boundaries.

Other later candidates, not blockers for TASK-007 Batch 1:

- `components/room/transport-controls.tsx`: 899 lines.
- `components/room/youtube-media-player.tsx`: 891 lines.
- `components/account/account-command-panel.tsx`: 806 lines.
- `components/room/direct-media-player.tsx`: 598 lines.
- `lib/media/cloudconvert.ts`: 595 lines.
- `lib/media/r2.ts`: 587 lines.

`lib/supabase/database.types.ts` is generated and should not be manually split.
