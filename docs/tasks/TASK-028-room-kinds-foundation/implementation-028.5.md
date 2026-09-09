# 028.5 — Themed direction contract

Status: approved and implemented 2026-09-09; local QA passed. Local only; High effort.

## Reviewed contract

- Active non-anonymous accounts create persistent Themed rooms. Guests join using the established Legacy invite/permissions mechanism; Themed is not Shared approval membership. Catalogue rights remain separate.
- A direction contains required plain text (1–500 characters) and optional exclusions (0–500). No classifier, provider lookup, seed import or automatic theme inference is included. Representative media may be added in the later engine milestone.
- Create room, owner membership, settings and direction version 1 atomically, with account-scoped retry idempotency. Creation is disabled by default in application and database gates.
- Only the active owner can explicitly change direction. Compare an expected version inside the transaction; reject stale updates instead of silently overwriting another device. Unchanged saves do not increase the version. Room playback/mode/name/queue updates cannot modify direction. No kind conversion.
- Private direction storage with RLS and no direct client grants. Authenticated owner reads/edits use narrow RPCs; current room members/guests receive read-only direction through authorized room context. Owner deletion removes the room; unsaving/idle cannot expire it.
- Themed implicit learning stays suppressed by the existing eligibility policy. Explicit Likes remain personal. Disable automatic recommendations at first-party and YouTube recommendation endpoints and Listen fallback shelves. Keep manual search, catalogue browsing, playlist/history and queue controls. Show an honest unavailable explanation, not theme-safe promises.
- Existing Room settings category holds direction editing in Watch and Listen. No new permanent toolbar, player remount, heartbeat query or Spacetime schema change.

## Verification plan

Test-first: first-party candidates and Listen fallback history must not become Themed recommendations; SQL owner-only creation/update, bounds, version conflict, idempotency and persistent lifetime. Then verify existing learning exclusion, direct grants/RLS, authenticated/guest entry, concurrent edits, manual playback preserving direction, desktop/mobile settings and unavailable messaging. Run Node/SQL suites, typecheck, lint, build and local database advisors. No production/Git changes or 028.6 implementation.

## Evidence

### Implementation

- Migration `20260909080558_themed_room_direction.sql` adds private direction/version storage, narrow creation/read/change RPCs, account-scoped retry locking, owner-only edits, persistence and owner-deletion cleanup. Authenticated/guest admission retains the existing invitation and catalogue boundaries.
- `lib/rooms/themed-actions.ts` and the dashboard Themed entry expose creation. `components/room/shared/room-direction.tsx` provides owner editing and member read-only access in Watch/mobile settings and the existing desktop Listen settings dialog. Existing saved/account lists retain the Themed label.
- First-party and YouTube recommendation endpoints reject automatic Themed candidates; Listen shelves retain only factual manual history/playlist content. Guest recommendation authorization now preserves the actual room kind. No classifier or theme-quality claim is included.
- No Spacetime source/schema change in this slice. Existing playback stays mounted during direction edits. Room name, mode and queue events do not write direction.

### Verified evidence

| Check | Result |
| --- | --- |
| Test-first recommendation boundary | Two expected Node failures before implementation; focused suite then 26 passed |
| SQL creation boundary | Two expected failures for missing creation capability before implementation; expanded coverage added during implementation |
| Full Node suite | 677 passed (`.tmp/task028-5-all-node.log`) |
| Full database suite | 219 assertions across eight files passed (`.tmp/task028-5-db.log`); 28 Themed assertions |
| Concurrent writes | Four identical creation requests yield one room; four edits against version 1 yield one version-2 winner and three explicit conflicts |
| Combined browser regression | Five passed: Legacy desktop/mobile, Personal, Shared and Themed (`.tmp/task028-5-browser-all.log`) |
| Final Themed browser verification | One passed after final styling/formatting (`.tmp/task028-5-browser-final.log`) |
| UI inspection | Desktop 1440×900, mobile 390×844 and landscape 844×390; direction controls reachable without horizontal clipping; modal accent inheritance corrected |
| Static/build checks | Typecheck, lint and production build passed locally |
| Database checks | Generated RPC signatures match local schema; advisors and error-level lint clear. One inherited warning in unchanged `private.shared_room_context`: text `[]` implicitly cast to jsonb |

Browser QA exercised actual local Auth/database/live-room services with synthetic accounts: create room, load manual media, preserve player element across direction edits, reject stale device save, reload, guest invitation/read-only settings, empty automatic recommendation responses for owner and guest, and Watch/Listen direction persistence. Synthetic browser fixtures clean up their accounts; these are not physical-device or production tests.

### Findings and limitations

- A stale direction initially raised SQL `40001`, which the HTTP layer treated as a server failure and retried. The unshipped migration now uses explicit `PT409`; the UI immediately asks the owner to reload and preserves their draft.
- Desktop Listen settings render through a portal. Its new controls initially missed the room accent variables; the settings opener now carries the current accent into the dialog. This is a one-time read when opening, not playback polling.
- First build compiled/typechecked but its native worker exited with code 3221226505 during static generation while browser QA was active. A standalone retry completed unchanged. The cause is unproven; record both logs (`.tmp/task028-5-build.log`, `.tmp/task028-5-build-retry.log`).
- The migration was applied locally through `supabase migration up --local`. The later PT409-only function refinement was applied from the same unshipped migration; final SQL tests used that definition. A complete fresh replay including this sixth migration has not been repeated in this slice.
- Personal, Shared and Themed creation are enabled only in isolated local QA; application/database defaults remain off. No hosted migration, Git operation or deployment occurred. Earlier dirty 028.1–028.4/audit changes were preserved.

## Next

028.6 Temporary lifecycle needs an explicit idle/absolute expiry, reconnect and retention policy before cleanup implementation. Keep High effort for those boundaries. Theme candidate filtering/evaluation, reliable Autoplay and the home hub remain separate later milestones.
