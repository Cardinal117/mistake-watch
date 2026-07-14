# Acceptance Criteria: Watch Media Hub Performance

## Performance

- Grid mode initially mounts at most 24 uploaded cards.
- List mode initially mounts at most 12 uploaded rows.
- A 250-item catalogue starts at least 75% fewer poster requests than baseline.
- Five-run controlled median hub opening improves by at least 40%.
- Progressive batches preserve canonical ordering through 1,000 items.

## Functional

- Search, folder filters, sorting, and view changes reset to the correct first batch.
- Scrolling reveals all matching items without duplicates or omissions.
- Upload refresh, approval, visibility, folder move, delete, play, queue, and
  Play Next remain bound to the correct asset.
- Empty and unauthorized states remain unchanged.

## Security

- Poster URLs remain application routes until requested.
- Signed R2 URLs never enter React state, catalogue JSON, queue state, or room state.
- Unauthorized poster access remains denied.
- Owner and room-session authorization behavior from TASK-009 remains unchanged.

## Accessibility and Responsive Behavior

- Result progress is exposed as readable text.
- Card controls retain keyboard access across progressive boundaries.
- Poster placeholders prevent layout shift on desktop and mobile.
- Existing design tokens, card layouts, and interaction styling are preserved.

## Must Not Break

- The 348-item room's playback, mode switching, queue state, and drawer behavior.
- Owner catalogue and guest denial.
- Uploaded playback and multi-participant synchronization.
- Existing upload and processing workflows.
