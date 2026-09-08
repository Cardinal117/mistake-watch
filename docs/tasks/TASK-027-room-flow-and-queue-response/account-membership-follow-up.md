# Account membership reconciliation — 2026-09-08

Status: Implemented and locally verified; physical-device acceptance pending.
Production remains unchanged. No commits, push or deployment in this follow-up.

## Scope

Fix repeated removal when a browser retains a guest cookie after signing into
an account already present in the room on another device. Room rendering and
live admission must use one server-side membership resolver: active account
membership first, valid guest membership only when no account membership exists.
Inactive accounts must not fall through to guest access. Failed lookups fail
closed. Keep per-device sessions, genuine kicks and existing permissions intact.

Distinguish live admission failure from host removal in the exit screen and
dashboard. Do not change playback, compact-player policy, schema, reducers,
credentials, production data or deployment.

## Plan and acceptance

1. Reproduce conflicting member IDs through real server entry functions with
   mocked cookies, account identity and database responses before changing code.
2. Share membership resolution and remove the duplicate selection path.
3. Correct admission-failure messaging without changing actual kick handling.
4. Run identity/admission regressions, typecheck, lint and build.
5. Leave physical two-device Google sign-in/reconnect acceptance explicitly open.

Testing is test-first for the identity bug. Cover account plus guest cookie,
ordinary guest, signed-in guest fallback, inactive account, closed room, missing
membership and database failure. No database writes are necessary for resolution.
Preserve unrelated dirty files in this worktree and the main checkout.

## Evidence

Baseline: `c1230ab`, accepted release worktree with unrelated pre-existing dirty
files preserved. The proposed resolver was absent before the first red run.

- Red: `node --test tests/identity/account-room-membership.test.mjs` exited 1:
  5 failures / 3 passes, including `guest-member` instead of `account-member`
  for both host and ordinary member. Subsequent strengthening tests the public
  admission entry point, intercepting only the outbound grant transport. The
  final test was rerun against `git show HEAD` versions through an ignored local
  loader without modifying source; it reproduced the same 5 failures.
- Green: the final 8 identity tests pass on the current source. Fixtures use
  synthetic account/cookie/database data and never contact hosted services.
- Regression: `node --experimental-strip-types --test tests/identity/*.test.mjs
  tests/spacetime/*.test.mjs` passed 110/110. Existing coverage includes identity
  reconnect and connection lifetime. Additional post-hoc hook coverage confirms
  real kicks retain priority, missing admission is distinguished, and restored
  per-device authority suppresses a stale missing-member notice.
- `npm run typecheck`: passed.
- `npm run lint`: failed on old generated build artifacts under ignored `.tmp`.
  `npx eslint . --ignore-pattern '.tmp/**'`: passed, no source lint failures.
- `npm run build`: blocked by the existing linked `node_modules` outside the
  Turbopack root. `npx next build --webpack`: passed compilation, TypeScript and
  page generation. This is webpack build evidence, not a Turbopack pass.
- `git diff --check`: passed.

Implementation: `lib/rooms/membership.ts` now supplies both room snapshots and
live admission. No admission token, role, kick, reducer or per-device session
validation is weakened. Snapshot loading fails closed on resolver errors.
The connection-timeout exit uses separate copy and dashboard notice; actual
host removals retain the existing path. No new layout or style was introduced.

Design hook review: reported white-alpha overlays in unchanged `app/globals.css`
are existing neutral borders/grid/slider treatments, not new palette drift in
this fix. Left unchanged; no suppressions added.

Manual gate: on device A, join as a signed-in ordinary member. On device B,
join as guest then sign into the same Google account. Remain past 60 seconds,
exercise permitted controls and reconnect B; A must remain connected. Repeat
for host and verify an actual host kick still removes the member. No physical
phone or live OAuth acceptance was performed during this local implementation.

The original incident is not proven; the deterministic selection mismatch
matches the reported roughly 30-second removal. Compact-player account policy
remains separate and unimplemented.
