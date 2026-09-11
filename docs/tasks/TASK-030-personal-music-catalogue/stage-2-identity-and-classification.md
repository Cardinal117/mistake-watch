# Stage 2 — recording identity and evidenced classification

Current owner approval follows the completed provider benchmark: implement
[030.12 automatic enrichment](automatic-enrichment.md). The local shadow engine
is implemented; durable jobs, measured acceptance and strict ranking remain next.
The evaluation/manual-reference chronology below is retained as history.

Latest owner correction (2026-09-11): the next step is an
[automatic favourites/provider evaluation](automatic-provider-evaluation.md).
The manual-reference-first delivery sequence below is historical and superseded.
Do not require listening-time confirmation UI. Evaluate automatic matching quality
and coverage before selecting provider integration; unresolved is a silent valid
outcome. Existing private correction infrastructure may be reused internally.

Updated: 2026-09-11. Status: owner accepted the listening/UI rollout and explicitly
authorized Stage 2 implementation with one independent reviewer at medium effort.
030.11a/b local foundation is implemented and reviewed; see
[implementation and QA evidence](stage-2-foundation-qa.md). No Stage 2 provider
integration or schema is live.

First delivery is a server-only, account-private reference foundation and offline
strict-selection evaluator. Explicitly entered recording/version references may
be corrected with revision checks; no title matching or implicit merging. Records,
links and assertions are isolated by account. Global publication, provider jobs,
live classification and room pilot follow the provenance/quality gate. No empty
job infrastructure is added before an enabled adapter exists. This is useful
preparation for 030.11c/d, not an activated recommendation engine.

Risk: data integrity and privacy require test-first SQL and deterministic tests.
Test wrong-account references, stale revisions, retry identity, revoked/disputed
links, expired evidence, contradictory assertions, alternate performance/edit,
and strict filtering before result limits. Synthetic references are test fixtures
only and must never be imported into the live catalogue.

## Outcome and boundaries

Use a small catalogue of correctly identified recordings and versions to make
useful, explainable suggestions. Personal favourites and rediscovery lead the
trial; Fantasy/orchestral is the first strict theme, with Classical performances
and phonk edits as boundary cases. The owner evaluates through normal listening.
Offline evaluation means fixture/ranking checks, not asking the owner to listen
to music they dislike.

Likes and counts remain attached to playable sources. A recording identity links
sources only with adequate evidence. A work/composition, performance/recording,
release and YouTube upload are different entities. Covers, live performances,
sped-up/slowed edits and remixes are not automatically interchangeable.

## Compact data model to implement

| Record | Minimum contents | Restrictions |
| --- | --- | --- |
| Recording | Internal ID, optional verified external recording ID, independently sourced display identity | No title-only automatic merging |
| Source relationship | Existing source ID, recording ID, exact-version relationship, evidence reference, review state and revision | Unresolved/ambiguous is a valid state; reversible corrections |
| Classification assertion | Recording/version subject, vocabulary/facet/value, provider or user provenance, evidence reference, retrieval/review date, license and status | Genre, mood, instrumentation and theme suitability are separate facets |
| Resolution job | Source/reference, bounded attempts, lease, due time and outcome | Deduplicated background work; no foreground provider wait |

Store accepted compact fields, not whole provider responses. User corrections
start private; they do not silently change everybody's classification. Global
assertions require reviewed evidence. A disputed link is excluded from strict
theme selection until resolved; correction invalidates affected candidate caches.
Retain enough revision/provenance to undo a bad match without rewriting Likes.

## Provider readiness and provenance gate

Official sources were checked on September 11, 2026:

- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
  restrict derived data/metrics from API data and require clear distinction for
  independent product data. The additional analytics exceptions require specific
  application/approval; this project has no verified exception. Preserve the
  existing 28-day metadata refresh/expiry boundary. Do not infer genre/mood/BPM
  from API titles, views or Like statistics as a presumed permitted shortcut.
- [MusicBrainz licensing](https://musicbrainz.org/doc/About/Data_License) separates
  CC0 core data from supplementary data under a noncommercial share-alike license.
  Field-level licensing must be checked before enabling tags/genres; not all
  returned data is automatically CC0 or commercially unrestricted.
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) and
  [rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) inform a
  background adapter with a meaningful application/contact User-Agent, shared
  throttling at no more than one request per second unless agreed otherwise,
  bounded retries and backoff. Deployment-wide coordination is required.

First safe evaluation path: independently supplied/confirmed recording references
and synthetic or properly licensed classification fixtures. A YouTube URL alone
does not guarantee recording identity, mood, genre or BPM. MusicBrainz is an
optional identity source, not a universal mood/BPM service. Do not download media,
extract audio, request Google scopes or create provider accounts in this slice.

Before any live enrichment adapter, record each field's origin, allowed use,
retention, attribution, license and match method in the packet. Also review the
actual origin/use of player-derived listening measurements before 030.10 enables
live collection or its pilot (the narrow review precedes Stage 2); app consent
does not override provider terms. Unknown permission keeps that adapter/evidence
path inactive while independent fixture and identity work can continue. This is
a concrete activation gate, not a declaration of legal compliance.

## Candidate selection and explanations

Reuse Stage 1 admitted playable sources and the private eligible account reader.
Keep availability/country, feedback, version and privacy filters before limits.
Familiar candidates lead. Verified related recordings may fill a bounded discovery
allocation only when their evidence supports the requested context. No invented
numerical confidence or learned weights; begin with deterministic, versioned rules.

Strict Fantasy/orchestral requires explicit supported theme/instrumentation
evidence under a documented rubric. A genre tag alone is not sufficient proof of
theme suitability. Unknowns may remain available outside strict filtering, clearly
unclassified, but cannot fill a strict-theme result just to reach a target count.
Classical performance identity and phonk version differences must survive ranking.

Reasons are evidence-specific: "You liked this", "You return to this", or a
truthful classification/recording relation. Do not claim "People with similar
tastes" before Stage 3's independent consent and cohort evidence exists.
Showing, skipping, queueing and Liking remain distinct actions. Autoplay and
automatic queue filling remain out of scope.

## Implementation sequence and QA gate

1. **030.11a — provenance and fixtures:** complete field/use review; prepare small
   labelled favourite/rediscovery, Fantasy/orchestral, Classical and phonk sets.
   Include ambiguous upload, compilation, cover, alternate performance and edit.
2. **030.11b — identity foundation:** additive private schema and reversible
   source links; owner isolation, conflict and idempotency tests first. Implement
   reviewed reference entry/resolution before any automatic external lookup.
3. **030.11c — permitted adapter/classification:** activate only reviewed fields;
   test rate budget, expiry, retry/lease fencing and contradictory assertions.
4. **030.11d — theme selection and pilot:** test strict unknown exclusion, version
   identity and explainable candidate reasons; then owner Personal-room trial.

Acceptance: no incorrect automatic merge in the labelled boundary set; all strict
theme inclusions have inspectable supporting assertions; uncertain cases abstain;
expired/unavailable sources cannot be recommended; zero automatic foreground
YouTube search; bounded background cost; no private cross-account evidence leak.
Report labelled-set results separately from natural-use usefulness. Small-fixture
success is not proof of broad genre coverage. Use quality failures to improve
identity/evidence before adding providers or unverified ranking heuristics.

Stage 3 community overlap, time-of-day habits, BPM analysis, Google history import
and learned ranking remain later work. Shared listening opt-in is not permission
to contribute a private profile to global similarity.
