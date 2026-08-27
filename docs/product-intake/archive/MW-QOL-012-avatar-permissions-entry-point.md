---
id: MW-QOL-012
type: qol
status: complete
priority: P2
area: room-permissions-ui
created: 2026-08-25
updated: 2026-08-27
related: [TASK-021, TASK-012]
---

# Open participant permissions from the room avatar cluster

> [!success] Complete - released with TASK-021

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
- **Completion evidence:** TASK-021 Batch B is released. The avatar cluster
  preserves active avatars and the numeric blip, opens the audience/permissions
  surface, and retains server-side owner/member/guest authority. Presentation,
  guest denial, keyboard focus restoration, responsive widths, integrated live
  permissions QA, and production readiness passed.
- **Release:** Production commit `a1f6b1c`; Vercel deployment
  `dpl_8Qfx6zZ8rLeiDZbT9TAGPnpt8Gwr`; released 2026-08-27.
