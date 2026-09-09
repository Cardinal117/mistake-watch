# Personal Discover — design reference

2026-09-09. Owner-requested imagegen concept, subsequently accepted and implemented
locally. Required override: preserve the song-driven accent/gradient background.
See [implementation and QA](implementation.md) for the actual result and evidence.
Companion to [TASK-029](task.md). Image: [desktop reference](discover-reference-v1.png).
Music, artwork, durations, Likes and explanation labels are illustrative, not
verified account data. The reference preserves the desktop player and room shell;
it proposes changes to Discover, not a new playback architecture.

## Diagnosis and proposed interaction

The supplied screenshot has repeated equally weighted carousels, clipped titles,
partial cards, many tiny action strips and scrolling inside a bordered panel.
This is screenshot-based critique, not a browser interaction audit.

- Put regulars in a compact wrapping artwork grid with stable positions during
  interaction. Separate explicit Likes from inferred repeat interest.
- Use flat recommendation rows with readable titles, one primary Add to queue
  action, a stable Added/In queue state and a contextual menu for other actions.
  Show Added only after confirmed authority success; expose failure/retry and
  preserve existing duplicate handling. Distinguish an existing queue entry from
  a new successful addition made from this suggestion.
- Keep Rediscover subordinate, beside the main list on wide screens and below
  it on smaller screens. One vertical discovery scroller; no mandatory horizontal
  carousel or nested section scrollers. View all opens a deliberate expanded
  collection view, not another narrow carousel.
- Preserve compact player behavior, existing typography/tokens, restrained room
  accent, readable metadata and accessible actions. Maintain keyboard menu focus,
  Escape/return focus, touch targets and a mobile action path without hover.
- Keep shelf positions stable while choosing music. Do not instantly replace a
  newly added row with a fresh candidate before its confirmation can be understood.

## Feedback and measurement contract to specify before implementation

Record a suggestion identity, candidate/media identity, ranking/source revision,
room/account scope, display surface and shown/selected state with minimal bounded
retention. Separate recommendation generation from an actual visible impression.
Client impressions describe presentation only; they cannot originate trusted
queue mutations or authoritative learning facts. Correlate a confirmed queue
action with its original suggestion where possible; independently adding the same
track is not automatically proof the recommendation caused it.

| Observation/action | Proposed interpretation and repeat handling |
| --- | --- |
| Never visible | No rejection or exposure claim |
| Shown but not selected | Reason unknown; no dislike; bounded exposure fatigue may reduce immediate repetition after its policy is specified |
| Confirmed Add/Play Next | Contextual interest; no duplicate suggestion while queued; not a permanent Like |
| Like / deliberate return | Stronger positive evidence, subject to attribution and duplicate suppression |
| Skip | Weak contextual negative; no permanent block or invented reason |
| Queue removal | Organizational by default; prevent immediate reinsertion without inferring dislike |
| Not now | Explicit temporary suggestion suppression; duration requires a defined policy |
| Don't suggest this track | Explicit personal automatic-suggestion exclusion; manual playback remains possible; reversible |
| Wrong version | Mark playable-match problem; do not dislike the intended recording; validate a replacement rather than auto-substituting blindly |
| Playback error | Availability evidence, never a taste penalty |

Show Undo for explicit dismissal/block/correction actions. No compulsory reason
question after an ordinary skip or removal. Store the user's declared reason
separately from inferred explanations; preserve unknowns. Decide recording-level
versus provider-video-level exclusion semantics before claiming duplicate uploads
are covered. Shared room-wide corrections require a separate authority contract.

The menu and diagnostic capture are proposed additions, outside the initial
evaluation-only harness. Expand the implementation packet for this UI plus
feedback/data work before building it. Autoplay remains separate and opt-in;
this concept does not automatically enqueue recommendations.

## Inspiration and rationale

- [Spotify familiar shortcuts](https://newsroom.spotify.com/2020-03-09/get-to-your-favorites-faster-with-spotifys-new-home-screen/): familiar material first, discovery beneath it.
  We infer that predictable access reduces the work of starting a session; this
  source is a historical design precedent, not a claim about every current client.
- [YouTube Music recommendation feedback](https://support.google.com/youtubemusic/answer/13401025?hl=en): contextual removal and Undo.
  Adapt the reversible-feedback principle rather than equating passive non-selection with rejection.
- [Spotify exclusion controls](https://support.spotify.com/nz/article/exclude-playlists-or-tracks-from-your-taste-profile/): distinguishes taste influence from other listening controls.
  Our temporary suppression, personal block and recording correction must likewise
  have distinct meanings; their proposed semantics are our own.

## Verification and limits

Generated with the built-in image tool from the owner screenshot; visually
inspected and corrected a generated peer-listening claim. Final reference is
saved locally. No code, schema, provider accounts or deployment changed.
Image rendering cannot certify responsive behavior or accessibility. Final
implementation requires desktop/mobile interaction QA and trusted feedback tests.
