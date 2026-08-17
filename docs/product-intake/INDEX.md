# Product Intake Index

This is the active product backlog. Priority is advisory until the owner approves
scheduling. Open [[INBOX]] for quick capture and [[README]] for operating rules.

| ID                                                                | Type       | Priority | Status             | Area              | Summary                                                   | Related work       |
| ----------------------------------------------------------------- | ---------- | -------- | ------------------ | ----------------- | --------------------------------------------------------- | ------------------ |
| [MW-BUG-001](items/MW-BUG-001-long-participant-names.md)          | Bug        | P1       | Needs reproduction | Room admission    | Long names may prevent joining or normal room use         | TASK-012           |
| [MW-BUG-002](items/MW-BUG-002-saved-room-dashboard-gap.md)        | Bug        | P1       | Needs reproduction | Account rooms     | Attached room can disappear from dashboard after sign-out | TASK-002.10        |
| [MW-BUG-003](items/MW-BUG-003-google-redirect-black-player.md)    | Bug        | P1       | Needs reproduction | Auth / playback   | Redirect failure may leave controls active without media  | TASK-012           |
| [MW-BUG-004](items/MW-BUG-004-uploaded-session-renewal-freeze.md) | Bug        | P1       | Needs reproduction | Uploaded playback | One participant can freeze while room progress continues  | TASK-009           |
| [MW-BUG-005](items/MW-BUG-005-cross-device-like-state.md)         | Bug        | P1       | In progress        | Recommendations   | Reconcile account Likes across already-open clients       | TASK-011           |
| [MW-BUG-006](items/MW-BUG-006-host-refresh-playback-drift.md)     | Bug        | P1       | Needs reproduction | Playback sync     | Resume can start far from authoritative room position     | Playback stability |
| [MW-FEAT-001](items/MW-FEAT-001-owner-enabled-vr.md)              | Feature    | P3       | Ready for planning | Spatial cinema    | Owner toggle exposes VR mode and headset prompt           | TASK-008           |
| [MW-FEAT-002](items/MW-FEAT-002-first-visit-privacy-notice.md)    | Feature    | P2       | Ready for planning | Privacy UX        | Add an accurate first-visit privacy notice if required    | Privacy review     |
| [MW-FEAT-003](items/MW-FEAT-003-account-rooms-surface.md)         | Feature    | P1       | Planned            | Account rooms     | Replace placeholder Rooms tab with durable room data      | TASK-002.10        |
| [MW-QOL-001](items/MW-QOL-001-simplify-listen-youtube-embed.md)   | QoL        | P2       | Planned            | Listen player     | Reduce duplicate iframe controls and add copy-link        | Add/Discover       |
| [MW-QOL-002](items/MW-QOL-002-drag-drop-queue.md)                 | QoL        | P2       | Ready for planning | Queue             | Reorder queue items directly instead of repeated clicks   | Queue UX           |
| [MW-QOL-003](items/MW-QOL-003-media-session-room-authority.md)    | QoL        | P2       | Needs verification | Media Session     | Verify device controls use room-authoritative actions     | TASK-006           |
| [MW-QOL-004](items/MW-QOL-004-previous-button-behavior.md)        | QoL        | P2       | Ready for planning | Playback          | Restart first, then move to previous on repeated action   | Playback UX        |
| [MW-QOL-005](items/MW-QOL-005-persist-local-volume.md)            | QoL        | P2       | Needs verification | Player settings   | Preserve chosen volume through refresh                    | Personalization    |
| [MW-OPS-001](items/MW-OPS-001-controlled-conversion-prep.md)      | Operations | P1       | Planned            | Media processing  | Restore CloudConvert safely and plan local preparation    | Incident follow-up |

## Current Focus

1. Release and live-test
   [[items/MW-BUG-005-cross-device-like-state|MW-BUG-005]], then close TASK-011.
2. Plan account-room projection with
   [[items/MW-FEAT-003-account-rooms-surface|MW-FEAT-003]] and
   [[items/MW-BUG-002-saved-room-dashboard-gap|MW-BUG-002]].
3. Reproduce remaining P1 playback and admission reports before implementation.
