# TASK-029 Personal Discover backend verification

Date: 2026-09-09. Local implementation and QA only; no hosted database access,
production changes, Git publication or deployment.

## Implemented boundary

- `GET /api/recommendations/discover?roomId=…` returns explicit account Likes,
  recorded completed Personal-room plays over the retained 180-day window,
  bounded known-video metadata, and the account's Discover feedback.
- Counts use distinct trusted `playback_occurrence_id` values on retained
  `playback_completed` events attributed to this Personal owner and room. They
  exclude skips, expired/older events and other accounts. They are display
  statistics and do not change the existing learning eligibility policy.
- Candidate supply takes a deduplicated union of up to eight liked tracks,
  eight frequent completed tracks and eight older completed tracks (>7 days).
  Active feedback is filtered before those limits. Hydration is at most 24
  identities and eight concurrent calls through the existing metadata cache.
- Feedback is private account/video state: neutral, seven-day `not_now`,
  `do_not_suggest`, and YouTube-video-specific `wrong_version`. Compare-and-set
  revisions protect cross-device edits and Undo. Likes remain independent.
- Browser observations use a separate 120/minute budget and a 30-day diagnostic
  ledger. They do not become trusted playback or taste evidence. Identical action
  retries are idempotent; conflicting reuse is rejected. Unselected impressions
  do not imply dislike. Actual playback/queue authority remains SpacetimeDB.
- Private tables have RLS and no browser grants. Public RPC wrappers are service
  only, call private implementations and recheck active Personal ownership.
  Account deletion cascades feedback and observations. Existing retention cleanup
  now also removes old observations. Feedback state is limited to 1,000 video
  identities per account with an explicit refusal at capacity, never silent loss.

## Verification evidence

| Check | Result |
| --- | --- |
| New contract/service tests | 8 passed; rejected forged fields, revision errors, malformed projections; tested snooze expiry, metadata failure/unavailability and concurrency bounds |
| Existing request-budget tests | 3 passed |
| `npm run typecheck` | Passed after frontend import correction |
| Targeted backend ESLint | Passed with no errors or warnings |
| `supabase/tests/database/personal-discover.test.sql` | **39 assertions passed**, rollback-only synthetic fixtures |
| `scripts/qa/discover-concurrency.mjs` | Two real concurrent PostgreSQL sessions: one feedback CAS winner; simultaneous retry produced one revision and one observation |
| Supabase security/performance advisors | No warning/error issues in the isolated final schema |

The SQL suite verifies owner/foreign-account denial, cold start, distinct occurrence
counts, retention/attribution exclusions, independent Likes, idempotency, stale
Undo, seven-day snooze expiry, persistent video exclusions, RLS/grants, cleanup,
disabled accounts, closed rooms and account deletion. Review identified candidate
starvation before limits; three added cases failed first, then passed after active
exclusions and separate bounded candidate sources were implemented.

Contract/service tests were written and run before their implementation (missing
module failures). The initial SQL suite failed because the new RPC did not exist.
Subsequent fixture field/schema-usage corrections were test setup fixes.

## Local database state and reproducibility

The isolated final QA database is `task029_discover_v2` inside the existing local
container `supabase_db_mistake-watch-task028`, exposed on database port `55422`.
It was created with schema-only auth/public/private definitions from the local
synthetic backend; no account/room/history rows were copied. SQL fixtures roll
back, and the separate concurrency fixture deletes its own synthetic account.
The abandoned empty first scratch database was removed after verifying no account,
room or recommendation rows. Existing services were preserved.

After isolated checks passed, migration
`20260909150143_personal_discover_feedback.sql` was applied transactionally to the
active **local synthetic** `postgres` database in that same container for the main
agent's actual-route browser/API checks. Existing account and room rows were
preserved. The reviewed candidate-supply correction was then applied to its new
private Discover read function. These were direct local SQL applications; no
hosted migration history was touched. Browser/API validation is recorded separately.

Commands (PowerShell, from this worktree):

```powershell
node --test tests/recommendations/discover-contracts.test.mjs tests/recommendations/discover-service.test.mjs tests/recommendations/request-budget.test.mjs
Get-Content -LiteralPath supabase/tests/database/personal-discover.test.sql -Raw | docker exec -i supabase_db_mistake-watch-task028 psql -U postgres -d task029_discover_v2 -v ON_ERROR_STOP=1 -q -At
$env:DISCOVER_QA_DATABASE='task029_discover_v2'
node scripts/qa/discover-concurrency.mjs
```

The Supabase advisor command used `--db-url` targeting that explicit local clone,
`--level warn --type all --output json`; no linked-project option was used.

## Limitations and release gates

- Completed occurrences mean trusted completion/advance classification, which can
  follow a seek or automatic loop; they are not proof of uninterrupted listening,
  deliberate replay or lifetime counts. UI copy must make that distinction clear.
- Synthetic counts prove projection behavior, not listening quality or physical
  device behavior. Real recommendation usefulness and consumed provider quota
  remain unmeasured.
- Metadata failures use explicit `Title unavailable`; definitively unavailable
  recordings are omitted. Metadata hydration does not add provider imports/scopes
  or automatically queue anything.
- No new ranker, theme classifier, Shared taste blend or Autoplay was enabled.
- The RPC TypeScript declarations were updated for the new signatures; this is
  not a claim that the entire generated database type file was regenerated.
- A production release still requires the approved migration/source release
  procedure. Missing schema fails closed as unavailable; it must not silently
  restore blocked fallback suggestions.
