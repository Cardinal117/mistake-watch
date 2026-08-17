# Tasks: First-Party Recommendation Intelligence

## Batch A: Contract, Baseline, And Bridge Proof

Status: Released to production on 2026-07-16. Original functional QA passed.
The account-member provider authorization hotfix is deployed and merged to
`main`. Durable account preference state is confirmed. Final closure requires
deployed two-client QA for the local `MW-BUG-005` reconciliation follow-up.

Suggested files:

- `lib/recommendations/`
- `spacetime/src/`
- `lib/rooms/live-authority.ts`
- `tests/recommendations/`
- `scripts/`

Work:

- Freeze the event taxonomy, room-session and playback-occurrence identity,
  media identity, idempotency, completion/skip/replay semantics, actor versus
  original contributor attribution, privacy fields, and retention questions.
- Define Like/Remove Like command semantics, account versus guest scope,
  current-state storage, event transitions, neutral removal, and capped weight.
- Benchmark current Room Picks derivation and recommendation endpoint behavior.
- Build a non-production proof that a trusted server identity can read a bounded
  SpacetimeDB event outbox and acknowledge retries safely within Vercel limits.
- Do not create or apply a Supabase migration in this batch.

Agent usage:

1. Primary agent owns the event/preference contract, authority design, and
   trusted bridge proof.
2. Agent 1 works read-only to challenge session/occurrence identity, Like
   privacy, retention, and bridge failure cases, then prepares baseline fixture
   and test recommendations without editing shared contracts.
3. Primary agent resolves findings and keeps the packet/contracts authoritative.

Expected outcome and cumulative progress:

- 15% release readiness. Event and Like semantics are unambiguous, the current
  baseline is measured, and the trusted drain is proven feasible or the batch
  stops before migration work.

Review checkpoint:

- Prove no browser is trusted to originate canonical events.
- Approve the outbox drain and retention approach before schema work.

Safe commit point:

- Contract, tests, benchmark, and bridge proof only.

## Batch B: Authority-Side Event Capture

Status: Completed locally on 2026-07-15. Generated bindings are local only;
Maincloud remains unchanged.

Suggested files:

- `spacetime/src/recommendation-events.ts`
- `spacetime/src/index.ts`
- generated bindings
- `tests/spacetime/`

Work:

- Add a bounded authority event/outbox table and helper.
- Add room/session-scoped guest Like state and verified Like/Remove Like command
  handling where the approved authority design places it.
- Extract recommendation event code from the existing 2,205-line SpacetimeDB
  entry module instead of extending that file as one large block.
- Emit atomic events from relevant queue and playback reducers.
- Reuse deterministic idempotency keys across retries.
- Add pruning/retention bounds and avoid playback-tick events.
- Build, generate, and test locally before any Maincloud publish.

Agent usage:

1. Primary agent exclusively owns SpacetimeDB tables, reducer instrumentation,
   event identity, preference commands, and generated-binding integration.
2. Agent 1 owns only new reducer/event test files covering retries, completion,
   skip, replay, Smart Shuffle noise, Like toggles, and guest scope.
3. Primary agent reviews the tests against reducer semantics and fixes runtime
   code; Agent 1 does not edit `spacetime/src/index.ts` or event modules.

Expected outcome and cumulative progress:

- 30% release readiness. Authoritative inferred events and guest session Likes
  work locally, generate one event per meaningful action, and do not change
  existing queue or playback behavior.

Review checkpoint:

- Verify event meaning for natural completion, manual Next, play-now, previous,
  loop/replay, failure, remove, and Play Next.
- Confirm queue/playback reducer behavior is unchanged.

Safe commit point:

- Local SpacetimeDB event capture passes reducer tests; no production publish.

## Batch C: Durable Event And Aggregate Store

Status: Completed locally on 2026-07-15. The migration, generated types,
service-only persistence, bounded drain route, retention cleanup, and focused
security tests are ready for review. The migration has not been applied to any
cloud Supabase project; it has passed a destructive reset and behavioral proof
against a disposable local Supabase PostgreSQL instance. No drain schedule or
application deployment is active.

Suggested files:

- `supabase/migrations/`
- `lib/supabase/database.types.ts`
- `lib/recommendations/persistence.ts`
- `lib/recommendations/preferences.ts`
- trusted drain route/job files
- `tests/recommendations/`

Work:

- Propose service-only event and aggregate DDL with RLS, grants, indexes,
  retention, deletion, and uniqueness constraints.
- Add durable signed-in media preference state with one current row per account
  and opaque media identity; Like and Remove Like remain idempotent.
- Implement bounded, retryable, idempotent drain behavior.
- Retain non-personal event-key tombstones for 180 days so account deletion
  cannot turn an unacknowledged retry into duplicate guest activity.
- Keep private URLs and account secrets out of durable rows.
- Add migration, RLS, duplicate, retry, and partial-failure tests.

Agent usage:

1. Primary agent exclusively owns DDL, RLS/grants, persistence code, identity
   mapping, retention, and drain acknowledgement behavior.
2. Agent 1 owns migration smoke, RLS denial, duplicate, retry, rapid-toggle,
   deletion, and partial-failure tests in disjoint test files.
3. Primary agent runs Supabase advisors and prepares the migration review. No
   agent applies the cloud migration without explicit user approval.

Expected outcome and cumulative progress:

- 50% release readiness. Durable account Likes, normalized events, and bounded
  aggregates are locally verified, duplicate-safe, private, and migration-ready
  but remain unapplied remotely.

Review checkpoint:

- Run Supabase security/performance review.
- Require explicit migration approval before cloud application.

Safe commit point:

- Migration and application code are verified locally but unapplied remotely.

## Batch D: Deterministic Ranking Engine

Status: Completed locally on 2026-07-15. The pure ranker, hard exclusions,
component scoring, stable reasons, deterministic tie-breaking, bounded
diversity, adversarial fixtures, and 500-candidate performance gate pass. No
recommendation API, UI integration, migration application, publish, or deploy
is included.

Suggested files:

- `lib/recommendations/events.ts`
- `lib/recommendations/media-identity.ts`
- `lib/recommendations/preferences.ts`
- `lib/recommendations/scoring.ts`
- `lib/recommendations/rank.ts`
- `tests/recommendations/`

Work:

- Normalize candidates and aggregate inputs.
- Apply hard exclusions before scoring.
- Implement explicit weighted components, stable tie-breaking, diversity, and
  bounded recency/repetition behavior.
- Make Like the strongest capped positive input; Remove Like restores neutral
  and absence of Like never becomes a negative signal.
- Return structured score components, reason codes, and exclusion diagnostics.
- Add deterministic fixtures for empty, sparse, repeated, skipped, completed,
  replayed, unavailable, private-upload, and 1,000-item inputs.

Agent usage:

1. Primary agent exclusively owns scoring formulas, caps, exclusions, reason
   codes, tie-breaking, and diversity behavior.
2. Agent 1 owns deterministic fixtures, adversarial ranking cases, golden
   outputs, and the 500-candidate performance harness.
3. Primary agent reviews every expected score/reason before accepting fixtures
   so tests cannot accidentally define product policy.

Expected outcome and cumulative progress:

- 70% release readiness. The pure engine produces stable ranked candidates,
  Like-aware explanations, controlled diversity, and p95 scoring at or below
  50 ms without API or UI dependencies.

Review checkpoint:

- Equal inputs produce byte-stable ordering and reasons.
- Ranking meets the 50 ms p95 target or the variance is explained and fixed.

Safe commit point:

- Pure ranker and fixtures pass without UI or API integration.

## Batch E: Authorized Recommendation Service

Status: Completed locally on 2026-07-15. Authorization, bounded request and
cache contracts, active-participant revalidation, private preference reads, and
focused security/performance tests pass. No cloud migration, Maincloud publish,
drain schedule, or application deployment was performed.

Suggested files:

- `lib/recommendations/room-service.ts`
- `app/api/recommendations/room/route.ts`
- `app/api/recommendations/preferences/route.ts`
- route and authorization tests

Work:

- Authorize the current room participant and resolve catalogue capability.
- Load bounded aggregates and eligible candidates.
- Cache by safe room/history revision inputs and prevent cross-room leakage.
- Replace unbounded process-lifetime provider caching with an explicit TTL,
  capacity bound, and failure-expiry behavior.
- Support both verified room-scoped guest identity and signed-in durable room
  membership; do not require a guest cookie for every authorized account path.
- Expose verified Like, Remove Like, and current preference reads without
  accepting source URLs or participant-controlled identity fields.
- Return ordered candidates, source status, and factual explanations.
- Fail independently from room playback and provider APIs.

Agent usage:

1. Primary agent exclusively owns room authorization, catalogue capability,
   preference commands, cache keys, response contracts, and service failure
   behavior.
2. Agent 1 owns route-level authorization, cross-room isolation, cache expiry,
   rapid-toggle, stale identity, private-upload, and latency tests.
3. Primary agent audits every response field for private media and participant
   data leakage before integration proceeds.

Expected outcome and cumulative progress:

- 82% release readiness. Guests and signed-in members receive only authorized,
  bounded recommendations and private Like state through a warm endpoint that
  meets the 250 ms p95 target in deterministic tests.

Review checkpoint:

- Guest, member, owner, stale room, provider failure, and private-upload cases
  behave correctly.
- Warm endpoint meets the 250 ms p95 target in deterministic integration tests.

Safe commit point:

- Authorized service contract passes without changing room presentation.

## Batch F: Existing Room Picks Integration

Status: Completed locally on 2026-07-15. Existing Listen Room Picks now use the
first-party order when available, retain the provider fallback on service
failure, preserve authoritative empty results, and expose a shared accessible
Like control. Production browser QA remains part of Batch G because the new
SpacetimeDB procedures are not published.

Suggested files:

- `lib/recommendations/listen-discovery.ts`
- `components/room/listen/discovery/media-cards.tsx`
- existing active-media and Room Picks hooks/components
- browser tests

Work:

- Replace only the existing heuristic data boundary when the new service has
  usable results.
- Preserve current cards, actions, permission checks, empty states, and
  provider fallback behavior.
- Show concise factual reason labels without exposing score internals or other
  participants' private activity.
- Add a shared compact Lucide Heart control to approved active-media and Room
  Picks/recommendation cards with `aria-pressed`, Like/Remove Like labels,
  tooltip, stable dimensions, optimistic rollback, and honest unavailable state.
- Keep Mistake Watch Like visually and semantically separate from YouTube's
  public like-count metadata.
- Do not redesign Add Media, Watch discovery, or AI DJ.

Agent usage:

1. Primary agent owns UI integration, shared Heart control, state wiring,
   explanation copy, and adherence to `DESIGN.md`.
2. Agent 1 owns browser/E2E coverage for keyboard, screen-reader labels,
   optimistic rollback, card identity, mobile sizing, guest scope, and current
   playback continuity. Agent 1 does not redesign components.
3. Primary agent performs visual inspection and resolves all UI regressions.

Expected outcome and cumulative progress:

- 92% release readiness. Users can Like and Remove Like from useful media
  surfaces, recommendation explanations use that explicit signal, and existing
  Room Picks, queue, playback, mobile, and private-media behavior remain intact.

Review checkpoint:

- Recommendations improve while playback, queue, large-list, and mobile flows
  remain unchanged.

Safe commit point:

- Existing Room Picks consume the new engine behind a safe fallback.

## Batch G: QA, Migration, Publish, And Release Gates

Status: Released to production on 2026-07-16. Local gates, Supabase migration,
non-destructive Maincloud publish, exact-revision Vercel deployment, cron drain,
and two-participant functional QA passed. The attached-account provider
regression is fixed in deployed commit `a163a4b`, merged to `main`, and
user-verified. A read-only production check on 2026-08-17 confirmed four durable
account Like rows for one account. Final task closure now depends on releasing
and live-testing the scoped cross-device reconciliation follow-up `MW-BUG-005`.

Work:

- Run `npm test`, typecheck, ESLint, file-length policy, changed-file Prettier,
  production build, SpacetimeDB build/generate, database tests, deterministic
  ranking performance tests, and browser E2E.
- Use `qa-release-gate` and an independent read-only review.
- Apply Supabase migration before dependent application deployment.
- Publish SpacetimeDB before frontend code that requires generated event tables.
- Deploy the exact approved commit and complete two-client production QA.
- Use `git-commit-assistant`; do not stage, commit, push, migrate, publish, or
  deploy without the relevant explicit approval.

Agent usage:

1. Primary agent owns the integrated release candidate, migration/publish/deploy
   order, corrective patches, and final evidence.
2. Agent 1 runs the deterministic regression and performance matrix and reports
   evidence without changing product semantics.
3. Agent 2 performs one independent read-only security, privacy, idempotency,
   accessibility, performance, and scope review after all implementation fixes.
4. Primary agent resolves findings, reruns gates, and stops for each explicit
   migration, publish, commit, push, and deployment approval.

Expected outcome and cumulative progress:

- 100% release readiness only after Supabase migration, SpacetimeDB publish,
  exact-revision Vercel deploy, and two-client production QA confirm stable
  Likes, recommendations, playback, queue authority, and private-media safety.

Current outcome:

- Production deployment `dpl_FHBEn8Ue865tEQfwvjqVkMRrfi4G` is healthy on the
  live aliases.
- Two-client QA passed Like/Remove Like, recommendation refresh, playback and
  queue continuity, participant synchronization, and uploaded-catalogue
  authorization.
- Production emitted one `media_liked` event for each tested Like and the
  authenticated drain acknowledged the complete outbox without a server error.
- The tested room is now attached to the signed-in account. Ownership,
  saved-room state, host membership, and the migration record are account-backed.
- The tested Likes predate attachment and therefore correctly persisted only in
  private room-session state; durable Google-account persistence was not
  exercised.
- Attachment exposed a `403` regression in the guest-only provider request
  guard. The deployed correction accepts open-room account membership,
  preserves guest fallback and rate limiting, and passes 314 tests plus the
  complete static/build gate.
- Exact commit `a163a4b` is live as
  `dpl_AFfECQewb4i9m6F5QwABLp3FzpvW` and is now the head of `main`.
- User QA confirmed attached-account provider search works. Maincloud records
  two post-attachment `media_liked` events for the account-backed host.
- The scheduled drain subsequently completed. A read-only production query on
  2026-08-17 confirmed four `liked` `media_preferences` rows for one account,
  with matching account-attributed Like events in the durable event store.
- Cross-browser QA confirmed a fresh signed-in client retrieves the expected
  state after refresh. Because that check used the same active room, the
  production database rows remain the direct evidence for durable persistence.
- `MW-BUG-005` confirmed that an already-open second client remains stale until
  refresh. The local follow-up now performs bounded private-endpoint
  reconciliation every ten seconds and on focus, visibility return, or network
  reconnect, while preserving optimistic mutations and rejecting stale reads.
- Manual DevTools inspection of recommendation response bodies was not
  completed. Automated URL/identity rejection contracts, private no-store
  response headers, and production authority rows provide supporting evidence,
  but this remains recorded as a manual QA limitation.

Review checkpoint:

- Security, authority, idempotency, privacy, performance, and rollback evidence
  are complete.
- Deploy the `MW-BUG-005` follow-up and confirm a Like appears on another active
  signed-in client without refresh before marking TASK-011 fully closed.
