# ListenBrainz read-only evaluation

## Expanded continuation and stopping decision

2026-09-11: owner explicitly authorized all 60 favourite artist/title pairs after
automatic approval review required exact payload scope. The earlier blocked
search below is historical; this authorization resolved it. All 60 were attempted:
58 HTTP 200 and two HTTP 500. Only the top ten candidates per successful query
were retained. A simple title/artist agreement screen found candidates for 32
sources, including one ambiguous source. These are not verified matches or a
measured identity accuracy. All 33 distinct candidate MBIDs hydrated successfully;
the expanded single-candidate screen checks duration and featured credits too.

Five original seed MBIDs were empty across all seven listed recording-similarity
algorithms. Space Song returned 100 rows under each of two algorithms. Artist
similarity returned data for five of eight tested artist IDs. These results support
selective use rather than universal coverage. Artist associations do not prove
recording genre, and MusicBrainz-derived tags are not independent corroboration.
MLHD was not tested: its options documentation timed out twice.

Owner requested stopping diminishing-return tests and pivoting to the
[AcousticBrainz benchmark](acousticbrainz-evaluation.md). No additional ListenBrainz
network tests are planned in this cycle. Expanded ignored receipts are
`listenbrainz-search.json`, `listenbrainz-agreement.json`, `listenbrainz-hydrate.json`,
`listenbrainz-algorithms.json`, and `listenbrainz-fallbacks.json`.

## Initial bounded run (historical)

2026-09-11. Owner added `LISTENBRAINZ_API_KEY` and authorized tests. This follows
the [automatic provider evaluation](automatic-provider-evaluation.md). No live
recommendations, account history, favourites or recording links were changed.

## Scope and authorization

Validate the token without printing it or the returned account name. Test the
five previously metadata-aligned MusicBrainz candidates as provisional seeds,
not independently verified YouTube recording identities. Query public similarity
and MusicBrainz tag/popularity datasets using only those MBIDs. No token is sent
to public dataset lookups; the token is sent only in the Authorization header to
`https://api.listenbrainz.org/1/validate-token`.

Automatic approval review rejected an additional six-source artist/title search.
Those requests were excluded from execution. The narrower five-MBID tag lookup
then passed review. No preference-derived artist/title data was sent to
ListenBrainz in this run. Broader recording search remains untested.

## Actual results

| Check | Result |
| --- | --- |
| Token validation | HTTP 200, `valid: true`; username/token not stored in evidence |
| Similarity, first algorithm, five seed MBIDs | Five HTTP 200 responses, all empty arrays |
| Similarity, second algorithm, same five MBIDs | Five HTTP 200 responses, all empty arrays |
| Bulk MusicBrainz tag/popularity, five seeds | Five HTTP 200 responses, all empty arrays |
| Public positive control, similarity | 100 rows returned; first 50 retained as bounded evidence |
| Public positive control, tags/popularity | 31 rows returned |

The positive control is the public dataset example for Portishead's Roads,
`8a49dba0-253a-4535-b87f-78bb035336ce`. It is not a favourite or imported sample
item. The similarity result included Massive Attack's Teardrop. The successful
control supports request/endpoint functionality; it does not prove freshness or
coverage of every dataset/algorithm. No generic control result was inserted into
the owner's recommendations.

The first algorithm was
`session_based_days_7500_session_300_contribution_5_threshold_15_limit_50_skip_30`;
the second adds `_top_n_listeners_1000`. Both were discovered in the public
similar-recordings page selector. The positive similarity control used the second.
Although the algorithm name contains `limit_50`, the actual response had 100 rows;
the receipt records actual count separately from the saved first-50 sample.

## Interpretation

This is a coverage finding for five provisional recording seeds and two dataset
algorithms, not a verdict on all ListenBrainz capabilities. The service accepted
requests, but this bounded sample produced no extra suggestions or tag rows.
There were therefore no favourite-derived recommendations to intersect with the
local catalogue or assess for theme quality. No broad catalogue query was needed.
Historical/snapshot coverage, thresholds and recording IDs may all affect results;
the run does not identify which explains these empty responses.

The tag endpoint exposes MusicBrainz tags/popularity; it is not a new independent
genre classifier. Empty rows do not mean that the song is absent from MusicBrainz,
unpopular, or has no genres. Personal ListenBrainz recommendations that depend on
submitted account history are a separate service and were not exercised.

Recommendation: keep ListenBrainz as an optional secondary source when it has
coverage. Prioritize the already-tested identity/broad metadata/community-context
pipeline. Public metadata search and other similarity datasets can be evaluated
as separate bounded follow-ups; no listening-history export is needed for the
public seed-based route, and no manual confirmation UI is introduced.

## Verification and evidence

Seventeen public data requests and one token validation succeeded. A public HTML
selector read discovered supported algorithms. All requests were serial within
each batch, bounded by timeouts and output limits, and stopped on HTTP failure.
Private evidence remains ignored under `.tmp/musicbrainz-evaluation/`:
`listenbrainz-token.json`, `listenbrainz-similar.json`,
`listenbrainz-extra.json`, `listenbrainz-controls.json`, and corresponding scripts.
The key is not stored there; the token-validation receipt contains only status,
validity and time. No scrobbling, feedback submission, playlist writes, migrations,
runtime activation, Git publication or deployment occurred.

This is exploratory external-service verification, not production-code testing.
Reconcile array lengths, control row counts, key absence and ignored paths before
handoff. Preserve the existing sample expiry boundary (2026-10-09).

## Primary documentation

- [Token validation](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#listens-get--1-validate-token)
- [Similar recordings and supported algorithm selector](https://labs.api.listenbrainz.org/similar-recordings)
- [MusicBrainz tag/popularity lookup](https://labs.api.listenbrainz.org/bulk-tag-lookup)
- [Public dataset hoster](https://labs.api.listenbrainz.org/)
