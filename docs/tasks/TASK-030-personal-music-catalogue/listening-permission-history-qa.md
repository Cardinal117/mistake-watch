# 030.10 listening permissions and history — local QA

Status: locally implemented and verified on 2026-09-11. This note does not claim hosted application or publication. Parent integration owns final release checks.

## Implemented scope

- Migration `20260911123235_listening_permission_history.sql` creates private, service-only Shared listening consent and account history-generation storage. It does not broaden existing Shared individual-action or room-contribution consent.
- Shared consent is purpose version 1, explicit, default off, and prospective. Identical retries preserve the epoch; changes and withdrawal rotate it. Compare-and-set rejects stale saves. Membership deletion/identity replacement invalidates listening consent, including existing leave/remove flows.
- Personal and owned-Themed access relies on existing immutable room ownership/kind guards. Listener context checks current account and room access plus account creation, room creation, membership admission, account migration, Shared consent activation, and history-clear timestamps. The helper must run in the receipt write transaction.
- Account history clear increments a generation under an account lock; repeated old-generation clears fail with SQLSTATE 40001. Legacy Personal completion evidence is filtered by occurrence time after the clear watermark. Likes and explicit manual queue choices remain; old operational records retain existing retention. The receipt migration independently filters/deletes its derived listener evidence using this generation.
- Server routes derive account identity from verified room authorization: GET/PATCH `/api/recommendations/listening/settings`, DELETE `/api/recommendations/listening/history`. Mutations reject extra identity fields, malformed versions, unsupported purpose, cross-origin requests and non-JSON bodies. Responses are private/no-store and omit raw database errors. Conflict returns HTTP 409 without automatic retry.
- A shared settings component exposes explicit Shared listening permission, account clear confirmation/cancel, and a separate verified-listener count summary. Mounted in desktop/TV room settings, the mobile/Watch Room category, and approved Shared membership settings. Success emits `mw-listening-settings-changed`; Personal Discover refreshes immediately.
- Copy explicitly says YouTube listener measurement is not enabled pending provider review. Direct/HLS/upload listener history is saved for future personal recommendations; it is not presented as a new input already used by the current YouTube catalogue ranking. Existing manual-choice ranking remains separate.

## Test-first evidence

Risk: private consent, revocation, account counts, and destructive history clear require behavioral tests.

Database RED: the initial five contract tests ran with the new functions absent and failed on expected settings/clear behavior. A preceding fixture ordering issue was corrected and is not counted as a behavioral RED. GREEN: the completed new suite `supabase/tests/database/listening-permission-history.test.sql` passes 40 assertions. Supplemental adversarial cases were added after the initial implementation; not every assertion is claimed to precede source changes.

Existing SQL regression suites also pass: owned-Themed choices 13, learning policy 37, audit corrections 40, music catalogue 77, Shared withdrawal 14, Personal room 38, persistent retirement 23. Total: 282 passing SQL assertions, including the 40 new assertions. Executed only in disposable `task030_catalogue_replay` in local Docker container `supabase_db_mistake-watch-task028`.

Three local concurrency cases pass: clear waits for an in-flight context-check transaction; concurrent clears with the same expected generation produce one success; leave versus stale consent save cannot resurrect permission. Synthetic fixtures were removed. Local Supabase security/performance advisors reported no issues; public/private database lint reported no errors.

API RED/GREEN: five settings/history route tests failed before route implementation, then passed: verified account/generation, guest denial, subject/purpose rejection, conflict without retry, cross-origin denial. Four additional post-implementation grant review tests pass: verified identity/epoch/admission binding and bounded validity, cross-origin/identity injection rejection, guest/withdrawn/stale-member denial, sanitized fail-closed settings errors. Files: `tests/recommendations/listening-settings-route.test.mjs` and `listener-grant-route.test.mjs`.

UI RED/GREEN: initial browser assertion failed because Clear listening history did not exist. Four final browser cases pass against the local design fixture: explicit confirm/cancel with success invalidation; separate Shared grant/withdraw; conflict refresh without repeating clear; 390px mobile reachability and no horizontal page overflow. Early test-selector failures were corrected (scope alert text; use actual mobile Room category). Tests use mocked API responses and prove UI behavior, not hosted auth or listening receipts.

Desktop/mobile screenshots were inspected at `.tmp/task030/listening-settings-desktop.png` and `.tmp/task030/listening-settings-mobile.png`. Text wraps, confirmation controls remain reachable, and existing song-accented backgrounds remain. No screenshots contain production account data.

Focused ESLint passed without warnings. Full TypeScript check passed before a concurrent listener test briefly introduced an invalid `audio` ARIA role; parent corrected that independent test. Final combined `npm run typecheck` then passed. No Git, hosted mutations, or deployment performed by this subtask.

## Independent review handoff

Grant route keeps browser-selected subject/epoch out of trusted input and checks durable member identity before issuing a short grant; receipt ingestion rechecks consent/generation transactionally. A discovered client renewal race could resume stale samples after a settings change; parent fixed it using a renewal version and queued fresh renewal. Database epoch checks already prevented durable acceptance of stale samples. End-to-end runtime receipt proof remains the listener agent's evidence, separate from these settings tests.

## Final review correction: historical owned-room closure

Independent receipt review found that reusing the live admission check for count reads hid already verified owned-room history when a room closed. Added a private historical-read helper only; live grants and ingestion continue to require an open room. Closed Personal/owned-Themed history requires current immutable owner, matching retained durable member, active nonanonymous account, current history generation, identity/creation/migration lower bounds, and observation no later than a recorded non-null closure timestamp. Shared withdrawal remains enforced by the original check. Receipt count-reader integration is owned by the listener agent.

Added six permission SQL assertions before helper implementation: five intended missing-helper failures, one passing strict-admission guard. After implementation all 46 permission assertions pass (previously 40), for 288 including the unchanged 242 regression assertions above. Full receipt count integration has separate agent evidence. No hosted writes were used.
