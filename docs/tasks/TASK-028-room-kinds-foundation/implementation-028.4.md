# 028.4 Shared membership and consent

Status: implemented and verified locally on 2026-09-08. High effort. No Git or hosted writes.

## Contract reviewed before implementation

Active non-anonymous accounts can create Shared rooms behind a disabled-by-default gate. Reuse the room shell, invite code/link, account room lists and existing live playback/permissions. Creation is transactional and retry-idempotent using a per-form request ID. Shared survives leaving, idle and unbookmarking. Owner deletion deletes the owned Shared room rather than making it ownerless.

A valid invite lets an active signed-in account request membership; it does not admit them or grant taste consent. Owner approves or rejects requests. Pending and removed accounts cannot read room contents, obtain live admission, play catalogue media, or use provider APIs. Approved accounts get one durable room member across devices. Leave disconnects presence and preserves return access. Removing membership closes consent and deletes the durable member; reapproval creates a new member ID and never restores old permissions or consent. Removed requests cannot self-promote by replaying an invite.

Use a private membership decision table plus existing public room_members for approved access. Private RPCs derive auth.uid and validate current profile/room owner; public wrappers are narrow, authenticated-only. Membership guards also prevent direct table inserts/role escalation. Existing kind RLS restricts Shared to approved account membership. Pending status contains only the invited room name and own state; owners see request names and decisions, not private taste. Membership and consent controls reuse settings/Social sections and existing compact tokens.

Cross-authority removal is durable-first then a trusted live revocation reducer. Permanently retire the old member ID and remove all its live sessions/grants; reject late grants and rejoin claims for that ID. Store removed member IDs for idempotent retry; report pending live revocation honestly and offer retry if live authority is unavailable. Do not claim cross-database atomicity. Ordinary client kick controls in Shared route through this durable action. No per-tick database calls or playback remounts.

Separate self-only contribution and individual-learning switches start off, load on panel entry and save explicitly. 028.3 consent epochs/revocation rules remain authoritative. Removing membership withdraws both. Shared blended ranking quality remains later work, not promised by this slice.

## Verification plan

First reproduce Shared approved membership being denied by existing page/live resolver. Then SQL allow/deny tests for creation, requests, owner decisions, durable return membership, direct RLS writes, consent separation and removal/reapproval. Test trusted live revocation including stale grants and unauthorized callers. Exercise actual local routes with owner, pending/approved member on two devices, and outsider; mobile/desktop settings and invite states. Run regression suites, schema replay/advisors, generated bindings, typecheck/lint/build. Preserve all earlier dirty slices.

## Implementation and review

`20260908131607_shared_room_membership_and_consent.sql` implements private membership/request records, retry-idempotent creation, active account eligibility, owner approval/removal, Shared access policies and persistent lifetime. Existing restrictive room-kind policies prevent direct client creation. Narrow RPCs derive identity from Auth; private decision/consent records are never broadcast. Owner deletion cascades the owned Shared room. Closed Shared rooms cannot be reopened through an invitation.

Server membership resolution, privileged room/provider/recommendation/catalogue checks, account lists and dashboard grouping now recognize approved Shared membership. Shared room creation is behind both `SHARED_ROOMS_ENABLED` and the private database gate; both default off. Minimal creation and approval screens reuse existing room components. Social and Settings > People expose membership decisions and separate self-only learning choices in Watch and Listen. Requests load when the panel opens; Refresh checks new requests, and the invited account uses Check approval. Automatic request notifications are not included.

The trusted `revoke_room_membership` reducer retires a member ID, clears outstanding admission grants and removes every connected session. Retired IDs cannot receive late grants or rejoin. Its private revocation table is not available to clients. The server action revokes durable access first, calls the live reducer, then acknowledges completion. Live failure exposes a retry state and blocks reapproval until acknowledgement. A new approval creates a fresh member ID, preserving neither old live permissions nor consent.

Removal and consent-save operations share the existing consent advisory lock. Consent validation occurs after acquiring it. This prevents a waiting save from recreating active consent after removal. No new playback authority or per-heartbeat database work was introduced. The new live schema/reducer was built, published and regenerated only for `mistake-watch-task028` on port 5376. Supabase RPC signatures were compared with locally generated types.

Primary code areas: `lib/rooms/shared-actions.ts`, `shared-live-revocation.ts`, `membership.ts`, `personal-access.ts`; the Shared dashboard/entry/membership components; existing account/room authorization and list projections; Spacetime admission/participation/schema; generated bindings and the migration. Earlier 028.1–028.3 changes remain intact in the same worktree.

## Findings resolved during QA

- Initial Shared page/live resolver regression failed before implementation; approved accounts now resolve consistently across devices.
- The browser caught a Create button that inherited `type=button`; it now explicitly submits the form.
- Status/pending copy had character-encoding damage; corrected and reviewed in screenshots.
- A consent persistence assertion caught a form-value race. Stale effect/refresh responses are ignored, and browser QA verifies the checkbox remains saved after refreshing the panel.
- A deterministic concurrent transaction test reproduced consent surviving removal (`1` active epoch, expected `0`). Locking validation and removal together now leaves zero active epochs. This is recorded red/green evidence, not an assumed race fix.
- A final permission audit reproduced a durable override remaining after removal (`1` row, expected `0`). Removal now deletes account permission overrides in the same durable transaction, preventing inheritance on reapproval. The new SQL regression passes.
- The first replay attempt used an npm-resolved CLI that downloaded another database image. It was cancelled; only the disposable task028 project was restarted. Final replay used installed Supabase CLI **2.84.2** successfully. Use `supabase`, not an unpinned `npx supabase`, for reproducing this setup.

## Verification evidence

- **661 Node tests passed**, including Shared account/anonymous/cookie denial, persistent account-list projection and failure paths for durable/live/ack removal. Additional SQL/action coverage is post-implementation unless specifically described as red/green above.
- **137 database assertions passed across five files**, including 39 Shared assertions. Checks cover gated creation, retries, forged insert/identity/role changes, invite-only requests, owner decisions, independent consent, removal/reapproval, private data access, idle persistence and owner deletion.
- **Four combined browser tests passed**: desktop/mobile Legacy grouping, Personal isolation/live playback/outbox ingestion, and Shared actual-room approval/removal. Shared used an owner, one invited account on two independent desktop/mobile contexts, an outsider and a signed-out invite viewer. One durable member was verified across both devices. Both connected devices were removed, invite replay stayed denied, and owner reapproval created a new ID with consent off.
- The Shared browser flow also passed twice consecutively after the stale-load guard. The extended final flow checks consent persistence after Refresh, Watch and Listen Social, mobile People settings, portrait and landscape access to controls. Screenshots were inspected at 1440×900, 390×844 and 844×390.
- Independent live-authority check: untrusted revocation denied, repeated trusted revocation succeeds, and late admission grants for a retired member ID are rejected.
- Independent database transactions: four concurrent creation retries returned one room; concurrent consent save/removal left no active consent. Reran after clean migration replay.
- Clean CLI replay: reset only task028 through `20260716064635`, loaded `supabase/fixtures/task028-before.sql`, applied all four new migrations, then reran all SQL assertions. After the final durable-permission cleanup, repeated the CLI replay from 028.3 with populated Legacy fixtures and reran all 137 assertions and the concurrency checks. Populated Legacy fixtures remained valid. Database lint and security/performance advisors reported no issues.
- Typecheck, lint, Spacetime module typecheck and production build passed. `git diff --check` passed. Source was not staged or committed.

QA logs/screenshots live in ignored `.tmp/task028-4-*` and `.tmp/shared-*`. Commands: `npm test`, `supabase test db`, `node scripts/qa/shared-concurrency.mjs`, `node scripts/qa/shared-revocation.mjs`, `supabase db lint --local --schema public,private --level error`, `supabase db advisors --local`, `npm run typecheck`, `npm run lint`, `npx tsc --noEmit -p spacetime/tsconfig.json`, `npm run build`. Browser tests use `PERSONAL_ROOM_QA=1` and `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5384` with the three `tests/e2e/*-rooms.spec.ts` files. The scripts explicitly target isolated local services. Generated test accounts are cleaned up.

## Rollout limits and next slice

Local app: <http://127.0.0.1:5384/>. Supabase API 55421/DB 55422; Spacetime 5376. Both Personal and Shared creation gates are enabled only in this local QA environment. Physical-phone, hosted OAuth/R2/provider playback and deployed multi-participant acceptance remain release checks; local Playwright devices are emulation. No recommendation-quality, fair-blend or continuous-Autoplay claim is made.

A future release must apply reviewed durable migrations before deploying this frontend, even with creation disabled: the entry fallback calls the Shared context RPC. Publish the trusted live revocation contract before enabling Shared creation. Keep creation disabled if either authority is missing. Disabling creation does not undo existing membership; never roll back to weaker admission/consent code while Shared rooms exist. Preserve the earlier 028.3 pre-existing-history reconciliation guard.

Cross-authority removal is not atomic: if Spacetime is unreachable, the UI truthfully reports pending live removal and requires owner retry. Retired member IDs remain in private live storage to reject stale grants; any future room-state garbage collection must preserve that security boundary. Larger membership/history load measurements and automatic request notifications are follow-up work, not advertised features.

Next approved candidate is **028.5 Themed direction contract**. Recommend **High** for owner authorization, direction versioning and preventing off-theme learning. It remains unstarted; 028.6 Temporary lifecycle and 028.7 release review follow. Root checkout changes are limited to mirroring this TASK-028 Markdown packet. The accepted production release is unchanged.
