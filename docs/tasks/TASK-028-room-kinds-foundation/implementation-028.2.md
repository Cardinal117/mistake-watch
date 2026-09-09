# 028.2 Personal creation and resume

Status: implemented locally on 2026-09-08; local QA passed. High reasoning recommended.
No Git publication, hosted migration or deployment authorized for this slice.

## Concrete contract

- A real, active authenticated account owns exactly one Personal room, including closed/archived states. Anonymous Auth users and disabled accounts are ineligible.
- A database transaction derives the owner from auth.uid(), serializes by account, and creates the room, host membership and settings together. Default Listen applies only on creation. Resume preserves IDs, mode, queue and playback state.
- A private database feature gate defaults off. The UI also requires PERSONAL_ROOMS_ENABLED=true. Both are enabled only in the isolated local QA environment; direct RPC calls cannot bypass the database gate.
- Only closed idle_timeout rooms can reopen. Archived, host_closed or manual_cleanup rooms remain blocked and never produce a replacement duplicate. Ordinary account close/archive/leave commands are unavailable for Personal; administration can still explicitly block it.
- The Saved star is a bookmark. Both cleanup implementations exclude Personal; database normalization keeps its idle deadline null. Deleting the owning Auth account deletes its Personal room before the existing owner foreign key can make it ownerless. Legacy deletion behavior is preserved.
- Kind conversion and Personal ownership transfer are forbidden. Only the atomic RPC creates Personal rooms for authenticated clients; direct table INSERT/UPDATE cannot bypass it.

## RLS intent

Existing Legacy policies remain in place. Additional restrictive policies protect Personal rows on rooms and every RLS-enabled public table with room_id. Only the active, non-anonymous owner may see or mutate them; direct authenticated room creation/update is Legacy-only. Membership and guest-identity write guards reject foreign-account/guest Personal membership even through privileged application paths. Security-definer helpers remain in the private schema, use an empty search_path, and have explicit execution grants. The public creation wrapper is SECURITY INVOKER.

Server-side admin clients do not rely on RLS: page/snapshot, provider requests, media authorization, live admissions, host mutations, activity, invites, guest reclaim and account commands are reviewed independently. Personal invite UI is suppressed and invite acceptance/preview rejects Personal. Catalogue entitlement remains unchanged.

## Validation

- **Test-first evidence:** four new behavioral membership/admission cases failed before implementation (4 failed / 9 passed): wrong owner with stale membership, missing account membership plus guest cookie, anonymous account, and signed-out guest. After guards, all 13 identity cases passed. Concurrency, SQL and additional unit coverage were added after implementation; no red-first history is claimed for them.
- **Node:** `node --test tests/*/*.test.mjs` — 650 passed, zero failures. Includes existing queue, media, sync, Worker and identity regressions plus Personal access/action/account-command coverage.
- **Clean local migration replay:** reset only `mistake-watch-task028` through historical migration `20260716064635`, load `supabase/fixtures/task028-before.sql`, then `supabase migration up --local`. Both pending migrations applied successfully to populated Legacy data. The uncommitted 028.1 filename was corrected to CLI-generated `20260908110656_room_kind_legacy_foundation.sql`, preceding `20260908110657_personal_room_creation_and_access.sql`; no hosted history was repaired.
- **PostgreSQL:** 61 assertions passed across three files. They cover Legacy behavior, owner/anonymous/foreign-account RLS, permanence, unique owner identity, membership/permissions/queue writes, failed settings insertion rolling back all creation, closed/blocked resume, cleanup and account deletion with queued media.
- **Concurrency:** four independent PostgreSQL transactions returned the same room; final counts were one room, one owner membership, one settings row. Script removes its synthetic account and restores the prior local feature flag.
- **Database review:** `supabase db lint --local --schema public,private --level error` found no schema errors; local advisors reported no issues. The new RPC signature was checked against CLI-generated types; existing generated-file conventions were preserved.
- **Browser:** three tests passed (46.1s): Legacy filtering at 1440×900 and 390×844; Personal with two independent same-account desktop/mobile contexts plus an unrelated account. Verified concurrent creation, one membership, initial Listen, local direct-media play/pause on both devices, more than one heartbeat interval, Watch switching without position or volume reset, invite suppression, foreign page/live-grant/provider/recommendation/account-list denial, per-device logout, blocked-room feedback/retry, and same-ID resume. Personal also checked at 844×390. This uses real local Supabase/Auth and SpacetimeDB, not just design fixtures.
- **Visual review:** inspected Personal entry, mobile Listen, Watch desktop/mobile/landscape, and signed-out/retry states. Shared Add now works when Listen is the first loaded mode. No horizontal document overflow in tested sizes. Existing compact room-settings typography was retained.
- **Final application checks:** `npm run typecheck`, `npm run lint` and `npm run build` all passed. `git diff --check` passed.

Official references reviewed: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [database functions](https://supabase.com/docs/guides/database/functions).

## Integration finding during local QA

Direct entry into Listen exposed an existing dependency on Watch-only CSS: the shared embedded Add form became a fixed overlay and blocked the bottom navigation. Relocating the existing embedded-form rules into a shared stylesheet is necessary for the approved first-use Listen default. No form behavior or visual redesign is added. The browser test reproduces this before the fix.

The design hook also flagged two existing 13px room-settings styles. These are unchanged, previously accepted compact settings typography; the edited Personal description uses that same established style. Classified as a contextual false positive for this copy-only change, with no suppression or typography redesign.

A denied/unavailable room route now uses neutral dashboard status copy instead of claiming inactivity closure. It uses the same response for unknown and inaccessible IDs, avoiding disclosure of private-room existence. Existing explicit closed/removed notices retain their semantics.

## Reproduction and local review

Worktree: `.worktrees/task-028-room-kinds`, branch `codex/task-028-room-kinds`, base main `c64196e`. All work remains unstaged/uncommitted. The canonical checkout's unrelated source work was preserved.

- Dashboard: <http://127.0.0.1:5384/>; Legacy visual fixture: <http://127.0.0.1:5384/dev/room-kinds>.
- Supabase/Auth: isolated `mistake-watch-task028`, API `http://127.0.0.1:55421`, DB 55422. Local test accounts are separate from production Google accounts. Production OAuth, catalogue and credentials were not copied.
- Live authority: unchanged Spacetime module built/published only to `ws://127.0.0.1:5376`, database `mistake-watch-task028`. Use `--no-config` on CLI SQL commands to avoid the root config selecting the production-named module. Local data/logs/issuer material are ignored under `.tmp/`.
- `.env.local` is Git-ignored and contains only local QA credentials. Set `PERSONAL_ROOMS_ENABLED=true` and enable `private.room_kind_features` only on this isolated database for testing. The committed migration defaults the DB gate off; `.env.example` defaults the app gate off.
- Database checks: `supabase test db`; `node scripts/qa/task028-personal-concurrency.mjs`; lint/advisors commands above. Fresh-fixture loading is for disposable local databases only.
- Browser: PowerShell `$env:PERSONAL_ROOM_QA='1'; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5384'; npx playwright test tests/e2e/personal-rooms.spec.ts tests/e2e/legacy-rooms.spec.ts`. The Personal test refuses non-local service configuration, creates temporary Auth accounts, and deletes them afterwards. Start Next with `npm run dev:any -- --hostname 127.0.0.1 --port 5384` and `WATCH_DESIGN_QA=1` for the local media fixture.
- Full logs/screenshots are ignored `.tmp/task028-*` / `.tmp/personal-*`; browser traces can contain local session credentials and must not be published.

## Changed areas and review conclusions

Migration/RLS and creation RPC; owner verification across room snapshots, admission, activity, provider/recommendation/media guards, account attachment and room commands; Personal account projections and dashboard entry; invite suppression; shared embedded Add CSS ownership; neutral denied-route copy. No new dependency, Spacetime reducer/schema change, provider sourcing, ranking or autoplay implementation.

Catalogue access still requires the existing entitlement. A Personal owner has room authority, not upload/catalogue authority. Existing Legacy entry, invites, save state and cleanup remain supported. Personal kind is not a second playback implementation.

The browser QA caught two integration defects and the SQL QA caught a shared-trigger field mismatch; all are fixed. Test-harness corrections included the recommendation endpoint's POST method, scoping the alert away from Next's route announcer, and waiting for actual playback instead of assuming Load Now automatically plays.

## Release boundary and next slice

Local implementation/QA does not certify hosted activation, real Google OAuth, physical phones, R2 expiry, real YouTube playback or production multi-device behavior. Those remain release acceptance checks. No production credential copy, migration, push or deployment occurred in this slice.

Apply migrations before compatible server code, keep both gates off until approved hosted QA, and never roll back to a server that treats Personal as Legacy. If rolling back after Personal exists, disable new entry/creation while retaining owner guards and cleanup exclusions; never relabel or delete rooms as a rollback shortcut.

Next is **028.3 learning-policy and attribution enforcement**, pending explicit approval. Keep **High**: trusted attribution, replay and consent boundaries need careful review. Shared, Themed and Temporary remain disabled and unimplemented. New recommendation quality and continuous Autoplay remain separate later milestones.
