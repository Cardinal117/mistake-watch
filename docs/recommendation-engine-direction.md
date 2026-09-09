# Recommendation engine: direction, evidence and experiments

Date: 2026-09-08
Status: owner-requested direction record; research-informed, not an implementation or release approval.

## Purpose and how to use this document

Preserve the combined owner discussion and two research passes so future work
does not depend on conversation history. This is the reference for the next
recommendation specification. Read it before proposing changes to recommendation
behaviour, room kinds, learning, Autoplay, or the Rooms Hub.

The target is an engine that understands what the listener enjoys, respects the
chosen room, and keeps welcome music playing with very little intervention.
Normal use should teach it; users should not need to rate every song, maintain
weights, or repeatedly explain their taste.

Evidence from existing products establishes useful precedents. Published
experiments support particular approaches under their study conditions. Neither
proves recommendation quality for Mistake Watch's small audience, music tastes,
provider access, or synchronized rooms. Proposed numbers, schemas and algorithms
remain experiments until evaluated here.

Related sources of truth:

- [TASK-011 recommendation foundation](tasks/TASK-011-first-party-recommendation-intelligence/tasks.md)
- [TASK-011 original design](tasks/TASK-011-first-party-recommendation-intelligence/design.md)
- [Product intake and original room idea](product-intake/INBOX.md): preserve owner Quick Capture unchanged.
- [Project guardrails](../AGENTS.md), [design system](../DESIGN.md), and [handoff](HANDOFF.md).
- TASK-027's accepted Watch/Listen mobile interactions remain the UI baseline;
  verify the merged task packet when preparing implementation. Do not restore
  an older full-player-on-Home mockup from the research discussion.

## Decision status

| Class | Meaning |
| --- | --- |
| Direction | Owner intent or a constraint retained from the discussion; carry into the specification |
| Proposed approach | Recommended engineering or UX method; validate before freezing implementation |
| Experiment | Requires measured comparison or real listening before selection |
| Deferred | Preserve the idea, but do not include in the first implementation |

The [TASK-028 room kinds foundation packet](tasks/TASK-028-room-kinds-foundation/proposal.md)
was allocated after checking local and merged-source task directories on 2026-09-08.
It plans Legacy compatibility and Personal create/resume first, followed by the
remaining room contracts. It does not implement the recommendation engine or
authorize application changes. Start with its [ordered slices](tasks/TASK-028-room-kinds-foundation/tasks.md).

## 1. Listener-first objective (direction)

- Optimize for relevance, room fidelity, correct recordings, enjoyable sequences,
  control, and low effort.
- No promotional ranking or creator-exposure obligation. Do not introduce unknown
  artists merely to satisfy a discovery target.
- Do not replace that objective with a popularity-only filter. An unfamiliar or
  lesser-known artist may be an excellent match; popularity is not personal familiarity.
- Familiar listening and rediscovery should lead the initial experience.
  Exploration is optional and controlled by the listener.
- Recommendation quality is not simply fewer skips or longer listening. Safe
  repetition can lower skips while making sessions worse.
- Listen must exclude uploaded catalogue assets from automatic recommendation
  selection. Manual catalogue playback remains available under existing access rules.

## 2. Room kind is separate from presentation mode (direction)

Keep one room/playback architecture. Watch and Listen remain presentation modes,
not independent recommendation identities or duplicated backends.

| Room kind | Recommendation identity | Learning direction |
| --- | --- | --- |
| Personal | Signed-in account taste plus current context; default to Listen, allow Watch | Attributable normal listening can inform personal taste; explicit actions remain strongest |
| Shared | Fair blend of participating, consenting accounts; stable room history provides context | Shared learning is separate from attributable individual learning and consent |
| Themed | Owner-directed taste inside an explicit theme; invited members may participate | Improve choices within the theme automatically; never silently broaden it |
| Temporary | Current session and chosen starting material | No durable implicit taste updates; explicit likes may persist |
| Legacy (transitional) | Existing rooms retain their established behaviour | Preserve existing learning/access behaviour until an explicitly defined migration |

### Existing rooms: Legacy (owner decision, 2026-09-08)

Legacy is the fifth, transitional room kind. Existing rooms are classified as
Legacy rather than automatically converted to Personal, Shared, Themed or
Temporary. Saved Rooms remains a navigation section, not a room kind; Legacy
rooms remain accessible there, with a small clearly labelled Legacy grouping.

Preserve their contents, queue, memberships, permissions and existing behaviour.
Do not infer themes, change privacy, introduce expiry or delete rooms as part of
this classification. The four new kinds remain the intended creation choices;
Legacy exists for compatibility with existing rooms, not as a new-room offering.

Allow a transition period without an invented deadline. Conversion options and
eventual retirement require a separate migration design and owner approval.
Until then, Legacy rooms remain usable. The exact database migration and
backward-compatible default must be specified and tested before implementation.

The latest Shared direction supersedes the attachment's earlier owner-first
"Global" proposal. Use Shared in product planning; it does not imply public access.
Themed remains owner-directed initially; collaborative theme editing is deferred.

Temporary does not literally mean no operational storage. Synchronization,
recovery and necessary diagnostics may need bounded state. Exact expiry,
retention, deletion and room-history visibility must be specified separately.

## 3. Separate room direction, learning policy and session intent

These are conceptual responsibilities, not final database types:

1. **Room direction:** what belongs; representative tracks, exclusions and an
   optional description.
2. **Learning policy:** whose actions may update account, room or session profiles,
   with consent, attribution and retention rules.
3. **Session intent:** temporary familiarity, mood or energy preferences, where
   supported by reliable evidence.

Account taste is long-lived context; room direction is persistent context;
session evidence should decay more quickly. The decay schedule is an experiment.

Theme restrictions precede preference ranking. If the account likes phonk,
the session wants energy, and the room is Fantasy, select energetic Fantasy.
Do not let two weighted preferences overpower the theme.

### Establishing a theme without burdensome setup

- Start from an existing playlist or a few representative tracks; propose a
  direction that the owner can correct.
- A room name alone is insufficient classification evidence.
- Detailed descriptions, negative anchors and tuning are optional, not a required questionnaire.
- Learn which eligible tracks work through normal use.
- Off-theme manual playback does not become an implicit theme change, even if
  repeated. A personal Like does not itself broaden the room.
- Provide an explicit change-direction action when the owner wants to expand it.
- In strict theme mode, uncertain candidates cannot bypass the theme merely
  through high preference scores. Require stronger evidence or exclude them.
- If suitable material runs out, explain the limit, offer an eligible familiar
  fallback or pause continuation; never silently abandon the theme.

## 4. Low-effort learning and provenance (direction)

Users should receive useful and improving recommendations without interacting
with training controls. Repeated independent evidence matters more than one
ambiguous event. Signals are scoped and weighted, not universal votes.

| Behaviour | Proposed interpretation |
| --- | --- |
| Deliberately choose a track | Interest in that track in the current context |
| Return across separate sessions | Increasing evidence of lasting interest |
| Intentional replay | Positive evidence; distinguish from repeat mode, reconnect or recovery |
| Play Next | Strong interest in hearing it soon, attributable to the actor |
| Complete a track | Modest evidence; do not assume attention |
| Skip | Weak session-heavy negative; no permanent dislike inferred from one skip |
| Remove/reorder queue items | Normally organizational, not taste feedback |
| Like | Strong explicit individual signal, including in Temporary |
| Playback failure/buffering/reconnect | No taste penalty |
| Connected but inactive | Not a vote or proof of attention |

Algorithm-selected passive completions must not reinforce preferences as strongly
as deliberate selections. Cap correlated/repeated evidence so the engine cannot
manufacture confidence by repeatedly playing its own suggestions.

Track actor, selection origin, playback occurrence and relevant room/policy
context. Reuse existing TASK-011 event/outbox contracts where possible. The
research's sample enums mix actor, source and queue status; they are not final schemas.

In Shared, a host skip does not imply every participant disliked the track.
Count accounts once across devices. Importing a playlist is not automatically
a strong endorsement of every entry.

After repeated skips, reduce confidence in the unsuccessful pattern and avoid
immediate repetition. Do not invent a cause such as "lower energy" or "dislikes
this artist." A trusted fallback or optional session adjustment is preferable.

### Optional corrections in the existing three-dot menu

| Action | Intended scope |
| --- | --- |
| Don't recommend this track | Personal automatic-suggestion exclusion; manual playback remains possible |
| Not for this room | Room correction, subject to room authority; does not change personal taste |
| Take a break from this track | Temporary cooldown |
| Wrong version | Correct the playable-media match without disliking the intended recording |
| Why this recommendation? | Short factual reason grounded in evidence |

Keep Like accessible. Deeper artist-wide controls may be added without crowding
the first menu. Apply explicit feedback promptly, offer Undo, and avoid mandatory
follow-up questions. Define who can make room-wide corrections during permission design.

## 5. Candidate supply and correct-recording resolution

Proposed pipeline:

```text
Room rules and authorized context
  -> candidate sources
  -> eligibility, exclusions, recording resolution and deduplication
  -> personal/shared affinity ranking
  -> lightweight sequence planning
  -> small Autoplay section
```

Candidate sources include familiar tracks, rediscovery, room history, known-artist
expansion, adjacent material, known-artist releases and optional exploration.
Sources can overlap. Keep candidate origins separate from familiarity, and keep
provenance when the same recording arrives from several sources.

Maintain a bounded, refreshed reserve so each track ending does not trigger
external discovery. Share reusable public metadata appropriately, but do not
leak private account preferences or private playlist contents across users.
Define provider retention/refresh requirements before implementing caching.

Resolve recommendations to the intended playable recording before scheduling:
title, artists, duration, version terms, channel evidence and availability may
help. Official/Topic status is evidence, not proof. Distinguish original, cover,
remix, live, sped-up/slowed, compilation and duplicate upload. Do not globally
reject alternate versions if that version is what the user explicitly wants.

Correct-recording rate is a separate quality metric. Matching a MusicBrainz
recording to a YouTube video is not solved merely by adding an external provider.

### External sources: investigate, do not adopt automatically

- Troi/ListenBrainz: inspect candidate composition, filtering, deduplication,
  identifier handling and radio exploration. Evaluate against real soundtrack,
  game, anime and orchestral examples. No replacement-engine commitment.
- MusicBrainz: investigate recording identity and genre/tag enrichment.
- Last.fm: investigate similar-track and tag coverage.
- YouTube: playable sources, metadata and separately authorized account seeds;
  do not assume access to its personalized recommendation graph.
- Review access, licensing, quotas and retention before adopting any provider.
  Audio-analysis examples from Plexamp/Deezer do not imply we have their audio data.

## 6. Sequence quality and stable Autoplay

Rank desirability, then consider order. Start with simple recording/artist
repetition checks and reliable context. More sophisticated lookahead, energy
progression and diversity balancing must earn their complexity in listening tests.
No BPM, harmonic matching, crossfade or reinforcement-learning promise for v1.

| Queue portion | Commitment |
| --- | --- |
| Current playback | Changes only through authorized playback controls or recovery |
| Manual choices and pins | Recommender never rearranges or displaces them |
| Next prepared automatic track | Normally stable |
| Later automatic suggestions | May adapt after meaningful evidence changes |

- Manual additions take precedence over automatic continuation.
- One authoritative refill path; idempotent behaviour across devices and retries.
- Brief disconnections and heartbeats do not reshuffle suggestions.
- Tune may intentionally replace automatic selections; it never rewrites manual choices.
- Explicit blocking, unavailable media, lost access or wrong recordings override
  a prepared suggestion's stability.
- Removing a suggestion prevents immediate reinsertion without implying permanent dislike.
- Turning Autoplay off stops future automatic continuation without deleting the manual queue.
- Prepare a small reserve in advance. One committed plus two-to-four provisional
  entries is a starting hypothesis, not an accepted constant.
- Keep discovery/ranking off the playback-critical path. Playback can still need
  authorization, network access and provider readiness; do not promise zero requests.
- Recommendation failure must not block ordinary playback, manual queue edits or room operation.

## 7. Shared blending

Room membership, playback permissions and consent to contribute taste are distinct.
Use server-selected eligible participants, not a client-submitted profile ID or
the requesting account as the entire group profile.

Each account has equal initial influence regardless of device count or history
volume. Unknown preferences are not negative ratings. Normalize comparable
scores before combining them; inspect whether one person's taste dominates.

Simple averaging is a baseline. Explicit-block handling and disagreement
penalties are proposed refinements, not universally proven strategies. Define
the effect of personal blocks on shared automatic selections and keep manual
playback authority distinct. Avoid exposing the private reason a member caused
a candidate to be excluded.

Optimize for participating, opted-in people, allowing a grace period for brief
disconnects. Join/leave events affect later suggestions gradually and preserve
the immediate commitment boundary. Exact presence windows remain open.

A taste-match card is deferred. Show insufficient evidence honestly; do not
invent a percentage from a handful of tracks. Explainable common interests may
be preferable initially.

## 8. Product surfaces and optional AI

- **Rooms Hub** is the top-level destination chooser. Personal is the primary
  quick-entry action; Shared, Themed and Temporary remain easy to reach.
- Saved rooms, current listeners and last-played context belong in a collapsible
  desktop sidebar or mobile Rooms drawer when data/access supports them.
- Proposed startup preference: open hub or resume preferred room. Explicit
  invitations take precedence. Fast entry does not promise browser autoplay
  without required user interaction.
- **Listen Home / Watch Home** are in-room surfaces. Preserve accepted navigation,
  compact playback and expansion behaviour. Listen Home must not automatically
  reopen the large player.
- Discovery shelves should appear when useful evidence exists, not as a permanent
  wall of repetitive recommendations. Do not fabricate confidence or explanations.
- Tune can hold Familiar/Balanced/Explore and supported optional energy/mood
  controls. No weights dashboard or compulsory profile management.
- Room-start, discovery and Autoplay serve different intents, while sharing the
  same core services and authorization.
- LLM/assistant/plugin integration is deferred and optional. Future natural
  language translates intent into validated existing controls. Separate session
  changes from permanent edits; retain permissions and observable actions.
- The system must operate if the AI layer is absent. ChatGPT/plugin plan access
  must be checked at integration time; research examples do not establish it.
- Tinder-like music discovery gestures are a deferred opt-in experiment. They
  must not become required training or replace current mobile interactions.

## 9. Evidence register from the research passes

Sources were discussed/checked on 2026-09-08. Product documentation establishes
features, not causal quality gains. Recheck mutable API and product details
before implementation. These links are preserved as research references, not
authorization to connect accounts or import data.

| Source | Finding and limit |
| --- | --- |
| [Pandora station guidance](https://help.pandora.com/s/article/Tips-to-improve-stations-1519949305949?language=en_US) / [Modes](https://help.pandora.com/s/article/Pandora-Modes?language=en%5C_US) | Song seeds and station tuning are useful theme precedents; not a guarantee of strict classification |
| [Deezer Flow Tuner](https://newsroom-deezer.com/2026/02/deezer-launches-flow-tuner-personalized-recommendations/) | Continuous personal listening with explicit genre control; newer tuning feature is not long-term validation |
| [Spotify exclusions](https://support.spotify.com/ga-en/article/exclude-playlists-or-tracks-from-your-taste-profile/) | Separating listening from taste influence is a real product need |
| [Spotify Blend](https://support.spotify.com/ws/article/social-recommendations-in-playlists/) | Shared listening profiles are established; daily playlist updates do not specify live-room churn behaviour |
| [Spotify familiarity research](https://research.atspotify.com/publications/algorithmic-balancing-of-familiarity-similarity-discovery-in-music-recommendations) | Familiarity/discovery have tradeoffs; no transferable fixed percentage |
| [Spotify Discovery Mode](https://artists.spotify.com/en/discovery-mode) | Documented commercial recommendation mechanism; does not explain every unfamiliar recommendation or establish the same mechanism on YouTube |
| [Apple AutoPlay](https://support.apple.com/en-ie/109336) | Continuation integrated with queue management |
| [YouTube recommendation contexts](https://support.google.com/youtube/answer/16089387?hl=en) | Home versus next-video signals differ; satisfaction is broader than watch time |
| [YouTube Music custom mixes](https://support.google.com/youtubemusic/answer/15165061?hl=en) | Tune, variety, familiarity and filters are product precedents, not public API capabilities |
| [Spotify sequencing paper](https://research.atspotify.com/publications/automatic-playlist-sequencing-and-transitions) | Sequencing evaluated with curators; does not prove our proposed short lookahead's gains |
| [Group study](https://arxiv.org/html/1707.09790) | 26 groups of three; averaging/similarity useful baselines, with limited population and observed social dynamics |
| [Plexamp sonic analysis](https://www.plex.tv/blog/super-sonic-get-closer-to-your-music-in-plexamp/) / [Deezer Flow Moods](https://arxiv.org/abs/2207.11229) | Track/audio context matters; our input data is different |
| [TIDAL My Mix](https://support.tidal.com/hc/en-us/articles/360000702697-My-Mix) / [Roon Valence](https://help.roonlabs.com/portal/en/kb/articles/valence) | Additional references for separate taste contexts and contextual discovery; not proof rediscovery wins here |
| [Troi](https://github.com/metabrainz/troi-recommendation-playground) | Inspectable pipeline used by ListenBrainz; coverage and integration remain untested |
| [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) / [Last.fm similar tracks](https://www.last.fm/api/show/track.getSimilar) | Potential enrichment/candidate sources; recording resolution still required |
| [Spotify conversational integration](https://newsroom.spotify.com/2026-04-23/claude-integration/) | Supports separating conversational intent from recommendation service; does not make AI necessary |

### Provider facts and repository observations to recheck

- [YouTube search](https://developers.google.com/youtube/v3/docs/search/list) and
  [quota documentation](https://developers.google.com/youtube/v3/determine_quota_cost)
  stated a default separate 100-search-call daily bucket during this research,
  with ordinary other endpoints sharing a 10,000-unit daily pool. Inspect actual
  project allocation; Google sign-ins do not imply independent project budgets.
- [Authorized liked videos](https://developers.google.com/youtube/v3/docs/videos/list)
  documented a most-recent-1,000 result limit. The channel's likes playlist is
  liked videos, not a general saved/liked-playlists list.
- [Activities](https://developers.google.com/youtube/v3/docs/activities/list)
  does not provide the deprecated personalized Home feed as a foundation for us.
- Prior repository inspection found a ranker, scoped aggregates, preferences,
  caching and request limits. Provider retrieval requested eight results in one
  search, not proven eight searches per song. Measure actual requests.
- Prior room-service inspection loaded the requesting account's aggregates with
  room aggregates. Revisit that selection before Shared implementation.
- TASK-011 is a released foundation, not proof the proposed room-kind contracts
  or recommendation-quality target are already implemented.

## 10. Experiment plan and first milestone

Recommended first milestone: a dependable Personal prototype and a strict
Themed-room trial using existing first-party history and selected seeds. Prove
them before expanding to Shared blending and the full Rooms Hub.

1. Audit current pipeline, event attribution, caches and provider usage. Freeze
   a reproducible baseline; check current main before modifying anything.
2. Define room/learning/privacy contracts and retention. No schema changes until
   approved; preserve Supabase durable / Spacetime live authority boundaries.
3. Inspect Troi and evaluate external metadata/recording coverage with actual
   representative music. No provider integration assumed.
4. Compare A: familiar + cooldown + rediscovery; B: current TASK-011; C: room-aware
   ranking with lightweight sequencing. Use the same candidate set when isolating
   ranking effects; assess expanded candidate supply separately.
5. Evaluate sequences in shadow/offline mode and then approved live listening.
   Shadow mode does not mutate queues or permanently train profiles. Separate
   evaluation examples from tuning data where practical; a small audience limits
   statistical claims.
6. Add authoritative continuation, then evaluate Shared and Temporary behaviour.
7. Build the Rooms Hub around working behaviours; optional AI and discovery
   gestures remain later work.

Evaluate normal Personal, Fantasy, energetic Fantasy, classical, war orchestra,
phonk, repeat-heavy sessions, several skips, explicit corrections, cold start,
two-person overlap and conflicting shared tastes. Include missing metadata,
unavailable media, quota exhaustion, reconnects and multiple devices per account.

| Measure | Interpretation |
| --- | --- |
| Listener judgment of a sequence | Primary usefulness check, not only track scores |
| Off-theme selections | Strict-room fidelity; identify uncertain labels separately |
| Correct recording/version | Resolver quality, separate from ranking |
| Repeat irritation | Track, recording and artist repetition; manual repeat excluded |
| Deliberate returns/rediscovery success | Later replay or explicit approval, not only completion |
| Discovery acceptance | Was unfamiliar material welcome when requested? |
| Manual interventions and skips | Contextual diagnostics; not the sole success metric |
| Shared representation | Avoid persistent dominance and unintended disclosure |
| Provider calls per useful selection | Efficiency plus cache/refresh behaviour |
| Time to first play and continuation readiness | Usability and playback resilience |

No numerical pass thresholds have been agreed. Establish baselines and owner
acceptance criteria before choosing percentages, cooldowns or planner complexity.
If the more complex candidate fails to improve real listening over A, simplify.

Future testing: characterize existing contracts before refactoring; use meaningful
failing tests for new theme restrictions, attribution, Temporary isolation,
account deduplication, exclusion precedence, queue authority and idempotent
refill. Test UI interactions on mobile/desktop and live multi-participant playback
at the appropriate gate. This document-only change needs content/link validation,
not application tests.

## 11. Open decisions and deferred questions

- Theme confidence model, source coverage and fallback UX.
- Personal versus Themed account-learning defaults and exact consent controls.
- Temporary operational retention and explicit save/convert behaviour.
- Shared personal-block semantics, membership grace periods and score calibration.
- Familiar/rediscovery balance, novelty floor (if any), cooldowns and session decay.
- Correct-recording thresholds and treatment of intentional alternate versions.
- Reserve size, committed boundary, refill triggers and concurrency mechanism.
- Provider budgets, authorized Google import scopes and refresh/deletion rules.
- Cold-start behaviour when no useful account history exists.
- Existing-room migration mechanics/default compatibility: Legacy is the agreed
  classification; conversion and retirement timing remain undecided. Personal
  room lifecycle and startup preference also remain to be specified.
- Whether energy/mood metadata is reliable enough to expose controls.
- Compatibility card evidence requirements and privacy.
- Watch-specific quality evaluation; music sequencing findings do not automatically
  apply to long-form video selection.

## Change record

2026-09-08 (owner follow-up): added Legacy as a fifth transitional kind for
existing rooms, accessible under Saved Rooms in a small Legacy grouping.
Preserve existing contents, access and behaviour; no automatic conversion or
retirement deadline. This replaces the earlier unresolved existing-room
classification question, while migration mechanics remain open.

2026-09-08: consolidated owner direction and both research passes. Preserved
minimal-effort learning, recording correctness, strict theme boundaries, stable
Autoplay, research caveats, existing mobile flow and deferred ideas. Supersedes
earlier conceptual owner-first Shared, constantly reshuffling Autoplay,
remove-equals-dislike and full-player-on-Home suggestions. No code, provider,
database, Git or deployment action is authorized by this document.

For future revisions, record the date, changed decision, supporting experiment
or owner instruction, and which earlier statement it supersedes. Keep unresolved
hypotheses visible rather than silently converting them into requirements.
