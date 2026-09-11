# Account-wide listening contract — 030.10

Updated: 2026-09-11. Status: approved product direction; eligible-source implementation
in final QA. The owner subsequently authorized two assistants and Git/deployment
after successful QA. See [release evidence](listening-rollout-qa.md) for the actual
deployment state. Stage 2 remains subsequent work.

Implementation boundary: direct/HLS listener coverage and private account counts
are implemented. YouTube-derived passive measurement is not expanded without the
affirmative provider-use review below. Existing Personal YouTube badges retain
their prior meaning. New eligible-source receipts feed listening history/counts;
using them in provider-specific recommendation ranking is later work. Owned-Themed
deliberate choices are prospectively eligible under policy version 2.

## Decision and current behavior

Personal and an account's own Themed rooms are the primary places to learn that
account's taste. Shared listening requires that account's explicit permission.
An explicit app Like is always an account preference, wherever it was made;
unlike, deletion and account lifecycle rules continue to apply.

Current production Likes are account-wide. Current recorded-play badges count
retained qualifying Personal-room completions over 180 days, not all listening
across rooms. On September 11 the owner confirmed the completion/reload/card
fixes worked and supplied a screenshot showing DAMIDAMI 2 and IVORY TOWER 1.
This confirms the reported Personal behavior, not cross-room attribution.

Source review: `catalogue_owner_evidence` in migration `20260911055006` has a
Personal-only completion path. Eligibility in `20260909073834` admits Likes and
eligible deliberate choices; owned Themed choices are not yet included.
`recommendation-events.ts` and persistence attribute events to the actor, while
participant sessions establish connectivity. Neither proves each member listened.

## Eligibility matrix

| Context | Explicit app Like | Account's deliberate queue choice | Passive listening / another user's choice |
| --- | --- | --- | --- |
| Own Personal | Account-wide | Learn | Learn from this account's qualified playback |
| Own Themed | Account-wide | Learn with room-theme context | Learn from this account's qualified playback |
| Shared | Account-wide | Existing explicit action-consent rules | New individual listening permission required |
| Someone else's Themed / Temporary / guest session | Existing authorized Like behavior | Preserve existing rules | No new implicit account learning |

Themed ownership is checked at observation time. Another person playing in an
owner's empty room does not teach the absent owner. Ownership transfer never
transfers taste history: the new owner's eligibility starts prospectively.
Theme is context for a session, not proof that every track or the account has
that genre. Personal recommendations can reuse eligible Themed evidence without
discarding that context. Existing room-specific recommendation presentation is
not replaced by this contract.

Others' queue additions supply possible exposures, not personal endorsements.
After permitted, qualified playback, remember that the listener heard that track.
Merely adding a song to the shared queue does not increment everyone's count or
copy the contributor's Like/action weight. No private contributor profile is read.

## Consent and deletion

- Add an independent per-account, per-Shared-room listening permission, initially
  off. Suggested purpose copy: "Learn my taste from music I listen to here,
  including music other people add. My Likes are always saved to my account."
- Keep existing action-learning and room-contribution permissions separate.
  Existing "my actions here" consent cannot authorize this broader purpose.
  Host permission cannot substitute for participant permission.
- Store scope, purpose version, activation time, revocation time and epoch.
  Check consent both at observation time and when reading evidence. Intervals
  spanning a permission change are split; only eligible portions qualify.
- Revoking listening immediately excludes its evidence from account reads and
  invalidates derived caches. Re-enabling uses a new epoch; old evidence stays
  excluded. Changing a different scope must not rotate this scope's epoch.
- Preserve existing Shared leave/removal behavior: revoke room learning scopes
  and exclude their evidence from personal reads. Membership deletion must not
  leave reusable listening evidence behind. Rejoining requires fresh permission.
  Account disabling/deletion and clear-history rules also override reads.
- History clearing advances an account history generation, so delayed receipts
  cannot restore cleared records. Likes are independently retained unless the
  user also clears them. Shared withdrawal never removes explicit Likes.
- No historical Shared fanout, guest-to-account conversion of old listening, or
  implied global community contribution. Stage 3 needs its own permission.

## Listener evidence and counts

Preserve operational room events. Add separate listener evidence whose subject
is the verified authenticated account; keep initiating actor, queue contributor
and listener distinct. Never treat all room members as the playback actor.

SpacetimeDB validates bounded local playback observations against the canonical
room/source/occurrence, active admitted session, server time and playback state.
Reject foreign occurrences, stale sessions, future timestamps, duplicate sequence
numbers and observations exceeding elapsed time at the allowed playback rate.
Client reports describe observable playback, not proof of human attention.

Initial conservative listen rule: at least 90% distinct media coverage from
eligible playing intervals in one occurrence, with elapsed-time validation.
This uses the existing 90% completion boundary but applies it to the listener's
coverage, not the host's position. Unknown-duration/live sources do not increment
this count. Paused, buffering, failed, disconnected and app-muted/zero-volume
intervals do not qualify. OS/device audibility is not claimed. Background playback
can qualify; tab visibility is not an attention requirement. Seeking never fills
unobserved coverage; a late arrival does not inherit earlier playback.

Merge overlapping device intervals for the same account and occurrence rather
than summing them. A count is unique per account/occurrence. An intentional repeat
with a new occurrence may count again. Reconnect and delivery retries cannot add
another count. Incomplete/uncertain evidence produces no negative taste signal.

Partition coverage by listening-consent epoch and account history generation.
Never combine coverage from before a revoke/clear with later coverage, even in
the same occurrence. A partition must independently qualify; the final eligible
projection still counts at most once per account/occurrence across devices.
Store those partitions explicitly in receipt keys/upserts, not one overwritable
account/occurrence row that can accidentally merge revoked intervals.

The account reader uses eligible evidence across rooms for the last 180 days,
with an explicit coverage start date and methodology version. Keep source-level
counts until recording identity is verified; never merge remixes by title.
Preserve today's legacy Personal totals separately. During transition the badge
keeps its current meaning; expose the new account total with distinct scope/copy
only after QA. Do not sum legacy and new counts for the same occurrence or reset
existing badges silently. Any later unified historical total needs a documented
conversion rule; old room completions are not verified listener receipts.

Eligible readers show the same account total for the same source/window after
refresh, wherever that personal count is presented. Shared/public views must
never expose another account's counts. This does not mandate real-time fanout to
every open tab: invalidate the subject's cache on accepted evidence and revalidate
on focus/navigation using existing bounded refresh patterns.

## Supabase and delivery changes to implement

| Boundary | Planned change | Enables |
| --- | --- | --- |
| Learning policy | Version 2; remove version-1-only constraint through an additive migration; retain old evidence interpretation | Explicit typed evidence eligibility |
| Consent | Independent listening scope and epoch; account history generation | Prospective permission and reliable withdrawal/clearing |
| Private listener receipts | Account, room, source, occurrence, observation bounds, compact validated coverage, method/policy version and permission/history epochs; unique account/occurrence/epoch/history-generation partition | Correct durable per-account counts with final occurrence deduplication |
| Eligibility projection | Separate subject from operational actor; retain room kind and event-time ownership | Personal, owned Themed and opted-in Shared evidence |
| Account reader | Batched eligible-source aggregate, room-context breakdown and coverage metadata | Reusable private regulars/rediscovery evidence |
| Live observation / outbox | Bounded per-session validation, interval compaction and idempotent service ingestion | Reliable delivery without a row per heartbeat |

Private tables use RLS and service-only wrappers; derive the account from verified
auth. No browser-selected account IDs or taste data/consent epochs in public room
broadcasts. Persist compact receipts for at most the 180-day learning window;
delete transient observations after compaction/expiry. Bound active occurrence
state, outbox batches, retry age and leases. Reuse delivery health counters; never
reintroduce per-job full-history scans. Add indexes around account/time/source,
occurrence uniqueness and consent lookup; prove query plans with realistic data.
Keep personal provenance out of the reusable public metadata cache.

Stage 1's 28-day provider cache remains separate. First-party retention does not
extend provider-data retention. No media, thumbnail bytes, lyrics or large raw
payloads. Provider-derived playback measurements need the narrow provenance
review described in the Stage 2 plan before 030.10 live collection or pilot;
naming a receipt first-party is not
by itself sufficient evidence of permitted use.

## Ordered work and acceptance

1. **030.10a:** implement policy/consent/history-generation boundaries and owned
   Themed explicit choices; failing SQL tests before additive migration. Complete
   the narrow measurement-origin/use review before enabling listener collection.
2. **030.10b:** implement validated listener observations and durable receipts;
   unit/reducer/SQL tests before changing production behavior.
3. **030.10c:** integrate private account evidence and honest scope/count copy;
   verify desktop/mobile and cross-room/account isolation without UI redesign.
4. **030.10d:** independent review, query/queue pressure tests, consent/deletion
   checks and account pilot. Record exact local versus released state. Then use
   [Stage 2's plan](stage-2-identity-and-classification.md).

Required cases: two verified listeners get one count each; absent members get
none; two devices get one count; queued-but-unplayed gets none; host completion
does not impersonate listeners; late arrival/seek/mute/buffer/pause/disconnect
do not manufacture coverage. Test old consent, grant/revoke/regrant, unrelated
scope changes, late delivery, history clear, guest upgrade, owner transfer,
account isolation, repeated occurrences, unavailable sources and expired records.
Maintain no automatic Personal YouTube search, source-level Likes, duplicate
queue support and preserved dynamic song accents.

Independent source/consent review completed using one assistant. The identified
actor/listener, consent-upgrade and legacy-history gaps are resolved in this
contract, not yet in runtime code. Final review also resolved Shared leave/removal
revocation, receipt coverage partitioning and the measurement-review order.
Hosted changes and release receipts remain
separate implementation evidence, not implied by this document.
