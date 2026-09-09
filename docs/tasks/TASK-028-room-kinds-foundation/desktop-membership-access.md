# Desktop Shared membership access

## Approved scope

The owner reports live QA passed with one exception: Shared membership requests
required switching to mobile layout. Add approval access through the existing
desktop members/permissions control in both Watch and Listen. Keep the broader
desktop settings redesign for a future task.

## Diagnosis and implementation

Mobile settings and Social already render SharedMembershipPanel. The shared
header audience dialog only rendered live MembersPanel, omitting durable Shared
requests and learning controls. Both headers now pass a Shared-only room ID into
that existing dialog, which reuses SharedMembershipPanel. The Listen settings-menu
permissions route also receives it. No new permission, data or playback logic was
introduced. The panel loads when opened and retains its Refresh action.

## Acceptance and verification

- Red: before application edits, the real-backend Shared browser test failed
  because the desktop audience dialog had no Approve button despite a pending
  request. Evidence: `.tmp/desktop-membership-red.log`.
- Green: the same flow passes in both desktop modes. The expanded final run also
  checks that an approved non-owner sees their own learning controls but no owner
  decisions. Dialog bounds and reachable approval/close controls pass at
  1440x900, 1280x600 and 390x844. Existing multi-device approval, playback, consent,
  removal and closure coverage passes. `.tmp/desktop-membership-final-browser.log`
  (one integration test, 1.5 minutes).
- Screenshots visually reviewed: `.tmp/desktop-membership-listen.png`,
  `.tmp/shared-before-approve.png`, `.tmp/desktop-membership-390.png`.
- Separate browser checks at `/dev/watch-design` and `/dev/listen-design` confirm
  non-Shared rooms hide the panel; Escape closes and returns focus to the trigger.
- All 690 Node tests passed; typecheck and production build passed. Lint completed
  with zero errors and 16 existing warnings in the ignored local release export
  under `.tmp/task028-live-release`. Changed files pass targeted lint. Diff check
  passes.

Desktop path: members/avatar group beside account settings > Shared membership
& learning > Requests & return access > Approve/Reject.

## Local handoff

Local app: <http://127.0.0.1:5384/>. Only synthetic accounts in the isolated local
backend were used and cleaned up by the integration test. Owner-reported live QA
and this agent's local regression evidence are separate. The initial local handoff preceded the approved release recorded below.

The broader desktop settings/account screen overhaul remains future work.

## Production release - 2026-09-09

Owner authorized commit, push and deployment. Implementation commit `de25e89`
was pushed to `codex/task-028-room-kinds` and deployed from a clean Git archive.
Vercel deployment `dpl_54qR6ftS6vEan9pJ3vTV5yJdQzMn` is Ready and its aliases
include <https://watch.mistakestudios.com>. Remote production build passed;
live health and readiness returned 200; both development design routes returned
404. No Supabase or Spacetime deployment was needed. Existing playback was not
interrupted for a fresh live approval action: interaction evidence is the local
real-backend regression run above. Main remains at `23cd524`; this fix is pushed
on the task branch and live, but has not been merged to main.

