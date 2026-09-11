# AcousticBrainz benchmark

2026-09-11. Owner requested this optional provider evaluation and instructed us
to stop diminishing-return ListenBrainz expansion. No runtime integration,
database changes, accepted recording writes, audio access or deployment.

## Scope and method

Test every current single-candidate title/artist agreement that also matches
duration within three seconds and retains parenthesized featured credits: 31
provisional recording MBIDs from the 60-favourite sample. Exclude the ambiguous
Discombobulate pair. These are metadata-screened candidates, not ground-truth
YouTube recording identities; no 99% accuracy or production acceptance is claimed.

GET low-level and high-level documents at submission offset zero separately,
serially, with 15-second timeout, 2 MiB response bound and a 1.1-second pause.
Only MBIDs are sent; no account IDs, credentials, preferences or audio. Retain
compact selected fields and classifier model versions, never full raw documents.
404 is missing; transport/other HTTP errors remain errors, not missing coverage.
Stop on errors rather than repeatedly hammering an unavailable endpoint.

Report unique seeds attempted, any-analysis coverage, low/high coverage, valid
BPM/key availability, genre/mood/danceability/voice classifiers, and useful-profile
coverage. Define useful as BPM plus at least one genre/mood/voice classifier.
Report successful retrieval separately from version agreement and feature validity.

## Completed results

All 31 unique seeds completed both requests: 62 total, ten HTTP 200 and 52 HTTP
404; no timeout or service error. Five seeds had both levels, 26 had neither.

| Measure | Count / 31 | Coverage |
| --- | --- | --- |
| Any analysis / low-level / high-level (each) | 5 | 16.1% |
| Positive finite BPM | 5 | 16.1% |
| Valid key and major/minor scale | 5 | 16.1% |
| Genre classifier scores | 5 | 16.1% |
| Mood classifier scores | 5 | 16.1% |
| Danceability / voice-instrumental (each) | 5 | 16.1% |
| Acoustic and electronic classifiers | 5 | 16.1% |
| Useful-profile field coverage | 5 | 16.1% |
| Both analysis durations within 3s of source | 5 | 16.1% |

Returned estimated BPM: Space Song 147.07; Assassin's Creed IV Black Flag Main
Theme 127.94; The Wolf and the Moon 119.98; Full Bodied 120.03; Für Elise (Epic
Trailer Version) 100.00. These are provider estimates, not independently measured
tempo. All five contain versioned classifiers with finite class scores in [0,1].
Useful-profile coverage means fields are present and structurally valid, not that
their musical conclusions have been validated. No eligible-pre-2022 denominator
was established; 16.1% must not be described as pre-2022 coverage.

For example, Space Song's genre_dortmund predicts electronic at ~0.99997,
genre_rosamerica predicts pop at ~0.598, and genre_tzanetakis predicts jaz at
~0.314. These are separate taxonomies/models, not agreeing authoritative labels.
This supports testing audio descriptors and cautious classifier weighting rather
than promoting AcousticBrainz to primary genre authority.

Decision: retain as optional historical audio-feature enrichment. Do not connect
it to live recommendations yet or call it the primary pre-2022 source. The next
useful validation is identity/version handling and model-quality checks on covered
tracks, including multiple submissions and tempo ambiguity, rather than more
unbounded provider searching. Last.fm and ListenBrainz retain their separate roles.

Independent review found no blocker for exploratory testing and requested clearer
source/MBID provenance and analysis-duration validation. Both were added to the
ignored seed/summary scripts. `acousticbrainz-summary.mjs` checks complete unique
receipts, status classification, finite probabilities, key/scale and duration
agreement. No audio, database writes, live activation or deployment occurred.

## Interpretation and integration constraints

The official site reports 7,564,215 unique recordings as of July 2022; collection
has stopped. This is an optional frozen dataset, not a source for new recordings.
Multiple analyses can exist per MBID. Offset zero is a bounded coverage probe,
not a policy for selecting the best submission. Before promotion, check analysis
duration against the accepted recording and inspect disagreement across submissions.

Keep classifier family, class scores, winning label, model/extractor version,
provider, fetched time and submission offset as provenance. Missing values remain
unknown. Do not equate not-happy with sad, not-acoustic with electronic, or model
probability with calibrated certainty. Do not collapse different genre models into
one label or treat mood tags as strict Fantasy/orchestral proof.

BPM supports tempo pulses, not beat-perfect YouTube synchronization. Even stored
beat timestamps describe the analyzed source and require timeline/version alignment.
No visualizer change is included. Primary pre-2022 provider status requires measured
eligible-catalogue coverage, version agreement and quality validation, not raw hits.

## Evidence

Ignored local script/receipts: `.tmp/musicbrainz-evaluation/acousticbrainz.mjs`,
`acousticbrainz-seeds.json`, `acousticbrainz.json`. Sample metadata expiry remains
2026-10-09. Exploratory tests are exempt from application test-suite execution;
script syntax, normalization invariants, counts and no-secret checks are required.

## Sources

- [Current site and frozen statistics](https://acousticbrainz.org/)
- [API and multiple-submission semantics](https://acousticbrainz.readthedocs.io/api.html)
- [Feature data and models](https://acousticbrainz.org/data)
- [Collection shutdown](https://community.metabrainz.org/t/acousticbrainz-submissions-data-dumps-and-next-steps/589843)
