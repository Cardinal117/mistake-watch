# 030.12 Automatic enrichment

Owner approved proceeding after the provider benchmark on 2026-09-11.
This replaces manual-reference-first delivery. No listening-time confirmation.

## Delivery sequence

1. Implement and verify the automatic matching/enrichment engine in shadow mode:
   compact provider adapters, deterministic candidate rules, bounded serial jobs,
   expiring reusable evidence and reproducible evaluation. Shadow outcomes never
   create accepted database links or change ranking. This is the current slice.
2. Validate threshold quality with version-sensitive labelled cases and the saved
   favourites, then connect the engine to durable leased jobs and private evidence
   in Supabase. Account eligibility, source revision, withdrawal, expiry and
   cross-worker rate limits must be enforced transactionally before activation.
3. Run the Fantasy/orchestral evaluation using eligible catalogue sources and
   supported classifications; unknown themes abstain. Release only after QA.

## Current engine contract

Matching rule v1 is a conservative eligibility screen, not a probability or an
accuracy claim. Require a Topic-derived artist, exact normalized title and complete
artist credit (including featured artists), finite source/recording durations
within three seconds, and exactly one distinct matching MBID. Preserve version
words, non-ASCII identities and diacritics. Nonempty disambiguation, conflicting
versions, truncated candidate sets, malformed results and missing duration abstain.
Provider relevance scores are not used. Results remain provisional until the
threshold has been independently evaluated; zero manual prompts.

MusicBrainz supplies search candidates with duration/disambiguation. Last.fm track
tags and AcousticBrainz features are optional, independent enrichment outcomes
after matching. No artist tag promotion, similarity lookup, YouTube request, audio
download or autoqueue. Each provider may be missing, invalid or unavailable without
invalidating identity or another provider's successful result. Keep original tag
labels and model namespaces; unknown is never a false/zero classifier result.

Cache identities by exact source metadata plus rule version; invalidate on metadata
change/expiry. Cache provider evidence by accepted candidate MBID and exact query
identity with provider/parser version. Bound expiry by source metadata expiry and
30 days; short retry outcomes must not become permanent negative entries. The
shadow batch is serial, capped, deadline-aware and uses an injected clock/sleep so
tests can prove failure/expiry behaviour without network calls. It is not a
deployment-wide rate limiter; no scheduler integration in this slice.

## Tests and acceptance

Test-first for matching and provider/data integrity: alternate versions, ambiguous
IDs, duplicate releases of one recording, title/artist collisions, Unicode,
featured credits, missing duration, stale source, malformed/oversized responses,
provider errors, classifier probabilities, source duration mismatch, cache expiry,
source changes, and no enrichment on unresolved sources. Synthetic fixtures only
in tracked tests. Saved real sample remains ignored and expires 2026-10-09.

Do not run new live queries merely to repeat the benchmark. Replay stored evidence
through the promoted rules for candidate coverage; absence of ground-truth labels
must remain explicit. Syntax, typecheck, targeted/regression tests and independent
review precede handoff. No Git publication, deployment or live ranking activation
is part of the current shadow-engine slice.

## Implemented shadow engine and current evidence

Four modules implement conservative identity matching, bounded MusicBrainz/Last.fm/
AcousticBrainz adapters, compact feature normalization and an isolated serial batch
with source-snapshot cache keys and per-provider fetched/expiry provenance. They
are not imported by a room route, scheduler or client component. Accepted recording
tables and owner-confirmation functions are not used. No schema changes in this
slice. Source-specific inference remains distinct from shared recording evidence.

`scripts/evaluate-recording-matches.mjs <private-evaluation.json>` runs entirely
offline. Input: `{ now, kind?, cases: [{ source, candidates, complete, expectedMbid?, labelEvidence? }] }`.
`source` follows SourceSnapshot, candidates follow RecordingCore. `expectedMbid`
is an independently authored ground-truth ID, or null for an intended abstention;
omit when unknown. Observational, synthetic and independent samples are separate;
see the [validation contract](identity-acceptance-validation.md). Output includes coverage, labelled errors/abstentions and sample
precision only when accepted labelled examples exist. No private titles or IDs are
printed. Inputs must be kept ignored, with their own source expiry enforced.

Replay of the existing saved MusicBrainz responses (latest successful normalized
query per source, only complete retained candidate sets eligible) covers ten unique
sources: four provisional, six unresolved. There are zero independent labels, so
precision remains null. This is not the earlier weak 32/60 ListenBrainz agreement
screen and must not be represented as 99% validated identity. A selected candidate
or successful metadata hydration alone cannot resolve every YouTube version.

Testing chronology: initial engine/adapter tests were authored before modules,
but first runs failed on missing modules, not a behavioural assertion. Do not claim
that as a complete behavioural red gate. Independent review then reproduced real
Unicode-title collisions, contradictory Last.fm IDs and a disabled-provider cache
bug. Added tests failed with those exact outcomes, then passed after fixes. A
separate provenance/expiry test also failed before its implementation. Remaining
new-surface coverage is contract-first with post-implementation green evidence.

Focused checks cover these regressions, features, version ambiguity, complete
candidate sets, source expiry, provider throttling and oversized data. The full
recommendation/YouTube suite passed 227 tests. No frontend behaviour changed, so
browser/device QA is not evidence for this shadow slice. No new provider requests
or private exports were made by the engine; fixture-backed adapters and offline
replay were exercised.

Final local gates passed: 15 focused tests, 227 recommendation/YouTube regression
tests, `npm run typecheck`, production build, formatting, independent review and
`npx eslint . --ignore-pattern '.tmp/**'`. Plain `npm run lint` was interrupted
because the repository configuration traversed ignored release snapshots/npm cache
under `.tmp`; the successful rerun excluded that generated directory only. File
length check: zero violations, 23 existing warnings outside the new modules.
Reviewer reproduced the Unicode/Last.fm/cache fixes and additionally checked empty
audio version and inconsistent classifier winner rejection. No remaining blocker
for the scoped local shadow engine; production integration remains unfinished.

## Remaining activation work

Update: the next durable-job slice is now implemented locally under
[030.12b durable enrichment](durable-enrichment.md), with private staged jobs,
account-bound claims, shared budgets and source/correction fencing. The remaining
description below is the production acceptance checklist, not absent local code.

The next implementation is durable admission/claim/completion and evidence storage
with deployment-wide provider quotas shared with existing MusicBrainz jobs. Do not
call the in-memory shadow cache production persistence or a global limiter. Refresh
source eligibility and revisions at completion, preserve corrections/withdrawals,
enforce leases and per-provider expiry, and keep source inference private. Add
service-only RPC/RLS tests and stale-worker/concurrency tests before migration.

Before provisional outcomes become accepted links, establish an independently
labelled validation set including covers/remixes, Classical performance identities,
phonk speed variants, uncertain artist credits and unrelated same-name tracks.
Exact-credit v1 intentionally abstains on partial collaboration credits/aliases.
Threshold validation and the Fantasy/orchestral ranking trial remain unfinished;
there is no live recommendation quality or production-readiness claim yet.

Adapter references: [MusicBrainz recording search](https://musicbrainz.org/doc/MusicBrainz_API/Search/RecordingSearch),
[Last.fm track.getInfo](https://www.last.fm/api/show/track.getInfo),
[AcousticBrainz API](https://acousticbrainz.readthedocs.io/api.html).
