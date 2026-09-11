# Controlled shadow rollout — 2026-09-11

Owner approved proceeding after acceptance validation. Scope: additive recording
foundation, MusicBrainz quota/reference prerequisites and private shadow jobs;
one-account automatic provider enrichment, with no accepted links or live ranking.
The earlier manual-confirmation UI/routes are excluded and retained locally.

## Release sequence and recovery

1. Recheck regression/build and isolated database concurrency; review exact artifact.
2. Apply the three tested Stage 2 migrations in filename order. Verify service-only
   privileges, RLS, advisors and existing account/room totals.
3. Configure server-only Last.fm key, explicit owner pilot account, shadow enabled;
   keep the older manual MusicBrainz worker explicitly disabled. No browser secrets.
4. Deploy the clean artifact to a production candidate without assigning the domain.
   Verify health, missing recording-review route and unauthorized drain rejection.
5. Promote only a Ready candidate, run a bounded authorized drain smoke check and
   inspect aggregate shadow outcomes, provider budgets and unchanged accepted links.

Stop provider work by disabling SHADOW_ENRICHMENT_ENABLED while retaining expiry
cleanup. Keep MUSICBRAINZ_IDENTITY_ENABLED=false. Do not roll back additive tables,
erase user history or enable provisional evidence in ranking. Provider throttling
is an expected retry outcome, not permission to increase polling or quotas.

## Scope and QA

The release includes automatic engine/adapters, durable worker/routes, three SQL
migrations and their prerequisite core/types, tests and task evidence. Source UI,
recording-review API, dialog/CSS and its tests are not in the release artifact.
No SpacetimeDB change or deployment is needed. No intake captures are staged.

Prior suite: 244 tests, typecheck/lint pass. Current full workspace production build
passes; that build contains retained local UI work and is not the final artifact.
Isolated concurrency proof rerun passes with no external requests or hosted changes.
Independent reviewer found no blocker to the stated additive, single-account scope.

Clean offline npm ci failed on an existing optional peer lockfile resolution; no
dependency files were changed. The hosted candidate build must independently pass.
Final deployment, migration and smoke receipts will be recorded below.

Hosted migrations applied successfully in order: `20260911163824`,
`20260911163857`, `20260911163915`. Local filenames now match hosted versions;
SQL content is unchanged from the isolated tests. Hosted readback: 2 accounts,
131 rooms, zero accepted links and zero initial shadow jobs. Anonymous and
authenticated claims denied; service-role claims allowed. Security advisor has
only the existing leaked-password-protection warning and intentional private RLS
no-policy INFO findings. Performance findings remain INFO, including six older
unindexed foreign keys; no new warning/error from the migration.

Clean release regression suite passes 239 tests (five excluded manual API tests
remain in the original checkout). Production environment is configured for the
single verified owner account, Last.fm key stored as secret, shadow enabled and
manual worker disabled; these settings take effect only on the new deployment.

## Candidate and remaining activation gate

Candidate `dpl_Ekppa5YTnV9k5tyGAZejnbgFcWbo` is Ready. Hosted build/typecheck pass,
and authenticated Vercel candidate checks return health 200, readiness 200 with
Supabase/Spacetime ready, unauthenticated drain 401, recording-review route 404,
and development media fixture 404. Plain HTTP initially reached deployment
protection rather than the app; only authenticated CLI checks count as evidence.
Independent artifact review confirms no confirmation UI/API or secret files.

Automatic approval review rejected live promotion: it interpreted owner approval as
QA deployment rather than permission to move the live domain. No alternate promotion
was attempted. Readback confirms watch.mistakestudios.com still resolves to
`dpl_BcbNSbdQJLf64zKDV8NRAP6swETG`. Explicit live-domain approval is the remaining gate.

The candidate's authorized drain smoke could not run because no local CRON_SECRET
is configured; no secret was fetched or auth bypass added. A hosted transaction
successfully admitted and claimed one eligible owner source, with snapshot and
lease, then rolled back all job/quota changes. This proves hosted admission/claim,
not an end-to-end deployed provider completion. Verify natural authenticated
Discover processing after promotion; accepted links/ranking must remain unchanged.
