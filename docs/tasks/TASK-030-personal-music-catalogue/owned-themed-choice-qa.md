# 030.10a owned-Themed explicit choices — local QA

Status: locally implemented and verified on 2026-09-11; not hosted or released.
Scope: owner manual queue choices only. This does not complete 030.10a's consent/history boundaries or implement listener observations.

## Change and boundaries

- Migration `20260911123216_owned_themed_choice_learning.sql` adds policy version 2 activation and replaces only the eligibility helper. It permits the verified owner’s explicit queue-added/play-next events occurring at or after activation to teach that account.
- `room_allowed` remains false for Themed choices: neither a visitor nor an owner’s queued song silently rewrites the fixed theme.
- Version-1 evidence is not updated; delayed pre-activation events stay ineligible. Shared consent scopes/epochs, Likes, guest/account attribution, deduplication and service-only access remain unchanged.
- Existing room-kind and Themed-owner immutability guards establish the ownership invariant. If transfers become supported later, replace this invariant with an event-time ownership contract before enabling them.
- Existing account aggregate and catalogue readers consume the newly eligible explicit choices without reader changes. No passive completion counts or new provider calls.

## Test-first evidence

Risk: migration/account-learning eligibility; test-first required.
Baseline: Git `2f3c399` with unrelated parent UI work preserved; proposed migration absent at initial red run.
New suite: `supabase/tests/database/owned-themed-choice-learning.test.sql`.

Initial red: 13 assertions, four intended failures: owner manual/add-next eligibility returned false, account projection returned zero, catalogue evidence returned null. The test ran before the migration was created. `psql` exited zero because pgTAP failures are result rows; assertions were explicitly inspected.

After migration, the catalogue assertion exposed a fixture timestamp issue: events using `clock_timestamp()` inside one transaction were later than the reader’s transaction-stable `now()`. Production requests use separate transactions. Corrected the fixture to use `now()` rather than changing production date filtering. Re-ran this final fixture against the original helper inside a rolled-back transaction: same four intended failures. Final modified helper: all 13 pass.

Regression suites in the disposable database:

| Suite | Passed |
| --- | ---: |
| owned-themed-choice-learning | 13 |
| learning-policy | 37 |
| audit-corrections | 40 |
| music-catalogue | 77 |
| shared-withdrawal | 14 |
| personal-room | 38 |
| Total | 219 |

Cases include owner/nonowner, fixed-theme neutrality, passive/automatic neutrality, explicit nonowner Like, prospective activation, actual aggregate/catalogue reads, immutable owner and account disabling. Existing regression cases cover Shared independent epoch transitions, revocation/regrant, attribution, replay/device deduplication, retention and restricted roles.

## Reproduction and verification

Used the documented Docker harness in `local-database-qa.md`: container `supabase_db_mistake-watch-task028`, disposable database `task030_catalogue_replay`. Verified zero users/rooms before tests. Applied the migration with `psql -v ON_ERROR_STOP=1 -1`; every fixture suite runs `BEGIN` / `ROLLBACK`. Verified zero users, rooms and recommendation events afterward.

```powershell
Get-Content supabase/tests/database/owned-themed-choice-learning.test.sql -Raw |
  docker exec -i supabase_db_mistake-watch-task028 psql -U postgres -d task030_catalogue_replay -v ON_ERROR_STOP=1 -q -At
```

Supabase CLI local `db advisors` (security/performance, warning level): no issues. `db lint` on public/private (error level): no errors. Current official database-function guidance reviewed; changelog Markdown fetch was unavailable because the web tool rejected its content type. No provider/client API changes are involved.

Only this disposable schema was changed. No hosted queries/writes, deployment, Git operations, consent UI, listener schema or intake changes. Local evidence does not authorize or prove a release.
