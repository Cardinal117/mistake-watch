# Review and evidence

Final disposition: **Stage 1 local candidate passes QA, 2026-09-11**. Planning,
implementation and independent review are complete. Release and natural-use
validation remain separate steps; no production or Git publication occurred.

## Planning baseline — 2026-09-11

Worktree initially clean on `codex/task-029-personal-discover`. Source and
migrations checked against current TASK-029 handoff; no hosted data read.
Owner approved thorough planning followed by local Stage 1 implementation.

Applied skills: spec-first-workflow, Supabase, risk-based-testing and approved-
task-implementation; design-md-enforcer for preserved UI and qa-release-gate for
final verification. User approval already covers transition from planning to
implementation; no repeated permission question is required.

Independent catalogue source audit identified and resolved in the design:

1. Playable does not mean public: require explicit verified public status.
2. Eligibility is inserted after events: register from eligibility/Like boundary.
3. Existing daily prune follows SpacetimeDB success: new retention must not.
4. Metadata refresh does not extend actual use or user preference retention.
5. Shared public metadata reuse is not consent to cross-user preference mining.

Stage 1 uses current first-party preference/history contracts and no inferred
YouTube genres or popularity-derived personal score. Stage 2 policy/identity
questions remain explicit future gates. Existing audio companion is not changed.

## Planning review

Independent packet review completed. Resolved four contract gaps before source
work: cache-aware regulars avoid pre-limit starvation; reconciliation progresses
past 128 unregistered references; apply revalidates only previewed IDs and may
omit revoked entries; refresh claims require current eligible references.
Frozen service RPC signatures are recorded in database.md. Planning gate passed;
proceeding with approved Stage 1 local implementation and test-first coverage.

## Implemented scope

- Additive source/cache/job/budget schema and bounded server decision snapshots.
  Source registration uses trusted Likes/eligible choices; reconciliation handles
  retained owner history without rewriting its learning semantics.
- Owner-only cache-aware regulars and wider familiar candidates; no foreground
  provider dependency, no YouTube-derived genre or popularity ranking.
- Bounded videos.list worker, explicit public/processed/embeddable admission,
  conservative restriction handling, lease/budget control and independent expiry.
- Personal UI consumes server candidates/reasons, keeps 12 rows in the overview
  with View all, expires mounted metadata and preserves queue/feedback behavior.
- Server decisions retain reason/version; browser observations retain original
  decision through in-flight queue confirmation. They remain diagnostics, not
  causal proof or trusted preference learning.

## Test chronology

Baseline: clean `e8fa1f9`; planning documents preceded production source changes.
Initial existing Discover characterization: 8 tests passed. The old hydration
tests were then superseded by the changed cached-read contract, not retained as
tests of dead provider-hydration code.

| Layer | Evidence and chronology |
| --- | --- |
| Cached reader | Test-first: `Personal catalogue read uses cached metadata and never calls foreground providers` failed with providerCalls 1 instead of 0, then passed. Other new snapshot validation/expiry cases initially hit the obsolete callback signature; those failures are not claimed as behavioral red evidence. |
| Personal provider search | Test-first browser: expected zero automatic calls, observed 2 YouTube recommendation searches and 3 room-ranking calls after mount/song change. Same final assertion passes after removing the effect. |
| Trace and compact overview | Test-first browser: missing decision UUID and 36 rendered rows instead of 12; same final tests pass with original-decision confirmation and View all. |
| Worker isolation | Most new worker coverage is post-hoc. Additional meaningful red/green corrections: catalogue failure initially prevented room persistence; explicit uploaded/restricted video initially admitted as public. Both corrections now pass. |
| SQL | Baseline before migration failed 3 capability assertions. Substantive privacy/retention/consent/decision tests were developed with the new schema and are labelled post-hoc, not retroactively claimed test-first. Independent source review and actual concurrency tests supplement them. |
| UI expiry | Post-hoc behavioral coverage: mounted expiry before next poll and stale refresh rejection. |
| Documentation | Exempt from invented application tests; checked consistency and local links. |

## Application verification

- `node --test tests/recommendations/*.test.mjs tests/youtube/*.test.mjs`:
  **133 passed**. Includes existing recommendation/consent-facing contracts and
  new cache/public-admission/worker/decision normalization coverage.
- `WATCH_DESIGN_QA=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5371 npx playwright test
  tests/e2e/personal-discover.spec.ts --workers=1`: **18 passed**. Preview route
  renders the actual Personal component using synthetic API/queue fixtures.
- `npm run typecheck`: passed. `npm run build`: passed.
- `npm run lint`: exit 0, zero errors; 32 warnings are unused generated eslint
  directives under pre-existing ignored `.tmp/task029-*` release archives.
  Targeted edited application/UI lint is clean.
- `git diff --check`: passed. Next-generated dev type path was returned to its
  existing production path by the successful build; no manual environment edit.
- `npm run check:file-lengths`: zero violations, 22 advisory warnings. Extracted
  reusable browser setup into `tests/fixtures/personal-discover-fixture.ts` to
  keep the spec below its 700-line ceiling (final 595 lines; helper 191).
  The rerun exposed an initial preference-refresh timer race in the expiry test;
  waiting for preference readiness and flushing that timer fixed the measurement
  boundary. Metadata still must disappear without another read. Final full
  browser suite: 18 passed; focused expiry checks: 6 passed. Typecheck and targeted
  test lint also passed after extraction. No product changes followed the build.
- Real local SQL snapshot from `read_personal_catalogue` passed through the
  application `createPersonalDiscoverReader`: 1 regular, 1 liked recommendation,
  verified metadata/expiry contract accepted. No provider request was used.

Desktop 1680 and mobile 390 screenshots were inspected by UI agent and main agent;
empty-player bottom screenshot checked by UI agent. Existing gradient, underline
tabs, wrapping regulars and accessible bottom rows are preserved. Screenshots
are local under ignored `test-results/personal-discover-*.png`; no new design
asset or style system was introduced.

## Independent review and corrections

Three bounded assistant roles: schema/source audit and SQL QA; packet/UI review
and browser QA; independent implementation review. No delegated production work.

Resolved during implementation review: obsolete loading property caught by
typecheck; explicit regional/age restriction admission; missing durable decision
trace; decision eviction breaking retries/feedback; storage lock-order conflict.
All catalogue storage mutations now acquire one short DB advisory lock before
row locks; provider I/O is outside the lock. This prioritizes correctness for
the bounded pilot and is a throughput tradeoff to revisit only with measurements.
Independent final source review found no remaining critical scoped contradictions.

## Database verification

Isolated synthetic database `task030_catalogue` in local container
`supabase_db_mistake-watch-task028`, port 55422. Schema-only clone from local
auth/public/private; zero existing accounts/rooms/history copied. Active local
postgres and hosted databases are not migration targets. SQL fixtures roll back;
concurrency fixtures use new random room IDs because retirement tombstones
correctly prevent reuse.

- New catalogue SQL suite: **77 assertions passed**.
- Existing SQL regressions: **239 assertions passed** across Discover (39),
  learning policy (37), consent audits (40), Temporary lifecycle (48), Shared
  withdrawal (14), Personal rooms (38) and retirement (23).
- Actual concurrent sessions passed disjoint 50+1 claims, expired-lease fencing,
  the atomic daily ceiling, identical-decision deduplication and immutable action
  linkage. These exercise the database rather than a mock of its locking rules.
- Full migration replay passed against a second fresh schema-only database,
  `task030_catalogue_replay`.
- Explicit local Supabase advisors: **No issues found**. Database function lint
  for public/private schemas: **clean**.

Only these two disposable databases were changed. See the
[reproducible commands](local-database-qa.md) and
[release plan](release-plan.md) for the separate hosted gate.

## Acceptance coverage

| Criteria | Local evidence |
| --- | --- |
| AC1–AC5: registry reuse, public admission, isolation, consent and bounded reconciliation | New SQL suite, existing consent/lifecycle regressions and worker admission tests. |
| AC6–AC7: no automatic search, bounded refresh and independent expiry | Reader/worker tests, no-search browser regression, lease/budget concurrency and database expiry checks. |
| AC8–AC9: owner evidence, truthful explanations and decision linkage | SQL candidate/decision tests, actual SQL-to-reader contract, browser observation and delayed queue confirmation checks. |
| AC10–AC11: explicit queue behavior and preserved responsive UI | Existing and added Personal browser interactions, expiry checks, desktop/mobile screenshot inspection. |
| AC12: scope boundaries | Diff and independent source review; synthetic local databases only, no provider requests or production operations. |

## Remaining verification limits

No hosted schema application, production backfill, Git publication or deployment.
No real YouTube calls/consumed quota or personal listening usefulness measured.
Browser fixtures prove component behavior, not a new authenticated production
room session. Real listening/physical-device acceptance follows the release plan.
Exact causal recommendation-to-authority-event attribution, external enrichment,
strict musical classification, community similarity and Autoplay remain later.
