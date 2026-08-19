---
id: TASK-017
status: complete
type: compact-task
related: [MW-BUG-013, MW-QOL-004, TASK-002, TASK-004]
created: 2026-08-19
updated: 2026-08-19
---

# Previous/Next Forward History Preservation

## Objective

Preserve the item that was active before a manual Previous action so the next
manual Next action returns to it instead of skipping it or leaving it only in
played history.

## Confirmed Reproduction

Given `A played`, `B playing`, and `C queued`, the current manual Previous path
promotes `A` and marks `B` played. Both Listen and shared transport Next select
only queued rows, so they select `C`; `B` disappears from the forward path.

## Scope

- Treat a manual selection of a played row as history navigation.
- Preserve the formerly playing row as the first queued forward item.
- Support YouTube, direct/HLS, and uploaded queue-item playback reducers.
- Cover repeated Previous followed by repeated Next with deterministic tests.
- Keep transition state server-authoritative and synchronized for all members.

## Exclusions

- No redesign of Previous restart-versus-history semantics from MW-QOL-004.
- No queue drawer, transport-control, or Add Media UI changes.
- No database, Supabase, or public API changes.
- No change to autoplay, loop restart, shuffle, recommendation scoring, or
  Play Next priority outside the manual history-navigation branch.

## Decisions

- Only manual playback of a row whose current server status is `played` creates
  a forward item.
- The formerly playing row is inserted at queued position zero and has stale
  one-shot Play Next and played-sequence state cleared.
- Existing queued rows shift together, preserving their relative order.
- Normal queued-item playback, natural completion, failure advance, and loop
  replay keep their existing transition behavior.

## Implementation Order

1. Add a pure queue-transition calculation and reproduce the state loss.
2. Use the calculation from the shared server commit helper.
3. Enable forward preservation in normal and uploaded manual-play reducers.
4. Run focused queue/player/Spacetime tests, then full project gates.

## Risks

- Reordering pinned or Play Next rows during history navigation could surprise
  users; the return item intentionally takes precedence only for the forward
  path created by Previous.
- Applying the rule to loop autoplay would grow or reorder the queue, so the
  option must remain manual-history-only.
- Stale clients must not be able to invent forward history; server row status
  determines whether preservation applies.

## Acceptance Criteria

- `A played → B playing → C queued → Previous` yields `A playing`, `B` first
  queued, and `C` second queued.
- Next returns to `B`; another Next reaches `C`.
- Repeated Previous preserves the complete forward order without duplication.
- Manual playback of an ordinary queued item retains existing behavior.
- Loop autoplay and natural completion retain existing behavior.
- Uploaded and non-uploaded manual playback use the same transition rule.
- No queue item is duplicated, removed, or attached to the wrong source.
- Focused tests, full tests, typecheck, lint, build, file-length policy, and diff
  checks pass before release consideration.

## Evidence

- Owner production report archived in
  [[../../product-intake/archive/quick-capture-2026-08-19#Raw Quick Capture]].
- Static state-transition reproduction confirmed on 2026-08-19.
- The shared server transition now preserves the active item only when a manual
  reducer selects a row whose current server status is `played`.
- Pure transition coverage proves single and repeated Previous behavior, forward
  order preservation, and unchanged loop replay behavior.
- Local verification completed on 2026-08-19:
  - SpacetimeDB module build passed.
  - Focused queue/player/authority suite: 56 passed.
  - Full `npm test`: 377 passed.
  - Typecheck, ESLint, production build, Prettier, and file-length policy passed.
- Commit `5792328` was released to production, including deployment
  `dpl_4UZdgUmuWQfY8APy3mkvd5pPuoy9`.
- On 2026-08-19, the owner completed two-participant production QA and
  confirmed that Previous followed by Next preserves the return item without
  loss.
