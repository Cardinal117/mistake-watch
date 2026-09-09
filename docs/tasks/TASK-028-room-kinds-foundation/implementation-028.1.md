# TASK-028.1 implementation and QA

Date: 2026-09-08. Status: implemented locally; local QA passed. Not committed or deployed.
Baseline: fetched `origin/main`, `c64196e6d70b40643d5926073b89a902fd13a128`.
Worktree: `.worktrees/task-028-room-kinds`; branch: `codex/task-028-room-kinds`.
Effort: High for this migration slice; keep High for 028.2 security/concurrency.

## Delivered

- `rooms.room_kind` is non-null text with a constant `legacy` default. The five
  planned values are declared, with a second CHECK permitting only Legacy in
  this release. Future kinds require an explicit migration plus their guards.
- No row UPDATE is used for backfill: existing values and timestamps remain intact.
  No new index, RLS policy, provider call, permission or idle-lifecycle change.
- Existing create forms work without the new field. Explicit unsupported values
  are rejected before creation; direct database writes cannot enable future kinds.
- Account and room snapshots carry optional Legacy metadata for additive payload
  compatibility. Unsupported stored values are not projected as Legacy.
- Saved Rooms has a small Legacy label; Account Rooms shows it in the Saved filter.
  Existing cards, colors, spacing, open/closed groups and saved membership are retained.
- Database type output was generated locally. Only the three new room-kind fields
  were integrated, avoiding unrelated churn in the older generated type file.
- A local-only QA route exercises the actual SavedRooms/AccountRoomListView components.
  Its fixtures are synthetic; its links are not authenticated production rooms.

## Verification chronology

1. Before source changes: `node --test tests/rooms/*.test.mjs tests/identity/*.test.mjs`
   passed 54 tests, including account/guest authority and duplicate-device membership.
2. New projection tests failed because kind was absent. Creation tests initially
   had missing fixture environment/mode inputs; those harness errors were corrected
   before production edits. The valid red run passed both old-form cases and failed
   seven unsupported-kind cases because the old action accepted them as ordinary creation.
3. A fresh isolated Supabase Postgres replayed all 19 existing migrations. Synthetic
   saved/guest/closed/archived rooms, memberships, settings, permissions and queue
   data were inserted before the new migration. Nine unchanged database behavioral
   assertions passed; the new column assertion failed as expected. An initial fixture
   placement under `supabase/tests` was corrected to `supabase/fixtures` so it is not
   executed as a pgTAP test; the clean red run failed only for the missing column.
4. `supabase migration up --local` applied `20260908110656_room_kind_legacy_foundation.sql`.
   JSON snapshots of six relevant tables matched exactly before/after, excluding
   only the newly added room-kind field. Existing timestamps and invite hashes matched.
5. Final `supabase test db`: **23 assertions passed**. Covers defaults, all existing
   states, preserved queue/permissions, RLS owner/unrelated access, saved/unsaved
   cleanup, forbidden kinds/null, privileged and authenticated mutation attempts,
   and permitted host mode switching. Additional negative cases were added after
   implementation and are not claimed as red-first evidence.
6. Final `node --test tests/*/*.test.mjs`: **635 passed, zero failed**. The initial
   wider run lacked the existing Worker dependency `miniflare`; `npm ci` in the
   Worker directory resolved setup, its focused test passed, then the full run passed.
7. `npm run typecheck`, `npm run lint`, `npm run build`: passed. Local database lint
   (`supabase db lint --local --schema public --level error`) found no schema errors.
8. `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5384 npx playwright test tests/e2e/legacy-rooms.spec.ts`:
   **2 passed**, at 1440×900 and 390×844. Saved filtering, closed-history search and
   no horizontal overflow verified. Initial browser failures were label-locator
   mismatches; switching to the rendered combobox/searchbox accessible roles fixed them.
   Screenshots visually inspected; in-app browser also opened the local route.
9. Production build served locally on 5385: `/dev/room-kinds` returns **404**.
   `git diff --check` passed. No Spacetime module or Worker changes were required.

## Local review

- UI: <http://127.0.0.1:5384/dev/room-kinds>
- Start UI from this worktree: PowerShell `$env:WATCH_DESIGN_QA='1'`, then
  `npm run dev:any -- --hostname 127.0.0.1 --port 5384`.
- Isolated database project: `mistake-watch-task028`, Postgres on local port 55422.
  The new small `supabase/config.toml` makes local database QA reproducible and is
  not linked to a hosted project. No production credentials were copied.
- Fresh database: `supabase db start`, then feed `supabase/fixtures/task028-before.sql`
  into `docker exec -i supabase_db_mistake-watch-task028 psql -U postgres -d postgres
  -v ON_ERROR_STOP=1`, then `supabase test db`. Fixtures must be loaded once into
  a fresh disposable database; do not run them against existing user data.
- To reproduce before/after migration evidence, start from main's migrations,
  seed the same fixtures, snapshot rooms/members/guests/settings/permissions/queue,
  then apply this one pending migration through `supabase migration up --local`.
  Normalize only `room_kind` out of the rooms snapshot when comparing.
- Screenshots and full command output are local ephemeral `.tmp/task028-*` and
  `.tmp/legacy-*.png` files, not committed artifacts.

## Room/admission/cleanup path inventory

| Boundary | Current source and treatment in this slice |
| --- | --- |
| Create/join forms | `lib/rooms/actions.ts`: validate explicit kind on create; join logic unchanged |
| Guest creation, code/link entry and reclaim | `lib/identity/guest-room.ts`: existing Legacy flow and identities unchanged; default supplied by DB |
| Account attachment | `lib/account/server.ts`, `lib/account/actions.ts`, `app/account/migrate-guest-room/route.ts`: no new identity behavior |
| Room page/snapshot and invite preview | `app/rooms/[roomId]/page.tsx`, `lib/rooms/data.ts`: Legacy snapshot metadata added; no new-kind access exposed |
| Membership and live grants | `lib/rooms/membership.ts`, `live-admission.ts`, `live-authority.ts`, `app/api/rooms/[roomId]/live-admission/route.ts`: unchanged trusted authority |
| Provider/media request admission | `lib/rooms/request-guards.ts`, existing media authorization routes: unchanged; catalogue access separate |
| Durable account room lists | `lib/account/room-data.ts`, `room-projection.ts`, `app/api/account/rooms/route.ts`: explicit kind projection, private response unchanged |
| Saved/closed room management | `lib/rooms/actions.ts`, `lib/account/actions.ts`, `room-management-policy.ts`: existing mutation rules retained |
| Activity refresh | `lib/rooms/activity.ts`, `activity-core.ts`: existing last-seen/deadline behavior retained |
| Application idle cleanup | `lib/rooms/lifecycle.ts`, called by dashboard, invite preview and guest entry: unchanged |
| SQL idle cleanup | `private.close_idle_unsaved_rooms`, scheduled by the saved-room migration when pg_cron exists: unchanged and regression-tested |
| Live playback/queue/presence | `spacetime/src/index.ts` and admission module: no schema/reducer change |

## Deployment/rollback boundary and limitations

Apply the additive migration **before** deploying the new explicit account-list
column selection. Old server code works with the migrated database because all
rows remain Legacy. The new server expects the migrated schema; absent fields
in older serialized payloads are compatible, but that is not a substitute for
schema-first deployment. Keep the enabled-kind CHECK in place through rollback.
Do not drop metadata or relabel rooms as a rollback strategy.

RLS behavior and migration were tested on a real local database; frontend QA used
synthetic props. No hosted Supabase advisors, production migration, physical-phone
session or two-participant live playback was run for this slice. They are not
claimed as passed. Existing playback regression tests passed; broader integrated
live QA belongs to the later release gate. There is no new recommendation behavior.

Personal creation/privacy, Shared consent, Themed enforcement and Temporary expiry
remain unstarted. No owner intake notes were altered or archived. Canonical checkout
unrelated work was preserved. Review this slice before approving 028.2.

Follow-up: [028.2 Personal implementation](implementation-028.2.md) subsequently passed local QA. The disabled-kind description above records the 028.1 checkpoint, not the later combined migration state.
