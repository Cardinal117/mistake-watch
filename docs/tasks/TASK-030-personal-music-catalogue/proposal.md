# TASK-030: Personal music catalogue foundation

Updated: 2026-09-11. Status: Stage 1 implemented and QA passed locally; not deployed.
Documentation: full packet because this changes durable data, provider spending,
privacy, background work and candidate selection.

## Approval and outcome

The owner approved thorough planning and then implementation once the plan is
reviewed: "when you are done and you are happy with the results I then permit
you to proceed." Up to three assistant agents are permitted. This authorizes
the Stage 1 local implementation proposed in the preceding discussion, including
isolated synthetic database tests. It does not authorize production migrations,
production backfill, new provider accounts, Git publication or deployment.

Replace Personal Discover's automatic artist/title YouTube searches with a
reusable catalogue and server-selected, owner-specific familiar candidates.
Preserve the accepted Discover UI, song accent/gradient, queue authority and
feedback. A catalogue is candidate infrastructure, not proof of recommendation
quality or an implemented collaborative/genre engine.

## Existing foundations and problem

TASK-011 stores trusted recommendation events and app Likes. TASK-028 defines
room-specific learning eligibility and consent. TASK-029 supplies regulars,
180-day recorded completion counts, rediscovery and private reversible feedback.
Its Personal recommendation panel still calls YouTube search when the seed
changes; the first-party ranker can only reorder that small external result set.
Per-process metadata caching does not provide shared durable reuse.

Reuse these foundations. Do not rewrite their history or silently reinterpret
ambiguous completions/skips as stronger taste evidence. SpacetimeDB remains the
sole live playback/queue authority; Supabase owns durable catalogue data.

## Stage 1 scope

- Private source registry, compact public YouTube metadata cache, deduplicated
  refresh work and global bounded metadata-request accounting.
- Register IDs from existing trusted Likes and eligible deliberate choices;
  bounded owner-scoped reconciliation/backfill also includes retained Personal
  completion references used for familiar listening/rediscovery.
- Preview backfill without writes or provider calls. Never sweep all room queues
  into a public catalogue or copy old metadata without a verified fetch date.
- Server-selected owner candidates, fresh public metadata, explicit suppression,
  truthful reasons and bounded response. No browser-supplied artist/title ranking.
- Background batched videos.list lookup, no automatic search from Personal
  Discover, no provider calls in the foreground catalogue read.
- Independent expiry cleanup even when SpacetimeDB is unavailable, bounded
  retries/leases and operational counters without raw profiles or credentials.
- Existing regulars/feedback actions continue; source availability is distinct
  from preference. Missing metadata may temporarily reduce visible results.

## Later stages (planned, not approved for this implementation)

Stage 2: recording identities, optional MusicBrainz IDs, provenance-bearing
classification, version correction and strict Fantasy/orchestral evaluation.
Resolve provider terms and YouTube enrichment restrictions before activation.
Unknown genre is not invented. Classical performances and phonk edits are
boundary cases; a title/channel is not a verified artist/recording.

Stage 3: separately consented community overlap, bounded track relationships,
contribution withdrawal and minimum cohort evidence for explanations. Never
expose who listened or private/unlisted sources. Existing Shared consent is not
global contribution consent.

Deferred: external provider integration, Google history import/scopes, lyrics,
BPM catalogue analysis, embeddings/AI, learned per-user weights, time-of-day
ranking, skip learning, Autoplay, automatic queue refill, other room-kind changes.

## Success and review

Known-track changes produce zero Personal automatic search calls. Fresh metadata
is reused across requests/workers. Expiry and privacy gates cannot be bypassed;
feedback and owner isolation survive. First release supplies familiar catalogue
recommendations, not yet unfamiliar genre or collaborative discovery. Natural
listening in the owner's Personal room follows local QA and a separate release.

See [design](design.md), [database contract](database.md), [ordered work](tasks.md),
[acceptance criteria](acceptance-criteria.md), and [review evidence](review-notes.md).
The [commit review](commit-review.md) records the exact prepared Git scope.
