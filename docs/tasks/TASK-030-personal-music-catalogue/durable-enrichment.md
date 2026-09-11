# 030.12b Durable shadow enrichment jobs

Owner approved proceeding on 2026-09-11 after the local shadow engine QA.
Implement durable background scheduling and storage without accepting inferred
recordings or changing live ranking. Existing listening permissions remain the
authority for eligible account evidence; no new listening collection.

## Persistence and authority

Private account/source/stage jobs retain fresh catalogue snapshots, recording-link
revision and source registration identity. Completion rechecks eligibility,
metadata freshness and corrections; a stale worker cannot publish old evidence.
Identity results remain provisional/unresolved. Optional tag/audio jobs depend on
the same provisional recording. Compact normalized fields only, no raw provider
JSON, audio, artwork or credential storage. Cache/evidence expiry is bounded by
source metadata and provider lifetime. Withdrawal and source changes invalidate
reads and late completion; cleanup removes stale payloads.

RLS intent: all new tables private, RLS enabled with no browser policies. Revoke
direct access including service-role tables; narrow service-only security-definer
RPCs use empty search_path and validate account/source eligibility. Never reuse
owner-confirmation RPCs or write accepted links. No public/user-facing read route.

Each claim is fenced by a unique token and 30-second lease. Three attempts maximum;
transient failures back off, absent data is not retried forever. Identity shares
the existing MusicBrainz100/day rate row and lock with manual jobs. Last.fm and
AcousticBrainz have separate200/day request budgets; an audio claim reserves two
requests. Stale lease completion cannot release a replacement provider lease.

## Application contract

Server-only worker, off by default via SHADOW_ENRICHMENT_ENABLED. A single explicit
SHADOW_ENRICHMENT_ACCOUNT UUID permits bounded admission for the initial pilot;
derive no account from browser-controlled input. No account ID sent to providers.
Existing authorized drain route invokes the worker via after(), never awaited by
playback or queue actions. A turn admits at most five sources and processes at
most one stage, claiming the oldest due available stage to avoid starvation.
Missing Last.fm credentials complete that stage as disabled without a provider
request. Shared budgets and leases remain SQL-authoritative.
The shadow worker takes the drain's provider slot when enabled; existing manual
MusicBrainz worker remains the fallback when disabled. No new cron.

The existing daily cron is a recovery fallback. Authorized Personal Discover GETs
for the configured pilot account also pump one stage after catalogue preparation.
No extra foreground fetch or polling is added; other accounts cannot trigger pilot
admission through their own Discover pages. The request deadline bounds optional
work after the primary response/maintenance.

## Verification

Test-first SQL and worker contracts: private access denial, admission freshness,
snapshot/correction invalidation, bounded retry, concurrent claims, lease fencing,
budget reservation, no accepted writes, feature-disabled/no-provider dispatch,
malformed/near-expiry claims and independent optional failures. SQL tests only in
isolated local task030_catalogue_replay, never the app database or hosted project.
Independent review: assistant owns SQL/tests; root reviews schema and tests and
implements worker/adapters; assistant reviews root changes after integration.
No deployment, hosted migrations, real provider calls or live ranking activation.

## Implemented behaviour and integration

Migration `20260911163915_durable_shadow_enrichment.sql` adds private job/rate
tables and service-only admission, claim, completion, read and prune RPCs. Worker
code is in `shadow-worker-core.ts` and server-only `shadow-worker.ts`; the existing
drain and authorized pilot Discover routes invoke it only after the response.
Catalogue maintenance invokes shadow expiry cleanup independently of the pilot
flag, so migration deployment must precede the application release. Existing
manual MusicBrainz claims and the automatic identity stage use one shared quota.

Identity admission is capped at 256 sources/account and 4096 globally, reserving
space for two optional stages per source. Capacity pauses new batch admission
without preventing processing of already queued jobs or refreshing existing jobs.
Normal play-count updates do not invalidate identity jobs; preference event,
history/consent generations, source registration, metadata and correction changes
do. Optional-provider retries refresh only that stage while identity stays valid.

This slice persists evidence per account/source. It does not yet deduplicate
provider responses across different uploads/accounts sharing one recording MBID.
That reuse is a future cache optimization; quotas still bound duplicate queries.
No claim of independently validated automatic acceptance or ranking quality.

## QA evidence

Final database gate: 48/48 pgTAP assertions pass in isolated local
`task030_catalogue_replay`. New functions have no database lint findings. The
existing `private.shared_room_context` initializer warning remains unrelated.
Local security/performance advisors report no issues. Disabled, anonymous and
deleted accounts reject in-flight completion. Hosted state was not tested/changed.

Application: 236 recommendation/YouTube tests pass, including worker token and
deadline checks, throttle-delay propagation, unauthorized drain rejection and
deferred pilot-only Discover dispatch. Typecheck, production build, ESLint with
generated `.tmp/**` excluded and formatting pass. File-length check has zero
violations and 23 existing warnings outside this change. UI rendering was not
changed; this is route/worker evidence rather than physical-device QA.

Root's `verify-shadow-enrichment-concurrency.mjs --local-fixture` observed exactly
one claim/attempt from two simultaneous workers. Two identical completions both
succeeded idempotently, with no accepted link. Random fixtures were removed. This
script refuses any database except the fixed isolated local replay database.

Test chronology: root worker's no-op scaffold failed three behavioural assertions
before implementation. A Retry-After test failed before propagation was added.
Initial SQL missing-capability checks and later implementation coverage are
identified separately from behavioural red-green fixes. Root review prompted
stable context generation, capacity/backpressure and compact payload protections;
database lint caught the valid-audio expression bug. Those defects were reproduced
and fixed with regression checks. Assistant reviewed root worker/adapters and root
reviewed the migration and ran independent concurrency proof.

At this local QA milestone, no hosted migration, provider call or deployment occurred.
The subsequent [controlled rollout](shadow-pilot-rollout.md) records hosted changes.
Both settings remain default-off/unconfigured. Next is measured identity acceptance
and a controlled shadow pilot; provisional results must not drive strict ranking.
