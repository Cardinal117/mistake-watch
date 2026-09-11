# Proposed follow-up: account Likes and recorded-play reliability

Delivery repair implemented and deployed under subsequent owner approval.
[Release evidence](delivery-release-2026-09-11.md) records the cleared backlog,
durable supplied Likes/completion, source manifest and remaining admission issue.
Historical proposal/diagnosis below remains intact; broader Like consistency
investigations are not declared resolved by the transport repair.

Status: diagnostic pass approved and initial cause confirmed, 2026-09-11. Recommended next priority: P1 repair before
UI improvements or expanded recommendation learning. This document scopes a
bounded diagnostic pass; architecture-changing repairs require an updated full
packet once the cause is known. No implementation, Git publication or deployment
is included in the proposal request.

## Read-only diagnostic results — 2026-09-11

The owner agreed to investigation and supplied `vlrN8Mso-6Y` and `FqvZVGL1_Vk`
as concrete references. Both are currently liked (revision 1) in the verified
owner's live Personal room, and both have pending `media_liked` events there.
Neither has a durable `media_preferences` row for that account in Supabase.
The account has 25 preference rows, so the 250-row read limit does not explain
these two cases. This establishes delayed durability for the current Likes;
it does not prove what happened to the owner's earlier remembered Likes.

One `playback_completed` event for `vlrN8Mso-6Y` is waiting in that Personal
room's outbox. The earlier durable read found zero Personal completions.
Event generation therefore worked for this occurrence; transfer is still pending.

The production outbox aggregate was 4,503 pending events at inspection. Source
verification shows oldest-first selection and one batch per drain invocation:
the scheduled path defaults to 50 events, with a hard per-batch maximum of 100.
The daily recommendation cron cannot guarantee prompt delivery under this
backlog. Cleanup paths can perform additional bounded drains; no exact clearing
date is inferred from a snapshot. A 200 response proves an invocation completed,
not that the queue is empty or the current owner's events were transferred.

Only aggregate/global backlog and the verified owner's Personal records were
inspected. An initially unscoped Like query was rejected by automatic approval
review; the successful replacement explicitly restricted it to the owner's
private Personal room. No event was acknowledged, replayed or changed and no
Like, queue or playback state was modified.

Recommended repair now has two parts: a bounded, resumable catch-up for existing
trusted events and a prompt, server-authorized delivery path for new events.
Keep preference/completion transfer separate from YouTube metadata refresh so
catch-up does not multiply provider batches. Preserve ordered Like/unlike
semantics, idempotency, acknowledgement-after-persistence and failure recovery.
Add pending-count/oldest-age evidence so successful requests cannot mask lag.
Update the full task packet and regression tests before implementation; any
production catch-up is a concrete data operation to include in rollout scope.

## Objective and evidence

Owner approved fixing/resolving the confirmed backlog on 2026-09-11 when safe.
Implementation slice: additive service-only delivery lease, bounded sequential
event pump, authorized after-response triggers, diagnostics and focused QA.
No UI redesign or broader account-history/ranking change. Use existing ingestion
and acknowledgements; no SpacetimeDB schema/reducer change is required.

Implementation bounds: batches of at most 100, at most 20 batches and a 20-second
start-new-batch budget per invocation. Database-clock lease of 120 seconds with
token-checked finish; cooldown 10 seconds on success, 30 on failure. Network
operations are bounded. Store only aggregate progress and oldest pending time.
Authenticated preference reads/writes and Personal Discover reads schedule
event-only work after the response. Daily maintenance retains pruning and YouTube
refresh once per maintenance invocation. Active delivery never calls YouTube.
Absent/hidden clients still rely on maintenance; no always-on guarantee is made.

Regression gates: multi-batch catch-up/deadline, consume and acknowledgement
failure, duplicate-safe retry, concurrent/stale leases, unauthorized trigger
denial, and existing SQL newer-unlike/duplicate-completion coverage. Apply the
additive migration to the isolated local test database before hosted rollout.

Make a signed-in account's explicit Likes consistent across eligible app surfaces,
and prove that trusted completed plays reach the durable Personal count.

The owner reports having to re-like four songs they are confident were liked
before. Do not equate an empty heart or missing suggestion with a deleted Like.
The previous production read found zero stored Personal completion events and
six returned regulars with zero counts. No production outbox root cause has yet
been established. See the preserved report in [INBOX](../../product-intake/INBOX.md).

Source observations to investigate, not confirmed causes:

- `preference-service.ts` reads live room preferences first, then uses durable
  account preferences only when that media key has no live entry. Check stale
  room state, explicit unlikes and cross-room ordering before changing precedence.
- The durable preference read has a 250-row limit without pagination or ordering.
  Check actual account size and whether the relevant tracks fall outside it.
- The browser treats missing preference entries as unknown with `liked: false`.
  Check how each heart handles loading, errors, unknown state and catalogue
  fallback; distinguish these from a confirmed unlike.
- Preference writes go through the live room bridge; trace the event path into
  durable account storage. Do not assume a successful heart response proves
  Supabase persistence.
- Catalogue availability and suppression are independent of saved preference.
  Rejected/expired metadata must not erase a Like or imply that it was unliked.
- Completion transport is separate from the visible panel's 30-second polling.
  Inspect generation, outbox age/acknowledgements, ingestion eligibility and
  retained events without assuming polling or a successful cron fixes transport.

## Proposed order

1. Read-only diagnosis of both pipelines. Compare the affected upload IDs, account
   identity, live preference state, durable state and API output. Ask for the
   four links if existing evidence cannot identify them; do not export a full
   private listening history or guess original Likes from the report.
2. Trace a completion occurrence from event generation through outbox persistence
   to the Personal projection. Prefer existing evidence; use controlled local
   fixtures for reproduction. A natural live completion can confirm the release
   later without unsolicited playback/queue mutations.
3. Report confirmed causes and the smallest repairs, then update the task packet
   before changing contracts. Establish meaningful failing regression tests
   first. Preserve SpacetimeDB playback authority, event deduplication and account
   isolation. Any faster drain must be server-verified, bounded and retry-safe.
4. Prove account Likes and current Personal counts end to end, then return to the
   captured compact regulars and visible Add next UI improvements.

## Acceptance gates for a repair

- Like the same upload in an eligible signed-in room: the heart agrees after
  refresh, room change, sign-out/sign-in and a second session once synchronized.
  Confirm the account preference survives live-room cleanup/restart.
- An intentional unlike also converges everywhere. Older snapshots/events must
  not resurrect it; room-local revision counters cannot be assumed globally
  comparable. Test delayed writes, retries and conflicting sessions.
- Read failures/loading/partial result sets cannot silently present confirmed
  unlike state or cause an erroneous toggle. Cover accounts beyond the current
  250-row read limit where applicable.
- Player, queue, Discover and search-result hearts use consistent account state.
  Regulars/recommendations consume eligible Likes without requiring re-liking;
  missing catalogue metadata remains an availability issue.
- One qualifying trusted completion yields one count increment; retrying the same
  occurrence does not double-count. Pause, queue insertion and manual skip do not
  count as completion. Verify auth/member attribution and the retention window.
- Proposed healthy-path freshness target: visible count within 60 seconds of
  completion. Validate feasibility before committing this as a delivery promise;
  provider outages or failed ingestion must not fabricate counts.
- Preserve privacy, account isolation, existing Likes/unlikes and feedback. Do
  not reconstruct absent historical preferences or plays without trusted evidence.

## Scope and delivery boundaries

This repairs existing explicit account Likes and current Personal-room counts.
Account-wide completion aggregation, consented Shared listening, time-of-day
ranking, genre/BPM, community recommendations and Autoplay remain separate work.
Different YouTube upload IDs remain distinct until reviewed identity work exists.

No calendar release date is assigned. Recommended sequence: reliability diagnosis
and repair, then Discover action/layout work, then account-wide learning design
and the already planned enrichment/community stages. Keep local tests, hosted
deployment and observed natural-use evidence separate in the final report.
