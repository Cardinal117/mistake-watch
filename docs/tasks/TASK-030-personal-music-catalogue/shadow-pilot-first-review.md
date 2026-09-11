# First accumulated shadow review — 2026-09-11

Read-only hosted snapshot around 18:32 UTC; counts may advance during normal use.
No provider requests, schema/data mutation, ranking activation or release in this review.

## Findings

256 identity jobs have reached the account admission cap. 36 have conclusive
metadata outcomes: 12 provisional, 23 insufficient agreement, one ambiguous.
45 await retry after an attempt and 175 have not been attempted. The provider
budget showed 84 of 100 daily MusicBrainz attempts reserved. This is the configured
application budget, not a claim about MusicBrainz's service-wide allowance.

For the 12 provisional identities, AcousticBrainz yielded seven normalized audio
profiles, four missing results and one retry outcome after three attempts. Each
ready profile has BPM, key, scale and 15 classifier families. 7/12 availability
does not measure catalogue coverage, correct identity or accurate classification.
Last.fm yielded seven missing and five invalid results, with no usable tag sets.
The stored invalid status does not identify which validation check failed; do not
assume all five were wrong song matches or loosen safeguards without investigation.

The key sampling problem is preference priority: only 52 of the admitted sources
carry a liked preference snapshot; 40 are unattempted, eight awaiting retry and
four insufficient agreement. None of the 12 provisional matches is from that liked
subset. Admission orders by media ID, so the current processing sample is not the
agreed favourites-first evaluation and should not be presented as such.

No accepted links, other-account jobs, expired result records, expired in-flight
leases or exhausted pending jobs were found in the checked snapshot. The completed
audio retry is a terminal bounded-retry outcome, not successful enrichment.

## Decision and next work

Enough evidence exists to evaluate operations and identify the next fixes. More
owner listening is not the immediate requirement. This is insufficient evidence
to enable trusted identities or Fantasy/orchestral ranking.

1. Prioritize existing liked-source jobs and favourites-first admission without
   discarding work, bypassing consent or increasing provider budgets. Account cap
   behaviour must not let older lower-priority sources starve newer favourites.
2. Diagnose the five Last.fm invalid outcomes with compact validation reasons and
   bounded targeted evidence; distinguish absent tags from identity disagreement.
3. Review retry throughput/cooldowns and independently validate representative
   identities/audio evidence before proposing a ranking trial. Keep unverified
   classifier genre/mood outputs as evidence, never certain musical facts.

## Approved follow-up

Owner approved proceeding. Implementation is bounded to favourites-first shadow
admission/processing and precise Last.fm diagnostic outcomes. Ranking stays off.
At capacity, a new favourite may replace only an unliked, never-attempted,
unleased pending identity job without downstream evidence. Completed results and
active work are preserved; if no safe slot exists, admission waits. Provider
budgets remain unchanged. Optional enrichment must continue to make progress.

Last.fm diagnostics store fixed reason codes only (response, title, artist, MBID,
duration or tags validation); raw responses and secrets are never persisted.
Previously invalid owner tag jobs may receive one bounded diagnostic retry through
the existing claim/budget/completion fences; no global reset or identity promotion.

Testing is test-first for changed outcome and scheduling contracts: reproduce
missing diagnostic reasons and favourite starvation, then verify cap handling,
active lease protection, privileges, stale-context rejection and concurrent claims.
Run focused tests, typecheck, lint, isolated SQL and a clean release build before
the authorized release. Audio and musical relevance QA remain the owner's role.

## Implementation and verification

Implemented favourites-first admission and per-stage claims. Existing refreshes
remain possible at capacity, and least-recently-served stage rotation prevents
identity backlog from starving tags/audio. No provider budgets were raised.

Last.fm now persists fixed validation codes; absent tag arrays remain malformed,
empty arrays mean no-tags, and explicit provider not-found means track-not-found.
Identity disagreement still rejects tags. HTTP/body failures are distinguished.
No raw provider response is stored. SQL accepts these codes only for tag outcomes.

Test-first evidence: the provider regression failed on the missing title-mismatch
reason, then passed. SQL diagnostics failed with Unexpected shadow fields, then
passed 17 assertions. Priority tests exposed seven failures before corrections,
then passed 16 assertions. Existing shadow48 and admission-performance7 also pass:
88 SQL assertions total. Independent diagnostic review found no blocker.
Full workspace 247 tests and clean release 242 tests pass; typecheck and focused
lint pass. Concurrent claims/idempotency pass when run serially after transactional
SQL suites (an overlapping run got zero claims while the shared test rate row was
locked; it was rerun after those fixtures released their locks).

Hosted migrations `20260911184812` and `20260911184825` are applied. Five-source
admission measured 192.674ms in a rolled-back hosted transaction. Advisors show
only pre-existing findings: leaked-password-protection WARN, intentional private
RLS INFO, six unindexed foreign keys INFO and unused indexes INFO.

Candidate `dpl_BpV2kLTP7yHdrtuQFPfsKQPPPzpb` is Ready. Hosted production build
and typecheck pass; health/readiness200, unauthorized drain401, excluded recording
review route404. Automatic approval review rejected live-domain promotion as
requiring explicit approval for that separate action. Domain readback still points
to `dpl_6SgqNaZkD56W1rz56mzXNm2MWH4p`; no alternate promotion was attempted.

The five original invalid tag jobs received one guarded requeue, preserving their
attempt count, provider budgets and fresh-context requirement. Targeted local
execution could not reliably complete inside the30-second claim across tool
approval latency; workstation clock was also about90seconds ahead of database UTC.
The runner stopped before network on expired timing checks. One intervening
ordinary pending tag job returned retry through the adapter. No failed identity
checks were relaxed and no diagnostic reason has been inferred for those five.
Stop local probes here; finish their recheck through the deployed worker after
promotion approval, respecting existing cooldowns and the three-attempt cap. No music
or UI changes are part of this release. Superseded local confirmation UI/API and
owner intake notes remain unstaged and excluded from the clean artifact.
