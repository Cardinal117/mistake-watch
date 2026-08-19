---
id: MW-BUG-010
type: bug
status: in-progress
priority: P1
area: room-authority
related: [TASK-012, TASK-014B, TASK-014C, MW-BUG-007, MW-BUG-011]
created: 2026-08-18
updated: 2026-08-19
---

# Account owner can lose host authority after rejoining

> [!bug] In progress - P1

- **Expected:** A signed-in account that durably owns a room should regain the
  correct live host/controller authority after leaving and rejoining, regardless
  of the browser display name entered for the new room session.
- **Observed:** Rejoining an account-owned room with another display name can
  produce a participant without host privileges, leaving the durable owner
  unable to control the room.
- **Evidence:** Owner production report after account-based room ownership and
  Account Rooms lifecycle work shipped. A later production report adds that
  opening a room through Account Rooms can reach the room but reject a playback
  action. Production reproduction on 2026-08-18 from 17:25 to 17:30 SAST used
  two browser contexts for the same account. Browser B displayed enabled host
  playback controls but could not control playback. Closing Browser A, waiting
  20 seconds, reloading Browser B, and retrying did not restore authority.
- **Reported error:** `Playback control denied because the caller is not an active room participant`.
- **Confirmed static defect:** Same-Google-account browser contexts resolve the
  same durable room-member ID but can hold different room-scoped Spacetime
  identities. `join_room` rejects the second identity for the existing
  room/member participant key, and disconnect retains that key as an idle row.
  Playback then fails because the new caller is not the admitted participant.
- **Live classification:** The persistent failure after the original context
  disconnected rules out a short participant-readiness delay for this case and
  corroborates the static identity-collision diagnosis. Join admission is the
  first confirmed divergent boundary.
- **Secondary UI defect:** Durable host state enables playback controls before
  the current browser owns an admitted live participant. Controls must remain
  unavailable or show a reconnecting state until live authority is confirmed.
- **Unknowns:** Determine whether the join path binds only the guest identity,
  whether the account membership reaches SpacetimeDB admission, and whether
  host/controller authority is restored independently from display-name state.
  Confirm whether Account Rooms navigation can reuse a room URL without first
  establishing the current browser as an active live participant.
- **Related work:** TASK-012 live-room trust boundary, TASK-014B account-aware
  room lifecycle, TASK-014C Account Rooms interaction work, and
  [[MW-BUG-007-signed-in-room-remains-browser-scoped]].
- **Planning:** TASK-012 Batch A3 and Batch B own the approved local correction.
  The protocol uses trusted one-time admission grants, concurrent private live
  sessions per durable member, and opaque browser-specific presence receipts.
- **Local correction:** Implemented and verified on 2026-08-19. A persistent
  two-client Spacetime proof confirmed concurrent same-account sessions, one
  aggregate participant, and surviving authority after one browser disconnects.
- **Next action:** Review the release diff, then use a separately approved safe
  order for Maincloud publication, application deployment, and production
  two-browser QA. Arbitrary member-ID takeover remains rejected.
- **Original reports:**
  [[../archive/quick-capture-2026-08-18#Capture 4]] and
  [[../archive/quick-capture-2026-08-18#Capture 11]].
