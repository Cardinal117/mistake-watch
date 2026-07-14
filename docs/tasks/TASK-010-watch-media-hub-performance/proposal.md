# Proposal: Watch Media Hub Performance

## Problem

The uploaded catalogue currently maps every matching asset to a full interactive
card. Every poster route is assigned immediately, so large catalogues can mount
hundreds of cards and initiate unnecessary authorization/signing requests before
the user reaches those items.

## Goal

Bound initial React and poster work while preserving the current UI, canonical
asset ordering, authorization model, and complete set of card actions.

## Approach

- Progressively reveal catalogue cards in deterministic grid/list batches.
- Observe poster containers relative to the Media Hub scroll root and assign
  poster routes only near the viewport.
- Keep the complete authorized metadata response and all management behavior.
- Add deterministic fixtures and browser evidence for large catalogues.

## Non-Goals

- Server pagination or catalogue API changes.
- Fixed-height or dependency-based virtualization.
- Media Hub visual redesign.
- Queue, recommendation, upload, or processing changes.

## Success Criteria

Initial mount/request budgets pass, controlled median opening improves by at
least 40%, all catalogue actions remain correctly bound, and TASK-009 privacy
behavior remains unchanged.
