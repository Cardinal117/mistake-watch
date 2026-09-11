# Immediate recommendation-to-queue feedback

Status: implemented and locally verified; see [release QA](listening-rollout-qa.md)
for the current publication state.
Updated: 2026-09-11. Extends the existing TASK-030 packet because it crosses
Discover, shared queue presentation and live confirmation. No new ranking scope.

## Requested behavior

Accepting Add to queue or Add next immediately removes that recommendation from
the displayed recommendation lists and inserts a locally pending queue entry.
The app sends the authorized command in the background. Confirmation replaces
the pending entry in place rather than displaying another copy or jumping around.
Keep manual duplicate adds and regulars available; acceptance is not rejection,
unlike, a seven-day suppression or evidence that the user listened.

Use a common room-level pending-add projection so the full queue, Listen drawer,
Up next and queue count agree. Avoid component-local fake queues. Other clients
see only the authoritative room state until the server accepts the request.
SpacetimeDB retains canonical ordering, permissions and playback authority.

## Reconciliation and failure contract

- Give each deliberate request its own correlation/idempotency identity. A retry
  of that request cannot create an extra occurrence; an intentional repeat gets
  a new identity. Do not match confirmations solely by song ID, since other
  participants may add the same song concurrently.
- Respect current permissions/pending protection before inserting a placeholder.
  Pending entries are visibly provisional and cannot be played/reordered as
  canonical entries. Tail adds append locally; Add next previews the existing
  next-position semantics without replacing the currently playing item.
- On definitive rejection, remove only that request's placeholder and restore
  its recommendation if still eligible. Give a concise error and explicit retry.
- Timeout means unconfirmed, not necessarily rejected. Reconcile first and retain
  request identity across retry; handle a late success without a duplicate or
  erasing a newer request. Never record queue_observed from an optimistic row.
- Accepted recommendations stay out of the current decision/session list even
  through a stale refresh. They may return in a later eligible recommendation
  decision; acceptance does not impose permanent taste suppression. Do not issue
  provider search to fill the vacancy: use remaining eligible cached candidates.
- Restore focus predictably when the activated row disappears. Respect reduced
  motion. Clear room/account-scoped pending UI on navigation or identity change;
  reconnection must resolve uncertain outcomes from authoritative state.

## Current source and implementation order

`use-personal-discovery.ts` already sets pending immediately, fences late failures
with a token and waits for a new occurrence before recording confirmation. Its
12-second timeout is not proof of rejection. Existing `use-optimistic-queue.ts`
supports queue presentation changes; inspect/reuse it instead of inventing a
parallel model. Its presence does not mean optimistic additions already work.

1. Specify request correlation and common pending-add ownership; establish a
   meaningful failing delayed-confirmation browser/reducer test.
2. Implement recommendation hiding and shared provisional queue presentation.
3. Verify confirmation, rejection, timeout/late success, reconnect, two clients
   adding the same song, deliberate repeats, multiple pending adds and Add next.
4. Desktop/mobile QA, focus/scroll stability, permissions, no automatic search,
   truthful learning events and existing queue regressions. Record local and
   release state separately. No offline playback or automatic retry loop implied.

Then continue remaining 030.10 consent/history boundaries, listener receipts,
private account readers and counts. Stage 2 identity/classification follows their
acceptance gate; community similarity and Autoplay remain separate later stages.
