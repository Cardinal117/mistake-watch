# Review notes and decision gates

Date: 2026-09-08. 028.1 implementation and local migration/QA completed; see
[verified evidence](implementation-028.1.md). No Git publication or production change.

## Evidence and checkout context

The canonical checkout contains unrelated owner/agent changes and is older than
the recent mobile release. Planning inspected recent code under
`.worktrees/task-027-room-flow` and the locally available `origin/main` reference
`c64196e6d70b40643d5926073b89a902fd13a128`. This is a local source baseline, not a
fresh production or remote-state audit. Recheck main before implementation.

Task directories in the canonical tree, recent worktree and main reference were
checked: TASK-028 was available. TASK-025 exists locally and TASK-026/027 in the
recent worktree/main. This packet does not supersede their accepted behavior.

Observed source anchors (paths relative to repository root at that baseline):

| Source | Planning consequence |
| --- | --- |
| `lib/rooms/actions.ts` / `createRoomAction` | Existing generic creation makes a guest-hosted room then attaches the account; do not reuse unchanged for private Personal creation |
| `lib/rooms/membership.ts` / `resolveRoomMembership` | Account-first lookup with guest-cookie fallback is shared with live admission; Personal policy must constrain fallback without regressing multi-device fixes |
| `lib/rooms/live-admission.ts` | Live grants already use membership resolution; extend the trusted boundary rather than create parallel admission |
| `lib/rooms/lifecycle.ts` | Application cleanup selects open unsaved rooms; new persistent kinds need explicit protection |
| `supabase/migrations/20260529140202_room_lifecycle_saved_rooms.sql` | SQL cleanup and scheduled lifecycle exist too; UI/save behavior alone cannot guarantee persistence |
| `lib/recommendations/persistence.ts` | Event validation and attribution fields already exist; inventory all downstream outbox/aggregation paths before defining policy migration |
| `spacetime/src/index.ts` | Trusted seed/admission grants already exist; keep one live authority |
| `lib/account/room-projection.ts`, `room-data.ts`, `room-list-view.ts` | Reuse current room projection surface for minimal Legacy/Personal entry changes; full integration inspection belongs to implementation |

Read product-intake README, INDEX and raw room proposal without modifying them.
Reviewed the recent HANDOFF/COMMANDS and the owner-requested recommendation
direction. Native memory was used for orientation only; private vault context was
older than the source baseline and was not used as release proof.

## Decision status

| Decision | Status / gate |
| --- | --- |
| Five kinds including transitional Legacy; Watch/Listen separate | Agreed direction |
| Legacy under Saved Rooms, no automatic conversion/retirement | Explicit owner decision |
| Shared replaces Global wording and blends consenting participants | Agreed direction |
| Personal account-private, persistent, manual additions plus future continuation | Agreed direction |
| One canonical Personal per account, unique across closed rows | Implemented locally in 028.2: idle-closed resumes; administrative closed/archived stays blocked |
| Additive kind field with Legacy compatibility default | Proposed schema method; validate migration and old clients in 028.1 |
| Shared/Themed created by signed-in accounts initially | Shared confirmed active non-anonymous accounts in 028.4; Themed confirmed in 028.5, with existing Legacy invitation/guest access |
| Temporary guest creation supported | Implemented locally in 028.6 for guests and active accounts |
| Temporary expiry/operational retention/deletion | Owner approved one-hour inactivity/rejoin grace and 24-hour closed retention; no absolute active-room cap. Likes/catalogue survive; account deletion closes owned rooms; UUID-only expiry/replay receipts remain |
| Shared consent withdrawal and profile erasure | 028.3 implemented consent epochs: withdrawal removes implicit contributions immediately; re-grant does not revive them. Likes and account erasure remain separate; UI implemented locally in 028.4 |
| Shared disconnect grace and theme confidence thresholds | Later measured choices; no arbitrary values frozen here |
| Themes constrain automatic output, manual items cannot broaden theme | Agreed; quality proof belongs to engine follow-on |
| Legacy conversion, Rooms Hub, startup preferences, new ranker/Autoplay | Deferred; separate approved scope |

These later decisions do not block Legacy characterization/spec review. They do
block exposing the affected later kinds with promises that are not enforced.

## Documentation review

- Full packet separates owner direction from engineering proposals and unresolved policy.
- Tasks are ordered with security, migration and test gates; no application change authorized by this record.
- Source paths and relative document links checked during documentation preparation.
- Local QA for 028.1 through 028.6 is recorded in the implementation reports; 028.7 records the original retirement blocker and the subsequently verified local R3 correction.

## Next implementation boundary

The [R3 correction](implementation-028.7-R3.md) now closes the persistent-room
live-authority gap locally, including owner deletion, retry and stale-grant denial.
Seven combined browser tests and a separate three-session owner-deletion test pass.
The earlier integration report retains the original red evidence. Hosted/device
acceptance and separately approved Git/release operations remain pending.
Keep High effort for the durable/live rollout boundary.

Temporary expiry, retained notices and safe purge remain implemented locally.
Recommendation quality and continuous Autoplay remain later milestones.
