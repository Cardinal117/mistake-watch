# Free supplementary music providers

Reviewed 2026-09-11 at owner request, alongside the
[actual favourites evaluation](automatic-provider-evaluation.md). Ongoing free
access, useful endpoint access and data reuse permission are separate questions.
No service below guarantees correct genre/mood for every YouTube upload.

Follow-up: [ListenBrainz actual evaluation](listenbrainz-evaluation.md) verified
the owner's key. Five provisional recording seeds returned no similarity results
under two algorithms and no tag/popularity rows, while a public positive control
returned data. Keep it optional; artist/title search remains untested.

| Provider | Input and useful output | Free access and practical fit |
| --- | --- | --- |
| Apple iTunes Search | Artist/title or Apple IDs; release metadata, duration, broad primary genre | Public no-key search; archived official guidance says approximately 20 calls/minute, subject to change. Tested on 12 owner-approved sources. Storefront dependent; no direct YouTube identity guarantee. Avoid promotional preview/artwork assets and review field reuse before integration. |
| ListenBrainz | Recording MBIDs; similar recordings/artists and metadata tools | Noncommercial/open-data direction. Useful after identity resolution for discovery candidates; public seed-based lookup is distinct from submitting an account's listens. Dataset tags sourced from MusicBrainz are not independent corroboration. Endpoint access/coverage still needs a bounded test. |
| Wikidata | Known entities/search; genre statements, external identifiers and structured context | Public CC0 structured data, no API key needed for ordinary reads. Good secondary entity/context source; sparse for obscure uploads. Work/artist facts must not silently become recording facts. |
| TheAudioDB | Internal IDs; populated artist/album/track metadata | Free tier exists, but current pricing places metadata search, MusicBrainz-ID lookup and YouTube music-video lookup in the paid developer tier. General API-page free-search claims conflict with pricing. Do not promise those endpoints free without clarification. |
| AcoustID | Audio fingerprint plus duration, or existing AcoustID; MusicBrainz associations | Free noncommercial use with registered application key, at most 3 requests/second. Requires a legitimate fingerprint source; not a YouTube URL resolver or independent mood/genre service. Defer for the current links-only flow. |

## Recommended roles

1. MusicBrainz for candidate recording identity, Apple for broad store metadata,
   and Last.fm for community context. Match/version evidence precedes use.
2. ListenBrainz similarity for known recording seeds, intersected with already
   admitted playable catalogue sources. Do not create an unrelated per-provider
   copy of owner listening history.
3. Wikidata for useful missing identifiers or contextual facts, retaining scope.
4. Defer TheAudioDB's restricted endpoints and fingerprint-only services until
   they solve a demonstrated remaining problem under acceptable access terms.

No free-provider research is a blanket authorization to send additional private
samples or activate production adapters. Apple was separately approved for 12
specific sample entries; Last.fm/MusicBrainz use follows the existing evaluation.

## Primary sources

- [Apple search parameters and limits](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html),
  [response fields](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html),
  [promotional-content conditions](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html).
- [ListenBrainz dataset interfaces](https://labs.api.listenbrainz.org/),
  [MetaBrainz support categories](https://metabrainz.org/supporters/account-type),
  [API authentication](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html),
  [experimental account recommendations](https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html).
- [Wikidata access](https://www.wikidata.org/wiki/Help:Data_access),
  [genre property](https://www.wikidata.org/wiki/Property:P136).
- [TheAudioDB pricing](https://www.theaudiodb.com/pricing),
  [API page](https://www.theaudiodb.com/free_music_api),
  [example fields](https://www.theaudiodb.com/docs_json).
- [AcoustID service and limits](https://acoustid.org/webservice).
- [Last.fm track tags](https://www.last.fm/api/show/track.getTopTags),
  [artist tags](https://www.last.fm/api/show/artist.getTopTags).
# Latest benchmark continuation — 2026-09-11

Owner requested [AcousticBrainz testing](acousticbrainz-evaluation.md), now complete:
five of 31 provisional matched recordings have both analysis levels and useful
audio-feature fields (16.1%). Retain as optional historical evidence, not primary
genre authority. Expanded [ListenBrainz results](listenbrainz-evaluation.md) also
supersede the initial five-seed-only result: some recording/artist similarity is
useful, but coverage varies substantially. No runtime activation in either trial.
