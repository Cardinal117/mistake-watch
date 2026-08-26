---
id: MW-QOL-012
type: qol
status: in-progress
priority: P2
area: room-permissions-ui
created: 2026-08-25
updated: 2026-08-26
related: [TASK-021, TASK-012]
---

# Open participant permissions from the room avatar cluster

> [!qol] In progress - P2

- **Requested:** Make the Listen-room avatar cluster open the participant and
  permissions surface while preserving the compact participant-count blip.
- **Expected:** Active participant avatars remain visible. The existing numeric
  blip continues to represent the additional participant/history population
  defined by the current room contract, without inventing a second history
  feature.
- **Authority:** Owners receive existing permission controls. Members and
  guests receive an appropriate audience view without privileged actions.
- **Constraints:** Preserve server authority and role checks. The cluster must
  remain keyboard accessible, responsive, and usable when names or avatars
  overflow.
- **Decision:** This interaction is planned as a bounded batch inside
  [[../../tasks/TASK-021-listen-room-experience-overhaul/proposal|TASK-021]].
- **Current evidence:** TASK-021 Batch B is locally implemented and user
  accepted. Owner/member/guest presentation tests, guest authority checks,
  keyboard focus restoration, and the required responsive widths pass. The
  atomic Git checkpoint remains outstanding.
