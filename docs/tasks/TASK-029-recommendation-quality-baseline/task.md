# TASK-029: Recommendation quality baseline and evaluation

Status: Discover UI and required Personal functionality released to production on 2026-09-09. See live-rollout-2026-09-09.md for exact receipts and verification limits.
Documentation level: Expanded implementation packet; this file retains planning history.
Updated: 2026-09-09.
Baseline: `77c1943c3e712ccfec57054eee8d99254ddba205` (main).

## Objective and authority

**Implementation approval superseded earlier planning-only restrictions:**
implement the accepted reference, Your regulars with explicit Likes and truthful
recorded play counts, rediscovery, recommendation queue states, feedback and
measurement, and Discover/Visualizer underline controls. Preserve the existing
per-song accent/gradient background. Use [implementation design](design.md),
[implementation sequence](tasks.md) and [acceptance criteria](acceptance-criteria.md).
The owner's subsequent proceed/approval instructions authorized Git publication,
PR #17 merge, the reviewed migration and production deployment. Earlier local-only
restrictions below are historical preparation checkpoints, not current gates.

Identify the smallest change that makes Personal recommendations more useful,
and establish how strict Themed eligibility can be evaluated before enabling it.
Quality comes before continuous Autoplay and the Rooms Hub.

The original baseline/specification approval (historical) did not approve
application implementation, new provider access/imports/scopes, hosted data reads
for profile export, schema changes, queue mutations, Git publication or deployment.
That earlier stage covered read-only source inspection, local existing tests and
documentation. The later implementation approval is recorded above. The proposed
listening-quality experiment below has not run; synthetic QA is not that experiment.

Sources of truth:

- [Recommendation direction](../../recommendation-engine-direction.md).
- [TASK-011](../TASK-011-first-party-recommendation-intelligence/tasks.md), the
  released deterministic recommendation foundation; do not reopen its completed batches.
- [TASK-028 live release](../TASK-028-room-kinds-foundation/live-rollout-2026-09-09.md)
  and [desktop membership follow-up](../TASK-028-room-kinds-foundation/desktop-membership-access.md).
- [Intake](../../product-intake/INDEX.md), including
  [MW-BUG-011](../../product-intake/items/MW-BUG-011-room-picks-actions-permission-toast.md).
- [Verified baseline](baseline.md).

The owner reports live acceptance passed except desktop membership access, now
fixed and released. PR #16 is merged; main application code matches live
`de25e89`. Post-patch interaction evidence is local real-backend verification,
not a repeated physical-device pass. This task does not reopen release acceptance.

## Scope

1. Freeze current candidate supply, filtering, ranking, feedback and cache behavior.
2. Define automated offline checks followed by a bounded natural-use live trial
   with Personal and strict Themed cases, without mandatory listening homework.
3. Separate recording correctness, candidate coverage and preference ranking.
4. Define provider-call measurement and a review gate for actual quota evidence.
5. Select one bounded implementation proposal from measured failures; do not
   automatically implement every gap in the baseline.

Excluded: continuous refill/Autoplay, Shared blend implementation, Temporary
automatic suggestions, new discovery providers, account imports, audio analysis,
AI inference, new controls, a hub/settings redesign and performance-index work.
Watch long-form recommendation quality needs its own evaluation later.

## Decisions and approach

- Preserve current room-kind and learning contracts. Temporary implicit learning
  stays excluded. Themed suggestions stay suppressed until a classifier earns
  acceptance. Manual off-theme playback and personal Likes never edit direction.
- Preserve source-versus-ranking separation. Candidate retrieval must be evaluated
  separately: a ranker cannot rescue a relevant recording absent from its input.
- Familiar listening and rediscovery lead; unfamiliar artists are allowed when
  useful, with no forced small-creator promotion or invented novelty percentage.
- Treat a channel as channel evidence, not verified artist or recording identity.
  Distinguish original, cover, remix, live and intentionally selected alternate versions.
- Theme eligibility precedes affinity scoring. Represent labels as eligible,
  ineligible or uncertain; uncertain cannot be promoted by a high taste score.
- Keep Likes strong and unlike neutral. A future explicit personal exclusion must
  stay separate from room corrections and manual playback authority. Skips,
  failures and organizational removals require attribution and uncertainty.
- Shared evaluation uses synthetic consenting accounts counted once regardless
  of device count; no claim of an implemented fair blend. Private preferences
  must not appear in another participant's explanation.
- Manual queue choices retain priority. Offline output never mutates queues,
  trains durable profiles, changes membership or calls playback reducers.

## Proposed evaluation sequence

### Personal Discover direction — owner follow-up

See the [desktop image reference and feedback proposal](discover-design-reference.md).
The owner requested UI redesign exploration and explicit suggestion outcomes;
these are now proposed follow-on scope. The original evaluation-only exclusions
remain in force until the UI/feedback implementation packet is expanded and approved.

The owner wants Personal Discover to emphasize favorites and frequently chosen
music, using the familiar quick-access idea they associate with a music speed
dial, with recommendations available to add to the queue. This is accepted product
direction, not a completed screen or authorization for automatic queue mutations.

Proposed hierarchy within the existing Personal Listen Discover surface:

1. **Your regulars:** prominent compact artwork shortcuts to repeatedly and
   deliberately chosen tracks, with explicit Likes as strong evidence. Do not
   label every frequently played track as explicitly liked, count automatic loops
   as deliberate returns, or fabricate account history from room queue position.
2. **Rediscover:** familiar tracks not deliberately played recently, using
   verified account history and a defined cooldown policy. Hide or explain an
   empty shelf when the evidence is insufficient.
3. **Recommended for you:** a smaller, separate set of eligible suggestions with
   existing Add to Queue, Play Next and explicit Play controls. Show honest reasons
   and distinguish first-party ranking from provider fallback.

Reuse existing artwork cards, action semantics, theme tokens and responsive
Discover interactions. Keep the compact player stable, readable titles, accessible
actions and one mobile vertical scroll container. Do not redesign the Rooms Hub,
Watch or other room kinds as part of this Personal proposal. Resolve exact shelf
names/counts and data availability in the implementation specification.

**Queue behavior:** merely opening Discover or viewing a recommendation does not
add or start anything. The first quality trial retains explicit user queue actions.
Continuous automatic continuation remains a separately scoped follow-on: proposed
opt-in Autoplay, a clearly labeled automatic queue section behind manual choices,
one authoritative refill path, no duplicate entries across devices and no
displacement of manual choices. The owner's question about automatic addition is
not approval to enable it. Recommendations and Autoplay must be explained as
separate capabilities.

### 029.1 — Reproducible offline baseline

First proposed implementation scope: an evaluation-only harness and fixtures,
without changing production recommendation modules or adding dependencies.
Reuse the existing ranker/test loaders. Freeze time, candidate inputs, aggregate
and preference inputs, room kind, source SHA and expected recording/theme labels.
Persist public/synthetic fixture inputs and sanitized result summaries only.

Use a small manually reviewable set based on the saved listening examples below.
Start with public examples or owner-supplied selections. A real preference export
requires a separately scoped read and privacy decision; never copy private profiles
or permanent/signed media URLs into Git. Keep tuning and evaluation examples
separate and label the limited sample size honestly.

Owner-selected priorities (2026-09-09): Personal favorites and rediscovery first;
Fantasy/orchestral as the first strict-theme trial; classical and phonk as useful
boundary cases. These labels do not establish individual tracks or universal
genre exclusions: some classical recordings may belong in the chosen Fantasy
direction. Do not invent personal favorites or import an external music account.

The owner prefers ordinary live listening to a separate listening exercise.
Offline means agent-run computation with no room effects, not a requirement to
listen to unfamiliar/unwanted music or grade lists. It checks invariants and
known examples before exposing a change. Synthetic checks cannot establish taste
quality. Normal choices, Likes, attributed skips and deliberate returns/replays
provide the live evidence; optional brief owner feedback can clarify ambiguity.
No mandatory ratings, questionnaires or forced unfamiliar tracks.

| Case | What to inspect |
| --- | --- |
| Personal cold start | Honest insufficiency; no fabricated familiarity |
| Familiar / rediscovery | Relevant known tracks present in supply; recent-repeat exclusion distinguished from older rediscovery |
| Fantasy / energetic Fantasy | Energy preference cannot admit an off-theme recording |
| Classical / war orchestra / phonk | Correct recording/version and room boundary, including ambiguous metadata |
| Repeat-heavy / several skips | Repeat irritation; no invented permanent dislike or inferred mood |
| Explicit correction | Like, unlike and proposed exclusion semantics evaluated separately |
| Duplicate uploads / wrong versions | Video identity versus recording identity; intended remix remains valid |
| Missing metadata / unavailable source | Uncertainty and availability kept separate from taste |
| Two accounts / duplicate devices | Synthetic fairness and consent invariants, without implementing blending |
| Provider failure / exhausted budget | No queue mutation, false quality claim or playback dependency |

Compare B (current TASK-011 ranker) with A (simple familiar/rediscovery baseline)
only after defining A's cooldown and familiarity rules with the owner. Use the same
candidate set and eligibility labels to isolate ranking. Record a separate supply
comparison when adding candidate sources. C (room-aware sequencing) is deferred
until A/B failures justify it; do not implement three engines up front.

### 029.2 — Candidate and provider evidence

Record requested search results, returned IDs, playable metadata, identity
duplicates, version mismatches, eligible candidates and useful selections as
separate counts. Distinguish raw browser requests, application endpoint requests,
cache hits, upstream search calls and upstream metadata calls.

Use deterministic mocked transport to prove call counts first. For any subsequent
approved live measurement, specify the Google project, time window, current quota
allocation, endpoint units, cache state, sample size and approved request budget.
Recheck official provider documentation then. Do not infer quota cost from result
count or assume every sign-in has an independent budget. Do not enable logging,
add credentials/scopes or issue discovery calls as part of this documentation task.

### 029.3 — Choose the smallest quality change

Review candidate availability, recording correctness, strict-theme labels and
listener judgment before choosing ranking weights or a classifier. Decide whether
the next change should address supply, identity, cache recovery or ranking.
Write the concrete behavior and first failing test into this packet before coding.
Expand to a full packet if the selected change crosses durable learning, privacy,
provider acquisition or live authority boundaries.

### 029.4 — Bounded live trial through ordinary listening

Accepted evaluation direction, not deployment authorization: after the selected
change passes local checks and its release is approved, trial it in the owner's
Personal room. The owner listens normally to music they enjoy, chooses songs,
Likes, skips and revisits favorites. Keep manual queue use and current controls
intact. This trial does not require automatic queue continuation; Autoplay needs
its own authority and stability work. Admit the Fantasy/orchestral trial only
after strict eligibility is proven; keep uncertain candidates out and explain
insufficient supply rather than broadening the theme.

Before implementation, specify which existing trusted events actually reach the
new-kind ranker, which proposed signals need additional work, the minimal retained
diagnostics, and an owner-only enable/disable boundary. See the baseline's narrower
Personal/Shared signal adapter: existing event infrastructure is not proof every
normal listening action already changes recommendations as intended.

Interpret feedback conservatively:

- Like is explicit positive interest; unlike returns to neutral.
- Deliberate replay/return is useful evidence only when separated from loops,
  retries, reconnects, automatic playback and duplicate devices.
- A skip is weak contextual evidence, not a permanent dislike or inferred cause.
- Queue removal/reordering is organizational by default; do not turn "remove"
  into "never recommend". An explicit exclusion action is a separate future scope.
- Failure/buffering is not negative taste. Another person's action must not be
  attributed to the owner, and device count must not multiply account influence.

Compare useful selections, repeat irritation, recording mistakes and optional
owner feedback against the current baseline. Track whether a suggestion was
shown/selected only through an approved measurement contract; connected presence
or an absent skip alone is not evidence of satisfaction. Do not run an unannounced
all-user experiment. Expand beyond the owner only through a defined participating
cohort and the existing independent consent rules.

Review results periodically and make small, reviewable algorithm changes. There
is no automatic self-rewriting/tuning system in this proposal. Any measured
regression can disable the experimental recommendations while ordinary listening
and the deployed room/learning guards stay intact. Define that mechanism before
shipping; it is not implemented by this document.

## Acceptance criteria

| ID | Required evidence |
| --- | --- |
| B1 | Baseline SHA, reproducible inputs, fixed time, commands and outputs are recorded; identical inputs produce identical order/exclusions/reasons |
| B2 | Candidate absence, eligibility rejection and low rank are distinguishable in each judged failure |
| B3 | Recording/version and theme labels include uncertainty and provenance; no title-only or channel-only correctness claim |
| B4 | Strict-theme output contains only eligible labels; exhaustion produces an empty/familiar eligible fallback in evaluation, never silent broadening |
| B5 | Personal relevance, repetition and rediscovery are evaluated through ordinary listening with optional owner feedback; no forced listening task; skips alone cannot define success |
| B6 | Provider counts distinguish layers; mocked counts are not reported as consumed production quota; live allocation/usage remains unknown until measured |
| B7 | Offline evaluation performs no durable training or room mutations; a separately approved live trial preserves trusted learning/consent rules, manual queue authority and Listen catalogue exclusion |
| B8 | Proposed next change has named scope, failure examples, test gate, rollback boundary and owner-approved quality criteria |
| B9 | Live trial defines eligible participants, observable signals, attribution, minimal diagnostics and disable behavior; existing supported signals are distinguished from proposed ones |

There are no agreed numerical quality pass thresholds. The existing TASK-011
performance budgets are regression references, not listening-quality targets.
An offline human label is evaluation evidence, not proof a production classifier
can infer that label. Hold activation until that distinction is resolved.

## Testing strategy and risk

Documentation: exempt from new application tests; check links, scope and evidence.
Current code: characterization using existing deterministic fixtures, service
boundaries and performance checks. No invented red-test chronology.

For 029.1, first meaningful harness test: with a frozen candidate set containing
an eligible favorite, a missing favorite, an off-theme favorite, a wrong-version
duplicate and an uncertain candidate, the report separates supply misses from
filtering/ranking outcomes and never labels uncertainty as a classifier pass.
Use mocked transport and prohibit network/mutation adapters in the evaluator.

Any later new theme, exclusion, cache-retry, quota, permission or authority behavior
needs a meaningful failing test before its production change. Reuse existing
contract tests where sufficient. UI/browser and real participant checks belong
to the later integration gate, not this documentation-only stage.

Main risks: overfitting to a tiny audience, inaccurate music metadata, treating
historical signals as current consent, confusing a source benchmark with live
latency, and broadening this task into an engine rewrite. Mitigate through separate
evaluation examples, uncertain labels, policy-preserving inputs and explicit gates.

## Evidence and next decision

[Baseline](baseline.md): 43 existing recommendation checks passed; pure ranker
p95 8.83 ms for 500 synthetic candidates. The existing discovery benchmark also
ran. No real listening sequence was graded and no live provider quota was read.

Next preparation: specify the smallest Personal improvement and its supported
feedback/measurement contract, using agent-run 029.1 checks as its validation
layer. Do not make the owner complete an offline listening study first. The
music priorities and natural-use trial approach are accepted; concrete application
implementation and live release remain separate decisions. Medium for bounded
offline work; High before sensitive cross-system engine implementation.
