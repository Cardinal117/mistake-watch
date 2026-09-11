# Owner intent and research disposition

2026-09-11. Conversation-derived requirements, not imported provider instructions.

The owner wants normal app use to grow a catalogue of links and small metadata,
reused for personal recommendations and eventually useful cross-user discovery.
Do not store media/image files. Retain cached YouTube API metadata no longer than
30 days without refresh. Favourites and rediscovery lead; Fantasy/orchestral is
the first strict-theme trial, with Classical and phonk boundary cases. Ordinary
listening should provide evaluation without compulsory unfamiliar listening.

The existing "Recommended for you" title overstated an artist/title search
fallback. Correct candidate supply and reasons, not just the ranking weights.
Preserve accepted regulars cards, counts, Discover/Visualizer controls, mobile
layout and dynamically changing song gradient. Queue additions remain explicit.

Research notes suggested MusicBrainz, Last.fm, TheAudioDB, ListenBrainz, lyric
and audio analysis libraries. They are options, not verified permissions or
guaranteed coverage. No automatic integration of every suggested provider.
MusicBrainz identity is optional and cannot resolve every upload. Tags are
evidence rather than calibrated probabilities. Existing audio companion tempo
estimation is not yet verified catalogue analysis; a Google allowlist is not
provider permission. Durable intelligence belongs in Supabase, not SpacetimeDB.

## Sources checked during planning

- [YouTube storage and derived-data policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube policy guidance](https://developers.google.com/youtube/terms/developer-policies-guide)
- [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase changelog](https://supabase.com/changelog)
- [MusicBrainz recording distinctions](https://musicbrainz.org/doc/Style/Recording)
- [MusicBrainz data licences](https://musicbrainz.org/doc/About/Data_License)
- [Last.fm terms](https://www.last.fm/api/tos)
- [ListenBrainz recommendation API](https://listenbrainz.readthedocs.io/en/latest/users/api/recommendation.html)

YouTube's policy guidance restricts inferred categories and combining API data.
Stage 1 does not infer musical classifications or combine YouTube popularity
statistics into an app taste score. App-owned preference explanations remain
clearly distinct from YouTube metadata. Stage 2 requires a reviewed permitted
flow; separate database tables alone are not a compliance exemption.
