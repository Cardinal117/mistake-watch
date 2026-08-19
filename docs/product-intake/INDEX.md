# Product Intake Index

This is the active product backlog. Priority is advisory until the owner approves
scheduling. Open [[INBOX]] for quick capture and [[README]] for operating rules.

| ID                                                                      | Type        | Priority | Status             | Area              | Summary                                                   | Related work       |
| ----------------------------------------------------------------------- | ----------- | -------- | ------------------ | ----------------- | --------------------------------------------------------- | ------------------ |
| [MW-BUG-001](items/MW-BUG-001-long-participant-names.md)                | Bug         | P1       | Needs reproduction | Room admission    | Long names may prevent joining or normal room use         | TASK-012           |
| [MW-BUG-002](items/MW-BUG-002-saved-room-dashboard-gap.md)              | Bug         | P1       | In progress        | Account rooms     | Attached room can disappear from dashboard after sign-out | TASK-014           |
| [MW-BUG-003](items/MW-BUG-003-google-redirect-black-player.md)          | Bug         | P1       | Needs reproduction | Auth / playback   | Redirect failure may leave controls active without media  | TASK-012           |
| [MW-BUG-004](items/MW-BUG-004-uploaded-session-renewal-freeze.md)       | Bug         | P1       | Needs reproduction | Uploaded playback | One participant can freeze while room progress continues  | TASK-009           |
| [MW-BUG-006](items/MW-BUG-006-host-refresh-playback-drift.md)           | Bug         | P1       | Needs reproduction | Playback sync     | Resume can start far from authoritative room position     | Playback stability |
| [MW-BUG-007](items/MW-BUG-007-signed-in-room-remains-browser-scoped.md) | Bug         | P1       | In progress        | Account rooms     | Signed-in room can remain browser-scoped                  | TASK-014B          |
| [MW-BUG-008](items/MW-BUG-008-tv-mode-like-control-missing.md)          | Bug         | P2       | Needs verification | TV mode           | Like control is missing from TV mode                      | TASK-002.5G, 011   |
| [MW-BUG-009](items/MW-BUG-009-high-browser-resource-usage.md)           | Bug         | P1       | In progress        | Performance       | Room playback consumes excessive browser resources        | TASK-015           |
| [MW-BUG-011](items/MW-BUG-011-room-picks-actions-permission-toast.md)   | Bug         | P2       | Needs verification | Recommendations   | Room Picks actions may reject permitted members           | TASK-011           |
| [MW-BUG-014](items/MW-BUG-014-youtube-embed-too-many-requests.md)       | Bug         | P1       | Needs reproduction | YouTube playback  | One user repeatedly receives provider throttling          | TASK-004           |
| [MW-FEAT-001](items/MW-FEAT-001-owner-enabled-vr.md)                    | Feature     | P3       | Ready for planning | Spatial cinema    | Owner toggle exposes VR mode and headset prompt           | TASK-008           |
| [MW-FEAT-002](items/MW-FEAT-002-first-visit-privacy-notice.md)          | Feature     | P2       | Ready for planning | Privacy UX        | Add an accurate first-visit privacy notice if required    | Privacy review     |
| [MW-FEAT-003](items/MW-FEAT-003-account-rooms-surface.md)               | Feature     | P1       | In progress        | Account rooms     | Replace placeholder Rooms tab with durable room data      | TASK-014           |
| [MW-FEAT-004](items/MW-FEAT-004-create-room-from-account-rooms.md)      | Feature     | P2       | Ready for planning | Account rooms     | Create a room directly from Account Rooms                 | TASK-014C          |
| [MW-FEAT-005](items/MW-FEAT-005-local-ai-dj-intent-router.md)           | Feature     | P1       | Ready for planning | AI DJ             | Route local intent into bounded tools and escalation      | TASK-002.10B, 011  |
| [MW-FEAT-006](items/MW-FEAT-006-local-audio-companion-extension.md)     | Feature     | P2       | In progress        | Listen visuals    | Analyse user-approved tab audio locally for visuals       | TASK-015, 018      |
| [MW-FEAT-007](items/MW-FEAT-007-native-web-audio-analysis.md)           | Feature     | P3       | Ready for planning | Media analysis    | Analyse accessible media locally through Web Audio        | TASK-015, 018      |
| [MW-QOL-001](items/MW-QOL-001-simplify-listen-youtube-embed.md)         | QoL         | P2       | Planned            | Listen player     | Reduce duplicate iframe controls and add copy-link        | Add/Discover       |
| [MW-QOL-002](items/MW-QOL-002-drag-drop-queue.md)                       | QoL         | P2       | Ready for planning | Queue             | Reorder queue items directly instead of repeated clicks   | Queue UX           |
| [MW-QOL-003](items/MW-QOL-003-media-session-room-authority.md)          | QoL         | P2       | Needs verification | Media Session     | Verify device controls use room-authoritative actions     | TASK-006           |
| [MW-QOL-004](items/MW-QOL-004-previous-button-behavior.md)              | QoL         | P2       | Ready for planning | Playback          | Restart first, then move to previous on repeated action   | Playback UX        |
| [MW-QOL-005](items/MW-QOL-005-persist-local-volume.md)                  | QoL         | P2       | Needs verification | Player settings   | Preserve chosen volume through refresh                    | Personalization    |
| [MW-QOL-006](items/MW-QOL-006-tv-mode-card-transitions.md)              | QoL         | P3       | Ready for planning | TV mode           | Add restrained card-deck transitions                      | TASK-002.5G        |
| [MW-QOL-007](items/MW-QOL-007-configurable-listen-artwork.md)           | QoL         | P2       | Ready for planning | Listen visuals    | Configure artwork per visualization and improve framing   | TASK-015           |
| [MW-QOL-008](items/MW-QOL-008-tv-mode-settings-access.md)               | QoL         | P2       | Ready for planning | TV mode           | Open TV settings without leaving TV mode                  | TASK-002.5G        |
| [MW-QOL-009](items/MW-QOL-009-suicide-mode-visualization.md)            | QoL         | P3       | Ready for planning | Listen visuals    | Add an optional owner-named visualization                 | TASK-015           |
| [MW-QOL-010](items/MW-QOL-010-direct-play-action-parity.md)             | QoL         | P1       | Ready for planning | Add Media         | Give direct Play Now media Like and Play Next parity      | TASK-002, 011      |
| [MW-OPS-001](items/MW-OPS-001-controlled-conversion-prep.md)            | Operations  | P1       | Planned            | Media processing  | Restore CloudConvert safely and plan local preparation    | Incident follow-up |
| [MW-OPS-002](items/MW-OPS-002-living-documentation-refresh.md)          | Operations  | P2       | Ready for planning | Documentation     | Keep concise product and architecture docs current        | TASK-009, 013      |
| [MW-OBS-001](items/MW-OBS-001-spacetime-participant-cache-warning.md)   | Observation | P3       | Needs reproduction | Live room sync    | Participant update can target a missing cached row        | TASK-009, 012      |

## Current Focus

1. Collect an affected-versus-working evidence bundle for
   [[items/MW-BUG-014-youtube-embed-too-many-requests|MW-BUG-014]] before
   changing provider or player behavior.
2. Plan [[items/MW-QOL-010-direct-play-action-parity|MW-QOL-010]] as a compact
   Add Media action-parity task.
3. TASK-015A2 owner QA passed. Run TASK-015B as a separately measured
   raster/throttling experiment before resolving
   [[items/MW-BUG-009-high-browser-resource-usage|MW-BUG-009]]. Keep
   [[items/MW-QOL-007-configurable-listen-artwork|MW-QOL-007]] as later
   composition work rather than expanding the performance task.
4. Prepare a research/prototype packet for
   [[items/MW-FEAT-005-local-ai-dj-intent-router|MW-FEAT-005]]. Preserve server
   authority and do not connect experimental inference directly to room
   mutations.
5. Reconcile the released TASK-014 guest-footer refinement and completed owner
   QA into the Account Rooms task records before closing
   [[items/MW-FEAT-003-account-rooms-surface|MW-FEAT-003]].
6. Schedule [[items/MW-QOL-008-tv-mode-settings-access|MW-QOL-008]] as a compact
   UI task; keep optional TV-mode motion behind current reliability work.
7. Run TASK-018 Phase 2 Opera GX accuracy, detector-only resource, and objective
   steady-state audio-level QA for
   [[items/MW-FEAT-006-local-audio-companion-extension|MW-FEAT-006]] before
   connecting a renderer. Keep
   [[items/MW-FEAT-007-native-web-audio-analysis|MW-FEAT-007]] deferred.
