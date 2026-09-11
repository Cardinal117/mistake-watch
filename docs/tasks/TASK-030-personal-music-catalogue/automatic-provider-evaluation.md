# Automatic provider evaluation on owner favourites

Approved 2026-09-11. This supersedes manual reference entry as the next delivery
priority. The owner does not want a song-confirmation UI during listening.
MusicBrainz should be evaluated for automatic matching, with Last.fm considered
for supplementary community tags. Existing local reference UI is not a release
requirement; do not activate it as the main enrichment flow.

Latest evidence: the Last.fm key is verified and the 60-source tag evaluation is
complete, with normalized-input and artist-context follow-ups. The owner also
explicitly authorized a 12-source Apple metadata test, now complete. MusicBrainz
is partly evaluated but still intermittently service-blocked. See the continuation
below and [free supplementary providers](free-supplementary-providers.md).

## Scope and method

- Read only the verified Personal-room owner's liked YouTube sources. No account
  identifiers, user authentication tokens, preference flags or room IDs go to
  music providers. The Last.fm application API key goes only to its official API,
  with required lookup parameters.
- Keep the private sample and compact provider responses in ignored `.tmp/`.
  Export only aggregate conclusions into the tracked task packet. Honour the
  source metadata expiry; do not commit the user's listening library.
- Evaluate all 60 currently returned favourites, including covers, edits and
  multilingual titles. Request bounded search results, serially at two-second
  intervals; stop on rate limiting/service failure, respecting Retry-After.
- Compare available catalogue input with independently established clean input
  where available. Do not silently hand-correct every title and call it automatic.
- Treat search relevance as candidate ordering, not a correctness probability.
  Distinguish candidate retrieval, exact-version evidence, ambiguity, no result,
  wrong match, network failure, and missing supplementary tags.
- No matching or classification writes, migrations, live flags, deployment,
  YouTube search calls, audio extraction, new accounts, or paid subscriptions.

## Acceptance and limits

The deliverable is evidence of practical match/coverage quality and remaining
blockers, not a production matcher. Correctness needs independent evidence; title
and artist agreement alone cannot establish exact audio/performance identity.
Report all abstentions and wrong versions, not only successful matches. A small
favourites sample cannot establish 99% population accuracy. Uncertain items must
remain unresolved automatically and must not interrupt listening.

Last.fm tags are community labels, not moderator-certified classifications.
Evaluate track tags separately from artist fallback, and genres separately from
mood/theme suitability. API credentials and allowed retention/attribution must be
verified before live integration. At the initial run, no Last.fm/ACRCloud/AudD key was found in the
local environment; no credentials are to be printed or borrowed from examples.

Testing classification: read-only exploratory evaluation; no production behavior
changes. Verify sample scope, compact outputs, bounded serial requests, and
reconcile reported denominators to the saved results. Existing application tests
are not evidence of provider accuracy.

## Initial run evidence — incomplete, provider service blocked

The scoped read returned 60 liked sources, all with unexpired compact metadata.
The room/account scope was verified from the owner's open Personal room; the
query returned no account identifiers. An earlier broader discovery query was
rejected by automatic review before returning preference data; it was replaced
with the explicitly scoped room-owner join, not bypassed.

Eight actual remote search requests were made across six distinct sources:
four HTTP 200 responses and four HTTP 503 responses. Three successful responses
contained no candidates; one contained one plausible title/artist/duration match.
There are four completed baseline searches, two attempted-but-incomplete sources,
and 54 unattempted sources. No precision/accuracy percentage is established.
The local sandbox-only TypeError attempt is not a remote provider response.

Requests began at 2.1-second intervals and were reduced to ten-second intervals
after intermittent failure. Runs stopped at the first failure; between-run pauses
varied, with Retry-After reported as zero. Later 503 bodies explicitly reported
that the MusicBrainz web server was busy. Root cause beyond that provider response
is unverified. Do not infer that slower pacing solved availability or that these
errors mean a recording is absent. No unattended retry process remains running.

The baseline is intentionally strict raw catalogue title plus channel-as-artist
(only the display suffix `- Topic` removed). It is not a tested clean-input
matcher. Uploader channels, featured credits in titles and alternate spellings
need a separate normalized-input comparison preserving version information.

Public-page spot checks independently demonstrate relevant recording data and
the difference between recording-level and release-level tags:

- [A recording with vocal/instrumental relationships](https://musicbrainz.org/recording/8bc5ddd9-fcca-4f1a-882b-eb19130c8021)
  has an ISRC and detailed credits, but no recording genres/tags. Its
  [release](https://musicbrainz.org/release/dcabb48c-a428-4914-a2e7-cc7ad638d641)
  shows a pop genre; do not silently present that as a direct recording tag.
- [A soundtrack release](https://musicbrainz.org/release/6bd75aaa-4a41-41fd-8307-4f3d602de499/disc/1)
  distinguishes a featured-vocal track from an orchestra version. Featured
  credits appear in artist credit rather than the recording title.

These are reference checks, not automated retrieval successes or independent
proof that each YouTube upload contains the exact referenced recording. Public
page access also encountered 429, so no bulk scraping fallback was attempted.

At the initial run, the owner was setting up a Last.fm API key and no key-backed
Last.fm API test had run. The continuation below supersedes that status.
Public artist-page inspection alone cannot establish track-tag API coverage or
quality. Store the key locally as `LASTFM_API_KEY`, never in Git or reports.

## Review and next execution

One independent reviewer checked the methodology read-only. Incorporated findings:
preserve request failures, distinguish raw/normalized inputs, preserve version
markers and source scope, and keep retrieval separate from verified accuracy.
Even 60 independently verified accepted matches with no errors would only give
approximately a 95.1% one-sided 95% lower bound on accuracy under independent
sampling assumptions. About 299 error-free independent accepted matches would
be needed for a 99% bound; this favourites sample also has selection bias.

Resume bounded provider work when service access is healthy; do not repeatedly
rerun successful searches. Complete raw and normalized comparisons, then inspect
Last.fm track tags once the owner key is configured. Report accepted-match
precision, total coverage, wrong versions, abstentions, extra tag value and
service failures separately. No automatic production matcher is approved by this
initial evidence, and the provider selection remains open.

Evidence is private and ignored: `.tmp/musicbrainz-evaluation/favourites.json`,
`results.json`, `attempts.jsonl`, and `run.mjs`. The first two remote requests
preceded the JSONL logger and are evidenced by tool receipts (one 200/no-result,
one 503); later six requests are logged. All sample material must expire no later
than its earliest source expiry (2026-10-09); this is not a permanent fixture.

## Continuation — key verified and actual supplementary-provider tests

The owner configured `LASTFM_API_KEY`; it was read only from ignored local
configuration, never printed. Last.fm calls used the official HTTPS endpoint,
bounded JSON reads, serial pacing, no redirects and no account authentication or
listening-history submission. No shared secret is needed for these read methods.
Requests carried artist/title lookup parameters and the Last.fm application API
key, with no account identifiers or user authentication tokens. `autocorrect=0` isolates the tested
input normalization from undocumented assumptions about automatic correction.

| Evaluation | Observed result | Interpretation |
| --- | --- | --- |
| Last.fm raw track tags, 60 favourites | 3 with tags, 55 empty tag arrays, 2 API code-6 errors; all HTTP 200 | Empty tags do not prove the recording is unknown; API errors are separate |
| Last.fm normalized titles, 6 changed inputs | 1 with tags, 4 empty, 1 code-6 error | Removing a same-artist video prefix/promotional suffix found tags for one additional source |
| Combined direct track-tag coverage | 4/60 sources, 6.7% | Coverage of returned labels, not correctness or genre coverage |
| Last.fm artist tags | 32/45 distinct queried Topic-derived artist names had tags; 13 empty | The tagged artists occur on 39/60 sample sources; account for artist-name ambiguity |
| MusicBrainz raw baseline, cumulative | 10 completed distinct searches: 5 with candidates, 5 without | Full 60-source evaluation remains incomplete due HTTP 503 |
| MusicBrainz normalized comparison | 2 completed: 1 with candidates, 1 without; later request 503 | Includes a top-ranked wrong version and a lower-ranked plausible version |
| Apple iTunes, explicitly authorized 12-source ZA sample | 12 HTTP 200; 10 queries with candidates, 2 without | Small selected sample, not representative coverage or precision |
| Apple metadata agreement screen | 9/12 sources have at least one closely agreeing candidate | One further result needs translation/version evidence; no automatic links accepted |

The exploratory metadata agreement screen compares case/diacritic/punctuation
normalized title, artist credit, featured-credit presence, and duration within
three seconds. Only parenthesized featured credits move out of the title; version
words remain. It identifies five MusicBrainz source candidates across completed
raw/normalized searches. This rule was applied post hoc for analysis, is not a
production matcher, and is not an independent accuracy test. Substring-based
artist agreement and a selected dataset cannot justify an automatic acceptance
threshold. No source was linked or reclassified.

Concrete private evidence contains two critical ranking failures: one raw search
returned only a different remix; another normalized search scored an orchestra
version 100 and the featured-vocal recording 99. Duration and featured credits
support rejecting those top results. A search score is not percent confidence.
Apple also returned a remix before the closer album track in one case, and often
included unrelated results after relevant ones. Cross-provider corroboration is
useful but may share upstream metadata, so is not guaranteed independent proof.

Artist tags include useful broad labels such as cinematic, orchestral and phonk,
but also nationality, occupations, duplicates, personal tags and `test`. An artist
tagged instrumental may have vocal tracks. Keep artist context separate from
recording facts; do not use it to qualify strict Fantasy/orchestral selections.
Likewise Apple's `primaryGenreName` is often broad (for example Alternative or
Soundtrack), not evidence of precise mood, BPM or theme suitability.

Apple test authorization: automatic approval initially rejected transmitting the
additional favourite sample. The owner then explicitly approved the 12-song
artist/title test; it ran successfully after approval. No payment, account,
preview audio or artwork was fetched. Broader Apple sample transmission remains
outside that 12-source approval. The exploratory script is local and not deployed.

Next recommendation: retain MusicBrainz as an automatic identity candidate source;
evaluate Apple as compact broad-genre corroboration and Last.fm as supplementary
track/artist context. Complete a labelled identity benchmark and provider field-use
review before implementation. Do not ship the earlier manual-confirmation UI as
the listening workflow. Research-only additional candidates are documented in
[free supplementary providers](free-supplementary-providers.md).

New private evidence: `lastfm-raw.json`, `lastfm-normalized.json`,
`lastfm-artists.json`, `lastfm-attempts.jsonl`, `results-normalized.json`,
`itunes.json`, and `summary.json`, with bounded local scripts. `summarize.mjs`
reconciles the counts above. Last.fm made 111 calls (60+6+45); Apple made 12.
All processes ended. No production code, DB data, provider settings, deployment,
or Git publication changed in this continuation.

Independent review reconciled all provider denominators and version warnings;
historical status and API-key transmission wording were clarified. Script syntax,
summary reproduction, ignored-path checks and a secret-value scan of evaluation
outputs passed. No application regression suite was rerun for this read-only
evaluation and documentation update.
