# Review Notes: Watch Media Hub Performance

## Status

Complete. Implementation, automated gates, independent review, production
deployment, and user acceptance all passed.

## Decisions

- Use progressive rendering, not fixed-height virtualization.
- Use no new dependency and make no public API or database change.
- Keep one implementation owner; agents provide analysis and independent QA.
- Treat the 348-item live room as a non-destructive integration environment.
- Keep server pagination deferred unless measured metadata transfer dominates.

## Risks

- An observer rooted to the wrong element may reveal too much or never advance.
- Resetting on unstable array identity could repeatedly collapse the catalogue.
- Lazy poster state must not retain stale visibility across recycled asset props.
- Progressive card unmounting must not disconnect actions from canonical assets.

## Measured Evidence

- Controlled browser fixture, 250 assets, five runs:
  - origin/main median: 2,166 ms.
  - TASK-010 median: 768 ms.
  - Improvement: 64.5%.
- Initial mounted work:
  - Grid: 24 cards at 250 and 1,000 assets.
  - List: 12 rows after switching from grid.
- Cold poster requests:
  - 12 requests at 250 assets, 95.2% below the 250-request baseline.
  - 12 requests at 1,000 assets.
- Structural fixtures cover 0, 24, 25, 250, and 1,000 assets.
- Desktop and 390 x 844 mobile browser assertions pass.
- Non-destructive live-room baseline:
  - 348 total queue items, 347 upcoming, and 219 played.
  - Closed Listen drawer mounted 0 queue rows.
  - Open Listen drawer mounted 15 bounded rows with aria-setsize 348.

## Important Context

- Production catalogue delivery currently caps responses at 160 assets. The 250
  and 1,000 fixtures intentionally intercept the catalogue response to validate
  future-scale client behavior without changing the public API.
- TASK-010 makes no poster-route, R2-signing, catalogue authorization, database,
  upload-processing, or queue-state change.
- Production deployment `dpl_Es7z7LZd1AwwSyqtFagfXbAokgBm` was released from
  commit `b365b00` and confirmed healthy on both production aliases.
- User acceptance on 2026-07-14 confirmed the released Media Hub performance
  was good. This closes the post-deployment smoke gate without adding new
  claims beyond the automated owner/guest, traversal, and playback checks.

## Verification

- npm test: 239 passed.
- npm run typecheck: passed.
- npm run lint: passed.
- npm run check:file-lengths: 0 violations.
- npm run build: passed.
- Changed-file Prettier and git diff --check: passed at the recorded gate.
- Deterministic Playwright performance test: passed.
- Independent review: passed after ordered-result, full traversal, responsive,
  and final-card keyboard-action corrections.
- Production health and readiness: passed.
- User production acceptance: passed on 2026-07-14.
