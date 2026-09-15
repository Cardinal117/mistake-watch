# CPU efficiency slice — request-local recommendation authorization

Status: implemented and locally verified on 2026-09-15; not published or
deployed.

## Objective

Reduce repeated Supabase authentication and profile reads during recommendation
authorization without caching identity or permission decisions across requests.

## Scope

- Validate the Supabase user once per recommendation request.
- Reuse that verified user while loading the current account profile.
- Reuse the resulting account summary for Personal-room ownership and uploaded
  catalogue access decisions.
- Keep room status, membership, account status and room-kind access checks fresh.
- Preserve guest-cookie fallback and request budgets.

## Exclusions

- Cross-request or global authentication caching.
- Changes to RLS, database schema, membership, room permissions or account
  lifecycle behavior.
- Preference polling, catalogue maintenance, delivery, heartbeat and health
  checks.
- Git publication and deployment unless separately approved after QA.

## Acceptance

- Account recommendation authorization performs one Supabase `auth.getUser()`
  call per request.
- An already validated active Personal account does not trigger another auth or
  profile read at the Personal access boundary.
- Personal access still requires a non-anonymous owner with an existing active
  profile.
- Shared and Temporary room access paths retain their existing checks.
- Recommendation, room and identity regression suites remain green, excluding
  independently identified pre-existing failures.

## Test chronology

- Characterization baseline: 16/16 existing Personal-access and recommendation
  route tests passed before production edits.
- Test-first red: the new authorization tests failed because the recommendation
  path performed two identity reads and Personal access performed another auth
  read despite receiving a validated account.
- Green: focused authorization and account tests pass after request-local reuse.

## Implementation

- `getAccountSummaryForVerifiedUser` builds an account summary from a user
  already returned by Supabase authentication. Personal authorization requests
  an existing profile to preserve its prior denial and side-effect boundary.
- `canAccessAccountRoom` and `isPersonalRoomOwner` accept an optional account
  summary and use it only for the Personal ownership decision. Their existing
  standalone behavior remains available for other callers.
- `requireRecommendationRoomAccess` continues to read current open-room and
  membership rows on every request, then passes the same account summary to
  room and catalogue authorization.

## Verification

- Focused authorization/account tests: 19/19 passed.
- Final combined recommendation, identity and Personal-access regression:
  277/277 passed (246 recommendation, 21 identity, 10 Personal-access checks).
- Ten additional integration checks execute the actual account, room access and
  catalogue helpers with synthetic Supabase responses. They verify one auth and
  one profile read, disabled/missing/unknown profile denial, anonymous/wrong-owner
  denial, closed-room/missing-member denial and fresh Shared revocation.
  This additional integration coverage is post-refactor; the original two
  optimization checks above retain their recorded red/green chronology.
- Identity suite: 21/21 passed.
- Typecheck, changed-file ESLint, production build and diff whitespace check passed.
- The complete room suite passed 100/102; two unrelated room-loading tests fail
  because their existing VM fixture does not provide `useRoomTransitions`.
  Neither failing source nor fixture is changed by this slice.
  `git diff --exit-code HEAD` on both files confirmed the baseline match.

## Limits and next step

Personal allowed requests reduce explicit auth calls from three to one and
profile reads from two to one. These are source/integration call counts, not a
measured production CPU percentage. No hosted data, migration or deployment was
used for verification. Existing loading-fixture failures and the earlier recorded
YouTube player file-length gate remain outside this slice.

Current Supabase getUser documentation was checked:
https://supabase.com/docs/reference/javascript/auth-getuser
The verified user is passed only within the request; callers must never supply
client-authored account summaries. Shared/Temporary access still runs before
profile creation, and Personal requires raw active status before normalization.

Memory preflight reused the current Watch retrieval: INDEX and Current-State,
two files/4,556 characters, no truncation; repository evidence overrides older
state. Checkpoint deferred to the repository task record; no vault write made.

Next: specify durable maintenance cadence and wake-up guarantees before moving
catalogue cleanup out of interactive requests. Recommend Astra Medium for that
scheduling decision, then Sol Medium implementation with Supabase,
risk-based-testing and qa-release-gate; review expiry and backlog progress.
